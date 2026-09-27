/** Portable W2/W4 native DB acceptance protocol, not a persistence implementation. */
export const DURABLE_PROCESS_SCENARIOS = [
  { id: 'reserve_race', workers: 20, action: 'reserve_and_start', recover: true },
  { id: 'confirmation_race', workers: 20, action: 'confirm_reserve_enqueue', recover: true },
  { id: 'crash_before_reservation', workers: 1, action: 'execute', killAt: 'before_reservation', recover: true },
  { id: 'crash_after_reservation', workers: 1, action: 'execute', killAt: 'after_reservation', recover: true },
  { id: 'kill_after_effect', workers: 1, action: 'execute', killAt: 'after_effect_before_completion', recover: true },
  { id: 'audit_delivery_outage', workers: 1, action: 'reconcile_with_sink_down', recover: true },
  { id: 'outbox_ack_loss', workers: 1, action: 'dispatch', killAt: 'after_effect_before_ack', recover: true },
  { id: 'lease_expiry', workers: 1, action: 'expire_executing_lease', recover: true },
  { id: 'cross_workspace_lookup', workers: 1, action: 'foreign_workspace_lookup', recover: false },
  { id: 'cross_actor_lookup', workers: 1, action: 'foreign_actor_lookup', recover: false },
  { id: 'changed_digest', workers: 1, action: 'reserve_changed_digest', recover: false },
  { id: 'revoked_principal', workers: 1, action: 'commit_after_revocation', recover: false },
] as const
export type DurableProcessScenario = typeof DURABLE_PROCESS_SCENARIOS[number]['id']
export type DurableObservation = {
  operationCount: number; executionAuthorizations: number; effectCount: number
  originalAuditIntents: number; deliveredOriginalEvents: number; pendingOriginalEvents: number
  unauthorizedRows: number; forbiddenTransitions: number; unregisteredDispatches: number
  automaticRedispatches: number; state: string
}
/** Counters are scoped to the fixture's one binding/operation, measured from DB
 * plus an independent synthetic effect ledger. Never count client assertions.
 */
export function validateDurableObservation(id: DurableProcessScenario, value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as DurableObservation
  const numeric = ['operationCount', 'executionAuthorizations', 'effectCount', 'originalAuditIntents', 'deliveredOriginalEvents', 'pendingOriginalEvents', 'unauthorizedRows', 'forbiddenTransitions', 'unregisteredDispatches', 'automaticRedispatches'] as const
  if (Object.keys(o).sort().join(',') !== [...numeric, 'state'].sort().join(',') ||
    numeric.some(k => !Number.isSafeInteger(o[k]) || o[k] < 0) || typeof o.state !== 'string') return false
  if (o.unauthorizedRows || o.forbiddenTransitions || o.unregisteredDispatches || o.automaticRedispatches) return false
  if (['cross_workspace_lookup', 'cross_actor_lookup', 'changed_digest', 'revoked_principal'].includes(id)) {
    return o.operationCount === 1 && o.executionAuthorizations === 0 && o.effectCount === 0 &&
      o.originalAuditIntents === 0 && o.deliveredOriginalEvents === 0 && o.pendingOriginalEvents === 0 && o.state === 'reconciliation_required'
  }
  return o.operationCount === 1 && o.executionAuthorizations === 1 && o.effectCount === 1 &&
    o.originalAuditIntents === 1 && o.deliveredOriginalEvents === 1 && o.pendingOriginalEvents === 0 && o.state === 'completed'
}
