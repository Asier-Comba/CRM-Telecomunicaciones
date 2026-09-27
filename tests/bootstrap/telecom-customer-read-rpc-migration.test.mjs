import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(
  new URL('../../supabase/migrations/20260927170000_telecom_v1_customer_read_rpc.sql', import.meta.url),
  'utf8',
)

test('customer readers recheck active actor/workspace scope in the database', () => {
  assert.match(migration, /join public\.workspaces w on w\.id = wm\.workspace_id/)
  assert.match(migration, /wm\.user_id = p_actor_id/)
  assert.match(migration, /wm\.workspace_id = p_workspace_id/)
  assert.match(migration, /wm\.status = 'active'/)
  assert.match(migration, /w\.status = 'active'/)
  assert.match(migration, /errcode = '42501'/)
})

test('customer readers are server-only and raw domain grants stay closed', () => {
  for (const signature of [
    /revoke all on function public\.telecom_v1_customer_search_rows[\s\S]*from public, anon, authenticated/,
    /revoke all on function public\.telecom_v1_customer_get_row[\s\S]*from public, anon, authenticated/,
  ]) assert.match(migration, signature)
  assert.match(migration, /grant execute on function public\.telecom_v1_customer_search_rows[\s\S]*to service_role/)
  assert.match(migration, /grant execute on function public\.telecom_v1_customer_get_row[\s\S]*to service_role/)
  assert.doesNotMatch(migration, /grant\s+(?:select|insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:customers|contacts)/i)
})

test('customer search is bounded, stable, cursor-aware and PII-minimized', () => {
  assert.match(migration, /p_limit not between 1 and 100/)
  assert.match(migration, /order by c\.created_at desc, c\.id desc/)
  assert.match(migration, /\(c\.created_at, c\.id\) < \(p_after_created_at, p_after_id\)/)
  assert.match(migration, /limit p_limit \+ 1/)
  assert.doesNotMatch(migration, /select\s+\*/i)
  assert.doesNotMatch(migration, /'tax_identifier'|'email'|'phone'/)
})

test('customer get scopes the entity to the resolved workspace', () => {
  assert.match(migration, /where c\.workspace_id = p_workspace_id\s+and c\.id = p_customer_id/)
})
