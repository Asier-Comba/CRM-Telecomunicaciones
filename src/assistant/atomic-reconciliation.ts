import type { ReconciliationAuditEvent } from './durable-contracts.js'
import { validOperationRef } from './durable-contracts.js'
import { isSafeEvidenceText } from './context-budget.js'

/** Candidate production boundary, NOT an implemented durable adapter.
 * Precondition: server authorization, independent verification and registered
 * capability output validation succeeded. The transaction repeats tenant,
 * immutable binding and expected-version checks under the database lock.
 */
export type AtomicReconciliationCommand = {
  workspaceId: string
  operationRef: string
  expectedVersion: number
  binding: { actorId: string; capability: string; argumentsDigest: string }
  resolution:
    | { state: 'completed'; safeResultRef: string }
    | { state: 'failed_retryable' | 'failed_terminal'; failureCode: string }
  /** Stable server-issued ID, reused for transport retries of this command. */
  eventRef: string
  audit: ReconciliationAuditEvent
}
export type AtomicOperationSnapshot = {
  workspaceId: string; operationRef: string; version: number
  binding: AtomicReconciliationCommand['binding']
  state: 'reconciliation_required' | 'completed' | 'failed_retryable' | 'failed_terminal'
  safeResultRef?: string
  failureCode?: string
}
export type AtomicAuditOutboxItem = {
  workspaceId: string; operationRef: string; eventRef: string
  event: ReconciliationAuditEvent
  status: 'pending' | 'delivered'
}
export type AtomicReconciliationDecision =
  | { status: 'applied' | 'replayed'; operation: AtomicOperationSnapshot; eventRef: string }
  | { status: 'not_found' | 'binding_mismatch' | 'conflict' }

export interface AtomicReconciliationAdapter {
  /** One durable transaction: scope/CAS + transition + immutable audit + audit
   * delivery outbox. Any pre-commit failure rolls all four back. Replay must
   * match the complete canonical command, not just a reused eventRef.
   */
  commit(command: AtomicReconciliationCommand): Promise<AtomicReconciliationDecision>
  inspect(workspaceId: string, operationRef: string): Promise<AtomicOperationSnapshot | null>
  /** Bounded workspace-scoped batch; production workers need expiring claims. */
  pendingAudits(workspaceId: string, limit: number): Promise<readonly AtomicAuditOutboxItem[]>
  acknowledgeAudit(workspaceId: string, eventRef: string): Promise<void>
}

export interface IdempotentAuditSink {
  /** Sink MUST atomically deduplicate (workspaceId,eventRef) against exact event
   * content before acknowledging. This is at-least-once delivery, not a promise
   * of exactly-once execution at arbitrary external providers.
   */
  accept(item: AtomicAuditOutboxItem): Promise<void>
}

/** No business side effect is dispatched by reconciliation or this audit worker.
 * A sink or acknowledgement outage leaves the committed event pending for replay.
 */
export async function deliverReconciliationAudits(
  adapter: AtomicReconciliationAdapter,
  sink: IdempotentAuditSink,
  workspaceId: string,
  limit = 20,
): Promise<{ acknowledged: number; unavailable: boolean }> {
  if (!workspaceId || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return { acknowledged: 0, unavailable: true }
  let acknowledged = 0
  try {
    const batch = await adapter.pendingAudits(workspaceId, limit)
    if (batch.length > limit || batch.some(item => {
      if (!item || item.workspaceId !== workspaceId || item.status !== 'pending' ||
        !validOperationRef(item.operationRef) || !validOperationRef(item.eventRef) || !item.event ||
        Object.keys(item).sort().join(',') !== 'event,eventRef,operationRef,status,workspaceId') return true
      const event = item.event
      return Object.keys(event).sort().join(',') !== 'actorId,decision,event,operationRef,reasonCode,requestId,requestedOutcome,workspaceId' ||
        event.workspaceId !== workspaceId || event.operationRef !== item.operationRef ||
        event.event !== 'assistant.operation.reconciliation' ||
        !['completed', 'failed_retryable', 'failed_terminal'].includes(event.decision) || event.decision !== event.requestedOutcome ||
        !Object.values(event).every(value => isSafeEvidenceText(value, 200))
    })) return { acknowledged, unavailable: true }
    for (const item of batch) {
      await sink.accept(structuredClone(item))
      await adapter.acknowledgeAudit(workspaceId, item.eventRef)
      acknowledged++
    }
    return { acknowledged, unavailable: false }
  } catch { return { acknowledged, unavailable: true } }
}
