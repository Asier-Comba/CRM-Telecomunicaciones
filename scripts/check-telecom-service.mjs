/** Exact-source integration, synthetic RPC transport: NOT live database evidence. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createAuthorizedTelecomAdapter, TELECOM_INTEGRATION_MATRIX } from '../dist/src/assistant/telecom-service-adapter.js'

const sha = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) { console.error('Expected exact source SHA'); process.exit(2) }
const dir = await mkdtemp(join(tmpdir(), 'w3-telecom-'))
const source = name => execFileSync('git', ['show', `${sha}:src/lib/server/${name}.ts`], { encoding: 'utf8' })
try {
  const upstream = execFileSync('git', ['show', `${sha}:src/lib/contracts/telecom-v1.ts`], { encoding: 'utf8' })
  assert.equal(await readFile(new URL('../src/assistant/telecom-service-contract.v1.ts', import.meta.url), 'utf8'), upstream, 'pinned DTO source differs; review exact diff first')
  for (const name of ['telecom-runtime-v1', 'telecom-read-service-v1', 'telecom-supabase-repository-v1']) {
    const js = ts.transpileModule(source(name), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
      .replaceAll('./telecom-runtime-v1.ts', './telecom-runtime-v1.mjs')
    await writeFile(join(dir, `${name}.mjs`), js)
  }
  const { AuthorizedTelecomReadServiceV1 } = await import(pathToFileURL(join(dir, 'telecom-read-service-v1.mjs')))
  const { SupabaseTelecomReadRepositoryV1 } = await import(pathToFileURL(join(dir, 'telecom-supabase-repository-v1.mjs')))
  const scope = { actorId: '10000000-0000-4000-8000-000000000001', workspaceId: '20000000-0000-4000-8000-000000000001', sessionId: 'session_synthetic_001', scopeEpoch: 'epoch_synthetic_0001' }
  const id = '40000000-0000-4000-8000-000000000001'
  const now = '2026-09-28T10:00:00.000Z'
  const version = { contract_version: 'telecom.v1', scope_epoch: scope.scopeEpoch }
  const empty = () => ({ ...version, source_state: 'available', permission: 'authorized', items: [], completeness: { kind: 'complete' }, continuation: null, freshness: { kind: 'fresh', as_of: now }, error: null })
  const row = { id, account_kind: 'legal_entity', legal_name: 'ACME synthetic', trade_name: null, lifecycle: 'customer', status: 'active', assigned_user_id: null, assigned_user_name: null, primary_contact_id: null, primary_contact_name: null }
  const customer = { ...version, id, account_kind: row.account_kind, legal_name: row.legal_name, trade_name: null, lifecycle: 'customer', status: 'active', assigned_user: null, primary_contact: null, tax_identifier: { field_class: 'tax_identifier', visibility: 'hidden' }, capabilities: [] }
  const summary = { ...version, customer, contracts: empty(), services: empty(), lines: empty(), attention: { ...version, customer_id: id, generated_at: now, next_task: empty(), next_meeting: empty(), nearest_renewal: empty(), nearest_permanence: empty(), recent_activity: empty(), alerts: { ...empty(), source_state: 'unsupported', reason: 'contract_not_published', permission: 'unknown', items: null, completeness: null, freshness: null } } }
  let mode = 'normal', calls = 0, current = { ...scope }
  const client = { async rpc(name, args) {
    calls++; assert.equal(args.p_workspace_id, scope.workspaceId); assert.equal(args.p_actor_id, scope.actorId)
    if (mode === 'outage') throw new Error('PRIVATE_PROVIDER_DETAIL')
    if (mode === 'revoke') current.scopeEpoch = 'epoch_revoked_00001'
    if (name === 'telecom_v1_customer_search_rows') return { data: { rows: [row], has_more: false, next_created_at: null, next_id: null }, error: null }
    if (name === 'telecom_v1_customer_get_row') return { data: mode === 'absent' ? null : row, error: null }
    assert.equal(name, 'telecom_v1_customer_summary')
    return { data: mode === 'foreign' ? { ...summary, scope_epoch: 'foreign_epoch_00001' } : summary, error: null }
  } }
  const repository = new SupabaseTelecomReadRepositoryV1(client, { consume: async () => null, issue: async () => { throw new Error('unused') } }, () => now)
  const service = new AuthorizedTelecomReadServiceV1(repository, { authorize: async () => true, authorizeReference: async () => true, authorizeCapability: async () => true, isCurrent: c => c.scope_epoch === current.scopeEpoch, now: () => now })
  const adapter = createAuthorizedTelecomAdapter({ service, authorizeOperation: async () => true, authorizeReference: async () => true, currentScope: () => current, now: () => Date.parse(now) })
  const results = []
  for (const mapping of TELECOM_INTEGRATION_MATRIX) {
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
    results.push({ operation: mapping.operation, state: result.state })
  }
  const before = calls
  assert.equal((await adapter.readEvidence(scope, 'crm.customer.get', { customer_id: id, workspace_id: 'forged' })).state, 'error')
  assert.equal(calls, before)
  for (const [scenario, capability, expected] of [['outage', 'get', 'error'], ['foreign', 'summary', 'error'], ['absent', 'get', 'not_found'], ['revoke', 'get', 'not_authorized']]) {
    mode = scenario
    assert.equal((await adapter.readEvidence(scope, `crm.customer.${capability}`, { customer_id: id })).state, expected, scenario)
  }
  console.log(JSON.stringify({ sourceSha: sha, evidence: 'exact_source_synthetic_rpc_no_database', operations: results, negativeControls: ['forged_scope_zero_calls', 'provider_outage', 'foreign_epoch', 'absent_record', 'revocation'], pass: true }, null, 2))
} finally { await rm(dir, { recursive: true, force: true }) }
