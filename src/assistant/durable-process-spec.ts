/** Portable W2/W4 native DB acceptance protocol, not a persistence implementation. */
export const DURABLE_PROCESS_CONTRACT = 'assistant.durable-process.v2' as const
export const DURABLE_ROLLBACK_POINTS = ['after_confirmation_lookup', 'after_confirmation_consume', 'after_operation_insert', 'after_command_insert', 'after_outbox_insert', 'before_commit'] as const
export const DURABLE_PROCESS_SCENARIOS = [
  { id: 'reserve_race', workers: 20, action: 'reserve_and_start', recover: true },
  { id: 'confirmation_race', workers: 20, action: 'confirm_reserve_enqueue', recover: true },
  { id: 'claim_race', workers: 20, action: 'claim_and_dispatch', recover: true },
  { id: 'reconciliation_race', workers: 20, action: 'reconcile', recover: true },
  { id: 'atomic_operation_outbox', workers: 1, action: 'rollback_then_enqueue', recover: true },
  { id: 'crash_before_reservation', workers: 1, action: 'execute', killAt: 'before_reservation', recover: true },
  { id: 'crash_after_reservation', workers: 1, action: 'execute', killAt: 'after_reservation', recover: true },
  { id: 'kill_before_effect', workers: 1, action: 'execute', killAt: 'after_authorization_before_effect', recover: true },
  { id: 'kill_after_effect', workers: 1, action: 'execute', killAt: 'after_effect_before_completion', recover: true },
  { id: 'kill_after_transition', workers: 1, action: 'execute', killAt: 'after_transition_commit', recover: true },
  { id: 'audit_ack_loss', workers: 1, action: 'deliver_audit', killAt: 'after_sink_acceptance_before_ack', recover: true },
  { id: 'database_connection_termination', workers: 1, action: 'terminate_transaction_connection', recover: true },
  { id: 'database_restart', workers: 1, action: 'restart_disposable_database_after_commit', recover: true },
  { id: 'committed_reply_loss', workers: 1, action: 'lose_confirmed_commit_reply', recover: true },
  { id: 'claim_fencing', workers: 1, action: 'reject_stale_claims', recover: true },
  { id: 'audit_content_conflict', workers: 1, action: 'reject_changed_audit_content', recover: true },
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
  if (!DURABLE_PROCESS_SCENARIOS.some(scenario => scenario.id === id)) return false
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
  // A killed, already-authorized attempt with independently verified absence
  // needs a second EXPLICIT authorization. Never mislabel it automatic retry.
  const authorizations = id === 'kill_before_effect' ? 2 : 1
  return o.operationCount === 1 && o.executionAuthorizations === authorizations && o.effectCount === 1 &&
    o.originalAuditIntents === 1 && o.deliveredOriginalEvents === 1 && o.pendingOriginalEvents === 0 && o.state === 'completed'
}

/** Driver measurements after rollback, before valid retry, from a separate DB
 * connection. Counts are deltas relative to the issued confirmation fixture.
 */
export function validateRollbackEvidence(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== DURABLE_ROLLBACK_POINTS.length) return false
  const keys = ['point', 'consumedConfirmations', 'operations', 'commands', 'outbox', 'auditIntents', 'auditDeliveries'] as const
  return DURABLE_ROLLBACK_POINTS.every((point, index) => {
    const row = value[index]
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false
    const fields = Object.getOwnPropertyDescriptors(row)
    return Reflect.ownKeys(fields).length === keys.length && keys.every(k => fields[k] && 'value' in fields[k]) &&
      fields.point!.value === point && keys.slice(1).every(k => fields[k]!.value === 0)
  })
}

/** Actual postmaster restart, not connection termination. Identifiers are
 * measured inside the reviewed disposable driver; never emitted in reports.
 * The unchanged logical intent must survive the same cluster's restart. */
export function validateDatabaseRestartEvidence(value: unknown): boolean {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const fields = Object.getOwnPropertyDescriptors(value)
    const keys = ['beforeSystemIdentifier', 'afterSystemIdentifier', 'beforePostmasterStartMs', 'afterPostmasterStartMs', 'originalBindingDigest', 'persistedBindingDigest'] as const
    if (Reflect.ownKeys(fields).length !== keys.length || !keys.every(key => fields[key] && 'value' in fields[key])) return false
    const v = Object.fromEntries(keys.map(key => [key, fields[key]!.value]))
    return typeof v.beforeSystemIdentifier === 'string' && /^[1-9][0-9]{0,19}$/.test(v.beforeSystemIdentifier)
      && v.afterSystemIdentifier === v.beforeSystemIdentifier
      && Number.isSafeInteger(v.beforePostmasterStartMs) && v.beforePostmasterStartMs > 0
      && Number.isSafeInteger(v.afterPostmasterStartMs) && v.afterPostmasterStartMs > v.beforePostmasterStartMs
      && typeof v.originalBindingDigest === 'string' && /^[a-f0-9]{64}$/.test(v.originalBindingDigest)
      && v.persistedBindingDigest === v.originalBindingDigest
  } catch { return false }
}
