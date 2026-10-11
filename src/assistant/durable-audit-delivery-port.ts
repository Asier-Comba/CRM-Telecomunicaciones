import {boundedAwaitV2} from './bounded-await-v2.ts'

/** Private delegated user-session delivery only. No effect or service authority. */
export type AuditWorkerAuthorityV1={authentication:'user_session';actorId:string;workspaceId:string;workerRef:string;
 capability:string;grantVersion:number;permissions:ReadonlySet<string>}
export type AuditDeliveryRpcV1='assistant_durable_v1_claim_audit'|'assistant_durable_v1_ack_audit'|'assistant_durable_v1_list_audit'
export type AuditDeliveryCursorV1={createdAt:string;eventRef:string}
export type EligibleAuditDeliveryV1=AuditDeliveryCursorV1&{version:number}
export type OriginalAuditEventV1={eventRef:string;workspaceId:string;operationRef:string;operationVersion:number;actorId:string;
 capability:string;argumentsDigest:string;event:'assistant.operation.reserved'|'assistant.operation.recovery_required';
 requestId:string;createdAt:string;reasonCode:null|'internal_safe'|'temporary_unavailable'}
export type AuditDeliveryClaimV1={workspaceId:string;eventRef:string;workerRef:string;grantVersion:number;version:number;
 fence:number;claimRef:string;claimedAt:string;leaseExpiresAt:string}
type Denial='forbidden'|'not_found'|'version_conflict'
export interface DurableAuditDeliveryPortV1{
 listEligible(after?:AuditDeliveryCursorV1):Promise<{status:'applied';items:readonly EligibleAuditDeliveryV1[];nextCursor:AuditDeliveryCursorV1|null}|{status:'forbidden'}>
 claim(eventRef:string,expectedVersion:number):Promise<{status:'applied';claim:AuditDeliveryClaimV1;event:OriginalAuditEventV1}|{status:Denial|'invalid_transition'}>
 ack(claim:AuditDeliveryClaimV1,receiptRef:string):Promise<{status:'applied';version:number}|{status:Denial|'invalid_claim'}>
}
export class DurableAuditDeliveryUnavailable extends Error{
 readonly code='ASSISTANT_DURABLE_AUDIT_UNAVAILABLE'
 constructor(){super('La entrega de auditoría no está disponible.');this.name='DurableAuditDeliveryUnavailable'}
}
const unavailable=()=>new DurableAuditDeliveryUnavailable()
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const ref=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v)
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v)
const version=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<Number.MAX_SAFE_INTEGER
function exact(value:unknown,fields:string):value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))
  ||Object.getOwnPropertySymbols(value).length)return false
 const descriptors=Object.getOwnPropertyDescriptors(value)
 return Object.values(descriptors).every(d=>'value'in d&&d.enumerable)
  &&Object.keys(descriptors).sort().join(',')===fields.split(',').sort().join(',')
}
function timestamp(v:unknown):v is string{
 if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))return false
 const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(v)
 return Boolean(m&&Number(m[2])<24&&Number(m[3])<60&&Number(m[4])<60
  &&new Date(`${m[1]}T00:00:00Z`).toISOString().slice(0,10)===m[1])
}
function micros(v:string):bigint{
 const f=/\.(\d{1,6})/.exec(v)?.[1].padEnd(6,'0')??'000000'
 return BigInt(Date.parse(v))*BigInt(1000)+BigInt(f.slice(3))
}
function event(value:unknown,worker:AuditWorkerAuthorityV1,eventRef:string):OriginalAuditEventV1{
 if(!exact(value,'eventRef,workspaceId,operationRef,operationVersion,actorId,capability,argumentsDigest,event,requestId,createdAt,reasonCode')
  ||value.eventRef!==eventRef||value.workspaceId!==worker.workspaceId||value.capability!==worker.capability
  ||!uuid(value.actorId)||!ref(value.operationRef)||!Number.isSafeInteger(value.operationVersion)||Number(value.operationVersion)<1
  ||!hex(value.argumentsDigest)||typeof value.requestId!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(value.requestId)||!timestamp(value.createdAt)
  ||!((value.event==='assistant.operation.reserved'&&value.operationVersion===1&&value.reasonCode===null)
   ||(value.event==='assistant.operation.recovery_required'&&Number(value.operationVersion)>1
    &&(value.reasonCode==='internal_safe'||value.reasonCode==='temporary_unavailable'))))throw unavailable()
 return Object.freeze({...value}) as OriginalAuditEventV1
}
function validClaim(value:unknown):value is AuditDeliveryClaimV1{
 return exact(value,'workspaceId,eventRef,workerRef,grantVersion,version,fence,claimRef,claimedAt,leaseExpiresAt')
  &&uuid(value.workspaceId)&&hex(value.eventRef)&&ref(value.workerRef)&&version(value.grantVersion)
  &&version(value.version)&&Number.isSafeInteger(value.fence)&&Number(value.fence)>0&&Number(value.fence)<=Number.MAX_SAFE_INTEGER
  &&hex(value.claimRef)&&timestamp(value.claimedAt)&&timestamp(value.leaseExpiresAt)
  &&micros(value.leaseExpiresAt)-micros(value.claimedAt)===BigInt(300000000)
}
export function createDurableAuditDeliveryPortV1(dependencies:{
 // Fresh verified session and private registry; never a browser/model worker.
 currentWorker:()=>Promise<AuditWorkerAuthorityV1|null>
 invoke:(operation:AuditDeliveryRpcV1,input:Readonly<Record<string,string>>)=>Promise<{data:unknown;error:unknown}>
}):DurableAuditDeliveryPortV1{
 async function current(){
  const w=await boundedAwaitV2(()=>dependencies.currentWorker())
  if(!w||w.authentication!=='user_session'||!uuid(w.actorId)||!uuid(w.workspaceId)||!ref(w.workerRef)
   ||!version(w.grantVersion)||typeof w.capability!=='string'||!/^[a-z][a-z0-9.:_-]{2,119}$/.test(w.capability)
   ||!w.permissions.has('assistant:audit:deliver'))return null
  return {...w}
 }
 async function invoke(operation:AuditDeliveryRpcV1,input:Record<string,string>){
  const r=await boundedAwaitV2(()=>dependencies.invoke(operation,Object.freeze(input)))
  if(!r||r.error!==null)throw unavailable();return r.data
 }
 const scope=(w:AuditWorkerAuthorityV1)=>({p_workspace:w.workspaceId,p_worker:w.workerRef,p_authority_version:String(w.grantVersion)})
 async function stillCurrent(w:AuditWorkerAuthorityV1){
  const fresh=await current()
  if(!fresh||fresh.actorId!==w.actorId||fresh.workspaceId!==w.workspaceId||fresh.workerRef!==w.workerRef
   ||fresh.grantVersion!==w.grantVersion||fresh.capability!==w.capability)throw unavailable()
 }
 function validCursor(v:unknown):v is AuditDeliveryCursorV1{
  return exact(v,'createdAt,eventRef')&&timestamp(v.createdAt)&&hex(v.eventRef)
 }
 return {
  async listEligible(after){
   try{
    if(after!==undefined&&!validCursor(after))throw unavailable()
    const w=await current();if(!w)return {status:'forbidden'}
    const value=await invoke('assistant_durable_v1_list_audit',{...scope(w),p_after_time:after?.createdAt??'',p_after_event:after?.eventRef??''})
    if(exact(value,'status')&&value.status==='forbidden')return {status:'forbidden'}
    if(!exact(value,'status,items,nextCursor')||value.status!=='applied'||!Array.isArray(value.items)
     ||Object.getPrototypeOf(value.items)!==Array.prototype||Object.getOwnPropertySymbols(value.items).length||value.items.length>20)throw unavailable()
    const descriptors=Object.getOwnPropertyDescriptors(value.items)
    if(Object.keys(descriptors).length!==value.items.length+1||Object.entries(descriptors).some(([key,d])=>
     key!=='length'&&(!('value'in d)||!d.enumerable||!/^(0|[1-9][0-9]*)$/.test(key))))throw unavailable()
    const items:EligibleAuditDeliveryV1[]=[]
    let previous=after
    for(let i=0;i<value.items.length;i++){
     const item:unknown=descriptors[String(i)]?.value
     if(!exact(item,'createdAt,eventRef,version')||!timestamp(item.createdAt)||!hex(item.eventRef)
      ||!Number.isSafeInteger(item.version)||Number(item.version)<1)throw unavailable()
     if(previous&&(micros(item.createdAt)<micros(previous.createdAt)
      ||(micros(item.createdAt)===micros(previous.createdAt)&&item.eventRef<=previous.eventRef)))throw unavailable()
     const accepted=Object.freeze({createdAt:item.createdAt,eventRef:item.eventRef,version:Number(item.version)})
     items.push(accepted);previous=accepted
    }
    const last=items.at(-1),cursor=value.nextCursor
    if(items.length===20?(!validCursor(cursor)||!last||cursor.createdAt!==last.createdAt||cursor.eventRef!==last.eventRef):cursor!==null)throw unavailable()
    await stillCurrent(w)
    return {status:'applied',items:Object.freeze(items),nextCursor:cursor===null?null:Object.freeze({...cursor}) as AuditDeliveryCursorV1}
   }catch{throw unavailable()}
  },
  async claim(eventRef,expectedVersion){
   try{
    if(!hex(eventRef)||!version(expectedVersion)||expectedVersion>=Number.MAX_SAFE_INTEGER-1)throw unavailable()
    const w=await current();if(!w)return {status:'forbidden'}
    const value=await invoke('assistant_durable_v1_claim_audit',{...scope(w),p_event:eventRef,p_version:String(expectedVersion)})
    if(exact(value,'status')&&typeof value.status==='string'&&['forbidden','not_found','version_conflict','invalid_transition'].includes(value.status))
     return {status:value.status as Denial|'invalid_transition'}
    if(!exact(value,'status,version,fence,claimRef,workerRef,grantVersion,claimedAt,leaseExpiresAt,event')||value.status!=='applied')throw unavailable()
    const claim={workspaceId:w.workspaceId,eventRef,workerRef:value.workerRef,grantVersion:value.grantVersion,
     version:value.version,fence:value.fence,claimRef:value.claimRef,claimedAt:value.claimedAt,leaseExpiresAt:value.leaseExpiresAt}
    if(!validClaim(claim)||claim.workerRef!==w.workerRef||claim.grantVersion!==w.grantVersion||claim.version!==expectedVersion+1)throw unavailable()
    const original=event(value.event,w,eventRef)
    if(micros(original.createdAt)>micros(claim.claimedAt))throw unavailable()
    await stillCurrent(w)
    return {status:'applied',claim:Object.freeze(claim),event:original}
   }catch{throw unavailable()}
  },
  async ack(claim,receiptRef){
   try{
    if(!validClaim(claim)||!ref(receiptRef))throw unavailable()
    const w=await current()
    if(!w||claim.workspaceId!==w.workspaceId||claim.workerRef!==w.workerRef||claim.grantVersion!==w.grantVersion)return {status:'forbidden'}
    const value=await invoke('assistant_durable_v1_ack_audit',{...scope(w),p_event:claim.eventRef,p_version:String(claim.version),
     p_fence:String(claim.fence),p_claim:claim.claimRef,p_receipt:receiptRef})
    if(exact(value,'status')&&typeof value.status==='string'&&['forbidden','not_found','version_conflict','invalid_claim'].includes(value.status))
     return {status:value.status as Denial|'invalid_claim'}
    if(!exact(value,'status,version')||value.status!=='applied'||value.version!==claim.version+1)throw unavailable()
    return {status:'applied',version:claim.version+1}
   }catch{throw unavailable()}
  },
 }
}
