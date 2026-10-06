import assert from 'node:assert/strict'
import test from 'node:test'
import { createTelecomReadBoundary, TELECOM_READ_DTO_KINDS, type TelecomReadBoundaryDependencies } from '../../src/assistant/telecom-read-boundary.ts'
import { TELECOM_CAPABILITY_CATALOG } from '../../src/assistant/telecom-catalog.ts'
import type { JsonObject } from '../../src/assistant/telecom-dto-parser.ts'

const scope = { actorId: 'actor_000000000000001', workspaceId: 'workspace_0000000001', sessionId: 'session_00000000001', scopeEpoch: 'epoch_0000000000001' }
const now = '2026-09-27T10:00:00Z'
const version = { contract_version: 'telecom.v1', scope_epoch: scope.scopeEpoch }
const cid = 'customer_00000000001'
const page = { limit: 20, continuation: null }
const customer = (id = cid): JsonObject => ({ ...version, id, account_kind: 'legal_entity', legal_name: 'ACME & Hijos', trade_name: null,
  tax_identifier: { field_class: 'tax_identifier', visibility: 'hidden' }, lifecycle: 'customer', status: 'active', assigned_user: null, primary_contact: null, capabilities: [] })
const collection = (items: JsonObject[] = []): JsonObject => ({ ...version, source_state: 'available', permission: 'authorized', items, completeness: { kind: 'complete' }, continuation: null, freshness: { kind: 'fresh', as_of: now }, error: null })
const readone = (data: JsonObject): JsonObject => ({ ...version, result: 'found', data, freshness: { kind: 'fresh', as_of: now }, error: null })
function dashboard(): JsonObject {
  return { ...version, generated_at: now, scope: { audience: 'personal', timezone: 'Europe/Madrid', scope_epoch: scope.scopeEpoch },
    window: { starts_at: now, ends_at: '2026-09-28T10:00:00Z' }, today: collection(), tasks: collection(), meetings: collection(), renewals: collection(), permanence_alerts: collection(), opportunities: collection() }
}
function summary(): JsonObject {
  return { ...version, customer: customer(), contracts: collection(), services: collection(), lines: collection(), attention: {
    ...version, customer_id: cid, generated_at: now, next_task: collection(), next_meeting: collection(), nearest_renewal: collection(), nearest_permanence: collection(), alerts: collection(), recent_activity: collection(),
  } }
}
function harness(dto: unknown, overrides: Partial<TelecomReadBoundaryDependencies> = {}) {
  let calls = 0
  const deps: TelecomReadBoundaryDependencies = {
    rawRead: async () => { calls++; return dto }, authorizeOperation: async () => true,
    authorizeReference: async () => true, currentScope: () => ({ ...scope }), now: () => Date.parse(now), ...overrides,
  }
  return { ...createTelecomReadBoundary(deps), calls: () => calls }
}

test('bridge maps exactly 14 W1 operation envelopes and validates all before metadata', async () => {
  assert.deepEqual(Object.keys(TELECOM_READ_DTO_KINDS).sort(), TELECOM_CAPABILITY_CATALOG.map(c => c.name).sort())
  for (const [operation, dtoKind] of Object.entries(TELECOM_READ_DTO_KINDS)) {
    const dto = dtoKind.startsWith('collection:') ? collection() : { ...version, result: 'not_found', data: null, freshness: null, error: null }
    const input: Record<string, string | number | null> = operation === 'crm.customer.search' ? { ...page, query: 'ACME' }
      : ['crm.customer.get', 'crm.customer.summary'].includes(operation) ? { customer_id: cid }
      : operation === 'crm.contract.get' ? { contract_id: 'contract_00000000001' }
      : operation === 'crm.dashboard.get' ? { audience: 'personal' } : page
    const bridge = harness(dto)
    const result = await bridge.reader(scope, operation, input)
    assert.equal(result.status, 'ok', operation)
    if (result.status === 'ok') assert.deepEqual(result.entities, [])
    assert.equal(bridge.calls(), 1)
  }
})

test('invalid inputs and forbidden operation/resources prevent any raw data read', async () => {
  let authorizations = 0
  const malformed = harness(collection(), { authorizeOperation: async () => { authorizations++; return true } })
  assert.deepEqual(await malformed.reader(scope, 'crm.customer.search', { ...page, query: 'ACME', workspace_id: 'forged' }), { status: 'failure' })
  assert.equal(authorizations, 0); assert.equal(malformed.calls(), 0)
  const denied = harness(collection(), { authorizeOperation: async (_scope, operation, input) => operation !== 'crm.dashboard.get' || input.audience === 'personal' })
  assert.deepEqual(await denied.reader(scope, 'crm.dashboard.get', { audience: 'workspace' }), { status: 'forbidden' })
  assert.equal(denied.calls(), 0)
  const foreign = harness(readone(customer()), { authorizeReference: async () => false })
  assert.deepEqual(await foreign.reader(scope, 'crm.customer.get', { customer_id: cid }), { status: 'forbidden' })
  assert.equal(foreign.calls(), 0)
})

test('search selection contains only authorized ID/business label and omits protected fields', async () => {
  const dto = customer()
  dto.primary_contact = { kind: 'contact', id: 'contact_000000000001', display_name: 'PRIVATE CONTACT NAME' }
  dto.tax_identifier = { field_class: 'tax_identifier', visibility: 'masked', masked_text: 'B****5678', reveal_capability: {
    ref: 'capability_0000000001', action: 'reveal', target: { kind: 'customer', id: cid, field_class: 'tax_identifier' }, expires_at: '2026-09-27T10:05:00Z',
  } }
  const result = await harness(collection([dto])).reader(scope, 'crm.customer.search', { ...page, query: 'ACME' })
  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return
  assert.deepEqual(result.entities, [{ kind: 'customer', id: cid, label: 'ACME & Hijos' }])
  for (const privateValue of ['PRIVATE CONTACT', 'B****5678', 'capability_', 'tax_identifier']) assert.equal(JSON.stringify(result).includes(privateValue), false)
})

test('nested foreign epochs, private provider errors and forged raw metadata fail closed', async () => {
  const foreign = summary(); (foreign.lines as JsonObject).scope_epoch = 'foreign_epoch'
  const privateError = { ...version, result: 'error', data: null, freshness: null, error: { code: 'internal_safe', retryable: false, provider_payload: 'PRIVATE' } }
  for (const dto of [readone(foreign), privateError, { status: 'ok', entities: [], scopeEpoch: scope.scopeEpoch }, { ...readone(summary()), unexpected: true }]) {
    assert.deepEqual(await harness(dto).reader(scope, 'crm.customer.summary', { customer_id: cid }), { status: 'failure' })
  }
  const thrown = harness(null, { rawRead: async () => { throw new Error('PRIVATE PROVIDER ERROR') } })
  assert.deepEqual(await thrown.reader(scope, 'crm.customer.search', { ...page, query: 'ACME' }), { status: 'failure' })
})

test('nested stale, partial and forbidden sections propagate conservatively through summary and dashboard', async () => {
  for (const kind of ['summary', 'dashboard']) for (const condition of ['stale', 'partial', 'forbidden']) {
    const data = kind === 'summary' ? summary() : dashboard()
    const key = kind === 'summary' ? 'lines' : 'tasks'
    if (condition === 'stale') (data[key] as JsonObject).freshness = { kind: 'stale', as_of: now, notice: null }
    if (condition === 'partial') (data[key] as JsonObject).completeness = { kind: 'partial', has_more: true }
    if (condition === 'forbidden') data[key] = { ...version, source_state: 'not_authorized', permission: 'not_authorized', items: null, completeness: null, continuation: null, freshness: null, error: null }
    const result = await harness(readone(data)).reader(scope, kind === 'summary' ? 'crm.customer.summary' : 'crm.dashboard.get', kind === 'summary' ? { customer_id: cid } : { audience: 'personal' })
    assert.equal(result.status, 'ok')
    if (result.status !== 'ok') continue
    assert.equal(result.freshness, condition === 'stale' ? 'stale' : 'fresh')
    assert.equal(result.completeness, condition === 'stale' ? 'complete' : 'partial')
  }
})

test('100 valid collection rows project50 with partialness while DTO snapshot remains complete server-side', async () => {
  const dto = collection(Array.from({ length: 100 }, (_, i) => customer(`customer_entity_${String(i).padStart(5, '0')}`)))
  const bridge = harness(dto)
  const server = await bridge.readDto(scope, 'crm.customer.search', { ...page, query: 'ACME' })
  assert.equal(server.status, 'ok')
  if (server.status === 'ok') { assert.equal(Object.isFrozen(server.value), true); assert.equal((server.value.items as unknown[]).length, 100) }
  const model = await bridge.reader(scope, 'crm.customer.search', { ...page, query: 'ACME' })
  assert.equal(model.status, 'ok')
  if (model.status === 'ok') { assert.equal(model.entities.length, 50); assert.equal(model.completeness, 'partial') }
})

test('server continuation authorization is mandatory and binds filters before raw read', async () => {
  const input = { ...page, query: 'ACME', continuation: 'cursor_synthetic_000001' }
  const denied = harness(collection())
  assert.deepEqual(await denied.reader(scope, 'crm.customer.search', input), { status: 'forbidden' }); assert.equal(denied.calls(), 0)
  let checked = false
  const accepted = harness(collection(), { authorizeContinuation: async (actualScope, operation, filters, cursor) => {
    assert.deepEqual(actualScope, scope); assert.equal(operation, 'crm.customer.search'); assert.deepEqual(filters, { ...page, query: 'ACME' }); assert.equal(cursor, input.continuation)
    checked = true; return true
  } })
  assert.equal((await accepted.reader(scope, 'crm.customer.search', input)).status, 'ok')
  assert.equal(checked, true)
})

test('scope changes during each await discard evidence and suppress subsequent reads', async () => {
  for (const at of ['operation', 'input_reference', 'raw_read', 'dto_reference', 'continuation']) {
    let live = { ...scope }; let rawCalls = 0
    const bridge = createTelecomReadBoundary({
      currentScope: () => live, now: () => Date.parse(now),
      authorizeOperation: async () => { if (at === 'operation') live = { ...scope, scopeEpoch: 'revoked' }; return true },
      authorizeContinuation: async () => { if (at === 'continuation') live = { ...scope, sessionId: 'revoked' }; return true },
      authorizeReference: async () => { if (at === 'input_reference' || at === 'dto_reference') live = { ...scope, actorId: 'revoked' }; return true },
      rawRead: async () => { rawCalls++; if (at === 'raw_read') live = { ...scope, workspaceId: 'revoked' }; return at === 'input_reference' ? readone(customer()) : collection([customer()]) },
    })
    const result = await bridge.reader(scope, at === 'input_reference' ? 'crm.customer.get' : 'crm.customer.search', at === 'input_reference' ? { customer_id: cid } : { ...page, query: 'ACME', ...(at === 'continuation' ? { continuation: 'cursor_synthetic_000001' } : {}) })
    assert.deepEqual(result, { status: 'forbidden' }, at)
    assert.equal(rawCalls, ['raw_read', 'dto_reference'].includes(at) ? 1 : 0, at)
  }
})

test('readone response identity and dashboard audience must match requested authorized scope', async () => {
  assert.deepEqual(await harness(readone(customer('customer_foreign_001'))).reader(scope, 'crm.customer.get', { customer_id: cid }), { status: 'failure' })
  const wrong = dashboard(); (wrong.scope as JsonObject).audience = 'workspace'
  assert.deepEqual(await harness(readone(wrong)).reader(scope, 'crm.dashboard.get', { audience: 'personal' }), { status: 'failure' })
})

test('a field capability expiring during reference authorization cannot cross the bridge', async () => {
  let clock = Date.parse(now)
  const dto = customer()
  dto.capabilities = [{ ref: 'capability_0000000001', action: 'navigate', target: { kind: 'customer', id: cid }, expires_at: '2026-09-27T10:00:01Z' }]
  const bridge = harness(collection([dto]), {
    now: () => clock,
    authorizeReference: async () => { clock += 2000; return true },
  })
  assert.deepEqual(await bridge.reader(scope, 'crm.customer.search', { ...page, query: 'ACME' }), { status: 'forbidden' })
})
