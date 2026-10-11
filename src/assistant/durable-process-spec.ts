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

/** Snapshot exact enumerable own data; do not evaluate evidence accessors. */
function evidenceRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null
    const fields = Object.getOwnPropertyDescriptors(value as object)
    if (Reflect.ownKeys(fields).length !== keys.length || !keys.every(key => fields[key]?.enumerable && 'value' in fields[key]!)) return null
    return Object.fromEntries(keys.map(key => [key, fields[key]!.value]))
  } catch { return null }
}

/** A dense ordinary array only; reject inherited/accessor/private entries. */
function evidenceRows(value: unknown, length: number): unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null
    const fields = Object.getOwnPropertyDescriptors(value as object)
    if (!fields.length || !('value' in fields.length) || fields.length.value !== length || Reflect.ownKeys(fields).length !== length + 1) return null
    const keys = Array.from({ length }, (_, index) => String(index))
    if (!keys.every(key => fields[key]?.enumerable && 'value' in fields[key]!)) return null
    return keys.map(key => fields[key]!.value)
  } catch { return null }
}
/** Counters are scoped to the fixture's one binding/operation, measured from DB
 * plus an independent synthetic effect ledger. Never count client assertions.
 */
export function validateDurableObservation(id: DurableProcessScenario, value: unknown): boolean {
  if (!DURABLE_PROCESS_SCENARIOS.some(scenario => scenario.id === id)) return false
  const numeric = ['operationCount', 'executionAuthorizations', 'effectCount', 'originalAuditIntents', 'deliveredOriginalEvents', 'pendingOriginalEvents', 'unauthorizedRows', 'forbiddenTransitions', 'unregisteredDispatches', 'automaticRedispatches'] as const
  const data = evidenceRecord(value, [...numeric, 'state'])
  if (!data) return false
  const o = data as DurableObservation
  if (numeric.some(k => !Number.isSafeInteger(o[k]) || o[k] < 0) || typeof o.state !== 'string') return false
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
  const rows = evidenceRows(value, DURABLE_ROLLBACK_POINTS.length)
  if (!rows) return false
  const keys = ['point', 'consumedConfirmations', 'operations', 'commands', 'outbox', 'auditIntents', 'auditDeliveries'] as const
  return DURABLE_ROLLBACK_POINTS.every((point, index) => {
    const row = evidenceRecord(rows[index], keys)
    return !!row && row.point === point && keys.slice(1).every(k => row[k] === 0)
  })
}

/** Actual postmaster restart, not connection termination. Identifiers are
 * measured inside the reviewed disposable driver; never emitted in reports.
 * The unchanged logical intent must survive the same cluster's restart. */
export function validateDatabaseRestartEvidence(value: unknown): boolean {
  try {
    const keys = ['beforeSystemIdentifier', 'afterSystemIdentifier', 'beforePostmasterStartMs', 'afterPostmasterStartMs', 'originalBindingDigest', 'persistedBindingDigest'] as const
    const v = evidenceRecord(value, keys)
    if (!v) return false
    return typeof v.beforeSystemIdentifier === 'string' && /^[1-9][0-9]{0,19}$/.test(v.beforeSystemIdentifier)
      && v.afterSystemIdentifier === v.beforeSystemIdentifier
      && typeof v.beforePostmasterStartMs === 'number' && Number.isSafeInteger(v.beforePostmasterStartMs) && v.beforePostmasterStartMs > 0
      && typeof v.afterPostmasterStartMs === 'number' && Number.isSafeInteger(v.afterPostmasterStartMs) && v.afterPostmasterStartMs > v.beforePostmasterStartMs
      && typeof v.originalBindingDigest === 'string' && /^[a-f0-9]{64}$/.test(v.originalBindingDigest)
      && v.persistedBindingDigest === v.originalBindingDigest
  } catch { return false }
}

/** Exact persisted fence measurements; reading a driver object is not proof
 * that its lease, owner or rejection ledger came from PostgreSQL. */
export function validateClaimFenceEvidence(value: unknown): boolean {
  const data = evidenceRecord(value, ['priorFence', 'currentFence', 'changedRows', 'rejected'])
  if (!data || typeof data.priorFence !== 'number' || !Number.isSafeInteger(data.priorFence) || data.priorFence < 1 ||
    typeof data.currentFence !== 'number' || !Number.isSafeInteger(data.currentFence) || data.currentFence <= data.priorFence || data.changedRows !== 0) return false
  const expected = ['expired_owner', 'stale_version', 'wrong_worker', 'wrong_workspace', 'wrong_operation', 'old_fence', 'future_fence']
  const rejected = evidenceRows(data.rejected, expected.length)
  return !!rejected && expected.every((reason, index) => rejected[index] === reason)
}

/** Snapshot the original audit identity without executing evidence getters.
 * The actual ledger, collision attempt and native driver still need review. */
export function validateImmutableAuditEvidence(value: unknown): boolean {
  const data = evidenceRecord(value, ['originalDigest', 'persistedDigest', 'changedContentRejected'])
  return !!data && typeof data.originalDigest === 'string' && /^[a-f0-9]{64}$/.test(data.originalDigest) &&
    data.persistedDigest === data.originalDigest && data.changedContentRejected === true
}
