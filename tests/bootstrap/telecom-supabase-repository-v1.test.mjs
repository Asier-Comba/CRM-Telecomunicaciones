import assert from 'node:assert/strict'
import test from 'node:test'

import { AesGcmTelecomCursorCodecV1 } from '../../src/lib/server/telecom-cursor-v1.ts'
import { AuthorizedTelecomReadServiceV1 } from '../../src/lib/server/telecom-read-service-v1.ts'
import { SupabaseTelecomReadRepositoryV1 } from '../../src/lib/server/telecom-supabase-repository-v1.ts'

const NOW = '2026-09-27T12:00:00.000Z'
const ACTOR_A = '10000000-0000-4000-8000-000000000001'
const ACTOR_B = '10000000-0000-4000-8000-000000000002'
const WORKSPACE_A = '20000000-0000-4000-8000-000000000001'
const CUSTOMER_A = '40000000-0000-4000-8000-000000000001'
const CONTACT_A = '41000000-0000-4000-8000-000000000001'
const context = {
  actor_id: ACTOR_A,
  workspace_id: WORKSPACE_A,
  principal_kind: 'user',
  scope_epoch: 'scope-epoch-0001',
}

function binding(overrides = {}) {
  return {
    actorId: ACTOR_A,
    workspaceId: WORKSPACE_A,
    scopeEpoch: context.scope_epoch,
    operation: 'customer.search',
    filter: '["synthetic",null,null,1]',
    ...overrides,
  }
}

function codec(clock = { value: Date.parse(NOW) }) {
  return new AesGcmTelecomCursorCodecV1(new Uint8Array(32).fill(7), {
    now: () => clock.value,
    ttlMs: 60_000,
  })
}

function customerRow(overrides = {}) {
  return {
    id: CUSTOMER_A,
    account_kind: 'legal_entity',
    legal_name: 'Synthetic Telecom Company',
    trade_name: null,
    lifecycle: 'customer',
    status: 'active',
    assigned_user_id: ACTOR_A,
    assigned_user_name: 'Synthetic Agent',
    primary_contact_id: CONTACT_A,
    primary_contact_name: 'Synthetic Contact',
    ...overrides,
  }
}

function available(items = [], scopeEpoch = context.scope_epoch) {
  return {
    contract_version: 'telecom.v1', scope_epoch: scopeEpoch,
    source_state: 'available', permission: 'authorized', items,
    completeness: { kind: 'complete' }, continuation: null,
    freshness: { kind: 'fresh', as_of: NOW }, error: null,
  }
}

function summaryData(scopeEpoch = context.scope_epoch) {
  const customer = {
    contract_version: 'telecom.v1', scope_epoch: scopeEpoch,
    id: CUSTOMER_A, account_kind: 'legal_entity', legal_name: 'Synthetic Telecom Company',
    trade_name: null, tax_identifier: { field_class: 'tax_identifier', visibility: 'hidden' },
    lifecycle: 'customer', status: 'active', assigned_user: null, primary_contact: null, capabilities: [],
  }
  return {
    contract_version: 'telecom.v1', scope_epoch: scopeEpoch, customer,
    contracts: available([], scopeEpoch), services: available([], scopeEpoch), lines: available([], scopeEpoch),
    attention: {
      contract_version: 'telecom.v1', scope_epoch: scopeEpoch, customer_id: CUSTOMER_A, generated_at: NOW,
      next_task: available([], scopeEpoch), next_meeting: available([], scopeEpoch),
      nearest_renewal: available([], scopeEpoch), nearest_permanence: available([], scopeEpoch),
      alerts: {
        contract_version: 'telecom.v1', scope_epoch: scopeEpoch, source_state: 'unsupported',
        reason: 'contract_not_published', permission: 'unknown', items: null,
        completeness: null, continuation: null, freshness: null, error: null,
      },
      recent_activity: available([], scopeEpoch),
    },
  }
}

function authorizer(referenceCalls = []) {
  return {
    authorize: async () => true,
    authorizeReference: async (_context, reference) => {
      referenceCalls.push(reference)
      return true
    },
    authorizeCapability: async () => true,
    isCurrent: () => true,
    now: () => NOW,
  }
}

test('encrypted continuation is opaque, context-bound, tamper-proof and expiring', async () => {
  const clock = { value: Date.parse(NOW) }
  const cursor = codec(clock)
  const value = { createdAt: '2026-09-27T10:00:00Z', id: CUSTOMER_A }
  const token = await cursor.issue(binding(), value)

  assert.ok(token.length >= 16 && token.length <= 256)
  assert.doesNotMatch(token, new RegExp(WORKSPACE_A))
  assert.doesNotMatch(token, /synthetic/i)
  assert.deepEqual(await cursor.consume(binding(), token), value)
  assert.equal(await cursor.consume(binding({ actorId: ACTOR_B }), token), null)
  assert.equal(await cursor.consume(binding({ scopeEpoch: 'scope-epoch-0002' }), token), null)
  assert.equal(await cursor.consume(binding({ filter: '["changed"]' }), token), null)

  const last = token.at(-1)
  const tampered = `${token.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`
  assert.equal(await cursor.consume(binding(), tampered), null)
  clock.value += 60_001
  assert.equal(await cursor.consume(binding(), token), null)
})

test('customer search uses resolved tenant scope, stable cursor fields and safe projection', async () => {
  const calls = []
  const rpc = {
    async rpc(name, parameters) {
      calls.push({ name, parameters })
      return {
        data: {
          rows: [customerRow()],
          has_more: true,
          next_created_at: '2026-09-27T10:00:00Z',
          next_id: CUSTOMER_A,
        },
        error: null,
      }
    },
  }
  const references = []
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer(references))
  const first = await service.customerSearch(context, { query: 'synthetic', limit: 1, continuation: null })

  assert.equal(first.source_state, 'available')
  assert.equal(first.completeness.kind, 'partial')
  assert.equal(first.items.length, 1)
  assert.equal(first.items[0].tax_identifier.field_class, 'tax_identifier')
  assert.equal(first.items[0].tax_identifier.visibility, 'hidden')
  assert.equal(first.items[0].primary_contact.display_name, 'Synthetic Contact')
  assert.ok(typeof first.continuation === 'string')
  assert.deepEqual(calls[0], {
    name: 'telecom_v1_customer_search_rows',
    parameters: {
      p_actor_id: ACTOR_A,
      p_workspace_id: WORKSPACE_A,
      p_query: 'synthetic',
      p_status: null,
      p_assigned_user_id: null,
      p_limit: 1,
      p_after_created_at: null,
      p_after_id: null,
    },
  })
  assert.deepEqual(references.map(({ kind, id }) => [kind, id]).sort(), [
    ['contact', CONTACT_A],
    ['customer', CUSTOMER_A],
    ['user', ACTOR_A],
  ])

  await service.customerSearch(context, { query: 'synthetic', limit: 1, continuation: first.continuation })
  assert.equal(calls[1].parameters.p_after_created_at, '2026-09-27T10:00:00Z')
  assert.equal(calls[1].parameters.p_after_id, CUSTOMER_A)
})

test('continuations cannot cross actor, scope, filter or page size', async () => {
  const rpc = {
    async rpc() {
      return {
        data: { rows: [], has_more: false, next_created_at: null, next_id: null },
        error: null,
      }
    },
  }
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer())
  const token = await codec().issue(binding(), { createdAt: '2026-09-27T10:00:00Z', id: CUSTOMER_A })
  for (const [ctx, input] of [
    [{ ...context, actor_id: ACTOR_B }, { query: 'synthetic', limit: 1, continuation: token }],
    [{ ...context, scope_epoch: 'scope-epoch-0002' }, { query: 'synthetic', limit: 1, continuation: token }],
    [context, { query: 'changed', limit: 1, continuation: token }],
    [context, { query: 'synthetic', limit: 2, continuation: token }],
  ]) {
    const result = await service.customerSearch(ctx, input)
    assert.equal(result.source_state, 'error')
    assert.equal(result.error.code, 'internal_safe')
  }
})

test('customer get returns found/not-found and reauthorizes returned references', async () => {
  let found = true
  const calls = []
  const rpc = {
    async rpc(name, parameters) {
      calls.push({ name, parameters })
      return { data: found ? customerRow() : null, error: null }
    },
  }
  const references = []
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer(references))

  const first = await service.customerGet(context, { customer_id: CUSTOMER_A })
  assert.equal(first.result, 'found')
  assert.equal(first.data.id, CUSTOMER_A)
  assert.equal(calls[0].parameters.p_workspace_id, WORKSPACE_A)
  assert.ok(references.some(({ kind, id }) => kind === 'customer' && id === CUSTOMER_A))

  found = false
  const missing = await service.customerGet(context, { customer_id: CUSTOMER_A })
  assert.equal(missing.result, 'not_found')
})

test('customer summary consumes the database read model and preserves section semantics', async () => {
  let data = summaryData()
  const calls = []
  const rpc = {
    async rpc(name, parameters) {
      calls.push({ name, parameters })
      return { data, error: null }
    },
  }
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer())
  const result = await service.customerSummary(context, { customer_id: CUSTOMER_A })
  assert.equal(result.result, 'found')
  assert.equal(result.data.customer.id, CUSTOMER_A)
  assert.equal(result.data.attention.alerts.source_state, 'unsupported')
  assert.deepEqual(calls[0], {
    name: 'telecom_v1_customer_summary',
    parameters: {
      p_actor_id: ACTOR_A,
      p_workspace_id: WORKSPACE_A,
      p_customer_id: CUSTOMER_A,
      p_scope_epoch: context.scope_epoch,
    },
  })

  data = null
  assert.equal((await service.customerSummary(context, { customer_id: CUSTOMER_A })).result, 'not_found')
})

test('customer summary rejects a foreign nested scope as a safe response error', async () => {
  const foreign = summaryData()
  foreign.contracts.scope_epoch = 'scope-epoch-0002'
  const rpc = { async rpc() { return { data: foreign, error: null } } }
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer())
  const result = await service.customerSummary(context, { customer_id: CUSTOMER_A })
  assert.equal(result.result, 'error')
  assert.equal(result.error.code, 'internal_safe')
  assert.equal(result.data, null)
})

test('malformed rows and provider errors collapse to safe service errors', async () => {
  for (const response of [
    { data: { rows: [{ ...customerRow(), private_field: 'SYNTHETIC_PRIVATE_VALUE' }], has_more: false, next_created_at: null, next_id: null }, error: null },
    { data: { rows: [], has_more: true, next_created_at: '2026-09-27T10:00:00Z', next_id: CUSTOMER_A }, error: null },
    { data: null, error: { message: 'SYNTHETIC_PROVIDER_SECRET' } },
  ]) {
    const rpc = { async rpc() { return response } }
    const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
    const service = new AuthorizedTelecomReadServiceV1(repository, authorizer())
    const result = await service.customerSearch(context, { query: 'synthetic', limit: 1, continuation: null })
    assert.equal(result.source_state, 'error')
    assert.equal(result.error.code, 'internal_safe')
    assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_/)
  }
})

test('contract readers use scoped RPCs and reject malformed or foreign projections', async () => {
  const contract = {
    contract_version: 'telecom.v1', scope_epoch: context.scope_epoch,
    id: '60000000-0000-4000-8000-000000000001',
    customer: { kind: 'customer', id: CUSTOMER_A, display_name: 'Synthetic Telecom Company' },
    operator: { kind: 'operator', id: '50000000-0000-4000-8000-000000000001', display_name: 'Synthetic Operator' },
    plan: null, external_reference: { field_class: 'contract_reference', visibility: 'not_available' },
    status: 'active', start_date: '2026-01-01', signed_date: null, end_date: null,
    cancelled_at: null, assigned_user: null, capabilities: [],
  }
  const calls = []
  const rpc = { async rpc(name, args) {
    calls.push({ name, args })
    return { error: null, data: name === 'telecom_v1_contract_list'
      ? { rows: [contract], has_more: false, next_created_at: null, next_id: null } : contract }
  } }
  const service = new AuthorizedTelecomReadServiceV1(
    new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW), authorizer())
  const list = await service.contractList(context, { limit: 1, continuation: null })
  const one = await service.contractGet(context, { contract_id: contract.id })
  assert.equal(list.source_state, 'available')
  assert.equal(list.items[0].id, contract.id)
  assert.equal(one.result, 'found')
  assert.deepEqual(calls.map(({ name }) => name), ['telecom_v1_contract_list', 'telecom_v1_contract_get'])
  assert.ok(calls.every(({ args }) => args.p_workspace_id === WORKSPACE_A && args.p_actor_id === ACTOR_A))
  const bad = new AuthorizedTelecomReadServiceV1(
    new SupabaseTelecomReadRepositoryV1({ async rpc() {
      return { error: null, data: { ...contract, private_payload: 'SYNTHETIC_PRIVATE_VALUE' } }
    } }, codec(), () => NOW), authorizer())
  const rejected = await bad.contractGet(context, { contract_id: contract.id })
  assert.equal(rejected.result, 'error')
  assert.doesNotMatch(JSON.stringify(rejected), /SYNTHETIC_PRIVATE_VALUE/)
})

test('service and line reads are scoped, paged and parsed', async () => {
  const serviceRow = {
    contract_version: 'telecom.v1', scope_epoch: context.scope_epoch,
    id: '61000000-0000-4000-8000-000000000001',
    customer: { kind: 'customer', id: CUSTOMER_A, display_name: 'Synthetic Company' },
    contract: { kind: 'contract', id: '60000000-0000-4000-8000-000000000001', display_name: 'Contrato' },
    operator: { kind: 'operator', id: '50000000-0000-4000-8000-000000000001', display_name: 'Synthetic Operator' },
    plan: null, service_kind: 'mobile', display_name: 'Synthetic Mobile', status: 'active',
    activated_on: '2026-01-01', ended_on: null, capabilities: [],
  }
  const lineRow = {
    contract_version: 'telecom.v1', scope_epoch: context.scope_epoch,
    id: '62000000-0000-4000-8000-000000000001',
    service: { kind: 'service', id: serviceRow.id, display_name: serviceRow.display_name },
    identifier: { field_class: 'line_identifier', visibility: 'not_available' },
    status: 'active', activated_on: '2026-01-01', ended_on: null, capabilities: [],
  }
  const calls = []
  const rpc = { async rpc(name, args) {
    calls.push({ name, args })
    return { error: null, data: {
      rows: [name === 'telecom_v1_service_list' ? serviceRow : lineRow],
      has_more: false, next_created_at: null, next_id: null,
    } }
  } }
  const service = new AuthorizedTelecomReadServiceV1(
    new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW), authorizer())
  const services = await service.serviceList(context, { limit: 1, continuation: null })
  const lines = await service.lineList(context, { limit: 1, continuation: null })
  assert.equal(services.source_state, 'available')
  assert.equal(lines.source_state, 'available')
  assert.equal(lines.items[0].identifier.visibility, 'not_available')
  assert.deepEqual(calls.map(({ name }) => name), ['telecom_v1_service_list', 'telecom_v1_line_list'])
  assert.ok(calls.every(({ args }) => args.p_actor_id === ACTOR_A && args.p_workspace_id === WORKSPACE_A))
})

test('remaining readers without a database projection report unavailable, never empty', async () => {
  const rpc = { async rpc() { throw new Error('must not execute') } }
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer())
  const renewals = await service.renewalList(context, { limit: 20, continuation: null })
  const dashboard = await service.dashboardGet(context, { audience: 'personal' })
  assert.equal(renewals.source_state, 'unavailable')
  assert.equal(renewals.items, null)
  assert.equal(dashboard.result, 'unavailable')
})

test('activity reader rejects a provider projection containing private fields', async () => {
  const rpc = { async rpc(name, args) {
    assert.equal(name, 'telecom_v1_activity_list')
    assert.equal(args.p_workspace_id, WORKSPACE_A)
    return { error: null, data: { rows: [{
      id: '74000000-0000-4000-8000-000000000001', kind: 'activity', customer: null,
      activity_kind: 'system', safe_summary: 'Importación registrada', occurred_at: NOW,
      actor: null, targets: [], capabilities: [], private_detail: 'SYNTHETIC_PRIVATE_VALUE',
    }], has_more: false, next_created_at: null, next_id: null } }
  } }
  const service = new AuthorizedTelecomReadServiceV1(
    new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW), authorizer())
  const result = await service.activityList(context, { limit: 1, continuation: null })
  assert.equal(result.source_state, 'error')
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_PRIVATE_VALUE/)
})
