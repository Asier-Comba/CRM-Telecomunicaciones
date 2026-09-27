import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const file = 'supabase/migrations/20260926164000_telecom_service_cases_documents.sql'
const sql = await readFile(file, 'utf8')
const allSql = (await Promise.all(
  (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')
const relations = ['service_cases', 'documents']
const tableBlock = (name) => sql.match(new RegExp(`create table public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1]
const functionBlock = (name) => sql.match(new RegExp(`create or replace function public\\.${name}\\(\\)[\\s\\S]*?\\n\\$\\$;`))?.[0]
const policyBlock = (name, source = sql) => source.match(new RegExp(`create policy ${name} [^;]+;`))?.[0]
const rawGrantPattern = /grant\s+[^;]*\bon\s+(?:table\s+)?[^;]*public\.(?:service_cases|documents)[^;]*\bto\s+[^;]*(?:\bpublic\b|\banon\b|\bauthenticated\b)/i

test('support relations are tenant-scoped, forced-RLS and raw-closed', () => {
  for (const relation of relations) {
    assert.match(tableBlock(relation), /workspace_id uuid not null references public\.workspaces/)
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    assert.match(policyBlock(`${relation}_select_active_member`), /is_workspace_member\(workspace_id\)/)
    assert.match(policyBlock(`${relation}_insert_owner_admin`), /has_workspace_role[\s\S]*created_by_user_id = auth\.uid\(\)/)
    assert.match(policyBlock(`${relation}_update_owner_admin`), /for update[\s\S]*has_workspace_role[\s\S]*with check/)
  }
  assert.doesNotMatch(sql, /for delete/i)
  assert.doesNotMatch(allSql, rawGrantPattern)
  for (const weakened of [
    'grant select on table public.foo, public.documents to authenticated;',
    'grant update on public.service_cases, public.foo to anon;',
    'grant truncate on table public.documents to authenticated;',
  ]) assert.match(weakened, rawGrantPattern)
  assert.doesNotMatch(allSql, /grant\s+[^;]*on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+(?:public|anon|authenticated)/i)
  assert.doesNotMatch(allSql, /alter\s+default\s+privileges[^;]*grant\s+[^;]*on\s+tables\s+to\s+(?:public|anon|authenticated)/i)
})

test('service cases bind customer, contract, service and line without cross-scope gaps', () => {
  const block = tableBlock('service_cases')
  for (const target of ['customers', 'telecom_contracts', 'telecom_services', 'telecom_lines']) {
    assert.match(block, new RegExp(`references public\\.${target}\\(id, workspace_id\\)`))
  }
  assert.match(block, /service_id is null or contract_id is not null/)
  assert.match(block, /line_id is null or service_id is not null/)
  assert.match(block, /'waiting_customer'[\s\S]*'waiting_operator'[\s\S]*'resolved'/)
  assert.match(block, /status = 'resolved' and resolved_at is not null and closed_at is null/)
  assert.match(block, /status in \('closed', 'cancelled'\) and closed_at is not null/)
  assert.match(block, /closed_at is null or resolved_at is null or closed_at >= resolved_at/)
  assert.doesNotMatch(block, /notes|metadata jsonb|description text/i)
  const validator = functionBlock('validate_service_case_context')
  assert.match(validator, /security definer set search_path = ''/)
  assert.match(validator, /case assignee is not an active workspace member/)
  assert.match(validator, /case contract scope mismatch/)
  assert.match(validator, /s\.customer_id = new\.customer_id and s\.contract_id = new\.contract_id/)
  assert.match(validator, /l\.service_id = new\.service_id/)
  assert.match(sql, /service_cases_validate_context[\s\S]*before insert or update/)
  assert.match(sql, /case customer is immutable/)
})

test('documents use one explicit FK target and immutable workspace-prefixed storage identity', () => {
  const block = tableBlock('documents')
  for (const [column, target] of [
    ['customer_id', 'customers'], ['contract_id', 'telecom_contracts'],
    ['service_id', 'telecom_services'], ['line_id', 'telecom_lines'],
    ['service_case_id', 'service_cases'], ['opportunity_id', 'opportunities'],
  ]) {
    assert.match(block, new RegExp(`foreign key \\(${column}, workspace_id\\)[\\s\\S]*references public\\.${target}\\(id, workspace_id\\)`))
  }
  assert.match(block, /num_nonnulls\([\s\S]*\) = 1/)
  assert.match(block, /storage_bucket = 'telecom-documents'/)
  assert.match(block, /sha256_hex ~ '\^\[0-9a-f\]\{64\}\$'/)
  assert.match(sql, /expected_prefix := new\.workspace_id::text \|\| '\/documents\/' \|\| new\.id::text \|\| '\/'/)
  assert.match(sql, /object_key !~ '\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-/)
  assert.match(sql, /document path must use the server-generated workspace\/document\/object grammar/)
  assert.match(sql, /document storage identity is immutable/)
  assert.match(sql, /document target is immutable/)
  assert.match(sql, /new\.storage_path is distinct from old\.storage_path/)
  assert.match(sql, /new\.media_type is distinct from old\.media_type/)
  assert.match(block, /file_name !~ '\[\[:cntrl:\]\/\]'/)
  assert.match(block, /position\(chr\(92\) in file_name\) = 0/)
  assert.match(block, /media_type ~ '\^\[a-z0-9\]/)
  assert.match(sql, /Potentially sensitive display metadata/)
  assert.doesNotMatch(block, /content bytea|body text|payload jsonb/i)
})

test('support indexes cover tenant queues and every document target', () => {
  for (const index of [
    'service_cases_customer_status_idx', 'service_cases_assignee_status_idx',
    'service_cases_contract_idx', 'service_cases_service_idx',
    'service_cases_line_idx', 'service_cases_open_due_idx',
    'documents_customer_idx', 'documents_contract_idx', 'documents_service_idx',
    'documents_line_idx', 'documents_case_idx', 'documents_opportunity_idx',
  ]) assert.match(sql, new RegExp(`create index ${index}`))
})

test('support security invariants have mutation-style negative controls', () => {
  const assertContract = (source) => {
    for (const relation of relations) {
      assert.match(source, new RegExp(`alter table public\\.${relation} force row level security`))
      assert.match(source, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
      assert.match(policyBlock(`${relation}_select_active_member`, source), /is_workspace_member\(workspace_id\)/)
    }
    assert.match(source, /num_nonnulls\([\s\S]*\) = 1/)
    assert.match(source, /security definer set search_path = ''/)
    assert.match(source, /case service scope mismatch/)
    assert.match(source, /document path must use the server-generated workspace\/document\/object grammar/)
    assert.match(source, /document storage identity is immutable/)
    assert.match(source, /document target is immutable/)
    assert.match(source, /case customer is immutable/)
  }
  assert.doesNotThrow(() => assertContract(sql))
  for (const weakened of [
    sql.replace('alter table public.documents force row level security;', ''),
    sql.replace('using (public.is_workspace_member(workspace_id));', 'using (true);'),
    sql.replace('num_nonnulls(', 'coalesce('),
    sql.replace("security definer set search_path = ''", "security definer set search_path = 'public'"),
    sql.replace("message = 'case service scope mismatch'", "message = 'case service accepted'"),
    sql.replace("message = 'document path must use the server-generated workspace/document/object grammar'", "message = 'document path accepted'"),
    sql.replace("message = 'document storage identity is immutable'", "message = 'document storage may change'"),
    sql.replace("message = 'document target is immutable'", "message = 'document target may change'"),
    sql.replace("message = 'case customer is immutable'", "message = 'case customer may change'"),
  ]) assert.throws(() => assertContract(weakened))
})
