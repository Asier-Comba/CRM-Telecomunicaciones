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

function collection(scopeEpoch = context.scope_epoch, items = []) {
  return {
    contract_version: 'telecom.v1',
    scope_epoch: scopeEpoch,
    source_state: 'available',
    permission: 'authorized',
    items,
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

function task(id = '33333333-3333-3333-3333-333333333333') {
  return {
    id,
    kind: 'task',
    customer: null,
    title: 'Synthetic follow-up',
    destination: null,
    capabilities: [],
    status: 'pending',
    priority: 'normal',
    due_at: '2026-09-28T09:00:00Z',
    assignee: null,
    version: 1,
  }
}

function harness({
  allowed = true,
  referencesAllowed = true,
  capabilitiesAllowed = true,
  current = true,
  listResult = collection(),
  oneResult = readOne(),
  throws = false,
} = {}) {
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
    async authorizeReference() { return referencesAllowed },
    async authorizeCapability() { return capabilitiesAllowed },
    isCurrent() { return current },
    now() { return '2026-09-27T12:00:00Z' },
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

test('strict calendar validation rejects rollover dates before persistence', async () => {
  for (const value of [
    '2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10',
    '2026-04-31', '2026-99-99', '2026-01-00', '2026-01-32',
  ]) {
    const { service, calls } = harness()
    const result = await service.taskList(context, { ...input, from: value, to: value })
    assert.equal(result.error.code, 'validation', value)
    assert.equal(calls.length, 0, value)
  }
})

test('strict calendar validation accepts a real leap day and stale past date', async () => {
  for (const value of ['2024-02-29', '2020-01-01']) {
    const { service, calls } = harness()
    const result = await service.taskList(context, { ...input, from: value, to: value })
    assert.equal(result.source_state, 'available', value)
    assert.equal(calls.filter(({ layer }) => layer === 'repository').length, 1, value)
  }
})

test('repository scope/version mismatch fails closed', async () => {
  const { service } = harness({ listResult: collection('another-scope') })
  const result = await service.activityList(context, input)
  assert.equal(result.source_state, 'error')
  assert.equal(result.error.code, 'access_revoked')
})

test('malformed runtime JSON is rejected deterministically without throwing', async () => {
  const cases = [
    null,
    [],
    {},
    { ...collection(), private_internal_field: 'SYNTHETIC_PRIVATE_VALUE' },
    { ...collection(), permission: 7 },
    { ...collection(), source_state: 'invented' },
    { ...collection(), items: [{ ...task(), status: 'invented' }] },
    { ...collection(), items: Array.from({ length: 101 }, (_, index) => task(`33333333-3333-3333-3333-${String(index).padStart(12, '0')}`)) },
  ]
  for (const value of cases) {
    const { service } = harness({ listResult: value })
    const result = await service.taskList(context, input)
    assert.equal(result.source_state, 'error')
    assert.equal(result.error.code, 'internal_safe')
  }
})

test('one malformed item rejects the whole section rather than silently dropping it', async () => {
  const value = collection(context.scope_epoch, [task(), { ...task('44444444-4444-4444-4444-444444444444'), scope_epoch: 'foreign-scope-0001' }])
  const { service } = harness({ listResult: value })
  const result = await service.taskList(context, input)
  assert.equal(result.source_state, 'error')
  assert.equal(result.items, null)
})

test('nested references and capabilities are reauthorized server-side', async () => {
  const customer = { kind: 'customer', id: '44444444-4444-4444-4444-444444444444', display_name: 'Synthetic customer' }
  const referenced = task()
  referenced.customer = customer
  const deniedReference = harness({ listResult: collection(context.scope_epoch, [referenced]), referencesAllowed: false })
  assert.equal((await deniedReference.service.taskList(context, input)).error.code, 'access_revoked')

  const withCapability = task()
  withCapability.capabilities = [{
    ref: 'capability-ref-0001',
    action: 'complete',
    target: { kind: 'task', id: withCapability.id },
    expires_at: '2026-09-28T12:00:00Z',
  }]
  const deniedCapability = harness({ listResult: collection(context.scope_epoch, [withCapability]), capabilitiesAllowed: false })
  assert.equal((await deniedCapability.service.taskList(context, input)).error.code, 'access_revoked')
})

test('unsafe repository error details and malformed timestamps never cross the boundary', async () => {
  const unsafe = {
    ...collection(),
    source_state: 'error',
    permission: 'unknown',
    items: null,
    completeness: null,
    continuation: null,
    freshness: null,
    error: { code: 'internal_safe', retryable: false, message: 'SYNTHETIC_PRIVATE_PROVIDER_DETAIL' },
  }
  const malformedTimestamp = collection(context.scope_epoch, [{ ...task(), due_at: '2026-09-28T09:00:00+25:00' }])
  for (const value of [unsafe, malformedTimestamp]) {
    const { service } = harness({ listResult: value })
    const result = await service.taskList(context, input)
    assert.equal(result.error.code, 'internal_safe')
    assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_PRIVATE_PROVIDER_DETAIL/)
  }
})

test('repository errors are reduced to safe codes', async () => {
  const { service } = harness({ throws: true })
  const result = await service.customerGet(context, { customer_id: '33333333-3333-3333-3333-333333333333' })
  assert.equal(result.result, 'error')
  assert.deepEqual(result.error, { code: 'internal_safe', retryable: false })
  assert.doesNotMatch(JSON.stringify(result), /sensitive provider error/)
})

test('the service is a repository boundary, not a raw table client', () => {
  assert.match(source, /Promise<unknown>/)
  assert.match(source, /parseTelecomCollectionV1/)
  assert.match(source, /parseTelecomReadOneV1/)
  assert.match(source, /createTelecomReadContextV1/)
  assert.doesNotMatch(source, /\.from\(|createClient|service_role|x-workspace-id/)
})
