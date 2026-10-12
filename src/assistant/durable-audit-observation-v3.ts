import {createHash} from 'node:crypto'
import type {IdempotencyBinding} from './contracts.ts'
import type {DurableObservation} from './durable-process-spec-v3.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'

type AuditRowV3=IdempotencyBinding&{operationRef:string;eventRef:string;event:string;contentDigest:string;deliveryState:'pending'|'delivered'}
type AuditScopeV3=IdempotencyBinding&{operationRef:string}
declare const baseline:unique symbol
export type DurableAuditBaselineV3=Readonly<{[baseline]:true}>
export type DurableAuditLedgerObservationV3=Readonly<Pick<DurableObservation,
  'originalAuditIntents'|'deliveredOriginalEvents'|'pendingOriginalEvents'|
  'reservationAuditIntents'|'outcomeAuditIntents'|'otherAuditIntents'|
  'outcomeDeliveredEvents'|'outcomePendingEvents'|'baselineOriginalAuditIntents'|
  'baselineDeliveredOriginalEvents'|'baselinePendingOriginalEvents'|
  'baselineAuditContentDigest'|'persistedBaselineAuditContentDigest'>>
const records=new WeakMap<object,{scope:AuditScopeV3;rows:readonly AuditRowV3[];digest:string}>()
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v)
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const exact=(v:Record<string,unknown>,keys:string)=>Object.keys(v).sort().join(',')===keys
const events=['assistant.operation.reserved','assistant.operation.effect_applied','assistant.operation.recovery_required','assistant.capability.completed','assistant.operation.reconciliation']
const outcome=(r:AuditRowV3)=>r.event==='assistant.capability.completed'||r.event==='assistant.operation.reconciliation'
const fingerprint=(rows:readonly AuditRowV3[])=>createHash('sha256').update(JSON.stringify([...rows].sort((a,b)=>a.eventRef.localeCompare(b.eventRef))
  .map(r=>[r.eventRef,r.event,r.contentDigest]))).digest('hex')
export function snapshotDurableBindingScopeV3(raw:unknown):AuditScopeV3|null{
  const value=snapshotProductJsonV1(raw)
  if(!object(value)||!exact(value,'actorId,argumentsDigest,capability,operationRef,workspaceId')||!uuid(value.actorId)||!uuid(value.workspaceId)
    ||!hex(value.argumentsDigest)||typeof value.capability!=='string'||!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/.test(value.capability)
    ||typeof value.operationRef!=='string'||!/^[A-Za-z0-9_-]{24,200}$/.test(value.operationRef))return null
  return value as AuditScopeV3
}
function rows(raw:unknown,binding:AuditScopeV3):readonly AuditRowV3[]|null{
  const value=snapshotProductJsonV1(raw)
  if(!Array.isArray(value)||value.length<1)return null
  const refs=new Set<string>()
  for(const item of value){
    if(!object(item)||!exact(item,'actorId,argumentsDigest,capability,contentDigest,deliveryState,event,eventRef,operationRef,workspaceId')
      ||Object.keys(binding).some(key=>item[key]!==binding[key as keyof AuditScopeV3])||!hex(item.eventRef)||refs.has(item.eventRef)
      ||!hex(item.contentDigest)||typeof item.event!=='string'||!events.includes(item.event)
      ||!['pending','delivered'].includes(item.deliveryState as string))return null
    refs.add(item.eventRef)
  }
  return value as readonly AuditRowV3[]
}
/** Private inspection input must come from the entire scoped original-intent
 * ledger LEFT JOIN its delivery outbox. No business/effect counters are inferred.
 * Capture before hostile work; handles cannot be manufactured from counters. */
export function captureDurableAuditBaselineV3(rawScope:unknown,rawRows:unknown):DurableAuditBaselineV3|null{
  try{
    const binding=snapshotDurableBindingScopeV3(rawScope);if(!binding)return null
    const initial=rows(rawRows,binding)
    if(!initial||initial.filter(r=>r.event==='assistant.operation.reserved').length!==1||initial.some(outcome))return null
    const handle=Object.freeze({}) as DurableAuditBaselineV3
    records.set(handle,{scope:binding,rows:initial,digest:fingerprint(initial)})
    return handle
  }catch{return null}
}
/** Current physical readback includes every original reservation/intermediate/
 * outcome event. Missing deliveries, foreign rows, dropped or changed originals
 * fail closed. Deliveries may advance; original audit contents may never change. */
export function inspectDurableAuditLedgerV3(handle:DurableAuditBaselineV3,rawRows:unknown):DurableAuditLedgerObservationV3|null{
  try{
    const prior=records.get(handle);if(!prior)return null
    const current=rows(rawRows,prior.scope);if(!current)return null
    const byRef=new Map(current.map(row=>[row.eventRef,row]))
    const retained=prior.rows.map(row=>byRef.get(row.eventRef))
    if(retained.some(row=>!row)||fingerprint(retained as AuditRowV3[])!==prior.digest)return null
    const count=(list:readonly AuditRowV3[],predicate:(row:AuditRowV3)=>boolean)=>list.filter(predicate).length
    const delivered=(row:AuditRowV3)=>row.deliveryState==='delivered'
    const outcomes=current.filter(outcome),reservationAuditIntents=count(current,r=>r.event==='assistant.operation.reserved')
    if(reservationAuditIntents!==1||outcomes.length>1)return null
    return Object.freeze({originalAuditIntents:current.length,deliveredOriginalEvents:count(current,delivered),pendingOriginalEvents:count(current,r=>!delivered(r)),
      reservationAuditIntents,outcomeAuditIntents:outcomes.length,otherAuditIntents:current.length-reservationAuditIntents-outcomes.length,
      outcomeDeliveredEvents:count(outcomes,delivered),outcomePendingEvents:count(outcomes,r=>!delivered(r)),
      baselineOriginalAuditIntents:prior.rows.length,baselineDeliveredOriginalEvents:count(prior.rows,delivered),baselinePendingOriginalEvents:count(prior.rows,r=>!delivered(r)),
      baselineAuditContentDigest:prior.digest,persistedBaselineAuditContentDigest:fingerprint(retained as AuditRowV3[])})
  }catch{return null}
}
