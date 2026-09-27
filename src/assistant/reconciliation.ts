import type {
  DurableIdempotencyRecord,
  DurableIdempotencyState,
  ReconciliationActor,
  ReconciliationAuditEvent,
  ReconciliationAuditSink,
  ReconciliationRequest,
  ReconciliationResolution,
  ReconciliationVerifier,
} from './durable-contracts.js'
import { validOperationRef } from './durable-contracts.js'
import { containsHighConfidenceSecret, containsTenantSelector, validateValue } from './schema.js'
import type { CapabilityResult, ValueSchema } from './contracts.js'
import type { ReconciliationPersistence } from './durable-db-contract.js'
import { createHash } from 'node:crypto'

const RECONCILE_PERMISSION = 'assistant:operation:reconcile'
const REQUESTED_OUTCOMES = new Set(['completed', 'failed_retryable', 'failed_terminal'])
const REASONS = new Set(['read_after_write', 'provider_receipt', 'verified_effect_absence'])

function safeVerifiedResult(value: unknown, capability: string, schema: ValueSchema | undefined): boolean {
  try {
    if (!schema || !value || typeof value !== 'object' || Array.isArray(value)) return false
    const result = value as Record<string, unknown>
    if (result.status !== 'SUCCESS' || result.capability !== capability ||
      Object.keys(result).some((key) => !['status', 'capability', 'data'].includes(key))) return false
    if (containsHighConfidenceSecret(value) || containsTenantSelector(result.data)) return false
    const encoded = JSON.stringify(value)
    if (Buffer.byteLength(encoded, 'utf8') > 64 * 1024) return false
    return validateValue(schema, result.data).ok && !containsHighConfidenceSecret(JSON.parse(encoded))
  } catch {
    return false
  }
}

export type ReconciliationServiceResult = {
  status: 'SUCCESS' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID_INPUT' | 'UNAVAILABLE'
  operationRef: string
  state?: DurableIdempotencyState
  error?: { code: string; retryable: boolean }
}

type ReconciliationDependencies = {
  persistence: ReconciliationPersistence
  verifier: ReconciliationVerifier
  audit: ReconciliationAuditSink
  /** Server-registered capability output schemas. Missing entry blocks completion.
   * Never populate this map from a verifier, model, request or provider payload.
   */
  outputSchemas?: ReadonlyMap<string, ValueSchema>
  /** Mandatory for observed-effect completion, including scalar/opaque IDs.
   * Check references against the original operation workspace and current
   * principal. A valid output shape alone does not prove resource ownership.
   */
  authorizeResult?: (actor: ReconciliationActor, record: DurableIdempotencyRecord, result: CapabilityResult) => Promise<boolean>
}

function isReconciliationRequest(value: unknown): value is ReconciliationRequest {
  if (containsHighConfidenceSecret(value)) return false
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== 4 || keys.some((key) => !['operationRef', 'expectedVersion', 'requestedOutcome', 'reason'].includes(key))) {
    return false
  }
  return typeof record.operationRef === 'string' && validOperationRef(record.operationRef) &&
    Number.isSafeInteger(record.expectedVersion) && Number(record.expectedVersion) >= 1 &&
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
  readonly #persistence: ReconciliationPersistence
  readonly #verifier: ReconciliationVerifier
  readonly #audit: ReconciliationAuditSink
  readonly #outputSchemas: ReadonlyMap<string, ValueSchema>
  readonly #authorizeResult: ReconciliationDependencies['authorizeResult']

  constructor(dependencies: ReconciliationDependencies) {
    this.#persistence = dependencies.persistence
    this.#verifier = dependencies.verifier
    this.#audit = dependencies.audit
    this.#outputSchemas = new Map([...dependencies.outputSchemas ?? []].map(([name, schema]) => [name, structuredClone(schema)]))
    this.#authorizeResult = dependencies.authorizeResult
  }

  async reconcile(
    actorInput: ReconciliationActor,
    value: unknown,
    now: Date,
  ): Promise<ReconciliationServiceResult> {
    if (!isReconciliationRequest(value)) {
      // Never reflect arbitrary browser input (including credentials) in errors.
      return failure('INVALID_INPUT', 'invalid_operation_reference', 'invalid_reconciliation_request')
    }
    const request = { ...value }
    const actor = { ...actorInput, permissions: new Set(actorInput.permissions) }
    now = new Date(now.getTime())
    if (!Number.isFinite(now.getTime())) return failure('INVALID_INPUT', 'invalid_operation_reference', 'invalid_reconciliation_time')
    if (!actor.permissions.has(RECONCILE_PERMISSION)) {
      return this.#finish(actor, request, 'denied', 'reconciliation_forbidden', failure(
        'FORBIDDEN',
        request.operationRef,
        'reconciliation_forbidden',
      ))
    }

    let record: DurableIdempotencyRecord | null
    try {
      record = await this.#persistence.loadAuthorizedOperation(actor, request.operationRef, now)
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_store_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_store_unavailable',
        true,
      ))
    }
    if (!record || record.operationRef !== request.operationRef || record.binding.workspaceId !== actor.workspaceId) {
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

    // Preserve the checked identity across the verifier await, including buggy
    // adapters/verifiers that mutate objects handed to them.
    const binding = { ...record.binding }
    const idempotencyKey = record.idempotencyKey
    let verification
    try {
      const raw = await this.#verifier.verify(structuredClone(record), { ...request })
      // Reject getters, cycles, exotic prototypes and secret values BEFORE cloning.
      if (containsHighConfidenceSecret(raw) || !raw || typeof raw !== 'object' ||
        Object.keys(raw).sort().join(',') !== (raw.outcome === 'effect_applied' ? 'outcome,result' : 'outcome')) return this.#finish(actor, request, 'inconclusive', 'reconciliation_inconclusive', failure('CONFLICT', request.operationRef, 'reconciliation_inconclusive'))
      verification = structuredClone(raw)
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_verification_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_verification_unavailable',
        true,
      ))
    }
    const verifiedResolution = verification && typeof verification === 'object' &&
      (verification.outcome !== 'effect_applied' ||
        safeVerifiedResult(verification.result, binding.capability, this.#outputSchemas.get(binding.capability)))
      ? resolution(request, verification) : null
    if (!verifiedResolution) {
      return this.#finish(actor, request, 'inconclusive', 'reconciliation_inconclusive', failure(
        'CONFLICT',
        request.operationRef,
        'reconciliation_inconclusive',
      ))
    }

    if (verifiedResolution.outcome === 'completed') {
      let authorized = false
      try {
        authorized = await this.#authorizeResult?.(structuredClone(actor), structuredClone(record), structuredClone(verifiedResolution.result)) === true
      } catch { authorized = false }
      if (!authorized) return this.#finish(actor, request, 'denied', 'reconciliation_result_forbidden', failure('FORBIDDEN', request.operationRef, 'reconciliation_result_forbidden'))
    }

    let transition
    const terminalState = expectedState(verifiedResolution)
    const eventRef = createHash('sha256').update(JSON.stringify([actor.workspaceId, request.operationRef, request.expectedVersion])).digest('hex')
    try {
      transition = await this.#persistence.commitVerifiedReconciliation({
        actor: structuredClone(actor), operationRef: request.operationRef,
        expectedVersion: request.expectedVersion, binding: { ...binding }, idempotencyKey,
        resolution: structuredClone(verifiedResolution), eventRef,
        auditIntent: auditEvent(actor, request, terminalState, 'reconciliation_applied'), now,
      })
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
      verifiedRecord = await this.#persistence.loadAuthorizedOperation(actor, request.operationRef, now)
    } catch {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_read_after_write_unavailable', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_read_after_write_unavailable',
        true,
      ))
    }
    const matchesIdentity = (candidate: DurableIdempotencyRecord): boolean =>
      candidate.operationRef === request.operationRef &&
      candidate.binding.workspaceId === binding.workspaceId &&
      candidate.binding.actorId === binding.actorId &&
      candidate.binding.capability === binding.capability &&
      candidate.binding.argumentsDigest === binding.argumentsDigest &&
      candidate.idempotencyKey === idempotencyKey
    if (transition.auditIntentPersisted !== true || transition.eventRef !== eventRef ||
      !verifiedRecord || !matchesIdentity(verifiedRecord) || !matchesIdentity(transition.record) ||
      verifiedRecord.state !== terminalState || transition.record.state !== terminalState ||
      !Number.isSafeInteger(verifiedRecord.version) || verifiedRecord.version <= request.expectedVersion ||
      verifiedRecord.version !== transition.record.version) {
      return this.#finish(actor, request, 'unavailable', 'reconciliation_read_after_write_failed', failure(
        'UNAVAILABLE',
        request.operationRef,
        'reconciliation_read_after_write_failed',
        true,
      ))
    }

    // Success relies on durable audit intent, never availability of delivery sink.
    return {
      status: 'SUCCESS',
      operationRef: request.operationRef,
      state: terminalState,
    }
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
