import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(
  new URL('../../supabase/migrations/20260927171000_telecom_v1_customer_summary_rpc.sql', import.meta.url),
  'utf8',
)

test('Customer 360 reuses the active server reader scope and closes execution grants', () => {
  assert.match(migration, /perform public\.telecom_v1_assert_reader_scope\(p_actor_id, p_workspace_id\)/)
  assert.match(migration, /where c\.workspace_id = p_workspace_id and c\.id = p_customer_id/)
  assert.match(migration, /revoke all on function public\.telecom_v1_customer_summary[\s\S]*from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.telecom_v1_customer_summary[\s\S]*to service_role/)
})

test('Customer 360 publishes bounded portfolio and attention sections', () => {
  for (const section of [
    'contracts', 'services', 'lines', 'next_task', 'next_meeting',
    'nearest_renewal', 'nearest_permanence', 'alerts', 'recent_activity',
  ]) assert.match(migration, new RegExp(`'${section}'`))
  assert.match(migration, /limit 101/g)
  assert.match(migration, /filter \(where position <= 100\)/g)
  assert.match(migration, /limit 21/)
  assert.match(migration, /filter \(where position <= 20\)/)
  assert.match(migration, /telecom_v1_unsupported_collection\(p_scope_epoch\)/)
  assert.doesNotMatch(migration, /select\s+\*/i)
})

test('Customer 360 never selects raw protected identity values', () => {
  assert.doesNotMatch(migration, /c\.tax_identifier|contact\.email|contact\.phone/)
  assert.match(migration, /'tax_identifier', jsonb_build_object\('field_class', 'tax_identifier', 'visibility', 'hidden'\)/)
  assert.match(migration, /'external_reference', jsonb_build_object\('field_class', 'contract_reference', 'visibility', 'not_available'\)/)
  assert.match(migration, /'identifier', jsonb_build_object\('field_class', 'line_identifier', 'visibility', 'not_available'\)/)
})

test('Customer 360 uses database time and closed derived status mappings', () => {
  assert.match(migration, /statement_timestamp\(\)/)
  assert.match(migration, /when renewal\.target_on < today then 'overdue' else 'upcoming'/)
  assert.match(migration, /when commitment\.starts_on > today then 'upcoming'/)
  assert.match(migration, /when commitment\.ends_on < today then 'ended' else 'active'/)
  assert.match(migration, /case activity\.summary_code[\s\S]*else 'Actividad registrada' end/)
})
