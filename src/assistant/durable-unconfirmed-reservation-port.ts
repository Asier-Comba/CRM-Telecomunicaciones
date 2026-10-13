import type {IdempotencyBinding} from './contracts.ts'
import type {DurableIdempotencyRecord,ServerEffectCommand} from './durable-contracts.ts'
import type {DurableDatabasePort} from './durable-db-contract.ts'
import type {DurableCompletionPortV1} from './durable-completion-port.ts'
import type {EffectWorkerAuthorityV1} from './durable-business-outbox-port.ts'
import {assertResultRecordV1} from './durable-result-material.ts'
import {preparedUnconfirmedMaterialParametersV1,type createDurableCommandMaterialProducerV1} from './durable-command-material.ts'
import {DurableReservationUnavailable,parseDurableRecoveryRecordV1} from './durable-reservation-port.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'

/** Ten lifecycle methods; verified reconciliation is still required. */
export type DurableUnconfirmedReservationPortV1=DurableCompletionPortV1&Pick<DurableDatabasePort,'reserveOperation'>
const fail=()=>new DurableReservationUnavailable()
function exact(value:unknown,fields:string):value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.getOwnPropertySymbols(value).length)return false
 const ds=Object.getOwnPropertyDescriptors(value)
 return Object.values(ds).every(d=>'value'in d&&d.enumerable)&&Object.keys(ds).sort().join(',')===fields.split(',').sort().join(',')
}
const ref=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v)
const key=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(v)
const same=(a:IdempotencyBinding,b:IdempotencyBinding)=>a.actorId===b.actorId&&a.workspaceId===b.workspaceId&&a.capability===b.capability&&a.argumentsDigest===b.argumentsDigest
function recordDto(value:unknown):DurableIdempotencyRecord{
 const fields='operationRef,idempotencyKey,binding,state,attempt,version,leaseExpiresAt,createdAt,updatedAt'
 if(!(exact(value,fields)||exact(value,fields+',effectReceiptRef')||exact(value,fields+',failureCode')
  ||exact(value,fields+',effectReceiptRef,failureCode')||exact(value,fields+',effectReceiptRef,result')))throw fail()
 if(value.state==='completed'){assertResultRecordV1(value);return value}
 if(!ref(value.operationRef))throw fail()
 return parseDurableRecoveryRecordV1(value,value.operationRef)
}
export function createDurableUnconfirmedReservationPortV1(deps:{
 completion:DurableCompletionPortV1;currentWorker:()=>Promise<EffectWorkerAuthorityV1|null>;
 producer:ReturnType<typeof createDurableCommandMaterialProducerV1>;
 // Private original key-to-draft lookup, not a caller/model command selector.
 loadCommand:(worker:Readonly<EffectWorkerAuthorityV1>,binding:Readonly<IdempotencyBinding>,key:string)=>Promise<unknown>;
 invoke:(name:'assistant_durable_v1_reserve_material',input:Readonly<Record<string,string>>,signal:AbortSignal)=>Promise<{data:unknown;error:unknown}>;
}):DurableUnconfirmedReservationPortV1{
 return {...deps.completion,async reserveOperation(actor,inputBinding,inputKey){
  const stop=new AbortController()
  try{return await boundedAwaitV2(async()=>{
   if(!exact(inputBinding,'actorId,workspaceId,capability,argumentsDigest')||!key(inputKey)||!key(actor?.requestId)||actor.authentication!=='user_session')throw fail()
   const binding=Object.freeze({...inputBinding}),principal={...actor}
   const first=await boundedAwaitV2(()=>deps.currentWorker(),stop.signal)
   function valid(w:EffectWorkerAuthorityV1|null):w is EffectWorkerAuthorityV1{
    return Boolean(w&&w.authentication==='user_session'&&w.actorId===binding.actorId&&w.workspaceId===binding.workspaceId
     &&w.actorId===principal.actorId&&w.workspaceId===principal.workspaceId&&w.capability===binding.capability&&w.permissions.has(binding.capability)
     &&ref(w.workerRef)&&Number.isSafeInteger(w.grantVersion)&&w.grantVersion>0&&w.grantVersion<Number.MAX_SAFE_INTEGER
     &&Number.isInteger(w.schemaVersion)&&w.schemaVersion>0&&w.schemaVersion<=2147483647
     &&typeof w.scopeEpoch==='string'&&w.scopeEpoch.length>0&&w.scopeEpoch.length<=256)
   }
   if(!valid(first))throw fail()
   const worker=Object.freeze({...first}),raw=await boundedAwaitV2(()=>deps.loadCommand(worker,binding,inputKey),stop.signal)
   if(!exact(raw,'dispatcher,commandRef')||raw.dispatcher!==worker.dispatcher||!ref(raw.commandRef))throw fail()
   const command:ServerEffectCommand=Object.freeze({dispatcher:raw.dispatcher,commandRef:raw.commandRef})
   async function fresh(){
    const w=await boundedAwaitV2(()=>deps.currentWorker(),stop.signal)
    if(!valid(w)||w.workerRef!==worker.workerRef||w.grantVersion!==worker.grantVersion||w.dispatcher!==worker.dispatcher
     ||w.schemaVersion!==worker.schemaVersion||w.scopeEpoch!==worker.scopeEpoch)throw fail()
    return w
   }
   const handle=await deps.producer.prepare(binding,command,principal.requestId,stop.signal)
   const material=preparedUnconfirmedMaterialParametersV1(handle,binding,command,await fresh(),worker.schemaVersion)
   const response=await boundedAwaitV2(()=>deps.invoke('assistant_durable_v1_reserve_material',Object.freeze({p_workspace:binding.workspaceId,
    p_worker:worker.workerRef,p_authority_version:String(worker.grantVersion),p_capability:binding.capability,p_digest:binding.argumentsDigest,
    p_key:inputKey,p_dispatcher:command.dispatcher,p_command:command.commandRef,p_request:principal.requestId,p_material:JSON.stringify(material)}),stop.signal),stop.signal)
   if(!response||response.error!==null)throw fail()
   const value=response.data
   if(exact(value,'status')&&value.status==='conflict'){await fresh();return {status:'conflict' as const}}
   let record:DurableIdempotencyRecord,status:'reserved'|'existing'
   if(exact(value,'status,operationRef')&&value.status==='existing'&&ref(value.operationRef)){
    const original=await boundedAwaitV2(()=>deps.completion.loadAuthorizedOperation(principal,value.operationRef as string,new Date()),stop.signal)
    if(!original)throw fail();record=original;status='existing'
   }else if(exact(value,'status,record')&&value.status==='reserved'){
    record=recordDto(value.record);status='reserved'
    if(record.state!=='reserved'||record.version!==1||record.attempt!==1||record.updatedAt!==record.createdAt
     ||Date.parse(record.leaseExpiresAt)-Date.parse(record.createdAt)!==300000)throw fail()
   }else throw fail()
   record=recordDto(record)
   if(!same(record.binding,binding)||record.idempotencyKey!==inputKey)throw fail()
   // Recheck private input resource authorization after commit/recovery as well.
   const released=await deps.producer.prepare(binding,command,principal.requestId,stop.signal)
   const current=preparedUnconfirmedMaterialParametersV1(released,binding,command,await fresh(),worker.schemaVersion)
   if(current.canonicalArguments!==material.canonicalArguments)throw fail()
   return {status,record:structuredClone(record)}
  },stop.signal)}catch{throw fail()}finally{stop.abort()}
 }}
}
