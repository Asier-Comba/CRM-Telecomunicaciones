/** Complete-ledger acceptance semantics; not a DB implementation or approval. */
import {DURABLE_PROCESS_SCENARIOS,validateDurableObservation as validateV2Observation,type DurableProcessScenario,type DurableObservation as ObservationV2} from './durable-process-spec.ts'
export {DURABLE_PROCESS_SCENARIOS,DURABLE_ROLLBACK_POINTS,validateRollbackEvidence,validateDatabaseRestartEvidence,validateClaimFenceEvidence,validateImmutableAuditEvidence} from './durable-process-spec.ts'
export const DURABLE_PROCESS_CONTRACT='assistant.durable-process.v3' as const
export type DurableObservation=ObservationV2&{
 reservationAuditIntents:number;outcomeAuditIntents:number;otherAuditIntents:number
 outcomeDeliveredEvents:number;outcomePendingEvents:number
 baselineOriginalAuditIntents:number;baselineDeliveredOriginalEvents:number;baselinePendingOriginalEvents:number
 baselineAuditContentDigest:string;persistedBaselineAuditContentDigest:string
}
const coreNumeric=['operationCount','executionAuthorizations','effectCount','originalAuditIntents','deliveredOriginalEvents','pendingOriginalEvents','unauthorizedRows','forbiddenTransitions','unregisteredDispatches','automaticRedispatches'] as const
const ledgerNumeric=['reservationAuditIntents','outcomeAuditIntents','otherAuditIntents','outcomeDeliveredEvents','outcomePendingEvents','baselineOriginalAuditIntents','baselineDeliveredOriginalEvents','baselinePendingOriginalEvents'] as const
const numeric=[...coreNumeric,...ledgerNumeric]
const keys=[...numeric,'state','baselineAuditContentDigest','persistedBaselineAuditContentDigest']
function snapshot(value:unknown):DurableObservation|null{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return null
  const descriptors=Object.getOwnPropertyDescriptors(value)
  if(Reflect.ownKeys(descriptors).length!==keys.length||!keys.every(k=>descriptors[k]?.enumerable&&'value'in descriptors[k]!))return null
  const v=Object.fromEntries(keys.map(k=>[k,descriptors[k]!.value])) as DurableObservation
  if(numeric.some(k=>!Number.isSafeInteger(v[k])||v[k]<0)||typeof v.state!=='string')return null
  if(typeof v.baselineAuditContentDigest!=='string'||typeof v.persistedBaselineAuditContentDigest!=='string'
   ||!/^[a-f0-9]{64}$/.test(v.baselineAuditContentDigest)||!/^[a-f0-9]{64}$/.test(v.persistedBaselineAuditContentDigest))return null
  return v
 }catch{return null}
}
function addsTo(total:number,...parts:number[]):boolean{
 let sum=0
 for(const part of parts){sum+=part;if(!Number.isSafeInteger(sum))return false}
 return sum===total
}
/** Totals cover EVERY immutable intent/delivery for the one operation. Outcome
 * counters identify its one completed/verified-reconciliation transition, never
 * a replacement for the original reservation or intermediate recovery audits.
 * Baseline fingerprints/counts are measured before hostile work and independently
 * reread afterward; fixtures cannot replace valid authorization targets with
 * unaudited legacy rows merely to pass the negative scenarios.
 */
export function validateDurableObservation(id:DurableProcessScenario,value:unknown):boolean{
 if(!DURABLE_PROCESS_SCENARIOS.some(s=>s.id===id))return false
 const v=snapshot(value);if(!v)return false
 if(!addsTo(v.originalAuditIntents,v.reservationAuditIntents,v.outcomeAuditIntents,v.otherAuditIntents)
  ||!addsTo(v.originalAuditIntents,v.deliveredOriginalEvents,v.pendingOriginalEvents)
  ||!addsTo(v.outcomeAuditIntents,v.outcomeDeliveredEvents,v.outcomePendingEvents)
  ||!addsTo(v.baselineOriginalAuditIntents,v.baselineDeliveredOriginalEvents,v.baselinePendingOriginalEvents)
  ||v.baselineOriginalAuditIntents>v.originalAuditIntents
  ||v.baselineAuditContentDigest!==v.persistedBaselineAuditContentDigest
  ||v.reservationAuditIntents!==1)return false
 const negative=['cross_workspace_lookup','cross_actor_lookup','changed_digest','revoked_principal'].includes(id)
 if(negative){
  if(v.outcomeAuditIntents!==0||v.otherAuditIntents<1||v.originalAuditIntents<2
   ||v.originalAuditIntents!==v.baselineOriginalAuditIntents
   ||v.deliveredOriginalEvents!==v.baselineDeliveredOriginalEvents||v.pendingOriginalEvents!==v.baselinePendingOriginalEvents)return false
 }else if(v.outcomeAuditIntents!==1||v.outcomeDeliveredEvents!==1||v.outcomePendingEvents!==0
  ||v.originalAuditIntents<2||v.deliveredOriginalEvents!==v.originalAuditIntents||v.pendingOriginalEvents!==0)return false
 // Preserve every v2 business invariant: one operation/effect, exact expected
 // authorizations, zero forbidden/foreign/unregistered/automatic redispatches.
 // The formerly ambiguous counters are now explicitly its outcome event subset;
 // complete-ledger constraints ABOVE must all pass before this semantic check.
 const core=Object.fromEntries(coreNumeric.map(k=>[k,v[k]]))
 return validateV2Observation(id,{...core,originalAuditIntents:v.outcomeAuditIntents,
  deliveredOriginalEvents:v.outcomeDeliveredEvents,pendingOriginalEvents:v.outcomePendingEvents,state:v.state})
}
/** Independently inspected after outcome commit while the sink is unavailable.
 * Admit exact data before reading counters; no evidence getter is evaluated.
 * Final validation still requires delivery of ALL original events after recovery.
 */
export function validateAuditOutageObservation(value:unknown):boolean{
 const v=snapshot(value);if(!v)return false
 if(v.reservationAuditIntents!==1||v.outcomeAuditIntents!==1||v.outcomePendingEvents!==1||v.outcomeDeliveredEvents!==0
  ||v.originalAuditIntents<2||v.pendingOriginalEvents<1
  ||!addsTo(v.originalAuditIntents,v.reservationAuditIntents,v.outcomeAuditIntents,v.otherAuditIntents)
  ||!addsTo(v.originalAuditIntents,v.deliveredOriginalEvents,v.pendingOriginalEvents)
  ||!addsTo(v.baselineOriginalAuditIntents,v.baselineDeliveredOriginalEvents,v.baselinePendingOriginalEvents)
  ||v.baselineOriginalAuditIntents>v.originalAuditIntents||v.baselineAuditContentDigest!==v.persistedBaselineAuditContentDigest)return false
 const core=Object.fromEntries(coreNumeric.map(k=>[k,v[k]]))
 return validateV2Observation('audit_delivery_outage',{...core,originalAuditIntents:1,deliveredOriginalEvents:1,pendingOriginalEvents:0,state:v.state})
}
