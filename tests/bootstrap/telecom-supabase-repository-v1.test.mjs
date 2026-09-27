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

test('published readers without a database projection report unavailable, never empty', async () => {
  const rpc = { async rpc() { throw new Error('must not execute') } }
  const repository = new SupabaseTelecomReadRepositoryV1(rpc, codec(), () => NOW)
  const service = new AuthorizedTelecomReadServiceV1(repository, authorizer())
  const contracts = await service.contractList(context, { limit: 20, continuation: null })
  const dashboard = await service.dashboardGet(context, { audience: 'personal' })
  assert.equal(contracts.source_state, 'unavailable')
  assert.equal(contracts.items, null)
  assert.equal(dashboard.result, 'unavailable')
})
