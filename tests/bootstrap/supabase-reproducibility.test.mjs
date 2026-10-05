import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = process.cwd()

function runAudit(...args) {
  return spawnSync(
    process.execPath,
    ['scripts/audit-supabase-reproducibility.mjs', ...args],
    { cwd: root, encoding: 'utf8' },
  )
}

test('the known Supabase drift remains explicit', () => {
  const result = runAudit('--json')
  assert.equal(result.status, 0, result.stderr)

  const report = JSON.parse(result.stdout)
  assert.equal(report.reproducible, false)
  assert.deepEqual(
    report.createdRelations,
    [
      'activities',
      'assistant_confirmations',
      'assistant_effect_outbox',
      'assistant_operations',
      'billing_customer_profiles',
      'billing_invoice_lines',
      'billing_invoices',
      'billing_issuers',
      'billing_private_pdf_artifacts',
      'billing_private_pdf_jobs',
      'billing_series',
      'business_audit_events',
      'calendar_events',
      'contacts',
      'customers',
      'document_download_tickets',
      'document_upload_intents',
      'documents',
      'import_applications',
      'import_field_mappings',
      'import_jobs',
      'import_row_issues',
      'import_staging_rows',
      'inbox_conversations',
      'inbox_messages',
      'inbox_read_markers',
      'internal_automation_events',
      'internal_automation_runs',
      'internal_automations',
      'internal_notifications',
      'notification_centers',
      'opportunities',
      'opportunity_stages',
      'product_audit_events',
      'product_command_key',
      'product_commands',
      'product_opportunity_history',
      'product_opportunity_links',
      'product_user_preferences',
      'profiles',
      'service_cases',
      'tasks',
      'team_invite_intents',
      'telecom_commitments',
      'telecom_contracts',
      'telecom_lines',
      'telecom_operators',
      'telecom_plan_versions',
      'telecom_plans',
      'telecom_renewals',
      'telecom_services',
      'workspace_company_profiles',
      'workspace_members',
      'workspaces',
    ],
  )
  assert.equal(report.historicalSqlFiles, 0)
  assert.deepEqual(
    report.unresolvedRelations.map(({ name }) => name),
    report.missingRelations.map(({ name }) => name),
  )
  assert.ok(report.unresolvedRelations.some(({ name }) => name === 'clients'))
  assert.deepEqual(report.missingFunctions.map(({ name }) => name), ['reserve_invoice_number'])
  assert.ok(report.createdFunctions.includes('provision_workspace'))
})

test('strict mode rejects an incomplete canonical migration set', () => {
  const result = runAudit('--strict')
  assert.equal(result.status, 1)
  assert.match(result.stdout, /RESULT: drift detected/)
})

test('the live inventory query contains no write statement', async () => {
  const sql = await readFile('scripts/audit-supabase-live-schema.sql', 'utf8')
  const executableSql = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')

  assert.doesNotMatch(
    executableSql,
    /^\s*(insert|update|delete|create|alter|drop|grant|revoke|truncate|call|do)\b/im,
  )

  const report = JSON.parse(runAudit('--json').stdout)
  const relationBlock = sql.match(
    /target_relations\(name\) as \(\s*values([\s\S]*?)\r?\n\),\r?\ntarget_functions/,
  )?.[1]
  const functionBlock = sql.match(
    /target_functions\(name\) as \(\s*values([\s\S]*?)\r?\n\),\r?\nrelations/,
  )?.[1]
  const names = (block) => [...block.matchAll(/\('([a-z_][a-z0-9_]*)'\)/g)]
    .map((match) => match[1])
    .sort()

  assert.ok(relationBlock)
  assert.ok(functionBlock)
  assert.deepEqual(
    names(relationBlock),
    [...report.createdRelations, ...report.missingRelations.map(({ name }) => name)].sort(),
  )
  assert.deepEqual(names(functionBlock), report.missingFunctions.map(({ name }) => name))
})
