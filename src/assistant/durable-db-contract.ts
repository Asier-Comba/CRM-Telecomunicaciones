import type { AuditEvent, CapabilityResult, IdempotencyBinding } from './contracts.ts'
import { DURABLE_MAPPING_MANIFEST } from './durable-mapping-manifest.ts'
import {
  CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES,
  type DurableIdempotencyRecord, type ReconciliationActor, type ReconciliationAuditEvent,
  type ReconciliationResolution,
  type DurableConfirmationRecord, type ConfirmationMutationDecision, type DurableReserveDecision,
  type DurableMutationDecision, type ServerEffectCommand, type OutboxMutationDecision,
} from './durable-contracts.ts'

/** Semantic contract only: W2 owns SQL, columns, RLS and the durable implementation. */
export const DURABLE_DB_CONTRACT_V1 = {
  version: 'assistant.durable-db.v1',
  fields: DURABLE_MAPPING_MANIFEST,
  states: { confirmation: CONFIRMATION_STATES, operation: IDEMPOTENCY_STATES, outbox: OUTBOX_STATES },
  binding: ['actorId', 'workspaceId', 'capability', 'argumentsDigest'],
  digestAlgorithm: 'w3-canonical-json-localeCompare-sha256-v1',
  uniqueness: {
    reservation: ['workspaceId', 'capability', 'idempotencyKey'],
    operation: ['workspaceId', 'operationRef'],
    effectOutbox: ['workspaceId', 'operationRef'],
    auditIntent: ['workspaceId', 'eventRef'],
  },
  transactions: {
    confirmReserveEnqueue: ['consume_confirmation', 'reserve_operation', 'enqueue_registered_command', 'audit_intent', 'audit_delivery_outbox'],
    complete: ['store_safe_result', 'transition', 'audit_intent', 'audit_delivery_outbox'],
    reconcile: ['reauthorize', 'compare_binding_version_state', 'store_safe_result', 'transition', 'audit_intent', 'audit_delivery_outbox'],
    claim: ['reauthorize_worker', 'compare_version_and_lease', 'persist_claim_fence'],
    acknowledge: ['compare_claim_fence', 'persist_receipt_and_state'],
  },
  effectsEnabled: false,
} as const

export type VerifiedReconciliationCommit = {
  actor: ReconciliationActor
  operationRef: string
  expectedVersion: number
  binding: IdempotencyBinding
  idempotencyKey: string
  resolution: ReconciliationResolution
  eventRef: string
  auditIntent: ReconciliationAuditEvent
  now: Date
}
export type ReconciliationCommitDecision =
  | { status: 'applied'; record: DurableIdempotencyRecord; eventRef: string; auditIntentPersisted: true }
  | { status: 'not_found' | 'forbidden' | 'binding_mismatch' | 'version_conflict' | 'invalid_transition' }

/** REQUIRED by AuthorizedReconciliationService; no legacy state-only fallback.
 * Methods use authenticated server principals, never browser/model actor objects.
 * Reauthorize current principal and operation access inside the DB transaction.
 */
export interface ReconciliationPersistence {
  loadAuthorizedOperation(actor: ReconciliationActor, operationRef: string, now: Date): Promise<DurableIdempotencyRecord | null>
  /** Atomically persist result + transition + immutable audit intent + delivery
   * outbox. Throw/rollback on pre-commit failure; a lost post-commit reply may
   * return UNAVAILABLE but MUST leave the original intent durable. Never emit
   * to an external sink here. Same eventRef with different content conflicts.
   */
  commitVerifiedReconciliation(command: VerifiedReconciliationCommit): Promise<ReconciliationCommitDecision>
}

/** Server application seam for W2. No SDK, SQL, provider URL or browser token.
 * W2 may compose these methods over its internal service/RPC names. These are
 * requested semantics, not evidence that a database implementation exists.
 */
export interface DurableDatabasePort extends ReconciliationPersistence {
  issueConfirmation(actor: ReconciliationActor, binding: IdempotencyBinding, expiresAt: Date): Promise<DurableConfirmationRecord>
  cancelConfirmation(actor: ReconciliationActor, confirmationRef: string, binding: IdempotencyBinding): Promise<ConfirmationMutationDecision>
  reserveOperation(actor: ReconciliationActor, binding: IdempotencyBinding, key: string): Promise<DurableReserveDecision>
  confirmReserveEnqueue(actor: ReconciliationActor, command: {
    confirmationRef: string; binding: IdempotencyBinding; idempotencyKey: string; command: ServerEffectCommand
  }): Promise<DurableReserveDecision | { status: 'invalid_confirmation' | 'forbidden' }>
  startExecution(actor: ReconciliationActor, operationRef: string, binding: IdempotencyBinding, expectedVersion: number): Promise<DurableMutationDecision>
  transitionToReconciliation(actor: ReconciliationActor, operationRef: string, binding: IdempotencyBinding, expectedVersion: number, reasonCode: string): Promise<DurableMutationDecision>
  completeOperationWithAuditIntent(actor: ReconciliationActor, command: {
    operationRef: string; binding: IdempotencyBinding; expectedVersion: number
    result: CapabilityResult; eventRef: string; auditIntent: AuditEvent
  }): Promise<DurableMutationDecision>
  claimOutbox(actor: ReconciliationActor, outboxRef: string, expectedVersion: number): Promise<
    (Extract<OutboxMutationDecision, { status: 'applied' }> & { claimFence: string }) | Exclude<OutboxMutationDecision, { status: 'applied' }>
  >
  ackOutbox(actor: ReconciliationActor, outboxRef: string, expectedVersion: number, claimFence: string, receiptRef: string): Promise<OutboxMutationDecision>
}
