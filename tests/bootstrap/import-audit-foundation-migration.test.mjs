import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const file = 'supabase/migrations/20260926165000_import_audit_foundation.sql'
const sql = await readFile(file, 'utf8')
const allSql = (await Promise.all(
  (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')
const relations = [
  'import_jobs', 'import_field_mappings', 'import_staging_rows',
  'import_row_issues', 'import_applications', 'business_audit_events',
]
const tableBlock = (name) => sql.match(new RegExp(`create table public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1]
const functionBlock = (name) => sql.match(new RegExp(`create or replace function public\\.${name}\\(\\)[\\s\\S]*?\\n\\$\\$;`))?.[0]
const policyBlock = (name, source = sql) => source.match(new RegExp(`create policy ${name} [^;]+;`))?.[0]
const rawGrantPattern = /grant\s+[^;]*\bon\s+(?:table\s+)?[^;]*public\.(?:import_jobs|import_field_mappings|import_staging_rows|import_row_issues|import_applications|business_audit_events)[^;]*\bto\s+[^;]*(?:\bpublic\b|\banon\b|\bauthenticated\b)/i

test('import and audit relations are forced-RLS, privileged and raw-closed', () => {
  for (const relation of relations) {
    assert.match(tableBlock(relation), /workspace_id uuid not null references public\.workspaces/)
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
  }
  for (const relation of relations.filter((name) => name !== 'business_audit_events')) {
    assert.match(policyBlock(`${relation}_select_owner_admin`), /has_workspace_role\(workspace_id, array\['owner','admin'\]/)
  }
  assert.match(policyBlock('business_audit_events_select_owner_admin'), /has_workspace_role\(workspace_id, array\['owner','admin'\]/)
  assert.doesNotMatch(allSql, rawGrantPattern)
  for (const weakened of [
    'grant select on table public.foo, public.import_jobs to authenticated;',
    'grant truncate on table public.business_audit_events to authenticated;',
  ]) assert.match(weakened, rawGrantPattern)
  assert.doesNotMatch(allSql, /grant\s+[^;]*on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+(?:public|anon|authenticated)/i)
  const defaultGrant = /alter\s+default\s+privileges[^;]*grant\s+[^;]*on\s+tables\s+to\s+(?:public|anon|authenticated)/i
  assert.doesNotMatch(allSql, defaultGrant)
  assert.match('alter default privileges grant select on tables to authenticated;', defaultGrant)
})

test('import jobs bind file, mapping and idempotency with monotonic lifecycle', () => {
  const block = tableBlock('import_jobs')
  assert.match(block, /contract_version = 'telecom\.v1'/)
  assert.match(block, /source_file_ref_id uuid not null/)
  assert.match(block, /source_file_digest_hmac text not null[\s\S]*'\^\[0-9a-f\]\{64\}\$'/)
  assert.match(block, /digest_key_version integer not null/)
  assert.match(block, /idempotency_key_id uuid not null/)
  assert.match(block, /unique \(workspace_id, idempotency_key_id\)/)
  assert.match(sql, /domain-separate source-file and row digests/)
  assert.match(sql, /terminal jobs are never resumed/)
  assert.match(block, /valid_rows \+ invalid_rows <= total_rows/)
  assert.match(block, /applied_rows \+ failed_rows <= valid_rows/)
  assert.match(block, /checkpoint_rows_processed bigint/)
  assert.match(block, /checkpoint_rows_processed is not null[\s\S]*checkpoint_rows_processed = total_rows/)
  assert.doesNotMatch(sql, /checkpoint_row_number/)
  assert.match(block, /status = 'completed'[\s\S]*completed_at is not null/)
  assert.match(block, /status = 'failed'[\s\S]*failure_code is not null/)
  assert.match(block, /status <> 'completed' or \([\s\S]*valid_rows \+ invalid_rows = total_rows[\s\S]*applied_rows \+ failed_rows = valid_rows/)
  const transition = functionBlock('validate_import_job_transition')
  for (const edge of [
    "old.status = 'uploaded' and new.status in ('mapping', 'failed', 'cancelled')",
    "old.status = 'mapping' and new.status in ('validating', 'failed', 'cancelled')",
    "old.status = 'validating' and new.status in ('ready', 'failed', 'cancelled')",
    "old.status = 'ready' and new.status in ('applying', 'failed', 'cancelled')",
    "old.status = 'applying' and new.status in ('completed', 'failed')",
  ]) assert.ok(transition.includes(edge))
  assert.match(sql, /import job binding is immutable/)
  assert.match(transition, /terminal import job is immutable/)
  assert.match(transition, /declared import total is immutable after validation starts/)
  assert.match(transition, /count\(\*\) filter \(where validation_state = 'valid'\)/)
  assert.match(transition, /from public\.import_applications/)
  assert.match(transition, /new\.status in \('ready', 'completed', 'failed', 'cancelled'\)/)
  assert.match(transition, /coalesce\(new\.checkpoint_rows_processed, 0\) <> actual_valid \+ actual_invalid/)
  assert.match(transition, /new\.status = 'ready' and actual_valid \+ actual_invalid <> actual_total/)
  assert.match(transition, /import counters do not match durable rows/)
  assert.match(sql, /import_jobs_validate_transition before update on public\.import_jobs/)
})

test('staging and issues store references and closed codes, never plaintext row payloads', () => {
  const staging = tableBlock('import_staging_rows')
  const issues = tableBlock('import_row_issues')
  assert.match(staging, /encrypted_payload_ref_id uuid not null/)
  assert.match(staging, /row_digest_hmac text not null/)
  assert.doesNotMatch(staging, /\brow_digest\b/)
  assert.match(staging, /application_state <> 'applied' or validation_state = 'valid'/)
  assert.match(issues, /message_template_code text not null/)
  assert.match(issues, /severity in \('warning', 'error'\)/)
  assert.doesNotMatch(staging, /jsonb|payload text|raw_value|email|phone|tax_identifier/i)
  assert.doesNotMatch(issues, /jsonb|message text|raw_value|rejected_value/i)
  assert.match(sql, /Plaintext row JSON, raw PII and rejected values are forbidden/)
  assert.match(sql, /keyed HMAC-SHA-256 over a canonical row representation/)
  assert.match(sql, /staging row binding is immutable/)
  assert.match(sql, /invalid staging validation transition/)
  assert.match(sql, /invalid staging application transition/)
  assert.match(sql, /staging validation timestamp is immutable outside its transition/)
  assert.match(sql, /staging application timestamp is immutable outside its transition/)
  assert.match(sql, /staging validation timestamp is invalid/)
  assert.match(sql, /staging application timestamp is invalid/)
  const mappingState = functionBlock('validate_import_mapping_state')
  assert.match(mappingState, /security definer set search_path = ''/)
  assert.match(mappingState, /for update/)
  assert.match(mappingState, /is_import_target_field_for_kind\(job_kind, new\.target_field_code\)/)
  assert.match(sql, /mapping is immutable after validation starts/)
  assert.match(sql, /mapping field does not belong to import kind/)
  const stagingPhase = functionBlock('validate_import_staging_phase')
  assert.match(stagingPhase, /security definer set search_path = ''/)
  assert.match(stagingPhase, /for update/)
  assert.match(stagingPhase, /new\.source_row_number > job_total_rows/)
  assert.match(stagingPhase, /staging rows may only be inserted while validating/)
  assert.match(stagingPhase, /staging rows must enter in pending state/)
  assert.match(stagingPhase, /staging validation may only change while validating/)
  assert.match(stagingPhase, /staging application may only change while applying/)
  assert.match(sql, /import_staging_rows_validate_phase before insert or update/)
  assert.match(functionBlock('validate_import_row_issue'), /import issue requires a validated staging row/)
  assert.match(functionBlock('validate_import_row_issue'), /import issues may only be appended while validating/)
  assert.match(sql, /import_staging_rows_no_delete before delete/)
})

test('applications have exactly one explicit tenant target and one durable row application', () => {
  const block = tableBlock('import_applications')
  for (const [column, target] of [
    ['customer_id', 'customers'], ['contact_id', 'contacts'],
    ['operator_id', 'telecom_operators'], ['plan_id', 'telecom_plans'],
    ['plan_version_id', 'telecom_plan_versions'], ['contract_id', 'telecom_contracts'],
    ['service_id', 'telecom_services'], ['line_id', 'telecom_lines'],
  ]) assert.match(block, new RegExp(`foreign key \\(${column}, workspace_id\\)[\\s\\S]*references public\\.${target}\\(id, workspace_id\\)`))
  assert.match(block, /num_nonnulls\([\s\S]*\) = 1/)
  assert.match(block, /unique \(workspace_id, import_job_id, staging_row_id\)/)
  assert.match(block, /operation_ref_id uuid not null/)
  assert.match(block, /unique \(workspace_id, operation_ref_id\)/)
  const applicationValidator = functionBlock('validate_import_application')
  assert.match(applicationValidator, /job_status <> 'applying'/)
  assert.match(applicationValidator, /expected_target is distinct from job_kind/)
  assert.equal((applicationValidator.match(/for update/g) ?? []).length, 2)
  assert.ok(applicationValidator.indexOf('from public.import_staging_rows r') < applicationValidator.indexOf('from public.import_jobs j'))
  assert.match(applicationValidator, /import job is not applying/)
  assert.match(applicationValidator, /new\.applied_at := clock_timestamp\(\)/)
  assert.match(sql, /import application target does not match job kind/)
  assert.match(sql, /import_applications_mark_row after insert/)
  assert.match(sql, /import row application state changed concurrently/)
  assert.match(sql, /import ledger mutation is forbidden/)
  for (const target of ['customer', 'contact', 'operator', 'plan', 'plan_version', 'contract', 'service', 'line']) {
    assert.match(sql, new RegExp(`create index import_applications_${target}_idx`))
  }
})

test('business audit is redacted, actor-bound and append-only', () => {
  const block = tableBlock('business_audit_events')
  assert.match(block, /actor_kind in \('user', 'system', 'integration'\)/)
  assert.match(block, /actor_kind = 'user' and actor_user_id is not null and actor_ref_id is null/)
  assert.match(block, /actor_kind <> 'user' and actor_user_id is null and actor_ref_id is not null/)
  assert.match(block, /split_part\(action_code, '\.', 2\) in/)
  assert.match(block, /array_length\(string_to_array\(action_code, '\.'\), 1\) = 3/)
  assert.doesNotMatch(block, /metadata|payload|before_value|after_value|prompt|secret|document_body/i)
  assert.match(functionBlock('validate_business_audit_event'), /security definer set search_path = ''/)
  assert.match(sql, /audit actor is not the active caller/)
  assert.match(functionBlock('validate_business_audit_event'), /new\.recorded_at := clock_timestamp\(\)/)
  assert.match(functionBlock('validate_business_audit_event'), /new\.prior_event_id is not null/)
  assert.match(functionBlock('validate_business_audit_event'), /new\.outcome in \('succeeded', 'no_effect'\)/)
  assert.match(functionBlock('validate_business_audit_event'), /successful audit target does not exist in workspace/)
  assert.match(functionBlock('validate_business_audit_event'), /new\.target_kind, new\.target_id, new\.action_code/)
  assert.match(sql, /audit correction chain mismatch/)
  assert.match(sql, /business_audit_events_append_only before update or delete/)
  assert.match(sql, /business audit is append-only/)
  assert.doesNotMatch(sql, /business_audit_events_update|business_audit_events_delete/)
})

test('import/audit security invariants have mutation-style negative controls', () => {
  const assertContract = (source) => {
    for (const relation of relations) {
      assert.match(source, new RegExp(`alter table public\\.${relation} force row level security`))
      assert.match(source, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    }
    assert.match(source, /invalid or non-monotonic import transition/)
    assert.match(source, /import job binding is immutable/)
    assert.match(source, /terminal import job is immutable/)
    assert.match(source, /declared import total is immutable after validation starts/)
    assert.match(source, /import counters do not match durable rows/)
    assert.match(source, /mapping is immutable after validation starts/)
    assert.match(source, /mapping field does not belong to import kind/)
    assert.match(source, /staging rows may only be inserted while validating/)
    assert.match(source, /staging application may only change while applying/)
    assert.match(source, /invalid staging application transition/)
    assert.match(source, /staging application timestamp is immutable outside its transition/)
    assert.match(source, /import application target does not match job kind/)
    assert.match(source, /import ledger mutation is forbidden/)
    assert.match(source, /num_nonnulls\([\s\S]*\) = 1/)
    assert.match(source, /business audit is append-only/)
    assert.match(source, /audit correction chain mismatch/)
    assert.match(source, /successful audit target does not exist in workspace/)
    assert.match(source, /security definer set search_path = ''/)
    assert.doesNotMatch(source, /security definer set search_path = '[^']+'/)
    assert.doesNotMatch(source, /payload jsonb|raw_value text/i)
  }
  assert.doesNotThrow(() => assertContract(sql))
  for (const weakened of [
    sql.replace('alter table public.import_jobs force row level security;', ''),
    sql.replace("message = 'invalid or non-monotonic import transition'", "message = 'transition accepted'"),
    sql.replace("message = 'import job binding is immutable'", "message = 'binding mutable'"),
    sql.replace("message = 'terminal import job is immutable'", "message = 'terminal mutable'"),
    sql.replace("message = 'declared import total is immutable after validation starts'", "message = 'declared total mutable'"),
    sql.replace("message = 'import counters do not match durable rows'", "message = 'fabricated counters accepted'"),
    sql.replace("message = 'mapping is immutable after validation starts'", "message = 'mapping mutable'"),
    sql.replace("message = 'mapping field does not belong to import kind'", "message = 'cross-kind mapping accepted'"),
    sql.replace("message = 'staging rows may only be inserted while validating'", "message = 'staging phase ignored'"),
    sql.replace("message = 'staging application may only change while applying'", "message = 'application phase ignored'"),
    sql.replace("message = 'invalid staging application transition'", "message = 'staging transition accepted'"),
    sql.replace("message = 'staging application timestamp is immutable outside its transition'", "message = 'timestamp mutable'"),
    sql.replace("message = 'import application target does not match job kind'", "message = 'target accepted'"),
    sql.replace("message = 'import ledger mutation is forbidden'", "message = 'ledger mutable'"),
    sql.replace('num_nonnulls(', 'coalesce('),
    sql.replace("message = 'business audit is append-only'", "message = 'audit mutable'"),
    sql.replace("message = 'audit correction chain mismatch'", "message = 'audit chain mismatch accepted'"),
    sql.replace("message = 'successful audit target does not exist in workspace'", "message = 'foreign audit target accepted'"),
    sql.replace("security definer set search_path = ''", "security definer set search_path = 'public'"),
    `${sql}\nalter table public.import_staging_rows add column payload jsonb;`,
  ]) assert.throws(() => assertContract(weakened))
})
