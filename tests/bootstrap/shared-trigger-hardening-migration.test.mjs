import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(
  'supabase/migrations/20260927161000_harden_shared_trigger_record_guards.sql',
  'utf8',
)
const domainRunner = await readFile(
  'scripts/security/ephemeral-postgres/domain.mjs',
  'utf8',
)
const onboardingRunner = await readFile(
  'scripts/security/ephemeral-postgres/onboarding.mjs',
  'utf8',
)

const functionBlock = (name) => migration.match(
  new RegExp(`create or replace function public\\.${name}\\(\\)[\\s\\S]*?\\n\\$\\$;`),
)?.[0]

test('heterogeneous trigger records branch before table-specific fields', () => {
  const plan = functionBlock('validate_telecom_plan_operator')
  const support = functionBlock('protect_support_identity')
  const imports = functionBlock('protect_import_child_identity')
  assert.ok(plan)
  assert.ok(support)
  assert.ok(imports)

  assert.ok(plan.indexOf("case tg_table_name") < plan.indexOf('new.start_date'))
  assert.ok(plan.indexOf("when 'telecom_services'") < plan.indexOf('new.service_kind'))
  assert.ok(support.indexOf("case tg_table_name") < support.indexOf('new.storage_bucket'))
  assert.ok(imports.indexOf("case tg_table_name") < imports.indexOf('new.created_by_user_id'))

  for (const block of [plan, support, imports]) {
    assert.match(block, /tg_op/)
    assert.match(block, /else[\s\S]*unsupported/)
  }
})

test('forward migration preserves closed execution and grants', () => {
  assert.match(migration, /^-- Forward-only/m)
  assert.match(migration, /begin;[\s\S]*commit;/)
  assert.equal((migration.match(/set search_path = ''/g) ?? []).length, 3)
  for (const name of [
    'validate_telecom_plan_operator',
    'protect_support_identity',
    'protect_import_child_identity',
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke all on function public\\.${name}\\(\\) from public, anon, authenticated`),
    )
  }
})

test('embedded domain runner is local, zero-to-head and transactional', () => {
  assert.match(domainRunner, /new PGlite/)
  assert.match(domainRunner, /pgcrypto/)
  assert.match(domainRunner, /btree_gist/)
  assert.match(domainRunner, /supabase\/migrations/)
  assert.match(domainRunner, /telecom-domain-rls\.sql/)
  assert.match(domainRunner, /fixture must end with rollback/)
  assert.doesNotMatch(domainRunner, /DATABASE_URL|https?:\/\//)
  assert.match(onboardingRunner, /btree_gist/)
  assert.match(onboardingRunner, /extensions: \{ pgcrypto, btree_gist \}/)
})
