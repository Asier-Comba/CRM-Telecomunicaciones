import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizedReconciliationService } from '../src/assistant/reconciliation.js'
import type { ValueSchema } from '../src/assistant/contracts.js'
import type { ReconciliationPersistence } from '../src/assistant/durable-db-contract.js'
import type {
  DurableIdempotencyRecord, ReconciliationActor,
  ReconciliationVerification, ReconciliationVerifier,
} from '../src/assistant/durable-contracts.js'

const now = new Date('2026-09-26T12:00:00Z')
const actor: ReconciliationActor = {
  actorId: 'operator-a', workspaceId: 'workspace-a', authentication: 'user_session',
  permissions: new Set(['assistant:operation:reconcile']), requestId: 'request-a',
}
const record: DurableIdempotencyRecord = {
  operationRef: 'operation_opaque_000000000001', idempotencyKey: 'idem-a',
  binding: { actorId: 'originator-a', workspaceId: 'workspace-a', capability: 'crm.task.create', argumentsDigest: 'digest-a' },
  state: 'reconciliation_required', attempt: 1, version: 4,
  leaseExpiresAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
}
const request = {
  operationRef: record.operationRef, expectedVersion: 4,
  requestedOutcome: 'completed', reason: 'provider_receipt',
}
const success: ReconciliationVerification = {
  outcome: 'effect_applied', result: { status: 'SUCCESS', capability: 'crm.task.create', data: { taskRef: 'task-a' } },
}
const outputSchema: ValueSchema = { type: 'object', properties: { taskRef: { type: 'string', minLength: 1, maxLength: 160 } }, required: ['taskRef'], additionalProperties: false }

function fixture(options: {
  initial?: DurableIdempotencyRecord
  readBack?: (record: DurableIdempotencyRecord) => DurableIdempotencyRecord
  verifier?: ReconciliationVerifier
  noSchema?: boolean
  schema?: ValueSchema
  authorizeResult?: () => Promise<boolean>
  noResultAuthorizer?: boolean
} = {}) {
  let calls = 0
  let transitions = 0
  let current = structuredClone(options.initial ?? record)
  const store = {
    async loadAuthorizedOperation() {
      calls++
      return calls > 1 && options.readBack ? options.readBack(structuredClone(current)) : structuredClone(current)
    },
    async commitVerifiedReconciliation(command) {
      transitions++
      current = { ...current, state: 'completed', version: 5 }
      return { status: 'applied', record: structuredClone(current), eventRef: command.eventRef, auditIntentPersisted: true }
    },
  } satisfies ReconciliationPersistence
  const service = new AuthorizedReconciliationService({
    persistence: store, verifier: options.verifier ?? { async verify() { return structuredClone(success) } },
    audit: { async emit() {} },
    outputSchemas: options.noSchema ? new Map() : new Map([[current.binding.capability, options.schema ?? outputSchema]]),
    ...(options.noResultAuthorizer ? {} : { authorizeResult: options.authorizeResult ?? (async () => true) }),
  })
  return { service, calls: () => calls, transitions: () => transitions }
}

test('invalid reconciliation identifiers never reflect untrusted values or perform lookup', async () => {
  const f = fixture()
  for (const input of [
    { ...request, operationRef: 'private browser material not an identifier' },
    { ...request, expectedVersion: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    const result = await f.service.reconcile(actor, input, now)
    assert.equal(result.status, 'INVALID_INPUT')
    assert.equal(result.operationRef, 'invalid_operation_reference')
  }
  assert.equal(f.calls(), 0)
})

test('reconciliation rejects a store returning a different opaque operation', async () => {
  const f = fixture({ initial: { ...record, operationRef: 'operation_opaque_000000000002' } })
  assert.equal((await f.service.reconcile(actor, request, now)).status, 'FORBIDDEN')
  assert.equal(f.transitions(), 0)
})

test('read-after-write verifies all immutable identity fields, not only state/version', async () => {
  const mutations: Array<(value: DurableIdempotencyRecord) => DurableIdempotencyRecord> = [
    (value) => ({ ...value, operationRef: 'operation_opaque_000000000002' }),
    (value) => ({ ...value, idempotencyKey: 'idem-other' }),
    ...(['workspaceId', 'actorId', 'capability', 'argumentsDigest'] as const).map((key) =>
      (value: DurableIdempotencyRecord) => ({ ...value, binding: { ...value.binding, [key]: 'other' } })),
    (value) => ({ ...value, version: 4 }),
  ]
  for (const readBack of mutations) {
    const f = fixture({ readBack })
    const result = await f.service.reconcile(actor, request, now)
    assert.equal(result.status, 'UNAVAILABLE')
    assert.equal(result.error?.code, 'reconciliation_read_after_write_failed')
  }
})

test('invalid verifier result cannot authorize completion or persist error/provider payloads', async () => {
  for (const result of [
    { status: 'SUCCESS', capability: 'crm.contract.delete' },
    { status: 'FORBIDDEN', capability: 'crm.task.create' },
    { status: 'SUCCESS', capability: 'crm.task.create', providerPayload: 'raw' },
    { status: 'SUCCESS', capability: 'crm.task.create', data: 'x'.repeat(70_000) },
    { status: 'SUCCESS', capability: 'crm.task.create', data: ['Bearer', 'opaque'.repeat(5)].join(' ') },
  ]) {
    const f = fixture({ verifier: { async verify() {
      return { outcome: 'effect_applied', result } as ReconciliationVerification
    } } })
    assert.equal((await f.service.reconcile(actor, request, now)).status, 'CONFLICT')
    assert.equal(f.transitions(), 0)
  }
})

test('verifier cannot mutate the previously authorized request and binding', async () => {
  const f = fixture({ verifier: { async verify(candidate, input) {
    candidate.binding.workspaceId = 'other-workspace'
    input.expectedVersion = 99
    input.operationRef = 'operation_opaque_000000000002'
    return success
  } } })
  const result = await f.service.reconcile(actor, { ...request }, now)
  assert.equal(result.status, 'SUCCESS')
  assert.equal(result.operationRef, record.operationRef)
})

test('W4 regression: capability-specific verifier data is validated before any transition', async () => {
  for (const data of [
    { arbitrary_private_field: 'SYNTHETIC_INTERNAL_DETAIL' }, {}, { taskRef: 42 },
    { taskRef: 'task-a', extra: 'private' }, null, ['task-a'], { taskRef: 'x'.repeat(161) },
  ]) {
    const f = fixture({ verifier: { async verify() { return { outcome: 'effect_applied', result: { status: 'SUCCESS', capability: 'crm.task.create', data } } } } })
    assert.equal((await f.service.reconcile(actor, request, now)).status, 'CONFLICT')
    assert.equal(f.transitions(), 0)
  }
  const missing = fixture({ noSchema: true })
  assert.equal((await missing.service.reconcile(actor, request, now)).status, 'CONFLICT')
  assert.equal(missing.transitions(), 0)
})

test('foreign resource references and missing result authorization have zero transitions', async () => {
  for (const options of [{ authorizeResult: async () => false }, { noResultAuthorizer: true }, { authorizeResult: async () => { throw new Error('denied') } }]) {
    const f = fixture(options)
    assert.equal((await f.service.reconcile(actor, request, now)).status, 'FORBIDDEN')
    assert.equal(f.transitions(), 0)
  }
})

test('unsafe nested verifier structures reject before getters, serialization or mutation', async () => {
  let getters = 0
  const accessor = Object.defineProperty({}, 'taskRef', { enumerable: true, get() { getters++; return 'task-a' } })
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
  for (const data of [accessor, cyclic, { taskRef: 'task-a', workspace_id: 'foreign' },
    { taskRef: 'task-a', nested: { WorkspaceId: 'foreign' } }, Object.assign(Object.create({ private: true }), { taskRef: 'task-a' }),
    { taskRef: 'task-a', [Symbol('private')]: 'detail' }, { taskRef: 'x'.repeat(65537) }]) {
    const f = fixture({ verifier: { async verify() { return { outcome: 'effect_applied', result: { status: 'SUCCESS', capability: 'crm.task.create', data } } as ReconciliationVerification } } })
    assert.equal((await f.service.reconcile(actor, request, now)).status, 'CONFLICT')
    assert.equal(f.transitions(), 0)
  }
  assert.equal(getters, 0)
})

test('both current mutating framework fixtures obey the same zero-transition output gate', async () => {
  // Synthetic definitions from runtime.test.ts, NOT published telecom write DTOs.
  for (const [capability, field] of [['crm.task.create', 'created'], ['crm.contract.update', 'updated']] as const) {
    const initial = { ...record, binding: { ...record.binding, capability } }
    const schema: ValueSchema = { type: 'object', properties: { [field]: { type: 'boolean' } }, required: [field], additionalProperties: false }
    const good = { [field]: true }
    for (const data of [{}, { [field]: 'true' }, { ...good, unknown: 1 }, { ...good, private_field: 'detail' },
      { ...good, workspaceId: 'foreign' }, { [field]: 'x'.repeat(70_000) }, { [field]: { nested: true } }]) {
      const f = fixture({ initial, schema, verifier: { async verify() { return { outcome: 'effect_applied', result: { status: 'SUCCESS', capability, data } } } } })
      assert.equal((await f.service.reconcile(actor, request, now)).status, 'CONFLICT')
      assert.equal(f.transitions(), 0)
    }
    const verifier: ReconciliationVerifier = { async verify() { return { outcome: 'effect_applied', result: { status: 'SUCCESS', capability, data: good } } } }
    const valid = fixture({ initial, schema, verifier })
    assert.equal((await valid.service.reconcile(actor, request, now)).status, 'SUCCESS')
    const foreign = fixture({ initial, schema, verifier, authorizeResult: async () => false })
    assert.equal((await foreign.service.reconcile(actor, request, now)).status, 'FORBIDDEN')
    assert.equal(foreign.transitions(), 0)
  }
})
