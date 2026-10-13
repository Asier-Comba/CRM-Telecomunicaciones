import {createHash} from 'node:crypto'
import type {IdempotencyBinding} from './contracts.ts'
import type {DurableDatabasePort} from './durable-db-contract.ts'
import type {ServerEffectCommand} from './durable-contracts.ts'
import type {EffectWorkerAuthorityV1} from './durable-business-outbox-port.ts'
import type {DurableUnconfirmedReservationPortV1} from './durable-unconfirmed-reservation-port.ts'
import {assertResultRecordV1,assertResultTimeProgressionV1,assertVerifiedReconciliationRecordV1,preparedResultParametersV1,type createDurableResultMaterialProducerV1} from './durable-result-material.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'
import {canonicalArgumentsV1} from './runtime.ts'
import {containsHighConfidenceSecret} from './schema.ts'
import {DurableReservationUnavailable} from './durable-reservation-port.ts'

/** Ten complete methods plus positive reconciliation. Verified absence is denied. */
export type DurablePositiveReconciliationPortV1=DurableUnconfirmedReservationPortV1&Pick<DurableDatabasePort,'commitVerifiedReconciliation'>
const fail=()=>new DurableReservationUnavailable()
function exact(v:unknown,fields:string):v is Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.getOwnPropertySymbols(v).length)return false
 const ds=Object.getOwnPropertyDescriptors(v)
 return Object.values(ds).every(d=>'value'in d&&d.enumerable)&&Object.keys(ds).sort().join(',')===fields.split(',').sort().join(',')
}
const ref=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v)
const key=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(v)
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const same=(a:IdempotencyBinding,b:IdempotencyBinding)=>a.actorId===b.actorId&&a.workspaceId===b.workspaceId&&a.capability===b.capability&&a.argumentsDigest===b.argumentsDigest
function validWorker(w:EffectWorkerAuthorityV1|null):w is EffectWorkerAuthorityV1{
 return Boolean(w&&w.authentication==='user_session'&&uuid(w.actorId)&&uuid(w.workspaceId)&&ref(w.workerRef)
  &&/^[a-z][a-z0-9.:_-]{2,119}$/.test(w.capability)&&/^[a-z][a-z0-9.:_-]{2,119}$/.test(w.dispatcher)
  &&Number.isSafeInteger(w.grantVersion)&&w.grantVersion>0&&w.grantVersion<Number.MAX_SAFE_INTEGER
  &&Number.isInteger(w.schemaVersion)&&w.schemaVersion>0&&w.schemaVersion<=2147483647
  &&typeof w.scopeEpoch==='string'&&w.scopeEpoch.length>0&&w.scopeEpoch.length<=256
  &&w.permissions.has(w.capability)&&w.permissions.has('assistant:operation:reconcile'))
}
export function createDurablePositiveReconciliationPortV1(deps:{reservation:DurableUnconfirmedReservationPortV1;
 currentWorker:()=>Promise<EffectWorkerAuthorityV1|null>;producer:ReturnType<typeof createDurableResultMaterialProducerV1>;
 loadCommand:(worker:Readonly<EffectWorkerAuthorityV1>,operationRef:string)=>Promise<unknown>;
 invoke:(name:'assistant_durable_v1_reconcile_completed',input:Readonly<Record<string,string>>,signal:AbortSignal)=>Promise<{data:unknown;error:unknown}>;
}):DurablePositiveReconciliationPortV1{
 async function fresh(before:EffectWorkerAuthorityV1,signal:AbortSignal){
  const w=await boundedAwaitV2(()=>deps.currentWorker(),signal)
  if(!validWorker(w)||w.actorId!==before.actorId||w.workspaceId!==before.workspaceId||w.scopeEpoch!==before.scopeEpoch
   ||w.workerRef!==before.workerRef||w.grantVersion!==before.grantVersion||w.capability!==before.capability||w.dispatcher!==before.dispatcher||w.schemaVersion!==before.schemaVersion)throw fail()
  return {...w,permissions:new Set(w.permissions)}
 }
 return {...deps.reservation,
  async commitVerifiedReconciliation(input){
   if(!exact(input,'actor,operationRef,expectedVersion,binding,idempotencyKey,resolution,eventRef,auditIntent,now')
    ||!exact(input.actor,'authentication,actorId,workspaceId,permissions,requestId')||input.actor.authentication!=='user_session'
    ||!key(input.actor.requestId)||!uuid(input.actor.actorId)||!uuid(input.actor.workspaceId)
    ||!(input.actor.permissions instanceof Set)||!input.actor.permissions.has('assistant:operation:reconcile')
    ||!ref(input.operationRef)||!key(input.idempotencyKey)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<4||input.expectedVersion>=Number.MAX_SAFE_INTEGER
    ||!exact(input.binding,'actorId,workspaceId,capability,argumentsDigest')||!uuid(input.binding.actorId)||!uuid(input.binding.workspaceId)
    ||typeof input.binding.argumentsDigest!=='string'||!/^[0-9a-f]{64}$/.test(input.binding.argumentsDigest)
    ||typeof input.eventRef!=='string'||!/^[0-9a-f]{64}$/.test(input.eventRef)||!(input.now instanceof Date)||!Number.isFinite(input.now.getTime())
    ||containsHighConfidenceSecret({operationRef:input.operationRef,binding:input.binding,idempotencyKey:input.idempotencyKey,resolution:input.resolution,eventRef:input.eventRef,auditIntent:input.auditIntent}))throw fail()
   const c=structuredClone(input),stop=new AbortController(),signal=stop.signal
   try{return await boundedAwaitV2(async()=>{
    const worker=await boundedAwaitV2(()=>deps.currentWorker(),signal)
    if(!validWorker(worker)||worker.actorId!==c.actor.actorId||worker.workspaceId!==c.actor.workspaceId)return {status:'forbidden'} as const
    const w={...worker,permissions:new Set(worker.permissions)}
    // No missing-row/expired-lease inference. Physical absence requires another reviewed authority.
    if(!exact(c.resolution,'outcome,result')||c.resolution.outcome!=='completed')return {status:'invalid_transition'} as const
    const record=await boundedAwaitV2(()=>deps.reservation.loadAuthorizedOperation(c.actor,c.operationRef,c.now),signal)
    assertVerifiedReconciliationRecordV1(record)
    if(!same(record.binding,c.binding)||record.idempotencyKey!==c.idempotencyKey||record.operationRef!==c.operationRef
     ||record.binding.actorId!==w.actorId||record.binding.workspaceId!==w.workspaceId||record.binding.capability!==w.capability)return {status:'binding_mismatch'} as const
    if(record.version!==c.expectedVersion)return {status:'version_conflict'} as const
    const original=structuredClone(record),raw=await boundedAwaitV2(()=>deps.loadCommand(w,c.operationRef),signal)
    if(!exact(raw,'dispatcher,commandRef')||raw.dispatcher!==w.dispatcher||!ref(raw.commandRef)||containsHighConfidenceSecret(raw))throw fail()
    const command:ServerEffectCommand={dispatcher:raw.dispatcher,commandRef:raw.commandRef}
    const e=c.auditIntent,eventRef=createHash('sha256').update(JSON.stringify([w.workspaceId,c.operationRef,c.expectedVersion])).digest('hex')
    if(!exact(e,'event,requestId,actorId,workspaceId,operationRef,requestedOutcome,decision,reasonCode')
     ||e.event!=='assistant.operation.reconciliation'||e.requestId!==c.actor.requestId||e.actorId!==w.actorId||e.workspaceId!==w.workspaceId
     ||e.operationRef!==c.operationRef||e.requestedOutcome!=='completed'||e.decision!=='completed'||e.reasonCode!=='reconciliation_applied'||c.eventRef!==eventRef)throw fail()
    const material=await deps.producer.prepare(original,command,c.resolution.result,c.actor.requestId,signal)
    const current=await fresh(w,signal),p=preparedResultParametersV1(material,current,original,command)
    const response=await boundedAwaitV2(()=>deps.invoke('assistant_durable_v1_reconcile_completed',Object.freeze({p_workspace:current.workspaceId,
     p_worker:current.workerRef,p_authority_version:String(current.grantVersion),p_operation:c.operationRef,p_version:String(c.expectedVersion),
     p_receipt:original.effectReceiptRef!,p_output_schema_version:String(p.schemaVersion),p_schema_digest:p.schemaDigest,p_result:p.canonicalResult,
     p_audit:canonicalArgumentsV1(e),p_event:eventRef}),signal),signal)
    if(!response||response.error!==null)throw fail()
    const data=response.data
    if(exact(data,'status')&&['not_found','version_conflict','invalid_transition'].includes(String(data.status)))return data as {status:'not_found'|'version_conflict'|'invalid_transition'}
    if(!exact(data,'status,record,eventRef,auditIntentPersisted')||data.status!=='applied'||data.eventRef!==eventRef||data.auditIntentPersisted!==true)throw fail()
    assertResultRecordV1(data.record)
    const completed=data.record
    if(completed.state!=='completed'||completed.operationRef!==original.operationRef||!same(completed.binding,original.binding)
     ||completed.idempotencyKey!==original.idempotencyKey||completed.version!==original.version+1||completed.attempt!==original.attempt
     ||completed.createdAt!==original.createdAt||completed.leaseExpiresAt!==original.leaseExpiresAt||completed.effectReceiptRef!==original.effectReceiptRef
     ||canonicalArgumentsV1(completed.result!)!==p.canonicalResult)throw fail()
    assertResultTimeProgressionV1(original.updatedAt,completed.updatedAt)
    const after=await fresh(current,signal),admitted=await deps.producer.prepare(completed,command,completed.result,c.actor.requestId,signal)
    const checked=preparedResultParametersV1(admitted,await fresh(after,signal),completed,command)
    if(checked.canonicalResult!==p.canonicalResult)throw fail()
    return {status:'applied',record:structuredClone(completed),eventRef,auditIntentPersisted:true} as const
   },signal)}catch{throw fail()}finally{stop.abort()}
  },
 }
}
