import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(
  'supabase/migrations/20260927162000_enforce_import_job_initial_state.sql',
  'utf8',
)
const domainFixture = await readFile('supabase/tests/telecom-domain-rls.sql', 'utf8')

test('import jobs enter through one closed database state', () => {
  assert.match(migration, /before insert on public\.import_jobs/)
  assert.match(migration, /new\.status <> 'uploaded'/)
  for (const field of [
    'total_rows', 'valid_rows', 'invalid_rows', 'applied_rows', 'failed_rows',
  ]) assert.match(migration, new RegExp(`new\\.${field} <> 0`))
  for (const field of [
    'checkpoint_rows_processed', 'failure_code', 'completed_at', 'cancelled_at',
  ]) assert.match(migration, new RegExp(`new\\.${field} is not null`))
  assert.match(migration, /import job must enter in the initial uploaded state/)
  assert.match(
    migration,
    /revoke all on function public\.validate_import_job_initial_state\(\) from public, anon, authenticated/,
  )
})

test('SQL harness covers invalid creation and valid lifecycle checkpoints', () => {
  for (const evidence of [
    'terminal import insert was not denied',
    'fabricated import insert counters were not denied',
    'completed_at on import insert was not denied',
    "set status = 'mapping', total_rows = 2",
    'set valid_rows = 1, invalid_rows = 1, checkpoint_rows_processed = 2',
    "set status = 'ready'",
    "set status = 'applying'",
    "set status = 'completed', applied_rows = 1, completed_at = now()",
    'fabricated terminal import counters were not denied',
  ]) assert.ok(domainFixture.includes(evidence), evidence)
  assert.match(
    domainFixture,
    /'80000000-0000-0000-0000-000000000001'[\s\S]{0,500}'89000000-0000-0000-0000-000000000001', 0/,
  )
})
