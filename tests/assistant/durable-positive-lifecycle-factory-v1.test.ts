import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { CapabilityRegistry } from '../../src/assistant/registry.ts'
import { argumentsDigest } from '../../src/assistant/runtime.ts'
import { createDurablePositiveLifecycleFactoryV1, type PositiveLifecycleFactoryDependenciesV1 } from '../../src/assistant/durable-positive-lifecycle-factory-v1.ts'
import type { EffectWorkerAuthorityV1 } from '../../src/assistant/durable-business-outbox-port.ts'
import type { VerifiedReconciliationCommit } from '../../src/assistant/durable-db-contract.ts'

const capability = 'fixture.lifecycle.write', permission = 'fixture:lifecycle:write'
const actor = { authentication: 'user_session' as const, actorId: 'a1000000-0000-4000-8000-000000000001',
  workspaceId: 'b2000000-0000-4000-8000-000000000001', requestId: 'lifecycle_original_request_0001',
  permissions: new Set([capability, permission, 'assistant:operation:reconcile']) }
const args = { label: 'Synthetic lifecycle' }, binding = { actorId: actor.actorId, workspaceId: actor.workspaceId,
  capability, argumentsDigest: argumentsDigest(args) }
const command = { dispatcher: capability, commandRef: 'lifecycle_original_command_0001' }
const operationRef = 'lifecycle_original_operation_0001', key = 'lifecycle_original_key_0001'
function fixture() {
  let worker: EffectWorkerAuthorityV1 | null = { ...actor, scopeEpoch: 'lifecycle_scope1', workerRef: 'lifecycle_worker_reference_0001',
    capability, dispatcher: capability, schemaVersion: 1, grantVersion: 1 }
  let authorityCalls = 0
  const calls: { name: string; input: Readonly<Record<string, string>> }[] = []
  const registry = new CapabilityRegistry()
  registry.register({ contractVersion: 3, name: capability, description: 'Synthetic lifecycle contract', permission,
    accessClass: 'SAFE_WRITE', confirmationPolicy: 'none', idempotencyRequired: true,
    inputSchema: { type: 'object', properties: { label: { type: 'string', maxLength: 120 } }, required: ['label'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { label: { type: 'string', maxLength: 120 } }, required: ['label'], additionalProperties: false },
    outputPolicy: { sourceProjection: 'explicit_dto', sensitiveValueScan: 'high_confidence' },
    tenantScope: { source: 'server_context', modelMayChooseWorkspace: false }, authorize: async () => ({ allowed: true }),
    handler: async () => { throw Error('business_handler_not_run') }, projectOutput: () => null })
  const createdAt = new Date().toISOString()
  const record = { operationRef, idempotencyKey: key, binding, state: 'reserved', attempt: 1, version: 1,
    createdAt, updatedAt: createdAt, leaseExpiresAt: new Date(Date.parse(createdAt) + 300000).toISOString() }
  const deps: PositiveLifecycleFactoryDependenciesV1 = { registry,
    registrations: [{ dispatcher: capability, capability, schemaVersion: 1, authorizeResult: async () => true }],
    currentWorker: async () => { authorityCalls++; return worker },
    loadDraft: async () => ({ binding, command, schemaVersion: 1, arguments: args }),
    loadOutcome: async () => { throw Error('outcome_not_requested') }, loadCommand: async () => command,
    loadReservationCommand: async () => command, loadConfirmationOrigin: async () => 'not_applicable',
    loadOutbox: async () => { throw Error('outbox_not_requested') }, verifyReceipt: async () => { throw Error('receipt_not_requested') },
    invoke: async (name, input) => { calls.push({ name, input }); assert.equal(name, 'assistant_durable_v1_reserve_material');
      return { data: { status: 'reserved', record }, error: null } } }
  return { deps, calls, authorityCalls: () => authorityCalls, worker: () => worker!, setWorker: (value: EffectWorkerAuthorityV1 | null) => { worker = value } }
}

test('factory construction wires frozen eleven-method surface without authority/DB calls or write activation', () => {
  const f = fixture(), lifecycle = createDurablePositiveLifecycleFactoryV1(f.deps)
  assert.deepEqual(Object.keys(lifecycle.port).sort(), ['issueConfirmation', 'cancelConfirmation', 'reserveOperation', 'confirmReserveEnqueue',
    'startExecution', 'transitionToReconciliation', 'completeOperationWithAuditIntent', 'claimOutbox', 'ackOutbox',
    'loadAuthorizedOperation', 'commitVerifiedReconciliation'].sort())
  assert.equal(Object.isFrozen(lifecycle), true); assert.equal(Object.isFrozen(lifecycle.port), true)
  assert.equal(lifecycle.verifiedCompleted, true); assert.equal(lifecycle.verifiedAbsence, false); assert.equal(lifecycle.businessEffectsEnabled, false)
  assert.equal(f.authorityCalls(), 0); assert.equal(f.calls.length, 0)
})

test('missing private dependencies and accessor configuration fail before executing callbacks', () => {
  for (const key of ['currentWorker', 'loadDraft', 'loadOutcome', 'loadCommand', 'loadReservationCommand', 'loadConfirmationOrigin', 'loadOutbox', 'verifyReceipt', 'invoke']) {
    const f = fixture(), missing = { ...f.deps } as Record<string, unknown>; delete missing[key]
    assert.throws(() => createDurablePositiveLifecycleFactoryV1(missing as PositiveLifecycleFactoryDependenciesV1))
    assert.equal(f.authorityCalls(), 0); assert.equal(f.calls.length, 0)
  }
  const f = fixture(); let reads = 0
  Object.defineProperty(f.deps, 'invoke', { enumerable: true, get() { reads++; throw Error('getter_must_not_run') } })
  assert.throws(() => createDurablePositiveLifecycleFactoryV1(f.deps)); assert.equal(reads, 0)
})

test('empty duplicate missing result authorization or malformed registrations refuse construction without DB calls', () => {
  const f = fixture(), registration = f.deps.registrations[0]
  for (const registrations of [[], [registration, registration], [{ ...registration, authorizeResult: null }],
    [{ ...registration, capability: 'unregistered.lifecycle.write' }], [{ ...registration, schemaVersion: 0 }]]) {
    assert.throws(() => createDurablePositiveLifecycleFactoryV1({ ...f.deps, registrations } as PositiveLifecycleFactoryDependenciesV1))
    assert.equal(f.authorityCalls(), 0); assert.equal(f.calls.length, 0)
  }
})

test('factory uses the registered private command producer before its reservation transport', async () => {
  const f = fixture(), lifecycle = createDurablePositiveLifecycleFactoryV1(f.deps)
  const result = await lifecycle.port.reserveOperation(actor, binding, key)
  assert.equal(result.status, 'reserved'); assert.equal(f.calls.length, 1); assert.ok(f.authorityCalls() > 1)
  const params = f.calls[0].input, material = JSON.parse(params.p_material)
  assert.equal(params.p_workspace, actor.workspaceId); assert.equal(params.p_digest, binding.argumentsDigest)
  assert.equal(params.p_command, command.commandRef); assert.equal(params.p_request, actor.requestId)
  assert.equal(material.canonicalArguments, JSON.stringify(args)); assert.equal(material.schemaVersion, 1)
  assert.equal(material.digestAlgorithm, 'w3-canonical-json-localeCompare-sha256-v1')
})

test('fresh authority remains dynamic after construction and revocation after loading draft cannot reach transport', async () => {
  const f = fixture(); f.deps.loadDraft = async () => { f.setWorker({ ...f.worker(), scopeEpoch: 'revoked_scope' });
    return { binding, command, schemaVersion: 1, arguments: args } }
  const lifecycle = createDurablePositiveLifecycleFactoryV1(f.deps)
  await assert.rejects(lifecycle.port.reserveOperation(actor, binding, key)); assert.equal(f.calls.length, 0)
  const gone = fixture(), built = createDurablePositiveLifecycleFactoryV1(gone.deps); gone.setWorker(null)
  await assert.rejects(built.port.reserveOperation(actor, binding, key)); assert.equal(gone.calls.length, 0)
})

test('factory still denies retryable and terminal verified absence before reading any physical operation or mutating', async () => {
  for (const outcome of ['failed_retryable', 'failed_terminal'] as const) {
    const f = fixture(), lifecycle = createDurablePositiveLifecycleFactoryV1(f.deps)
    const commit: VerifiedReconciliationCommit = { actor, operationRef, binding, idempotencyKey: key, expectedVersion: 4,
      eventRef: createHash('sha256').update(JSON.stringify([actor.workspaceId, operationRef, 4])).digest('hex'), now: new Date(),
      resolution: { outcome, failureCode: outcome === 'failed_retryable' ? 'effect_absence_verified_retryable' : 'effect_absence_verified_terminal' },
      auditIntent: { event: 'assistant.operation.reconciliation', requestId: actor.requestId, actorId: actor.actorId, workspaceId: actor.workspaceId,
        operationRef, requestedOutcome: outcome, decision: outcome, reasonCode: 'reconciliation_applied' } }
    assert.deepEqual(await lifecycle.port.commitVerifiedReconciliation(commit), { status: 'invalid_transition' })
    assert.equal(f.calls.length, 0)
  }
})
