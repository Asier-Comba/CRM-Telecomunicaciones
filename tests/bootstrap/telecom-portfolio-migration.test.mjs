import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const file = 'supabase/migrations/20260926162000_telecom_contract_service_portfolio.sql'
const sql = await readFile(file, 'utf8')
const allSql = (await Promise.all(
  (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')
const relations = ['telecom_contracts', 'telecom_services', 'telecom_lines', 'telecom_commitments', 'telecom_renewals']
const tableBlock = (name) => sql.match(new RegExp(`create table public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1]
const policyBlock = (name) => sql.match(new RegExp(`create policy ${name} [^;]+;`))?.[0]

test('portfolio relations are tenant-owned, indexed and raw-closed', () => {
  for (const relation of relations) {
    assert.match(sql, new RegExp(`create table public\\.${relation}`))
    assert.match(tableBlock(relation), /workspace_id uuid not null references public\.workspaces/)
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    assert.match(sql, new RegExp(`create policy ${relation}_select_active_member`))
    assert.match(sql, new RegExp(`create policy ${relation}_insert_owner_admin`))
    assert.match(sql, new RegExp(`create policy ${relation}_update_owner_admin`))
    assert.match(policyBlock(`${relation}_select_active_member`), /for select to authenticated using \(public\.is_workspace_member\(workspace_id\)\)/)
    assert.match(policyBlock(`${relation}_insert_owner_admin`), /for insert to authenticated with check \(public\.has_workspace_role\(workspace_id, array\['owner','admin'\]::text\[\]\) and created_by_user_id = auth\.uid\(\)\)/)
    assert.match(policyBlock(`${relation}_update_owner_admin`), /for update to authenticated using \(public\.has_workspace_role\(workspace_id, array\['owner','admin'\]::text\[\]\)\) with check \(public\.has_workspace_role\(workspace_id, array\['owner','admin'\]::text\[\]\)\)/)
  }
  assert.doesNotMatch(
    allSql,
    /grant\s+(?:select|insert|update|delete|all)[^;]*on\s+(?:table\s+)?public\.telecom_(?:contracts|services|lines|commitments|renewals)\s+to\s+(?:public|anon|authenticated)/i,
  )
  assert.doesNotMatch(allSql, /grant\s+[^;]*on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+(?:public|anon|authenticated)/i)
  assert.doesNotMatch(allSql, /alter\s+default\s+privileges[^;]*grant\s+[^;]*on\s+tables\s+to\s+(?:public|anon|authenticated)/i)
  assert.doesNotMatch(sql, /for delete/i)
})

test('contract cancellation is recorded separately from contractual end dates', () => {
  const contract = tableBlock('telecom_contracts')
  assert.match(contract, /cancelled_at timestamptz/)
  assert.match(contract, /cancelled_by_user_id uuid references auth\.users\(id\)/)
  assert.match(contract, /status <> 'ended' or end_date is not null/)
  assert.match(contract, /\(status = 'cancelled'\) = \(cancelled_at is not null\)/)
  assert.doesNotMatch(contract, /status not in \('ended', 'cancelled'\) or end_date is not null/)
})

test('composite foreign keys reject cross-tenant and intra-tenant parent mismatches', () => {
  assert.match(sql, /foreign key \(customer_id, workspace_id\) references public\.customers\(id, workspace_id\)/)
  assert.match(sql, /foreign key \(operator_id, workspace_id\) references public\.telecom_operators\(id, workspace_id\)/)
  assert.match(sql, /foreign key \(contract_id, workspace_id, customer_id, operator_id\)/)
  assert.match(sql, /references public\.telecom_contracts\(id, workspace_id, customer_id, operator_id\)/)
  assert.match(sql, /foreign key \(service_id, workspace_id, contract_id\)/)
  assert.match(sql, /references public\.telecom_services\(id, workspace_id, contract_id\)/)
  for (const index of [
    'telecom_contracts_operator_idx', 'telecom_contracts_plan_version_idx',
    'telecom_services_plan_version_idx', 'telecom_services_operator_idx',
    'telecom_commitments_service_idx', 'telecom_renewals_contract_idx',
  ]) assert.match(sql, new RegExp(`create index ${index}`))
})

test('plan versions must belong to the selected operator', () => {
  const fn = sql.match(/create or replace function public\.validate_telecom_plan_operator\(\)[\s\S]*?\n\$\$;/)?.[0]
  assert.ok(fn)
  assert.match(fn, /security definer set search_path = ''/)
  assert.match(fn, /p\.operator_id = new\.operator_id/)
  assert.match(fn, /p\.service_kind = new\.service_kind/)
  assert.match(fn, /pv\.workspace_id = new\.workspace_id/)
  assert.match(fn, /pv\.valid_from <= new\.start_date/)
  assert.match(fn, /pv\.valid_from <= new\.activated_on/)
  assert.match(sql, /revoke all on function public\.validate_telecom_plan_operator\(\) from public, anon, authenticated/)
  assert.match(sql, /telecom_contracts_validate_plan/)
  assert.match(sql, /telecom_services_validate_plan/)
  assert.match(sql, /telecom_plans_protect_referenced_identity/)
  assert.match(sql, /referenced plan identity is immutable/)
})

test('sensitive contract and line identifiers are deferred pending protected storage', () => {
  assert.doesNotMatch(tableBlock('telecom_contracts'), /external_reference/)
  assert.doesNotMatch(tableBlock('telecom_lines'), /identifier_(?:kind|value|normalized)/)
  assert.match(sql, /Sensitive MSISDN\/SIM\/circuit identifiers are deferred/)
  assert.doesNotMatch(sql, /metadata jsonb/i)
})

test('commitment and renewal dates encode facts rather than clock-derived states', () => {
  assert.match(sql, /check \(ends_on >= starts_on\)/)
  assert.match(sql, /administrative_status in \('open', 'cancelled'\)/)
  assert.match(sql, /status in \('open', 'completed', 'dismissed', 'not_applicable'\)/)
  assert.doesNotMatch(sql, /status in \([^)]*'upcoming'/)
  assert.doesNotMatch(sql, /status in \([^)]*'overdue'/)
  assert.match(sql, /Upcoming\/overdue is derived at read time/)
  assert.match(sql, /exclude using gist/)
  assert.match(sql, /target_on date not null/)
  assert.match(sql, /unique \(workspace_id, contract_id, target_on\)/)
  assert.match(sql, /\(opens_on is null\) = \(closes_on is null\)/)
  assert.doesNotMatch(tableBlock('telecom_contracts'), /renewal_date/)
})

test('portfolio security controls have mutation-style negative checks', () => {
  const assertContract = (source) => {
    for (const relation of relations) {
      assert.match(source, new RegExp(`alter table public\\.${relation} force row level security`))
      assert.match(source, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    }
    assert.match(source, /foreign key \(contract_id, workspace_id, customer_id, operator_id\)/)
    assert.match(source, /foreign key \(service_id, workspace_id, contract_id\)/)
    assert.match(source, /telecom_commitments_service_idx\s+on public\.telecom_commitments \(workspace_id, service_id, contract_id\)\s+where service_id is not null/)
    assert.match(source, /p\.operator_id = new\.operator_id and p\.service_kind = new\.service_kind/)
    assert.match(source, /set search_path = ''/)
    for (const relation of relations) {
      const policy = (name) => source.match(new RegExp(`create policy ${name} [^;]+;`))?.[0]
      assert.match(policy(`${relation}_select_active_member`), /using \(public\.is_workspace_member\(workspace_id\)\)/)
      assert.match(policy(`${relation}_insert_owner_admin`), /with check \(public\.has_workspace_role\([\s\S]+created_by_user_id = auth\.uid\(\)\)/)
      assert.match(policy(`${relation}_update_owner_admin`), /using \(public\.has_workspace_role\([\s\S]+with check \(public\.has_workspace_role\(/)
    }
  }
  assert.doesNotThrow(() => assertContract(sql))
  for (const weakened of [
    sql.replace('alter table public.telecom_lines force row level security;', ''),
    sql.replace('foreign key (contract_id, workspace_id, customer_id, operator_id)', 'foreign key (contract_id)'),
    sql.replace('foreign key (service_id, workspace_id, contract_id)', 'foreign key (service_id)'),
    sql.replace('on public.telecom_commitments (workspace_id, service_id, contract_id)', 'on public.telecom_commitments (workspace_id, ends_on)'),
    sql.replace('p.operator_id = new.operator_id and p.service_kind = new.service_kind', 'p.operator_id = new.operator_id'),
    sql.replaceAll("set search_path = ''", "set search_path = 'public'"),
    sql.replace('using (public.is_workspace_member(workspace_id));', 'using (true);'),
    sql.replace("with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());", 'with check (true);'),
  ]) assert.throws(() => assertContract(weakened))
})
