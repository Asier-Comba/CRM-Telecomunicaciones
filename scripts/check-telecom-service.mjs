/** Exact-source integration, synthetic RPC transport: NOT live database evidence. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createAuthorizedTelecomAdapter, telecomIntegrationMatrix } from '../dist/src/assistant/telecom-service-adapter.js'

const sha = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) { console.error('Expected exact source SHA'); process.exit(2) }
const dir = await mkdtemp(join(tmpdir(), 'w3-telecom-'))
const source = name => execFileSync('git', ['show', `${sha}:src/lib/server/${name}.ts`], { encoding: 'utf8' })
try {
  const upstream = execFileSync('git', ['show', `${sha}:src/lib/contracts/telecom-v1.ts`], { encoding: 'utf8' })
  assert.equal(await readFile(new URL('../src/assistant/telecom-service-contract.v1.ts', import.meta.url), 'utf8'), upstream, 'pinned DTO source differs; review exact diff first')
  for (const name of ['telecom-runtime-v1', 'telecom-read-service-v1', 'telecom-supabase-repository-v1', 'telecom-cursor-v1']) {
    const js = ts.transpileModule(source(name), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
      .replaceAll('./telecom-runtime-v1.ts', './telecom-runtime-v1.mjs')
    await writeFile(join(dir, `${name}.mjs`), js)
  }
  const { AuthorizedTelecomReadServiceV1 } = await import(pathToFileURL(join(dir, 'telecom-read-service-v1.mjs')))
  const { SupabaseTelecomReadRepositoryV1 } = await import(pathToFileURL(join(dir, 'telecom-supabase-repository-v1.mjs')))
  const { AesGcmTelecomCursorCodecV1 } = await import(pathToFileURL(join(dir, 'telecom-cursor-v1.mjs')))
  const scope = { actorId: '10000000-0000-4000-8000-000000000001', workspaceId: '20000000-0000-4000-8000-000000000001', sessionId: 'session_synthetic_001', scopeEpoch: 'epoch_synthetic_0001' }
  const id = '40000000-0000-4000-8000-000000000001'
  const now = '2026-09-28T10:00:00.000Z'
  const version = { contract_version: 'telecom.v1', scope_epoch: scope.scopeEpoch }
  const empty = () => ({ ...version, source_state: 'available', permission: 'authorized', items: [], completeness: { kind: 'complete' }, continuation: null, freshness: { kind: 'fresh', as_of: now }, error: null })
  const row = { id, account_kind: 'legal_entity', legal_name: 'ACME synthetic', trade_name: null, lifecycle: 'customer', status: 'active', assigned_user_id: null, assigned_user_name: null, primary_contact_id: null, primary_contact_name: null }
  const customer = { ...version, id, account_kind: row.account_kind, legal_name: row.legal_name, trade_name: null, lifecycle: 'customer', status: 'active', assigned_user: null, primary_contact: null, tax_identifier: { field_class: 'tax_identifier', visibility: 'hidden' }, capabilities: [] }
  const ref = kind => ({ kind, id, display_name: kind })
  const contract = { ...version, id, customer: ref('customer'), operator: ref('operator'), plan: null, external_reference: { field_class: 'contract_reference', visibility: 'not_available' }, status: 'active', start_date: '2026-01-01', signed_date: null, end_date: null, cancelled_at: null, assigned_user: null, capabilities: [] }
  const serviceRow = { ...version, id, customer: ref('customer'), contract: ref('contract'), operator: ref('operator'), plan: null, service_kind: 'mobile', display_name: 'Synthetic mobile', status: 'active', activated_on: null, ended_on: null, capabilities: [] }
  const lineRow = { ...version, id, service: ref('service'), identifier: { field_class: 'line_identifier', visibility: 'not_available' }, status: 'active', activated_on: null, ended_on: null, capabilities: [] }
  const attention = kind => ({ id, kind, customer: ref('customer'), title: 'Synthetic attention', destination: null, capabilities: [] })
  const task = { ...attention('task'), status: 'pending', priority: 'normal', due_at: now, assignee: null, version: 1 }
  const meeting = { ...attention('meeting'), status: 'scheduled', starts_at: now, ends_at: null, all_day: false, timezone: 'Europe/Madrid', channel: 'video', assignee: null }
  const activity = { id, kind: 'activity', customer: ref('customer'), activity_kind: 'contacted', safe_summary: 'Synthetic call', occurred_at: now, actor: null, targets: [], capabilities: [] }
  const opportunity = { ...attention('opportunity'), stage: ref('opportunity_stage'), status: 'open', next_follow_up_at: null, follow_up_state: 'none', amount: null, owner: null }
  const renewal = { ...attention('renewal'), contract: ref('contract'), status: 'upcoming', target_on: '2026-10-01', opens_on: null, closes_on: null }
  const permanence = { ...attention('permanence'), contract: ref('contract'), service: null, status: 'active', starts_on: '2026-01-01', ends_on: '2026-12-31', reason_code: 'minimum_term' }
  const summary = { ...version, customer, contracts: empty(), services: empty(), lines: empty(), attention: { ...version, customer_id: id, generated_at: now, next_task: empty(), next_meeting: empty(), nearest_renewal: empty(), nearest_permanence: empty(), recent_activity: empty(), alerts: { ...empty(), source_state: 'unsupported', reason: 'contract_not_published', permission: 'unknown', items: null, completeness: null, freshness: null } } }
  let mode = 'normal', calls = 0, current = { ...scope }
  const client = { async rpc(name, args) {
    calls++; assert.equal(args.p_workspace_id, scope.workspaceId); assert.equal(args.p_actor_id, scope.actorId)
    if (mode === 'outage') throw new Error('PRIVATE_PROVIDER_DETAIL')
    if (mode === 'revoke') current.scopeEpoch = 'epoch_revoked_00001'
    if (name === 'telecom_v1_customer_search_rows') return { data: { rows: [row], has_more: mode === 'page', next_created_at: mode === 'page' ? now : null, next_id: mode === 'page' ? id : null }, error: null }
    if (name === 'telecom_v1_customer_get_row') return { data: mode === 'absent' ? null : row, error: null }
    if (name === 'telecom_v1_contract_get') return { data: contract, error: null }
    if (name === 'telecom_v1_dashboard_authorize') return { data: true, error: null }
    const portfolio = { telecom_v1_contract_list: contract, telecom_v1_service_list: serviceRow, telecom_v1_line_list: lineRow,
      telecom_v1_task_list: task, telecom_v1_meeting_list: meeting, telecom_v1_activity_list: activity, telecom_v1_opportunity_list: opportunity,
      telecom_v1_renewal_list: renewal, telecom_v1_permanence_list: permanence }
    if (Object.hasOwn(portfolio, name)) return { data: { rows: [portfolio[name]], has_more: false, next_created_at: null, next_id: null }, error: null }
    assert.equal(name, 'telecom_v1_customer_summary')
    return { data: mode === 'foreign' ? { ...summary, scope_epoch: 'foreign_epoch_00001' } : summary, error: null }
  } }
  let clock = Date.parse(now)
  const codec = new AesGcmTelecomCursorCodecV1(new Uint8Array(32).fill(7), { now: () => clock, ttlMs: 60_000 })
  const repository = new SupabaseTelecomReadRepositoryV1(client, codec, () => now)
  const service = new AuthorizedTelecomReadServiceV1(repository, { authorize: async () => true, authorizeReference: async () => true, authorizeCapability: async () => true, isCurrent: c => c.scope_epoch === current.scopeEpoch, now: () => now })
  const adapter = createAuthorizedTelecomAdapter({ service, authorizeOperation: async () => true, authorizeReference: async () => true, currentScope: () => current, now: () => Date.parse(now),
    authorizeContinuation: async (s, capability, filters, token) => capability === 'crm.customer.search' && await codec.consume({ actorId: s.actorId, workspaceId: s.workspaceId, scopeEpoch: s.scopeEpoch, operation: 'customer.search', filter: JSON.stringify([filters.query.trim(), filters.status ?? null, filters.assigned_user_id ?? null, filters.limit]) }, token) !== null })
  const results = []
  for (const mapping of telecomIntegrationMatrix(sha)) {
    const input = mapping.operation === 'customer.search' ? { query: 'ACME', limit: 20, continuation: null }
      : ['customer.get', 'customer.summary'].includes(mapping.operation) ? { customer_id: id }
      : mapping.operation === 'contract.get' ? { contract_id: id }
      : mapping.operation === 'dashboard.get' ? { audience: 'personal' } : { limit: 20, continuation: null }
    const result = await adapter.readEvidence(scope, mapping.capability, input)
    assert.equal(result.state, mapping.integrationState === 'repository_unavailable' ? 'unavailable' : 'available', mapping.operation)
    if (mapping.operation === 'customer.summary') {
      assert.equal(result.sections.alerts.availability, 'unsupported')
      assert.equal(result.sections.opportunities.availability, 'unsupported')
      assert.equal(result.sections.lines.can_assert_empty, true)
    }
    if (mapping.operation === 'dashboard.get' && result.state === 'available') {
      assert.equal(result.calendar.timezone, 'UTC')
      assert.equal(result.sections.today_tasks.rows.length, 1)
      assert.equal(result.sections.today_meetings.rows.length, 1)
      assert.equal(result.sections.renewals.availability, 'unavailable')
      assert.equal(result.sections.permanence_alerts.availability, 'unavailable')
      assert.equal((await adapter.readEvidence(scope, 'crm.dashboard.get', { audience: 'workspace' })).sections.renewals.availability, 'available')
      const preTeam = calls
      assert.equal((await adapter.readEvidence(scope, 'crm.dashboard.get', { audience: 'team' })).state, 'unavailable')
      assert.equal(calls, preTeam)
    }
    results.push({ operation: mapping.operation, state: result.state })
  }
  const before = calls
  assert.equal((await adapter.readEvidence(scope, 'crm.customer.get', { customer_id: id, workspace_id: 'forged' })).state, 'error')
  assert.equal(calls, before)
  mode = 'page'
  const serverContext = { actor_id: scope.actorId, workspace_id: scope.workspaceId, principal_kind: 'user', scope_epoch: scope.scopeEpoch }
  const first = await service.customerSearch(serverContext, { query: 'ACME', limit: 20, continuation: null })
  assert.equal(first.completeness.kind, 'partial')
  const nextInput = { query: 'ACME', limit: 20, continuation: first.continuation }
  assert.equal((await adapter.readEvidence(scope, 'crm.customer.search', nextInput)).state, 'available')
  const priorCalls = calls
  assert.equal((await adapter.readEvidence(scope, 'crm.customer.search', { ...nextInput, query: 'other_filter' })).state, 'not_authorized')
  clock += 60_000
  assert.equal((await adapter.readEvidence(scope, 'crm.customer.search', nextInput)).state, 'not_authorized')
  assert.equal(calls, priorCalls)
  for (const [scenario, capability, expected] of [['outage', 'get', 'error'], ['foreign', 'summary', 'error'], ['absent', 'get', 'not_found'], ['revoke', 'get', 'not_authorized']]) {
    mode = scenario
    assert.equal((await adapter.readEvidence(scope, `crm.customer.${capability}`, { customer_id: id })).state, expected, scenario)
  }
  console.log(JSON.stringify({ sourceSha: sha, evidence: 'exact_source_synthetic_rpc_no_database', operations: results, negativeControls: ['forged_scope_zero_calls', 'provider_outage', 'foreign_epoch', 'absent_record', 'revocation', 'changed_cursor_filter_zero_calls', 'expired_cursor_zero_calls'], pass: true }, null, 2))
} finally { await rm(dir, { recursive: true, force: true }) }
