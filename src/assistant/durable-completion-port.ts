import type {AuditEvent,IdempotencyBinding} from './contracts.ts'
import type {DurableDatabasePort} from './durable-db-contract.ts'
import type {ReconciliationActor,ServerEffectCommand} from './durable-contracts.ts'
import type {DurableBusinessPortV1,EffectWorkerAuthorityV1} from './durable-business-outbox-port.ts'
import {assertResultRecordV1,preparedResultParametersV1,type createDurableResultMaterialProducerV1} from './durable-result-material.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'
import {canonicalArgumentsV1} from './runtime.ts'
import {containsHighConfidenceSecret} from './schema.ts'
import {DurableReservationUnavailable} from './durable-reservation-port.ts'

/** Nine lifecycle methods, private original user session only. Not a full port. */
export type DurableCompletionPortV1=DurableBusinessPortV1&Pick<DurableDatabasePort,'completeOperationWithAuditIntent'>
export type CompletionRpcV1='assistant_durable_v1_complete'|'assistant_durable_v1_load_result'
const fail=()=>new DurableReservationUnavailable()
function exact(v:unknown,fields:string):v is Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.getOwnPropertySymbols(v).length)return false
 const d=Object.getOwnPropertyDescriptors(v)
 return Object.values(d).every(x=>'value'in x&&x.enumerable)&&Object.keys(d).sort().join(',')===fields.split(',').sort().join(',')
}
const ref=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v)
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const same=(a:IdempotencyBinding,b:IdempotencyBinding)=>a.actorId===b.actorId&&a.workspaceId===b.workspaceId&&a.capability===b.capability&&a.argumentsDigest===b.argumentsDigest
const key=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(v)
function validWorker(v:EffectWorkerAuthorityV1|null):v is EffectWorkerAuthorityV1{
 return Boolean(v&&v.authentication==='user_session'&&uuid(v.actorId)&&uuid(v.workspaceId)&&ref(v.workerRef)
  &&/^[a-z][a-z0-9.:_-]{2,119}$/.test(v.capability)&&/^[a-z][a-z0-9.:_-]{2,119}$/.test(v.dispatcher)
  &&Number.isSafeInteger(v.grantVersion)&&v.grantVersion>0&&v.grantVersion<Number.MAX_SAFE_INTEGER
  &&Number.isInteger(v.schemaVersion)&&v.schemaVersion>0&&v.schemaVersion<=2147483647
  &&typeof v.scopeEpoch==='string'&&v.scopeEpoch.length>0&&v.scopeEpoch.length<=256&&v.permissions.has(v.capability))
}
function audit(value:unknown,actor:ReconciliationActor,b:IdempotencyBinding,accessClass:string,confirmation:unknown):asserts value is AuditEvent{
 if(!exact(value,'event,requestId,actorId,workspaceId,capability,accessClass,status,reasonCode,confirmationState,idempotencyState,durationMs')
  ||value.event!=='assistant.capability.completed'||value.requestId!==actor.requestId||value.actorId!==b.actorId||value.workspaceId!==b.workspaceId
  ||value.capability!==b.capability||value.accessClass!==accessClass||value.status!=='SUCCESS'||value.reasonCode!=='capability_success'
  ||!['accepted','not_applicable'].includes(String(confirmation))||(confirmation==='not_applicable'&&accessClass!=='SAFE_WRITE')
  ||value.confirmationState!==confirmation||value.idempotencyState!=='reserved'||!Number.isSafeInteger(value.durationMs)||Number(value.durationMs)<0
  ||containsHighConfidenceSecret(value))throw fail()
}
export function createDurableCompletionPortV1(deps:{business:DurableBusinessPortV1;currentWorker:()=>Promise<EffectWorkerAuthorityV1|null>;
 producer:ReturnType<typeof createDurableResultMaterialProducerV1>;
 loadCommand:(worker:Readonly<EffectWorkerAuthorityV1>,operationRef:string)=>Promise<unknown>;
 // Optional only for original confirmed callers. Unconfirmed paths must load
 // provenance from the private original operation, never from the audit input.
 loadConfirmationOrigin?:(worker:Readonly<EffectWorkerAuthorityV1>,operationRef:string)=>Promise<unknown>;
 invoke:(name:CompletionRpcV1,input:Readonly<Record<string,string>>,signal:AbortSignal)=>Promise<{data:unknown;error:unknown}>;
}):DurableCompletionPortV1{
 async function bounded<T>(actor:ReconciliationActor,run:(w:EffectWorkerAuthorityV1,signal:AbortSignal)=>Promise<T>):Promise<T>{
  const stop=new AbortController()
  try{return await boundedAwaitV2(async()=>{
   if(!actor||actor.authentication!=='user_session'||!key(actor.requestId))throw fail()
   const w=await boundedAwaitV2(()=>deps.currentWorker(),stop.signal)
   if(!validWorker(w)||actor.actorId!==w.actorId||actor.workspaceId!==w.workspaceId)throw fail()
   return run(w,stop.signal)
  },stop.signal)}catch{throw fail()}finally{stop.abort()}
 }
 async function fresh(w:EffectWorkerAuthorityV1,signal:AbortSignal){
  const after=await boundedAwaitV2(()=>deps.currentWorker(),signal)
  if(!validWorker(after)||after.actorId!==w.actorId||after.workspaceId!==w.workspaceId||after.scopeEpoch!==w.scopeEpoch
   ||after.workerRef!==w.workerRef||after.grantVersion!==w.grantVersion||after.capability!==w.capability||after.dispatcher!==w.dispatcher||after.schemaVersion!==w.schemaVersion)throw fail()
  return after
 }
 const scope=(w:EffectWorkerAuthorityV1)=>({p_workspace:w.workspaceId,p_worker:w.workerRef,p_authority_version:String(w.grantVersion)})
 async function rpc(name:CompletionRpcV1,p:Record<string,string>,signal:AbortSignal){
  const response=await boundedAwaitV2(()=>deps.invoke(name,Object.freeze(p),signal),signal)
  if(!response||response.error!==null)throw fail();return response.data
 }
 function command(value:unknown,w:EffectWorkerAuthorityV1):ServerEffectCommand{
  if(!exact(value,'dispatcher,commandRef')||value.dispatcher!==w.dispatcher||!ref(value.commandRef)||containsHighConfidenceSecret(value))throw fail()
  return Object.freeze({dispatcher:value.dispatcher,commandRef:value.commandRef})
 }
 return {...deps.business,
  async completeOperationWithAuditIntent(actor,input){
   if(containsHighConfidenceSecret(input)||!exact(input,'operationRef,binding,expectedVersion,result,eventRef,auditIntent')
    ||!ref(input.operationRef)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<3||input.expectedVersion>=Number.MAX_SAFE_INTEGER
    ||typeof input.eventRef!=='string'||!/^[0-9a-f]{64}$/.test(input.eventRef))throw fail()
   const c=structuredClone(input),principal={...actor}
   return bounded(principal,async(w,signal)=>{
    const record=await boundedAwaitV2(()=>deps.business.loadAuthorizedOperation(principal,c.operationRef,new Date()),signal)
    assertResultRecordV1(record)
    if(record.state!=='effect_applied'||record.operationRef!==c.operationRef||!same(record.binding,c.binding)||record.version!==c.expectedVersion
     ||record.binding.actorId!==w.actorId||record.binding.workspaceId!==w.workspaceId||record.binding.capability!==w.capability)throw fail()
    const cmd=command(await boundedAwaitV2(()=>deps.loadCommand(w,c.operationRef),signal),w)
    const material=await deps.producer.prepare(record,cmd,c.result,principal.requestId,signal)
    const current=await fresh(w,signal),p=preparedResultParametersV1(material,current,record,cmd)
    const confirmation=deps.loadConfirmationOrigin?await boundedAwaitV2(()=>deps.loadConfirmationOrigin!(current,c.operationRef),signal):'accepted'
    if(confirmation==='not_applicable'&&p.confirmationPolicy!=='none')throw fail()
    audit(c.auditIntent,principal,record.binding,p.accessClass,confirmation)
    const response=await rpc('assistant_durable_v1_complete',{...scope(current),p_operation:c.operationRef,p_version:String(c.expectedVersion),
     p_receipt:record.effectReceiptRef!,p_output_schema_version:String(p.schemaVersion),p_schema_digest:p.schemaDigest,
     p_result:p.canonicalResult,p_audit:canonicalArgumentsV1(c.auditIntent),p_event:c.eventRef},signal)
    if(exact(response,'status')&&typeof response.status==='string'&&['not_found','version_conflict','invalid_transition'].includes(response.status))
     return {status:response.status as 'not_found'|'version_conflict'|'invalid_transition'}
    if(!exact(response,'status,record')||response.status!=='applied')throw fail()
    assertResultRecordV1(response.record)
    const result=response.record
    if(result.state!=='completed'||result.version!==record.version+1||result.operationRef!==record.operationRef||!same(result.binding,record.binding)
     ||result.effectReceiptRef!==record.effectReceiptRef||result.idempotencyKey!==record.idempotencyKey||result.attempt!==record.attempt
     ||result.createdAt!==record.createdAt||result.leaseExpiresAt!==record.leaseExpiresAt||Date.parse(result.updatedAt)<Date.parse(record.updatedAt)
     ||canonicalArgumentsV1(result.result!)!==p.canonicalResult)throw fail()
    // Resource access can change after the commit releases its locks. Admit the
    // returned completed DTO again before exposing it; denial never undoes a commit.
    const returned=await deps.producer.prepare(result,cmd,result.result,principal.requestId,signal)
    const released=preparedResultParametersV1(returned,await fresh(w,signal),result,cmd)
    if(released.canonicalResult!==p.canonicalResult||released.schemaDigest!==p.schemaDigest||released.schemaVersion!==p.schemaVersion||released.accessClass!==p.accessClass)throw fail()
    return {status:'applied',record:structuredClone(result)}
   })
  },
  async loadAuthorizedOperation(actor,operationRef,now){
   if(!ref(operationRef)||!(now instanceof Date)||!Number.isFinite(now.getTime()))throw fail()
   const principal={...actor}
   return bounded(principal,async(w,signal)=>{
    const loaded=await rpc('assistant_durable_v1_load_result',{...scope(w),p_operation:operationRef},signal)
    if(loaded===null)return boundedAwaitV2(()=>deps.business.loadAuthorizedOperation(principal,operationRef,now),signal)
    if(!exact(loaded,'record,command'))throw fail()
    assertResultRecordV1(loaded.record)
    const record=loaded.record,cmd=command(loaded.command,w)
    if(record.state!=='completed'||record.operationRef!==operationRef||record.binding.actorId!==w.actorId
     ||record.binding.workspaceId!==w.workspaceId||record.binding.capability!==w.capability)throw fail()
    const material=await deps.producer.prepare(record,cmd,record.result,principal.requestId,signal)
    const p=preparedResultParametersV1(material,await fresh(w,signal),record,cmd)
    if(canonicalArgumentsV1(record.result!)!==p.canonicalResult)throw fail()
    return structuredClone(record)
   })
  },
 }
}
