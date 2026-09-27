// Adapter conformance contract. No adapter => no database run or durability claim.
// The reviewed adapter must execute real isolated PostgreSQL operations; reports
// are checked here, not manufactured from fixtures in a release evidence job.
export const DURABILITY_CASES = Object.freeze([
  'reserve-race-20', 'confirmation-race-20', 'restart-after-reservation',
  'restart-after-effect', 'lease-expiration', 'kill-after-effect',
  'atomic-operation-outbox', 'audit-outage', 'reconciliation-race-20',
  'cross-workspace', 'cross-actor',
])
const safeCode = /^[a-z][a-z0-9_]{0,63}$/
export async function runNativeDurabilitySuite(adapter) {
  if (!adapter || typeof adapter.run !== 'function' || typeof adapter.environment !== 'function') throw Error('durable_adapter_missing')
  const environment = await adapter.environment()
  if (environment?.engine !== 'native-postgresql' || environment.environment !== 'test' || environment.synthetic !== true || environment.isolated !== true || environment.productionReachable !== false) throw Error('native_isolated_environment_required')
  const results=[]
  for (const id of DURABILITY_CASES) {
    const r=await adapter.run(id)
    if (!r || r.caseId !== id || r.passed !== true || r.crossWorkspaceAccess !== false || r.crossActorAccess !== false || r.automaticSecondEffect !== false) throw Error(`${id}:security_invariant_failed`)
    if (!Number.isSafeInteger(r.effectCount) || r.effectCount < 0 || r.effectCount > 1) throw Error(`${id}:effect_count_invalid`)
    if (!Array.isArray(r.backendPids) || r.backendPids.some(p=>!Number.isSafeInteger(p)||p<=0) || !r.backendPids.length) throw Error(`${id}:backend_identity_missing`)
    if (!Array.isArray(r.clientPids) || r.clientPids.some(p=>!Number.isSafeInteger(p)||p<=0) || !r.clientPids.length) throw Error(`${id}:process_identity_missing`)
    if (id.endsWith('race-20') && (new Set(r.backendPids).size<20 || new Set(r.clientPids).size<20 || r.winners!==1)) throw Error(`${id}:independent_race_not_proven`)
    if (['restart-after-reservation','restart-after-effect','kill-after-effect'].includes(id) && (r.processRestartObserved!==true || r.persistedStateRecovered!==true || new Set(r.clientPids).size<2)) throw Error(`${id}:restart_not_proven`)
    if (id==='kill-after-effect' && (r.killSignalObserved!==true || r.effectCount!==1)) throw Error(`${id}:kill_cutpoint_missing`)
    if (id==='lease-expiration' && r.finalState!=='reconciliation_required') throw Error(`${id}:unsafe_lease_recovery`)
    if (id==='atomic-operation-outbox' && (r.atomicCommitVerified!==true || r.orphanOutboxCount!==0)) throw Error(`${id}:atomicity_missing`)
    if (id==='audit-outage' && (r.originalAuditIntentCount!==1 || r.originalAuditDeliveredCount!==1 || r.sinkOutageInjected!==true || r.atomicCommitVerified!==true)) throw Error(`${id}:original_audit_not_preserved`)
    if (['cross-workspace','cross-actor'].includes(id) && (r.effectCount!==0 || r.denied!==true)) throw Error(`${id}:denial_not_proven`)
    if (r.errorCode !== undefined && !safeCode.test(r.errorCode)) throw Error(`${id}:unbounded_error`)
    // Never propagate arbitrary adapter payload/log/PII fields into evidence.
    results.push({caseId:id,passed:true})
  }
  return {engine:'native-postgresql',results}
}
