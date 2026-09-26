import assert from 'node:assert/strict'
import test from 'node:test'
import { TELECOM_CAPABILITY_CATALOG, telecomCapability } from '../src/assistant/telecom-catalog.js'
import { isCalendarDate, validateTelecomInput } from '../src/assistant/telecom-input-validation.js'

const expected = ['customer.search', 'customer.get', 'customer.summary', 'contract.list', 'contract.get', 'service.list', 'line.list', 'renewal.list', 'permanence.list', 'task.list', 'meeting.list', 'activity.list', 'opportunity.list', 'dashboard.get']
function validInput(name: string): Record<string, unknown> {
  const descriptor = telecomCapability(name)!
  return Object.fromEntries(descriptor.inputSchema.required.map((key) => {
    const field = descriptor.inputSchema.properties[key]!
    return [key, key === 'limit' ? 20 : key === 'continuation' ? null : key === 'query' ? 'ACME' : field.type === 'string' && field.enum ? field.enum[0] : 'entity_000000000000001']
  }))
}

test('catalog exactly maps 14 W1 telecom.v1 read operations, without live adapters or invented permissions', () => {
  assert.deepEqual(TELECOM_CAPABILITY_CATALOG.map((c) => c.operation), expected)
  for (const capability of TELECOM_CAPABILITY_CATALOG) {
    assert.equal(capability.name, `crm.${capability.operation}`)
    assert.equal(capability.sourceContract, 'telecom.v1')
    assert.equal(capability.implementationState, 'published_contract_no_live_adapter')
    assert.equal(capability.authorization.operation, capability.operation)
    assert.equal(capability.authorization.authorizer, 'TelecomReadAuthorizerV1')
    assert.equal(capability.tenantScope.source, 'server_context')
    assert.equal(capability.tenantScope.modelMayChooseWorkspace, false)
    assert.equal(capability.inputSchema.additionalProperties, false)
    assert.equal(capability.accessClass, 'READ')
    assert.equal(capability.confirmationPolicy, 'none')
    assert.equal(capability.idempotency, 'not_applicable')
    assert.deepEqual(validateTelecomInput(capability.name, validInput(capability.name)), { ok: true })
  }
  assert.equal(telecomCapability('crm.task.create'), null)
  assert.equal(telecomCapability('crm.contract.search'), null)
  assert.equal(telecomCapability('crm.operator.get'), null)
  assert.equal(telecomCapability('crm.plan.get'), null)
})

test('W1 exact collection, summary and service/line output references remain distinct', () => {
  assert.equal(telecomCapability('crm.customer.summary')?.outputSchema.ref, 'telecom.v1#ReadOneResponseV1<CustomerSummaryV1>')
  assert.equal(telecomCapability('crm.service.list')?.outputSchema.ref, 'telecom.v1#CollectionEnvelopeV1<TelecomServiceV1>')
  assert.equal(telecomCapability('crm.line.list')?.outputSchema.ref, 'telecom.v1#CollectionEnvelopeV1<TelecomLineV1>')
  assert.equal(telecomCapability('crm.renewal.list')?.outputSchema.ref, 'telecom.v1#CollectionEnvelopeV1<RenewalItemV1>')
})

test('input property sets and server method names match the published W1 v1 boundary exactly', () => {
  const snapshots: [string, string, string[]][] = [
    ['customer.search', 'customerSearch', ['query', 'assigned_user_id', 'status', 'limit', 'continuation']],
    ['customer.get', 'customerGet', ['customer_id']],
    ['customer.summary', 'customerSummary', ['customer_id']],
    ['contract.list', 'contractList', ['customer_id', 'operator_id', 'assignee_id', 'status', 'commitment_from', 'commitment_to', 'limit', 'continuation']],
    ['contract.get', 'contractGet', ['contract_id']],
    ['service.list', 'serviceList', ['customer_id', 'contract_id', 'operator_id', 'status', 'limit', 'continuation']],
    ['line.list', 'lineList', ['customer_id', 'service_id', 'status', 'limit', 'continuation']],
    ['renewal.list', 'renewalList', ['customer_id', 'from', 'to', 'limit', 'continuation']],
    ['permanence.list', 'permanenceList', ['customer_id', 'from', 'to', 'limit', 'continuation']],
    ['task.list', 'taskList', ['customer_id', 'from', 'to', 'assignee_id', 'status', 'limit', 'continuation']],
    ['meeting.list', 'meetingList', ['customer_id', 'from', 'to', 'assignee_id', 'status', 'limit', 'continuation']],
    ['activity.list', 'activityList', ['customer_id', 'from', 'to', 'limit', 'continuation']],
    ['opportunity.list', 'opportunityList', ['customer_id', 'from', 'to', 'owner_id', 'status', 'limit', 'continuation']],
    ['dashboard.get', 'dashboardGet', ['audience']],
  ]
  for (const [operation, method, keys] of snapshots) {
    const capability = telecomCapability(`crm.${operation}`)!
    assert.equal(capability.serviceMethod, method)
    assert.deepEqual(Object.keys(capability.inputSchema.properties).sort(), keys.sort())
  }
})

test('all descriptors reject missing required fields and unknown/nested tenant selectors', () => {
  let rejected = 0
  for (const capability of TELECOM_CAPABILITY_CATALOG) {
    const valid = validInput(capability.name)
    for (const key of capability.inputSchema.required) {
      const missing = { ...valid }; delete missing[key]
      assert.equal(validateTelecomInput(capability.name, missing).ok, false)
    }
    for (const selector of ['workspace', 'workspace_id', 'workspaceId', 'tenant', 'tenantId', 'tenant_id', 'actor_id', 'scope_epoch']) {
      const attacks: unknown[] = [{ [selector]: 'forged' }]
      for (let depth = 0; depth < 8; depth++) attacks.push({ nested: [attacks[attacks.length - 1]] })
      for (const attack of attacks) {
        assert.equal(validateTelecomInput(capability.name, { ...valid, injected: attack }).ok, false)
        assert.equal(validateTelecomInput(capability.name, { ...valid, [selector]: attack }).ok, false)
        for (const key of Object.keys(capability.inputSchema.properties)) {
          assert.equal(validateTelecomInput(capability.name, { ...valid, [key]: attack }).ok, false)
          rejected++
        }
      }
    }
  }
  assert.ok(rejected > 4000)
})

test('closed schemas reject malformed IDs, pagination and unpublished filters', () => {
  for (const capability of TELECOM_CAPABILITY_CATALOG) {
    const valid = validInput(capability.name)
    for (const [key, rule] of Object.entries(capability.inputSchema.properties)) {
      if (key.endsWith('_id')) for (const id of ['', 'forged', 'x'.repeat(161), null, 42]) assert.equal(validateTelecomInput(capability.name, { ...valid, [key]: id }).ok, false)
      if (rule.type === 'integer') for (const limit of [0, 101, 1.5, NaN, Infinity, '20']) assert.equal(validateTelecomInput(capability.name, { ...valid, [key]: limit }).ok, false)
    }
    assert.equal(validateTelecomInput(capability.name, { ...valid, cursor: 'opaque_0000000000000' }).ok, false)
  }
  assert.equal(validateTelecomInput('crm.customer.search', { limit: 1, continuation: null, query: '   ' }).ok, false)
  assert.equal(validateTelecomInput('crm.dashboard.get', { audience: 'all' }).ok, false)
  assert.equal(validateTelecomInput('crm.contract.list', { limit: 1, continuation: null, status: 'renewal_due' }).ok, false)
})

test('strict Gregorian calendar dates and ordered windows reject rollover and relative text', () => {
  for (const value of ['2024-02-29', '2000-02-29', '2026-12-31']) assert.equal(isCalendarDate(value), true)
  for (const value of ['1900-02-29', '2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-00-01', '2026-01-00', 'tomorrow', '2026-09-27T00:00:00Z']) assert.equal(isCalendarDate(value), false)
  for (const capability of TELECOM_CAPABILITY_CATALOG) {
    const from = capability.inputSchema.properties.from ? 'from' : capability.inputSchema.properties.commitment_from ? 'commitment_from' : null
    if (!from) continue
    const to = from === 'from' ? 'to' : 'commitment_to'
    const valid = validInput(capability.name)
    assert.equal(validateTelecomInput(capability.name, { ...valid, [from]: '2026-02-30' }).ok, false)
    assert.equal(validateTelecomInput(capability.name, { ...valid, [from]: '2026-09-28', [to]: '2026-09-27' }).ok, false)
    assert.equal(validateTelecomInput(capability.name, { ...valid, [from]: '2026-09-27', [to]: '2026-09-27' }).ok, true)
  }
})

test('non-JSON objects, getters and cyclic nested input fail closed without invoking getters', () => {
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
  assert.equal(validateTelecomInput('crm.dashboard.get', { audience: cyclic }).ok, false)
  const getter = Object.defineProperty({}, 'audience', { enumerable: true, get() { throw new Error('must not run') } })
  assert.equal(validateTelecomInput('crm.dashboard.get', getter).ok, false)
  assert.equal(validateTelecomInput('crm.dashboard.get', Object.create({ audience: 'personal' })).ok, false)
  assert.equal(validateTelecomInput('crm.hallucinated.get', {}).ok, false)
})
