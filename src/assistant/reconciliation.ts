import type {
  DurableIdempotencyRecord,
  DurableIdempotencyState,
  DurableIdempotencyStore,
  ReconciliationActor,
  ReconciliationAuditEvent,
  ReconciliationAuditSink,
  ReconciliationRequest,
  ReconciliationResolution,
  ReconciliationVerifier,
} from './durable-contracts.js'
import { validOperationRef } from './durable-contracts.js'

const RECONCILE_PERMISSION = 'assistant:operation:reconcile'
const REQUESTED_OUTCOMES = new Set(['completed', 'failed_retryable', 'failed_terminal'])
const REASONS = new Set(['read_after_write', 'provider_receipt', 'verified_effect_absence'])

export type ReconciliationServiceResult = {
  status: 'SUCCESS' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID_INPUT' | 'UNAVAILABLE'
  operationRef: string
  state?: DurableIdempotencyState
  error?: { code: string; retryable: boolean }
}

type ReconciliationDependencies = {
  store: DurableIdempotencyStore
  verifier: ReconciliationVerifier
  audit: ReconciliationAuditSink
}

function isReconciliationRequest(value: unknown): value is ReconciliationRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== 4 || keys.some((key) => !['operationRef', 'expectedVersion', 'requestedOutcome', 'reason'].includes(key))) {
    return false
  }
  return typeof record.operationRef === 'string' && validOperationRef(record.operationRef) &&
    Number.isInteger(record.expectedVersion) && Number(record.expectedVersion) >= 1 &&
    typeof record.requestedOutcome === 'string' && REQUESTED_OUTCOMES.has(record.requestedOutcome) &&
    typeof record.reason === 'string' && REASONS.has(record.reason)
}

function failure(
  status: Exclude<ReconciliationServiceResult['status'], 'SUCCESS'>,
  operationRef: string,
  code: string,
  retryable = false,
): ReconciliationServiceResult {
  return { status, operationRef, error: { code, retryable } }
}

function auditEvent(
  actor: ReconciliationActor,
  request: ReconciliationRequest,
  decision: ReconciliationAuditEvent['decision'],
  reasonCode: string,
): ReconciliationAuditEvent {
  return {
    event: 'assistant.operation.reconciliation',
    requestId: actor.requestId,
    actorId: actor.actorId,
    workspaceId: actor.workspaceId,
    operationRef: request.operationRef,
    requestedOutcome: request.requestedOutcome,
    decision,
    reasonCode,
  }
}

function resolution(
  request: ReconciliationRequest,
  verification: Awaited<ReturnType<ReconciliationVerifier['verify']>>,
): ReconciliationResolution | null {
  if (
    request.requestedOutcome === 'completed' &&
    (request.reason === 'read_after_write' || request.reason === 'provider_receipt') &&
    verification.outcome === 'effect_applied'
  ) {
    return { outcome: 'completed', result: verification.result }
  }
  if (
    (request.requestedOutcome === 'failed_retryable' || request.requestedOutcome === 'failed_terminal') &&
    request.reason === 'verified_effect_absence' &&
    verification.outcome === 'effect_absent'
  ) {
    return {
      outcome: request.requestedOutcome,
      failureCode: request.requestedOutcome === 'failed_retryable'
        ? 'effect_absence_verified_retryable'
        : 'effect_absence_verified_terminal',
    }
  }
  return null
}

function expectedState(result: ReconciliationResolution): 'completed' | 'failed_retryable' | 'failed_terminal' {
  return result.outcome === 'completed' ? 'completed' : result.outcome
}

export class AuthorizedReconciliationService {
  readonly #store: DurableIdempotencyStore
  readonly #verifier: ReconciliationVerifier
  readonly #audit: ReconciliationAuditSink

  constructor(dependencies: ReconciliationDependencies) {
    this.#store = dependencies.store
    this.#verifier = dependencies.verifier
    this.#audit = dependencies.audit
  }

  async reconcile(
    actor: ReconciliationActor,
    value: unknown,
    now: Date,
  ): Promise<ReconciliationServiceResult> {
    if (!isReconciliationRequest(value)) {
      const operationRef = value && typeof value === 'object' && !Array.isArray(value) &&
        typeof (value as Record<string, unknown>).operationRef === 'string'
        ? String((value as Record<string, unknown>).operationRef).slice(0, 200)
        : 'invalid_operation_reference'
      return failure('INVALID_INPUT', operationRef, 'invalid_reconciliation_request')
    }
    const request = value
    if (!actor.permissions.has(RECONCILE_PERMISSION)) {
      return this.#finish(actor, request, 'denied', 'reconciliation_forbidden', failure(
        'FORBIDDEN',
        request.operationRef,
        'reconciliation_forbidden',
      ))
    }

    let record: DurableIdempotencyRecord | null
    try {
      record = await this.#store.inspectByOperationRef(request.operationRef, now)
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_store_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_store_unavailable',
        true,
      ))
    }
    if (!record || record.binding.workspaceId !== actor.workspaceId) {
      return this.#finish(actor, request, 'denied', 'reconciliation_forbidden', failure(
        'FORBIDDEN',
        request.operationRef,
        'reconciliation_forbidden',
      ))
    }
    if (record.state !== 'reconciliation_required' || record.version !== request.expectedVersion) {
      return this.#finish(actor, request, 'conflict', 'reconciliation_state_conflict', failure(
        'CONFLICT',
        request.operationRef,
        'reconciliation_state_conflict',
      ))
    }

    let verification
    try {
      verification = await this.#verifier.verify(record, request)
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_verification_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_verification_unavailable',
        true,
      ))
    }
    const verifiedResolution = resolution(request, verification)
    if (!verifiedResolution) {
      return this.#finish(actor, request, 'inconclusive', 'reconciliation_inconclusive', failure(
        'CONFLICT',
        request.operationRef,
        'reconciliation_inconclusive',
      ))
    }

    let transition
    try {
      transition = await this.#store.applyAuthorizedReconciliation(
        request.operationRef,
        actor.workspaceId,
        request.expectedVersion,
        verifiedResolution,
        now,
      )
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_store_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_store_unavailable',
        true,
      ))
    }
    if (transition.status !== 'applied') {
      return this.#finish(actor, request, 'conflict', `reconciliation_${transition.status}`, failure(
        'CONFLICT',
        request.operationRef,
        'reconciliation_state_conflict',
      ))
    }

    let verifiedRecord: DurableIdempotencyRecord | null
    try {
      verifiedRecord = await this.#store.inspectByOperationRef(request.operationRef, now)
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_read_after_write_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_read_after_write_unavailable',
        true,
      ))
    }
    const terminalState = expectedState(verifiedResolution)
    if (!verifiedRecord || verifiedRecord.state !== terminalState || verifiedRecord.version !== transition.record.version) {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_read_after_write_failed', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_read_after_write_failed',
        true,
      ))
    }

    return this.#finish(actor, request, terminalState, 'reconciliation_applied', {
      status: 'SUCCESS',
      operationRef: request.operationRef,
      state: terminalState,
    })
  }

  async #finish(
    actor: ReconciliationActor,
    request: ReconciliationRequest,
    decision: ReconciliationAuditEvent['decision'],
    reasonCode: string,
    result: ReconciliationServiceResult,
  ): Promise<ReconciliationServiceResult> {
    try {
      await this.#audit.emit(auditEvent(actor, request, decision, reasonCode))
    } catch {
      return failure('UNAVAILABLE', request.operationRef, 'reconciliation_audit_unavailable', true)
    }
    return result
  }
}
