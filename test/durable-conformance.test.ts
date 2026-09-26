import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CapabilityResult,
  ConfirmationBinding,
  IdempotencyBinding,
} from '../src/assistant/contracts.js'
import type {
  ConfirmationMutationDecision,
  DurableConfirmationRecord,
  DurableConfirmationStore,
  DurableIdempotencyRecord,
  DurableIdempotencyStore,
  DurableMutationDecision,
  DurableOutbox,
  DurableOutboxRecord,
  DurableReserveDecision,
  OperationRef,
  OutboxMutationDecision,
  ReconciliationResolution,
  ServerEffectCommand,
} from '../src/assistant/durable-contracts.js'
import type {
  ReconciliationActor,
  ReconciliationAuditEvent,
  ReconciliationAuditSink,
  ReconciliationVerification,
  ReconciliationVerifier,
} from '../src/assistant/durable-contracts.js'
import { AuthorizedReconciliationService } from '../src/assistant/reconciliation.js'
import {
  type DurableAdapterHarness,
  type DurableFaultPoint,
  registerDurableAdapterConformance,
} from './support/durable-conformance.js'

function sameBinding(left: ConfirmationBinding, right: ConfirmationBinding): boolean {
  return left.actorId === right.actorId &&
    left.workspaceId === right.workspaceId &&
    left.capability === right.capability &&
    left.argumentsDigest === right.argumentsDigest
}

function copy<T>(value: T): T {
  return structuredClone(value)
}

type ReferenceBacking = {
  confirmationSequence: number
  confirmations: Map<string, DurableConfirmationRecord>
  idempotencySequence: number
  idempotencyByKey: Map<string, DurableIdempotencyRecord>
  idempotencyByRef: Map<string, DurableIdempotencyRecord>
  outboxSequence: number
  outboxByOperation: Map<string, DurableOutboxRecord>
  outboxByRef: Map<string, DurableOutboxRecord>
}

function createBacking(): ReferenceBacking {
  return {
    confirmationSequence: 0,
    confirmations: new Map(),
    idempotencySequence: 0,
    idempotencyByKey: new Map(),
    idempotencyByRef: new Map(),
    outboxSequence: 0,
    outboxByOperation: new Map(),
    outboxByRef: new Map(),
  }
}

class Faults {
  readonly #pending = new Set<DurableFaultPoint>()

  failNext(point: DurableFaultPoint): void {
    this.#pending.add(point)
  }

  check(point: DurableFaultPoint): void {
    if (!this.#pending.delete(point)) return
    throw new Error(`injected_failure:${point}`)
  }
}

class ReferenceConfirmationStore implements DurableConfirmationStore {
  constructor(private readonly backing: ReferenceBacking, private readonly faults: Faults) {}

  async issue(binding: ConfirmationBinding, now: Date, expiresAt: Date): Promise<DurableConfirmationRecord> {
    this.backing.confirmationSequence += 1
    const operationRef = `confirmation_${String(this.backing.confirmationSequence).padStart(24, '0')}`
    const record: DurableConfirmationRecord = {
      operationRef,
      binding: copy(binding),
      state: 'issued',
      version: 1,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    }
    this.backing.confirmations.set(operationRef, record)
    return copy(record)
  }

  async inspect(operationRef: OperationRef, now: Date): Promise<DurableConfirmationRecord | null> {
    const record = this.backing.confirmations.get(operationRef)
    if (!record) return null
    this.#expire(record, now)
    return copy(record)
  }

  async consume(operationRef: OperationRef, binding: ConfirmationBinding, now: Date): Promise<ConfirmationMutationDecision> {
    return this.#transition(operationRef, binding, now, 'consumed')
  }

  async cancel(operationRef: OperationRef, binding: ConfirmationBinding, now: Date): Promise<ConfirmationMutationDecision> {
    this.faults.check('confirmation.cancel')
    return this.#transition(operationRef, binding, now, 'cancelled')
  }

  #transition(
    operationRef: OperationRef,
    binding: ConfirmationBinding,
    now: Date,
    state: 'consumed' | 'cancelled',
  ): ConfirmationMutationDecision {
    const record = this.backing.confirmations.get(operationRef)
    if (!record) return { status: 'not_found' }
    this.#expire(record, now)
    if (!sameBinding(record.binding, binding)) return { status: 'binding_mismatch' }
    if (record.state === 'expired') return { status: 'expired' }
    if (record.state !== 'issued') return { status: 'already_terminal' }
    record.state = state
    record.version += 1
    record.updatedAt = now.toISOString()
    return { status: 'applied', record: copy(record) }
  }

  #expire(record: DurableConfirmationRecord, now: Date): void {
    if (record.state !== 'issued' || Date.parse(record.expiresAt) > now.getTime()) return
    record.state = 'expired'
    record.version += 1
    record.updatedAt = now.toISOString()
  }
}

class ReferenceIdempotencyStore implements DurableIdempotencyStore {
  constructor(private readonly backing: ReferenceBacking, private readonly faults: Faults) {}

  async reserve(
    binding: IdempotencyBinding,
    idempotencyKey: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<DurableReserveDecision> {
    this.faults.check('idempotency.reserve')
    const key = this.#key(binding, idempotencyKey)
    const existing = this.backing.idempotencyByKey.get(key)
    if (existing) {
      this.#expire(existing, now)
      return sameBinding(existing.binding, binding)
        ? { status: 'existing', record: copy(existing) }
        : { status: 'conflict' }
    }
    this.backing.idempotencySequence += 1
    const operationRef = `operation_${String(this.backing.idempotencySequence).padStart(24, '0')}`
    const record: DurableIdempotencyRecord = {
      operationRef,
      idempotencyKey,
      binding: copy(binding),
      state: 'reserved',
      attempt: 1,
      version: 1,
      leaseExpiresAt: leaseExpiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    this.backing.idempotencyByKey.set(key, record)
    this.backing.idempotencyByRef.set(operationRef, record)
    return { status: 'reserved', record: copy(record) }
  }

  async inspectByKey(
    binding: IdempotencyBinding,
    idempotencyKey: string,
    now: Date,
  ): Promise<DurableReserveDecision | { status: 'empty' }> {
    const record = this.backing.idempotencyByKey.get(this.#key(binding, idempotencyKey))
    if (!record) return { status: 'empty' }
    this.#expire(record, now)
    return sameBinding(record.binding, binding)
      ? { status: 'existing', record: copy(record) }
      : { status: 'conflict' }
  }

  async inspectByOperationRef(operationRef: OperationRef, now: Date): Promise<DurableIdempotencyRecord | null> {
    const record = this.backing.idempotencyByRef.get(operationRef)
    if (!record) return null
    this.#expire(record, now)
    return copy(record)
  }

  async startExecution(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<DurableMutationDecision> {
    return this.#transition(operationRef, binding, expectedVersion, ['reserved'], 'executing', now, (record) => {
      record.leaseExpiresAt = leaseExpiresAt.toISOString()
      delete record.failureCode
    })
  }

  async recordEffectApplied(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    effectReceiptRef: string,
    now: Date,
  ): Promise<DurableMutationDecision> {
    return this.#transition(operationRef, binding, expectedVersion, ['executing'], 'effect_applied', now, (record) => {
      record.effectReceiptRef = effectReceiptRef
    })
  }

  async complete(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    result: CapabilityResult,
    now: Date,
  ): Promise<DurableMutationDecision> {
    this.faults.check('idempotency.complete')
    return this.#transition(operationRef, binding, expectedVersion, ['effect_applied'], 'completed', now, (record) => {
      record.result = copy(result)
      delete record.failureCode
    })
  }

  async failBeforeEffect(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    failureCode: string,
    retryable: boolean,
    now: Date,
  ): Promise<DurableMutationDecision> {
    return this.#transition(
      operationRef,
      binding,
      expectedVersion,
      ['reserved', 'executing'],
      retryable ? 'failed_retryable' : 'failed_terminal',
      now,
      (record) => { record.failureCode = failureCode },
    )
  }

  async requireReconciliation(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    failureCode: string,
    now: Date,
  ): Promise<DurableMutationDecision> {
    return this.#transition(
      operationRef,
      binding,
      expectedVersion,
      ['executing', 'effect_applied'],
      'reconciliation_required',
      now,
      (record) => { record.failureCode = failureCode },
    )
  }

  async retry(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<DurableMutationDecision> {
    return this.#transition(operationRef, binding, expectedVersion, ['failed_retryable'], 'reserved', now, (record) => {
      record.attempt += 1
      record.leaseExpiresAt = leaseExpiresAt.toISOString()
      delete record.failureCode
      delete record.effectReceiptRef
    })
  }

  async applyAuthorizedReconciliation(
    operationRef: OperationRef,
    workspaceId: string,
    expectedVersion: number,
    resolution: ReconciliationResolution,
    now: Date,
  ): Promise<DurableMutationDecision> {
    const record = this.backing.idempotencyByRef.get(operationRef)
    if (!record) return { status: 'not_found' }
    if (record.binding.workspaceId !== workspaceId) return { status: 'binding_mismatch' }
    if (record.version !== expectedVersion) return { status: 'version_conflict' }
    if (record.state !== 'reconciliation_required') return { status: 'invalid_transition' }
    record.state = resolution.outcome
    record.version += 1
    record.updatedAt = now.toISOString()
    if (resolution.outcome === 'completed') {
      record.result = copy(resolution.result)
      delete record.failureCode
    } else {
      record.failureCode = resolution.failureCode
      delete record.result
    }
    return { status: 'applied', record: copy(record) }
  }

  #key(binding: IdempotencyBinding, idempotencyKey: string): string {
    return `${binding.workspaceId}:${binding.capability}:${idempotencyKey}`
  }

  #expire(record: DurableIdempotencyRecord, now: Date): void {
    if (!['executing', 'effect_applied'].includes(record.state)) return
    if (Date.parse(record.leaseExpiresAt) > now.getTime()) return
    record.state = 'reconciliation_required'
    record.failureCode = 'execution_lease_expired'
    record.version += 1
    record.updatedAt = now.toISOString()
  }

  #transition(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    allowed: DurableIdempotencyRecord['state'][],
    state: DurableIdempotencyRecord['state'],
    now: Date,
    mutate?: (record: DurableIdempotencyRecord) => void,
  ): DurableMutationDecision {
    const record = this.backing.idempotencyByRef.get(operationRef)
    if (!record) return { status: 'not_found' }
    this.#expire(record, now)
    if (!sameBinding(record.binding, binding)) return { status: 'binding_mismatch' }
    if (record.version !== expectedVersion) return { status: 'version_conflict' }
    if (!allowed.includes(record.state)) return { status: 'invalid_transition' }
    record.state = state
    record.version += 1
    record.updatedAt = now.toISOString()
    mutate?.(record)
    return { status: 'applied', record: copy(record) }
  }
}

class ReferenceOutbox implements DurableOutbox {
  constructor(private readonly backing: ReferenceBacking, private readonly faults: Faults) {}

  async enqueue(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    command: ServerEffectCommand,
    now: Date,
  ): Promise<DurableOutboxRecord> {
    const existing = this.backing.outboxByOperation.get(operationRef)
    if (existing) {
      if (JSON.stringify(existing.command) !== JSON.stringify(command) || !sameBinding(existing.binding, binding)) {
        throw new Error('outbox_operation_conflict')
      }
      return copy(existing)
    }
    this.backing.outboxSequence += 1
    const outboxRef = `outbox_${String(this.backing.outboxSequence).padStart(24, '0')}`
    const record: DurableOutboxRecord = {
      outboxRef,
      operationRef,
      binding: copy(binding),
      command: copy(command),
      state: 'pending',
      attempt: 0,
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    this.backing.outboxByOperation.set(operationRef, record)
    this.backing.outboxByRef.set(outboxRef, record)
    return copy(record)
  }

  async claim(
    outboxRef: string,
    expectedVersion: number,
    _workerRef: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<OutboxMutationDecision> {
    this.faults.check('outbox.claim')
    return this.#transition(outboxRef, expectedVersion, ['pending', 'failed_retryable'], 'dispatching', now, (record) => {
      record.attempt += 1
      record.leaseExpiresAt = leaseExpiresAt.toISOString()
      delete record.failureCode
    })
  }

  async recordDelivered(
    outboxRef: string,
    expectedVersion: number,
    receiptRef: string,
    now: Date,
  ): Promise<OutboxMutationDecision> {
    return this.#transition(outboxRef, expectedVersion, ['dispatching'], 'delivered', now, (record) => {
      record.receiptRef = receiptRef
      delete record.leaseExpiresAt
    })
  }

  async recordFailure(
    outboxRef: string,
    expectedVersion: number,
    failureCode: string,
    retryable: boolean,
    now: Date,
  ): Promise<OutboxMutationDecision> {
    return this.#transition(
      outboxRef,
      expectedVersion,
      ['dispatching'],
      retryable ? 'failed_retryable' : 'failed_terminal',
      now,
      (record) => {
        record.failureCode = failureCode
        delete record.leaseExpiresAt
      },
    )
  }

  async inspect(outboxRef: string, now: Date): Promise<DurableOutboxRecord | null> {
    const record = this.backing.outboxByRef.get(outboxRef)
    if (!record) return null
    this.#expire(record, now)
    return copy(record)
  }

  #expire(record: DurableOutboxRecord, now: Date): void {
    if (record.state !== 'dispatching' || !record.leaseExpiresAt || Date.parse(record.leaseExpiresAt) > now.getTime()) return
    record.state = 'reconciliation_required'
    record.failureCode = 'dispatch_lease_expired'
    record.version += 1
    record.updatedAt = now.toISOString()
  }

  #transition(
    outboxRef: string,
    expectedVersion: number,
    allowed: DurableOutboxRecord['state'][],
    state: DurableOutboxRecord['state'],
    now: Date,
    mutate?: (record: DurableOutboxRecord) => void,
  ): OutboxMutationDecision {
    const record = this.backing.outboxByRef.get(outboxRef)
    if (!record) return { status: 'not_found' }
    this.#expire(record, now)
    if (record.version !== expectedVersion) return { status: 'version_conflict' }
    if (!allowed.includes(record.state)) return { status: 'invalid_transition' }
    record.state = state
    record.version += 1
    record.updatedAt = now.toISOString()
    mutate?.(record)
    return { status: 'applied', record: copy(record) }
  }
}

function harness(backing = createBacking()): DurableAdapterHarness {
  const faults = new Faults()
  return {
    confirmations: new ReferenceConfirmationStore(backing, faults),
    idempotency: new ReferenceIdempotencyStore(backing, faults),
    outbox: new ReferenceOutbox(backing, faults),
    failNext: (point) => faults.failNext(point),
    restart: async () => harness(backing),
  }
}

registerDurableAdapterConformance('reference durable adapter contract', async () => harness())

const reconciliationNow = new Date('2026-09-26T11:00:00.000Z')
const reconciliationLease = new Date('2026-09-26T11:05:00.000Z')
const reconciliationBinding: IdempotencyBinding = {
  actorId: 'actor-a',
  workspaceId: 'workspace-a',
  capability: 'crm.task.create',
  argumentsDigest: 'digest-a',
}
const authorizedActor: ReconciliationActor = {
  actorId: 'security-operator-a',
  workspaceId: 'workspace-a',
  authentication: 'user_session',
  permissions: new Set(['assistant:operation:reconcile']),
  requestId: 'request-reconcile-00000001',
}

class ReconciliationAudit implements ReconciliationAuditSink {
  readonly events: ReconciliationAuditEvent[] = []
  fail = false

  async emit(event: ReconciliationAuditEvent): Promise<void> {
    if (this.fail) throw new Error('audit_unavailable')
    this.events.push(copy(event))
  }
}

class StaticVerifier implements ReconciliationVerifier {
  calls = 0

  constructor(readonly verification: ReconciliationVerification, readonly fail = false) {}

  async verify(): Promise<ReconciliationVerification> {
    this.calls += 1
    if (this.fail) throw new Error('verification_unavailable')
    return copy(this.verification)
  }
}

async function operationRequiringReconciliation(adapter: DurableAdapterHarness) {
  const reserved = await adapter.idempotency.reserve(
    reconciliationBinding,
    'idem-reconcile-00000001',
    reconciliationNow,
    reconciliationLease,
  )
  assert.equal(reserved.status, 'reserved')
  if (reserved.status !== 'reserved') throw new Error('expected reservation')
  const executing = await adapter.idempotency.startExecution(
    reserved.record.operationRef,
    reconciliationBinding,
    reserved.record.version,
    reconciliationNow,
    reconciliationLease,
  )
  assert.equal(executing.status, 'applied')
  if (executing.status !== 'applied') throw new Error('expected execution')
  const uncertain = await adapter.idempotency.requireReconciliation(
    executing.record.operationRef,
    reconciliationBinding,
    executing.record.version,
    'provider_completion_unknown',
    reconciliationNow,
  )
  assert.equal(uncertain.status, 'applied')
  if (uncertain.status !== 'applied') throw new Error('expected reconciliation state')
  return uncertain.record
}

test('authorized reconciliation completes only after verified effect and read-after-write', async () => {
  const adapter = harness()
  const pending = await operationRequiringReconciliation(adapter)
  const audit = new ReconciliationAudit()
  const verifier = new StaticVerifier({
    outcome: 'effect_applied',
    result: {
      status: 'SUCCESS',
      capability: reconciliationBinding.capability,
      data: { taskRef: 'task-opaque-000000000001' },
    },
  })
  const service = new AuthorizedReconciliationService({ store: adapter.idempotency, verifier, audit })

  const result = await service.reconcile(authorizedActor, {
    operationRef: pending.operationRef,
    expectedVersion: pending.version,
    requestedOutcome: 'completed',
    reason: 'provider_receipt',
  }, reconciliationNow)

  assert.deepEqual(result, {
    status: 'SUCCESS',
    operationRef: pending.operationRef,
    state: 'completed',
  })
  assert.equal(verifier.calls, 1)
  assert.equal((await adapter.idempotency.inspectByOperationRef(pending.operationRef, reconciliationNow))?.state, 'completed')
  assert.deepEqual(audit.events.map((event) => event.decision), ['completed'])
  assert.doesNotMatch(JSON.stringify(audit.events), /task-opaque|provider_completion_unknown/)
})

test('reconciliation denies missing permission and cross-workspace operation references', async () => {
  const adapter = harness()
  const pending = await operationRequiringReconciliation(adapter)
  const audit = new ReconciliationAudit()
  const verifier = new StaticVerifier({ outcome: 'effect_absent' })
  const service = new AuthorizedReconciliationService({ store: adapter.idempotency, verifier, audit })
  const request = {
    operationRef: pending.operationRef,
    expectedVersion: pending.version,
    requestedOutcome: 'failed_retryable',
    reason: 'verified_effect_absence',
  }

  const noPermission = await service.reconcile(
    { ...authorizedActor, permissions: new Set() },
    request,
    reconciliationNow,
  )
  const crossWorkspace = await service.reconcile(
    { ...authorizedActor, workspaceId: 'workspace-b' },
    request,
    reconciliationNow,
  )

  assert.equal(noPermission.status, 'FORBIDDEN')
  assert.equal(crossWorkspace.status, 'FORBIDDEN')
  assert.equal(verifier.calls, 0)
  assert.equal((await adapter.idempotency.inspectByOperationRef(pending.operationRef, reconciliationNow))?.state, 'reconciliation_required')
  assert.deepEqual(audit.events.map((event) => event.decision), ['denied', 'denied'])
})

test('reconciliation rejects browser-supplied outcome data and malformed plans before lookup', async () => {
  const adapter = harness()
  const pending = await operationRequiringReconciliation(adapter)
  const audit = new ReconciliationAudit()
  const verifier = new StaticVerifier({ outcome: 'effect_absent' })
  const service = new AuthorizedReconciliationService({ store: adapter.idempotency, verifier, audit })

  const forged = await service.reconcile(authorizedActor, {
    operationRef: pending.operationRef,
    expectedVersion: pending.version,
    requestedOutcome: 'completed',
    reason: 'provider_receipt',
    result: { status: 'SUCCESS', data: { forged: true } },
  }, reconciliationNow)
  const malformed = await service.reconcile(authorizedActor, {
    operationRef: pending.operationRef,
    expectedVersion: -1,
    requestedOutcome: 'completed',
    reason: 'provider_receipt',
  }, reconciliationNow)

  assert.equal(forged.status, 'INVALID_INPUT')
  assert.equal(malformed.status, 'INVALID_INPUT')
  assert.equal(verifier.calls, 0)
  assert.equal((await adapter.idempotency.inspectByOperationRef(pending.operationRef, reconciliationNow))?.state, 'reconciliation_required')
})

test('inconclusive verification cannot force a terminal reconciliation state', async () => {
  const adapter = harness()
  const pending = await operationRequiringReconciliation(adapter)
  const audit = new ReconciliationAudit()
  const service = new AuthorizedReconciliationService({
    store: adapter.idempotency,
    verifier: new StaticVerifier({ outcome: 'inconclusive' }),
    audit,
  })

  const result = await service.reconcile(authorizedActor, {
    operationRef: pending.operationRef,
    expectedVersion: pending.version,
    requestedOutcome: 'completed',
    reason: 'read_after_write',
  }, reconciliationNow)

  assert.equal(result.status, 'CONFLICT')
  assert.equal(result.error?.code, 'reconciliation_inconclusive')
  assert.equal((await adapter.idempotency.inspectByOperationRef(pending.operationRef, reconciliationNow))?.state, 'reconciliation_required')
  assert.deepEqual(audit.events.map((event) => event.decision), ['inconclusive'])
})

test('verified effect absence permits bounded retryable reconciliation', async () => {
  const adapter = harness()
  const pending = await operationRequiringReconciliation(adapter)
  const audit = new ReconciliationAudit()
  const service = new AuthorizedReconciliationService({
    store: adapter.idempotency,
    verifier: new StaticVerifier({ outcome: 'effect_absent' }),
    audit,
  })

  const result = await service.reconcile(authorizedActor, {
    operationRef: pending.operationRef,
    expectedVersion: pending.version,
    requestedOutcome: 'failed_retryable',
    reason: 'verified_effect_absence',
  }, reconciliationNow)

  assert.equal(result.status, 'SUCCESS')
  assert.equal(result.state, 'failed_retryable')
  const record = await adapter.idempotency.inspectByOperationRef(pending.operationRef, reconciliationNow)
  assert.equal(record?.failureCode, 'effect_absence_verified_retryable')
})

test('audit outage returns bounded uncertainty after an applied reconciliation', async () => {
  const adapter = harness()
  const pending = await operationRequiringReconciliation(adapter)
  const audit = new ReconciliationAudit()
  audit.fail = true
  const service = new AuthorizedReconciliationService({
    store: adapter.idempotency,
    verifier: new StaticVerifier({ outcome: 'effect_absent' }),
    audit,
  })

  const result = await service.reconcile(authorizedActor, {
    operationRef: pending.operationRef,
    expectedVersion: pending.version,
    requestedOutcome: 'failed_terminal',
    reason: 'verified_effect_absence',
  }, reconciliationNow)

  assert.equal(result.status, 'UNAVAILABLE')
  assert.equal(result.error?.code, 'reconciliation_audit_unavailable')
  assert.equal((await adapter.idempotency.inspectByOperationRef(pending.operationRef, reconciliationNow))?.state, 'failed_terminal')
})
