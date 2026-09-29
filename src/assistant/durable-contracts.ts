import type {
  CapabilityResult,
  ConfirmationBinding,
  IdempotencyBinding,
} from './contracts.js'

export type OperationRef = string

export const CONFIRMATION_STATES = ['issued', 'consumed', 'cancelled', 'expired'] as const
export type DurableConfirmationState = typeof CONFIRMATION_STATES[number]

export const IDEMPOTENCY_STATES = [
  'reserved',
  'executing',
  'effect_applied',
  'completed',
  'failed_retryable',
  'failed_terminal',
  'reconciliation_required',
] as const
export type DurableIdempotencyState = typeof IDEMPOTENCY_STATES[number]

export const OUTBOX_STATES = [
  'pending',
  'dispatching',
  'delivered',
  'failed_retryable',
  'failed_terminal',
  'reconciliation_required',
] as const
export type DurableOutboxState = typeof OUTBOX_STATES[number]

export type DurableConfirmationRecord = {
  operationRef: OperationRef
  binding: ConfirmationBinding
  state: DurableConfirmationState
  version: number
  issuedAt: string
  expiresAt: string
  updatedAt: string
}

export type ConfirmationMutationDecision =
  | { status: 'applied'; record: DurableConfirmationRecord }
  | { status: 'not_found' | 'binding_mismatch' | 'already_terminal' | 'expired' }

export interface DurableConfirmationStore {
  issue(binding: ConfirmationBinding, now: Date, expiresAt: Date): Promise<DurableConfirmationRecord>
  inspect(operationRef: OperationRef, now: Date): Promise<DurableConfirmationRecord | null>
  consume(operationRef: OperationRef, binding: ConfirmationBinding, now: Date): Promise<ConfirmationMutationDecision>
  cancel(operationRef: OperationRef, binding: ConfirmationBinding, now: Date): Promise<ConfirmationMutationDecision>
}

export type DurableIdempotencyRecord = {
  operationRef: OperationRef
  idempotencyKey: string
  binding: IdempotencyBinding
  state: DurableIdempotencyState
  attempt: number
  version: number
  leaseExpiresAt: string
  createdAt: string
  updatedAt: string
  effectReceiptRef?: string
  result?: CapabilityResult
  failureCode?: string
}

export type DurableReserveDecision =
  | { status: 'reserved'; record: DurableIdempotencyRecord }
  | { status: 'existing'; record: DurableIdempotencyRecord }
  | { status: 'conflict' }

export type DurableMutationDecision =
  | { status: 'applied'; record: DurableIdempotencyRecord }
  | { status: 'not_found' | 'binding_mismatch' | 'version_conflict' | 'invalid_transition' }

export type ReconciliationResolution =
  | { outcome: 'completed'; result: CapabilityResult }
  | { outcome: 'failed_retryable'; failureCode: string }
  | { outcome: 'failed_terminal'; failureCode: string }

export interface DurableIdempotencyStore {
  reserve(
    binding: IdempotencyBinding,
    idempotencyKey: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<DurableReserveDecision>
  inspectByKey(binding: IdempotencyBinding, idempotencyKey: string, now: Date): Promise<DurableReserveDecision | { status: 'empty' }>
  inspectByOperationRef(operationRef: OperationRef, now: Date): Promise<DurableIdempotencyRecord | null>
  startExecution(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<DurableMutationDecision>
  recordEffectApplied(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    effectReceiptRef: string,
    now: Date,
  ): Promise<DurableMutationDecision>
  complete(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    result: CapabilityResult,
    now: Date,
  ): Promise<DurableMutationDecision>
  failBeforeEffect(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    failureCode: string,
    retryable: boolean,
    now: Date,
  ): Promise<DurableMutationDecision>
  requireReconciliation(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    failureCode: string,
    now: Date,
  ): Promise<DurableMutationDecision>
  retry(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    expectedVersion: number,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<DurableMutationDecision>
  applyAuthorizedReconciliation(
    operationRef: OperationRef,
    workspaceId: string,
    expectedVersion: number,
    resolution: ReconciliationResolution,
    now: Date,
  ): Promise<DurableMutationDecision>
}

export type ServerEffectCommand = {
  dispatcher: string
  commandRef: string
}

export type DurableOutboxRecord = {
  outboxRef: string
  operationRef: OperationRef
  binding: IdempotencyBinding
  command: ServerEffectCommand
  state: DurableOutboxState
  attempt: number
  version: number
  leaseExpiresAt?: string
  receiptRef?: string
  failureCode?: string
  createdAt: string
  updatedAt: string
}

export type OutboxMutationDecision =
  | { status: 'applied'; record: DurableOutboxRecord }
  | { status: 'not_found' | 'version_conflict' | 'invalid_transition' }

export interface DurableOutbox {
  enqueue(
    operationRef: OperationRef,
    binding: IdempotencyBinding,
    command: ServerEffectCommand,
    now: Date,
  ): Promise<DurableOutboxRecord>
  claim(outboxRef: string, expectedVersion: number, workerRef: string, now: Date, leaseExpiresAt: Date): Promise<OutboxMutationDecision>
  recordDelivered(outboxRef: string, expectedVersion: number, receiptRef: string, now: Date): Promise<OutboxMutationDecision>
  recordFailure(outboxRef: string, expectedVersion: number, failureCode: string, retryable: boolean, now: Date): Promise<OutboxMutationDecision>
  inspect(outboxRef: string, now: Date): Promise<DurableOutboxRecord | null>
}

export type ReconciliationActor = {
  actorId: string
  workspaceId: string
  authentication: 'user_session' | 'service_principal'
  permissions: ReadonlySet<string>
  requestId: string
}

export type ReconciliationRequest = {
  operationRef: OperationRef
  expectedVersion: number
  requestedOutcome: 'completed' | 'failed_retryable' | 'failed_terminal'
  reason: 'read_after_write' | 'provider_receipt' | 'verified_effect_absence'
}

export type ReconciliationVerification =
  | { outcome: 'effect_applied'; result: CapabilityResult }
  | { outcome: 'effect_absent' }
  | { outcome: 'inconclusive' }

export interface ReconciliationVerifier {
  verify(record: DurableIdempotencyRecord, request: ReconciliationRequest): Promise<ReconciliationVerification>
}

export type ReconciliationAuditEvent = {
  event: 'assistant.operation.reconciliation'
  requestId: string
  actorId: string
  workspaceId: string
  operationRef: OperationRef
  requestedOutcome: ReconciliationRequest['requestedOutcome']
  decision: 'completed' | 'failed_retryable' | 'failed_terminal' | 'denied' | 'conflict' | 'inconclusive' | 'unavailable'
  reasonCode: string
}

export interface ReconciliationAuditSink {
  emit(event: ReconciliationAuditEvent): Promise<void>
}

export function validOperationRef(value: string): boolean {
  return /^[A-Za-z0-9_-]{24,200}$/.test(value)
}
