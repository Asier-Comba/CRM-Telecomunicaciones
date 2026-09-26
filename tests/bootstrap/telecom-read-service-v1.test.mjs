import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { AuthorizedTelecomReadServiceV1 } from '../../src/lib/server/telecom-read-service-v1.ts'

const source = await readFile('src/lib/server/telecom-read-service-v1.ts', 'utf8')
const context = {
  actor_id: '11111111-1111-1111-1111-111111111111',
  workspace_id: '22222222-2222-2222-2222-222222222222',
  principal_kind: 'user',
  scope_epoch: 'scope-epoch-0001',
}
const input = { limit: 20, continuation: null }

function collection(scopeEpoch = context.scope_epoch) {
  return {
    contract_version: 'telecom.v1',
    scope_epoch: scopeEpoch,
    source_state: 'available',
    permission: 'authorized',
    items: [],
    completeness: { kind: 'complete' },
    continuation: null,
    freshness: { kind: 'fresh', as_of: '2026-09-26T00:00:00Z' },
    error: null,
  }
}

function readOne(scopeEpoch = context.scope_epoch) {
  return {
    contract_version: 'telecom.v1',
    scope_epoch: scopeEpoch,
    result: 'not_found',
    data: null,
    freshness: null,
    error: null,
  }
}

function harness({ allowed = true, listResult = collection(), oneResult = readOne(), throws = false } = {}) {
  const calls = []
  const repository = new Proxy({}, {
    get: (_target, property) => async (ctx, value) => {
      calls.push({ layer: 'repository', operation: String(property), ctx, value })
      if (throws) throw new Error('sensitive provider error')
      return String(property).endsWith('Get') || String(property) === 'customerSummary' ? oneResult : listResult
    },
  })
  const authorizer = {
    async authorize(ctx, operation) {
      calls.push({ layer: 'authorizer', operation, ctx })
      return allowed
    },
  }
  return { service: new AuthorizedTelecomReadServiceV1(repository, authorizer), calls }
}

test('authorization is evaluated before a repository read with the exact operation', async () => {
  const { service, calls } = harness()
  const result = await service.taskList(context, input)
  assert.equal(result.source_state, 'available')
  assert.deepEqual(calls.map(({ layer, operation }) => ({ layer, operation })), [
    { layer: 'authorizer', operation: 'task.list' },
    { layer: 'repository', operation: 'taskList' },
  ])
  assert.equal(calls[1].ctx.workspace_id, context.workspace_id)
})

test('denial is fail-closed and never reaches persistence', async () => {
  const { service, calls } = harness({ allowed: false })
  const result = await service.contractList(context, input)
  assert.equal(result.source_state, 'not_authorized')
  assert.equal(result.permission, 'not_authorized')
  assert.equal(result.items, null)
  assert.equal(calls.filter(({ layer }) => layer === 'repository').length, 0)
})

test('invalid pagination is rejected before authorization and persistence', async () => {
  const { service, calls } = harness()
  const result = await service.serviceList(context, { limit: 101, continuation: null })
  assert.equal(result.source_state, 'error')
  assert.equal(result.error.code, 'validation')
  assert.equal(calls.length, 0)
})

test('caller-selected workspace and unknown keys are rejected at the boundary', async () => {
  const { service, calls } = harness()
  const result = await service.customerGet(context, {
    customer_id: '33333333-3333-3333-3333-333333333333',
    workspace_id: 'attacker-selected-workspace',
  })
  assert.equal(result.result, 'error')
  assert.equal(result.error.code, 'validation')
  assert.equal(calls.length, 0)
})

test('closed enums and bounded dates are validated before authorization', async () => {
  const { service, calls } = harness()
  const result = await service.opportunityList(context, {
    limit: 20,
    continuation: null,
    status: 'invented',
    from: '2026-10-02',
    to: '2026-10-01',
  })
  assert.equal(result.source_state, 'error')
  assert.equal(result.error.code, 'validation')
  assert.equal(calls.length, 0)
})

test('repository scope/version mismatch fails closed', async () => {
  const { service } = harness({ listResult: collection('another-scope') })
  const result = await service.activityList(context, input)
  assert.equal(result.source_state, 'error')
  assert.equal(result.error.code, 'access_revoked')
})

test('repository errors are reduced to safe codes', async () => {
  const { service } = harness({ throws: true })
  const result = await service.customerGet(context, { customer_id: '33333333-3333-3333-3333-333333333333' })
  assert.equal(result.result, 'error')
  assert.deepEqual(result.error, { code: 'internal_safe', retryable: false })
  assert.doesNotMatch(JSON.stringify(result), /sensitive provider error/)
})

test('the service is a repository boundary, not a raw table client', () => {
  assert.match(source, /type TelecomReadRepositoryV1 = TelecomReadServiceV1/)
  assert.match(source, /createTelecomReadContextV1/)
  assert.doesNotMatch(source, /\.from\(|createClient|service_role|x-workspace-id/)
})
