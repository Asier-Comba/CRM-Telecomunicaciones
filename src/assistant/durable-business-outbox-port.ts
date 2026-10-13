import type {IdempotencyBinding} from './contracts.ts'
import type {DurableDatabasePort} from './durable-db-contract.ts'
import type {DurableOutboxRecord,ReconciliationActor,ServerEffectCommand} from './durable-contracts.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'
import {containsHighConfidenceSecret} from './schema.ts'
import {DurableReservationUnavailable} from './durable-reservation-port.ts'
import type {DurableReservationPortV1} from './durable-reservation-port.ts'
import {assertPreparedCommandMaterialV1} from './durable-command-material.ts'
import type {CommandMaterialAuthorityV1,createDurableCommandMaterialProducerV1} from './durable-command-material.ts'

export type EffectWorkerAuthorityV1=CommandMaterialAuthorityV1&{workerRef:string;capability:string;dispatcher:string;schemaVersion:number;grantVersion:number}
export type EffectOutboxMetadataV1={outboxRef:string;operationRef:string;binding:IdempotencyBinding;command:ServerEffectCommand;version:number}
export type EffectReceiptAdmissionV1={workspaceId:string;actorId:string;outboxRef:string;operationRef:string;capability:string;argumentsDigest:string;
 dispatcher:string;commandRef:string;claimFence:string;receiptRef:string;receiptAuthority:'registered_effect_source.v1'}
export type EffectRpcV1='assistant_durable_v1_claim_effect'|'assistant_durable_v1_ack_effect'
export type DurableBusinessPortV1=DurableReservationPortV1&Pick<DurableDatabasePort,'claimOutbox'|'ackOutbox'>
const fail=()=>new DurableReservationUnavailable()
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const ref=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v)&&!containsHighConfidenceSecret(v)
const cap=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9.:_-]{2,119}$/.test(v)
const version=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<Number.MAX_SAFE_INTEGER
function exact(v:unknown,fields:string):v is Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.getOwnPropertySymbols(v).length)return false
 const d=Object.getOwnPropertyDescriptors(v)
 return Object.values(d).every(x=>'value'in x&&x.enumerable)&&Object.keys(d).sort().join(',')===fields.split(',').sort().join(',')
}
function same(v:unknown,b:IdempotencyBinding):boolean{return exact(v,'actorId,workspaceId,capability,argumentsDigest')&&v.actorId===b.actorId&&v.workspaceId===b.workspaceId&&v.capability===b.capability&&v.argumentsDigest===b.argumentsDigest}
function worker(v:EffectWorkerAuthorityV1|null):v is EffectWorkerAuthorityV1{
 return Boolean(v&&v.authentication==='user_session'&&uuid(v.actorId)&&uuid(v.workspaceId)&&ref(v.workerRef)&&cap(v.capability)&&cap(v.dispatcher)
  &&Number.isInteger(v.schemaVersion)&&v.schemaVersion>0&&v.schemaVersion<=2147483647&&version(v.grantVersion)&&typeof v.scopeEpoch==='string'
  &&v.scopeEpoch.length>0&&v.scopeEpoch.length<=256&&v.permissions.has(v.capability))
}
function timestamp(v:unknown):v is string{
 if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))return false
 const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(v)
 return Boolean(m&&Number(m[2])<24&&Number(m[3])<60&&Number(m[4])<60&&new Date(m[1]+'T00:00:00Z').toISOString().slice(0,10)===m[1])
}
const micros=(v:string)=>BigInt(Date.parse(v))*BigInt(1000)+BigInt((/\.(\d{1,6})/.exec(v)?.[1].padEnd(6,'0')??'000000').slice(3))
function fence(v:string){const m=/^v1:([1-9][0-9]{0,15}):([0-9a-f]{64})$/.exec(v);if(!m||!Number.isSafeInteger(Number(m[1]))||Number(m[1])>Number.MAX_SAFE_INTEGER)throw fail();return {counter:m[1],proof:m[2]}}
function record(v:unknown,m:EffectOutboxMetadataV1,expected:number,state:'dispatching'|'delivered',receipt?:string):DurableOutboxRecord{
 if(!exact(v,'outboxRef,operationRef,binding,command,state,attempt,version,createdAt,updatedAt,'+(state==='dispatching'?'leaseExpiresAt':'receiptRef'))
  ||v.outboxRef!==m.outboxRef||v.operationRef!==m.operationRef||!same(v.binding,m.binding)||!exact(v.command,'dispatcher,commandRef')
  ||v.command.dispatcher!==m.command.dispatcher||v.command.commandRef!==m.command.commandRef||v.state!==state||v.version!==expected+1
  ||!Number.isSafeInteger(v.attempt)||Number(v.attempt)<2||!timestamp(v.createdAt)||!timestamp(v.updatedAt)||micros(v.updatedAt)<micros(v.createdAt))throw fail()
 if(state==='dispatching'&&(!timestamp(v.leaseExpiresAt)||micros(v.leaseExpiresAt)<=micros(v.updatedAt)||micros(v.leaseExpiresAt)-micros(v.updatedAt)>BigInt(300000000)))throw fail()
 if(state==='delivered'&&v.receiptRef!==receipt)throw fail()
 return Object.freeze({...v,binding:Object.freeze({...m.binding}),command:Object.freeze({...m.command})}) as DurableOutboxRecord
}
export function createDurableBusinessOutboxPortV1(deps:{reservation:DurableReservationPortV1;
 currentWorker:()=>Promise<EffectWorkerAuthorityV1|null>;
 producer:ReturnType<typeof createDurableCommandMaterialProducerV1>;
 loadOutbox:(worker:Readonly<EffectWorkerAuthorityV1>,outboxRef:string)=>Promise<unknown>;
 // Required private registered handler/sink verifier. A caller's opaque receipt
 // is a lookup key, never proof that the business effect happened.
 verifyReceipt:(worker:Readonly<EffectWorkerAuthorityV1>,metadata:Readonly<EffectOutboxMetadataV1>,claimFence:string,receiptRef:string)=>Promise<unknown>;
 invoke:(operation:EffectRpcV1,input:Readonly<Record<string,string>>,signal:AbortSignal)=>Promise<{data:unknown;error:unknown}>;
}):DurableBusinessPortV1{
 async function mutate(actor:ReconciliationActor,outboxRef:string,expectedVersion:number,claimFence?:string,receiptRef?:string,ack=false){
  const controller=new AbortController(),signal=controller.signal
  try{return await boundedAwaitV2(async()=>{
   if(!ref(outboxRef)||!version(expectedVersion)||(ack&&typeof claimFence!=='string')||!actor||actor.authentication!=='user_session'||typeof actor.requestId!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(actor.requestId))throw fail()
   const before=await boundedAwaitV2(()=>deps.currentWorker(),signal)
   if(!worker(before)||before.actorId!==actor.actorId||before.workspaceId!==actor.workspaceId)throw fail()
   const value=await boundedAwaitV2(()=>deps.loadOutbox(Object.freeze({...before}),outboxRef),signal)
   if(value===null)return {status:'not_found'} as const
   if(!exact(value,'outboxRef,operationRef,binding,command,version')||value.outboxRef!==outboxRef||!ref(value.operationRef)
    ||!exact(value.binding,'actorId,workspaceId,capability,argumentsDigest')||value.binding.actorId!==before.actorId||value.binding.workspaceId!==before.workspaceId
    ||value.binding.capability!==before.capability||typeof value.binding.argumentsDigest!=='string'||!/^[0-9a-f]{64}$/.test(value.binding.argumentsDigest)
    ||!exact(value.command,'dispatcher,commandRef')||value.command.dispatcher!==before.dispatcher||!ref(value.command.commandRef)||!version(value.version))throw fail()
   const metadata=Object.freeze({...value,binding:Object.freeze({...value.binding}),command:Object.freeze({...value.command})}) as EffectOutboxMetadataV1
   if(metadata.version!==expectedVersion)return {status:'version_conflict'} as const
   if(!ack&&expectedVersion>=Number.MAX_SAFE_INTEGER-1)throw fail()
   const handle=await deps.producer.prepare(metadata.binding,metadata.command,actor.requestId,signal)
   let parsed:ReturnType<typeof fence>|undefined
   if(ack&&claimFence!==undefined){
    parsed=fence(claimFence);if(!ref(receiptRef))throw fail()
    const admission=await boundedAwaitV2(()=>deps.verifyReceipt(Object.freeze({...before}),metadata,claimFence,receiptRef),signal)
    const expected={workspaceId:before.workspaceId,actorId:before.actorId,outboxRef,operationRef:metadata.operationRef,capability:metadata.binding.capability,
     argumentsDigest:metadata.binding.argumentsDigest,dispatcher:metadata.command.dispatcher,commandRef:metadata.command.commandRef,claimFence,receiptRef,receiptAuthority:'registered_effect_source.v1'}
    if(!exact(admission,Object.keys(expected).join(','))||Object.entries(expected).some(([k,v])=>admission[k]!==v))throw fail()
   }
   const fresh=await boundedAwaitV2(()=>deps.currentWorker(),signal)
   if(signal.aborted||!worker(fresh)||fresh.actorId!==before.actorId||fresh.workspaceId!==before.workspaceId||fresh.workerRef!==before.workerRef
    ||fresh.capability!==before.capability||fresh.dispatcher!==before.dispatcher||fresh.schemaVersion!==before.schemaVersion||fresh.grantVersion!==before.grantVersion)throw fail()
   assertPreparedCommandMaterialV1(handle,metadata.binding,metadata.command,fresh,fresh.schemaVersion)
   const params={p_workspace:fresh.workspaceId,p_worker:fresh.workerRef,p_authority_version:String(fresh.grantVersion),p_outbox:outboxRef,p_version:String(expectedVersion)}
   const response=await boundedAwaitV2(()=>deps.invoke(parsed?'assistant_durable_v1_ack_effect':'assistant_durable_v1_claim_effect',Object.freeze(parsed?
    {...params,p_fence:parsed.counter,p_claim:parsed.proof,p_receipt:receiptRef!,p_request:actor.requestId}:params),signal),signal)
   if(!response||response.error!==null)throw fail()
   const result=response.data
   if(exact(result,'status')&&['not_found','version_conflict','invalid_transition'].includes(String(result.status)))return {status:result.status as 'not_found'|'version_conflict'|'invalid_transition'}
   if(!exact(result,parsed?'status,record':'status,record,claimFence')||result.status!=='applied')throw fail()
   const projected=record(result.record,metadata,expectedVersion,parsed?'delivered':'dispatching',receiptRef)
   if(!parsed){if(typeof result.claimFence!=='string')throw fail();fence(result.claimFence);return {status:'applied',record:projected,claimFence:result.claimFence} as const}
   return {status:'applied',record:projected} as const
  },signal)}catch{throw fail()}finally{controller.abort()}
 }
 return Object.freeze({...deps.reservation,
  claimOutbox:async(actor,outboxRef,expectedVersion)=>mutate(actor,outboxRef,expectedVersion) as ReturnType<DurableDatabasePort['claimOutbox']>,
  ackOutbox:async(actor,outboxRef,expectedVersion,claimFence,receiptRef)=>mutate(actor,outboxRef,expectedVersion,claimFence,receiptRef,true),
 })
}
