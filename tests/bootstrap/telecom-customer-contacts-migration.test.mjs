import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const path = 'supabase/migrations/20260926160000_telecom_customer_contacts.sql'
const sql = await readFile(path, 'utf8')
const allSql = (await Promise.all(
  (await readdir('supabase/migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')

function tableBlock(name) {
  return sql.match(new RegExp(`create table public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1]
}

function assertSecurityContract(source) {
  for (const relation of ['customers', 'contacts']) {
    assert.match(source, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(source, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(source, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    assert.doesNotMatch(source, new RegExp(`grant [^;]+ on table public\\.${relation}`, 'i'))
  }
  assert.match(source, /foreign key \(customer_id, workspace_id\)/)
  assert.match(source, /set search_path = ''/)
  assert.doesNotMatch(source, /create policy (?:customers|contacts).*for delete/is)
}

test('customer and contact tables have tenant keys, timestamps and strict relations', () => {
  const customers = tableBlock('customers')
  const contacts = tableBlock('contacts')

  assert.ok(customers)
  assert.ok(contacts)
  for (const block of [customers, contacts]) {
    assert.match(block, /workspace_id uuid not null references public\.workspaces/)
    assert.match(block, /created_at timestamptz not null default now\(\)/)
    assert.match(block, /updated_at timestamptz not null default now\(\)/)
    assert.match(block, /created_by_user_id uuid default auth\.uid\(\) references auth\.users/)
  }
  assert.match(customers, /account_kind in \('legal_entity', 'sole_trader'\)/)
  assert.match(customers, /status in \('active', 'inactive', 'archived'\)/)
  assert.match(customers, /lifecycle in \('lead', 'prospect', 'customer', 'former_customer'\)/)
  assert.match(contacts, /foreign key \(customer_id, workspace_id\)/)
  assert.match(contacts, /references public\.customers\(id, workspace_id\) on delete restrict/)
})

test('customer identity and contact constraints stay normalized', () => {
  assert.match(sql, /customers_workspace_tax_identifier_uidx/)
  assert.match(sql, /customers_workspace_legal_name_idx/)
  assert.match(sql, /contacts_one_active_primary_uidx/)
  assert.match(sql, /check \(not is_primary or \(status = 'active' and archived_at is null\)\)/)
  assert.doesNotMatch(tableBlock('customers'), /^\s*notes\s+/m)
  assert.doesNotMatch(tableBlock('customers'), /metadata jsonb/)
  assert.doesNotMatch(tableBlock('contacts'), /metadata jsonb/)
})

test('assigned commercial must be active in the same active workspace', () => {
  const assignment = sql.match(
    /create or replace function public\.validate_customer_assignment\(\)[\s\S]*?\n\$\$;/,
  )?.[0]
  assert.ok(assignment)
  assert.match(assignment, /security definer/)
  assert.match(assignment, /set search_path = ''/)
  assert.match(assignment, /wm\.workspace_id = new\.workspace_id/)
  assert.match(assignment, /wm\.user_id = new\.assigned_user_id/)
  assert.match(assignment, /wm\.status = 'active'/)
  assert.match(assignment, /w\.status = 'active'/)
  assert.match(sql, /revoke all on function public\.validate_customer_assignment\(\) from public, anon, authenticated/)
})

test('both domain tables force RLS and fail closed through active-workspace helpers', () => {
  for (const relation of ['customers', 'contacts']) {
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(sql, new RegExp(`create policy ${relation}_select_active_member`))
    assert.match(sql, new RegExp(`create policy ${relation}_insert_manager`))
    assert.match(sql, new RegExp(`create policy ${relation}_update_manager`))
  }
  assert.match(sql, /public\.is_workspace_member\(workspace_id\)/)
  assert.match(sql, /public\.has_workspace_role\(workspace_id, array\['owner', 'admin'\]::text\[\]\)/)
  assert.doesNotMatch(sql, /create policy (?:customers|contacts).*for delete/is)
})

test('raw tables stay closed until capability-aware readers and commands exist', () => {
  for (const relation of ['customers', 'contacts']) {
    assert.match(sql, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    assert.doesNotMatch(sql, new RegExp(`grant [^;]+ on table public\\.${relation}`, 'i'))
  }
  assert.doesNotMatch(
    allSql,
    /grant\s+(?:select|insert|update|delete|all)[^;]*on\s+table\s+public\.(?:customers|contacts)\s+to\s+(?:public|anon|authenticated)/i,
  )
})

test('the migration documents the capability boundary for sensitive fields', () => {
  assert.match(sql, /Raw tables intentionally receive no authenticated grant/)
  assert.match(sql, /Tax identifiers,[\s\S]*email and phone must be projected/)
  assert.match(sql, /closed commands will later expose approved mutations/)
})

test('security contract rejects weakened migration negative controls', () => {
  assert.doesNotThrow(() => assertSecurityContract(sql))

  const weakened = [
    sql.replace('alter table public.customers force row level security;', ''),
    sql.replace('foreign key (customer_id, workspace_id)', 'foreign key (customer_id)'),
    sql.replace(
      'revoke all on table public.contacts from public, anon, authenticated;',
      'grant select on table public.contacts to authenticated;',
    ),
    sql.replace("set search_path = ''", "set search_path = 'public'"),
  ]

  for (const candidate of weakened) {
    assert.throws(() => assertSecurityContract(candidate))
  }
})
