import type {IdempotencyBinding} from './contracts.ts'
import type {DurableConfirmationRecord,DurableIdempotencyRecord,ReconciliationActor} from './durable-contracts.ts'
import type {DurableDatabasePort} from './durable-db-contract.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'

/** Six-method lifecycle seam. Not a full port, worker claim or enabled write path. */
export type DurableReservationPortV1=Pick<DurableDatabasePort,'issueConfirmation'|'cancelConfirmation'|'confirmReserveEnqueue'|'loadAuthorizedOperation'|'transitionToReconciliation'|'startExecution'>
export type ReservationAuthorityV1={actorId:string;workspaceId:string;permissions:ReadonlySet<string>}
export type ReservationRpcV1='assistant_durable_v1_issue'|'assistant_durable_v1_cancel'|'assistant_durable_v1_confirm_reserve'|'assistant_durable_v1_load_operation'|'assistant_durable_v1_require_reconciliation'|'assistant_durable_v1_start_execution'
export type ReservationDependenciesV1={
 // Current server-owned session/permissions, resolved anew for EVERY call.
 authority:()=>Promise<ReservationAuthorityV1|null>
 invoke:(operation:ReservationRpcV1,input:Readonly<Record<string,string>>)=>Promise<{data:unknown;error:unknown}>
}
export class DurableReservationUnavailable extends Error{
 readonly code='ASSISTANT_DURABLE_RESERVATION_UNAVAILABLE'
 constructor(){super('La operación del asistente no está disponible.');this.name='DurableReservationUnavailable'}
}
const unavailable=()=>new DurableReservationUnavailable()
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const ref=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v)
const key=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(v)
const capability=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9.:_-]{2,119}$/.test(v)
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v)
function object(v:unknown):v is Record<string,unknown>{
 if(v===null||typeof v!=='object'||Array.isArray(v))return false
 if(![Object.prototype,null].includes(Object.getPrototypeOf(v)))return false
 return Object.values(Object.getOwnPropertyDescriptors(v)).every(d=>'value'in d)
}
function exact(v:unknown,keys:string):v is Record<string,unknown>{
 return object(v)&&Object.keys(v).sort().join(',')===keys.split(',').sort().join(',')
}
function timestamp(v:unknown):v is string{
 if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))return false
 const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(v)
 return Boolean(match&&Number(match[2])<24&&Number(match[3])<60&&Number(match[4])<60
  &&new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0,10)===match[1])
}
// PostgreSQL keeps microseconds; Date.parse alone would merge two distinct
// instants within one millisecond and reject a legitimate pre-expiry cancel.
function microtime(value:string):bigint{
 const fraction=/\.(\d{1,6})/.exec(value)?.[1].padEnd(6,'0')??'000000'
 return BigInt(Date.parse(value))*BigInt(1000)+BigInt(fraction.slice(3))
}
function validBinding(v:unknown):v is IdempotencyBinding{
 return exact(v,'actorId,workspaceId,capability,argumentsDigest')&&uuid(v.actorId)&&uuid(v.workspaceId)&&capability(v.capability)&&digest(v.argumentsDigest)
}
function matches(v:unknown,b:IdempotencyBinding):boolean{
 return validBinding(v)&&v.actorId===b.actorId&&v.workspaceId===b.workspaceId&&v.capability===b.capability&&v.argumentsDigest===b.argumentsDigest
}
function confirmation(v:unknown,b:IdempotencyBinding):DurableConfirmationRecord{
 if(!exact(v,'operationRef,binding,state,version,issuedAt,expiresAt,updatedAt')||!ref(v.operationRef)||!matches(v.binding,b)
  ||v.state!=='issued'||v.version!==1||!timestamp(v.issuedAt)||!timestamp(v.expiresAt)||!timestamp(v.updatedAt)
  ||microtime(v.expiresAt)-microtime(v.issuedAt)!==BigInt(300000000)||v.updatedAt!==v.issuedAt)throw unavailable()
 return {operationRef:v.operationRef,binding:{...b},state:'issued',version:1,issuedAt:v.issuedAt,expiresAt:v.expiresAt,updatedAt:v.updatedAt}
}
function reservation(v:unknown,b:IdempotencyBinding,k:string):DurableIdempotencyRecord{
 // Completion/results and worker states require their own reviewed projection;
 // do not pretend an unsupported state is a usable reserved record.
 if(!exact(v,'operationRef,idempotencyKey,binding,state,attempt,version,leaseExpiresAt,createdAt,updatedAt')||!ref(v.operationRef)
  ||v.idempotencyKey!==k||!matches(v.binding,b)||v.state!=='reserved'||v.attempt!==1||v.version!==1
  ||!timestamp(v.leaseExpiresAt)||!timestamp(v.createdAt)||!timestamp(v.updatedAt)
  ||microtime(v.leaseExpiresAt)-microtime(v.createdAt)!==BigInt(300000000)||v.updatedAt!==v.createdAt)throw unavailable()
 return {operationRef:v.operationRef,idempotencyKey:k,binding:{...b},state:'reserved',attempt:1,version:1,
  leaseExpiresAt:v.leaseExpiresAt,createdAt:v.createdAt,updatedAt:v.updatedAt}
}
function recoveryRecord(v:unknown,operationRef:string):DurableIdempotencyRecord{
 if(!object(v))throw unavailable()
 const required='operationRef,idempotencyKey,binding,state,attempt,version,leaseExpiresAt,createdAt,updatedAt'.split(',')
 const optional=['effectReceiptRef','failureCode']
 if(!required.every(k=>Object.hasOwn(v,k))||Object.keys(v).some(k=>!required.includes(k)&&!optional.includes(k))
  ||v.operationRef!==operationRef||!key(v.idempotencyKey)||!validBinding(v.binding)
  ||typeof v.state!=='string'||!['reserved','executing','effect_applied','reconciliation_required'].includes(v.state)
  ||!Number.isSafeInteger(v.version)||Number(v.version)<1||!Number.isSafeInteger(v.attempt)||Number(v.attempt)<1
  ||!timestamp(v.createdAt)||!timestamp(v.updatedAt)||!timestamp(v.leaseExpiresAt)
  ||microtime(v.updatedAt)<microtime(v.createdAt)||microtime(v.leaseExpiresAt)<=microtime(v.createdAt)
  ||microtime(v.leaseExpiresAt)>microtime(v.updatedAt)+BigInt(300000000)
  ||(Object.hasOwn(v,'effectReceiptRef')&&!ref(v.effectReceiptRef))
  ||(Object.hasOwn(v,'failureCode')&&(typeof v.failureCode!=='string'||!['temporary_unavailable','validation','conflict','access_revoked','internal_safe','effect_absence_verified_retryable','effect_absence_verified_terminal'].includes(v.failureCode)))
  ||(v.state==='effect_applied'&&!ref(v.effectReceiptRef)))throw unavailable()
 // A recovery read reports persisted state; it never invents an expiry transition
 // or reconstructs a completed result without a registered result schema.
 return {operationRef,idempotencyKey:v.idempotencyKey,binding:{...v.binding},state:v.state as DurableIdempotencyRecord['state'],
  attempt:Number(v.attempt),version:Number(v.version),leaseExpiresAt:v.leaseExpiresAt,createdAt:v.createdAt,updatedAt:v.updatedAt,
  ...(typeof v.effectReceiptRef==='string'?{effectReceiptRef:v.effectReceiptRef}:{}),...(typeof v.failureCode==='string'?{failureCode:v.failureCode}:{})}
}
export function createDurableReservationPortV1(dependencies:ReservationDependenciesV1):DurableReservationPortV1{
 async function currentAuthority(actor:ReconciliationActor){
  if(!actor||actor.authentication!=='user_session'||!key(actor.requestId))return null
  const current=await boundedAwaitV2(()=>dependencies.authority())
  return current&&uuid(current.actorId)&&uuid(current.workspaceId)&&current.actorId===actor.actorId&&current.workspaceId===actor.workspaceId?current:null
 }
 async function authorized(actor:ReconciliationActor,binding:IdempotencyBinding){
  if(!validBinding(binding))return false
  const current=await currentAuthority(actor)
  return Boolean(current&&current.actorId===binding.actorId&&current.workspaceId===binding.workspaceId
   &&current.permissions.has(binding.capability))
 }
 async function invoke(operation:ReservationRpcV1,input:Record<string,string>){
  const response=await boundedAwaitV2(()=>dependencies.invoke(operation,Object.freeze(input)))
  if(!response||response.error!==null)throw unavailable()
  return response.data
 }
 return {
  async startExecution(actor,operationRef,binding,expectedVersion){
   try{
    if(!ref(operationRef)||!Number.isSafeInteger(expectedVersion)||expectedVersion<1||expectedVersion>=Number.MAX_SAFE_INTEGER)throw unavailable()
    if(!await authorized(actor,binding))throw unavailable()
    const value=await invoke('assistant_durable_v1_start_execution',{p_workspace:binding.workspaceId,p_operation:operationRef,
     p_capability:binding.capability,p_digest:binding.argumentsDigest,p_version:String(expectedVersion)})
    if(exact(value,'status')&&typeof value.status==='string'&&['not_found','binding_mismatch','version_conflict','invalid_transition'].includes(value.status))
     return {status:value.status as 'not_found'|'binding_mismatch'|'version_conflict'|'invalid_transition'}
    if(!exact(value,'status,record')||value.status!=='applied')throw unavailable()
    const record=recoveryRecord(value.record,operationRef)
    if(!matches(record.binding,binding)||record.state!=='executing'||record.version!==expectedVersion+1
     ||record.effectReceiptRef!==undefined||record.failureCode!==undefined
     ||microtime(record.leaseExpiresAt)-microtime(record.updatedAt)!==BigInt(300000000))throw unavailable()
    // A successful lifecycle receipt does not authorize an external effect;
    // that requires the separately reviewed current worker/fence claim.
    return {status:'applied',record}
   }catch{throw unavailable()}
  },
  async loadAuthorizedOperation(actor,operationRef,now){
   try{
    if(!ref(operationRef)||!(now instanceof Date)||!Number.isFinite(now.getTime()))throw unavailable()
    const current=await currentAuthority(actor);if(!current)return null
    const value=await invoke('assistant_durable_v1_load_operation',{p_workspace:current.workspaceId,p_operation:operationRef})
    if(value===null)return null
    const record=recoveryRecord(value,operationRef)
    if(!await authorized(actor,record.binding))return null
    return record
   }catch{throw unavailable()}
  },
  async transitionToReconciliation(actor,operationRef,binding,expectedVersion,reasonCode){
   try{
    if(!ref(operationRef)||!Number.isSafeInteger(expectedVersion)||expectedVersion<1||expectedVersion>=Number.MAX_SAFE_INTEGER
     ||!['internal_safe','temporary_unavailable'].includes(reasonCode))throw unavailable()
    if(!await authorized(actor,binding))throw unavailable()
    const value=await invoke('assistant_durable_v1_require_reconciliation',{p_workspace:binding.workspaceId,p_operation:operationRef,
     p_capability:binding.capability,p_digest:binding.argumentsDigest,p_version:String(expectedVersion),p_reason:reasonCode,p_request:actor.requestId})
    if(exact(value,'status')&&typeof value.status==='string'&&['not_found','binding_mismatch','version_conflict','invalid_transition'].includes(value.status))
     return {status:value.status as 'not_found'|'binding_mismatch'|'version_conflict'|'invalid_transition'}
    if(!exact(value,'status,record')||value.status!=='applied')throw unavailable()
    const record=recoveryRecord(value.record,operationRef)
    if(!matches(record.binding,binding)||record.state!=='reconciliation_required'||record.version!==expectedVersion+1||record.failureCode!==reasonCode)throw unavailable()
    return {status:'applied',record}
   }catch{throw unavailable()}
  },
  async cancelConfirmation(actor,confirmationRef,binding){
   try{
    if(!ref(confirmationRef)||!await authorized(actor,binding))throw unavailable()
    const value=await invoke('assistant_durable_v1_cancel',{p_workspace:binding.workspaceId,p_confirmation:confirmationRef,p_capability:binding.capability,p_digest:binding.argumentsDigest})
    if(exact(value,'status')&&typeof value.status==='string'&&['not_found','binding_mismatch','already_terminal','expired'].includes(value.status))
     return {status:value.status as 'not_found'|'binding_mismatch'|'already_terminal'|'expired'}
    if(!exact(value,'status,record')||value.status!=='applied')throw unavailable()
    const v=value.record
    if(!exact(v,'operationRef,binding,state,version,issuedAt,expiresAt,updatedAt')||v.operationRef!==confirmationRef||!matches(v.binding,binding)
     ||v.state!=='cancelled'||!Number.isSafeInteger(v.version)||Number(v.version)<2
     ||!timestamp(v.issuedAt)||!timestamp(v.expiresAt)||!timestamp(v.updatedAt)
     ||microtime(v.expiresAt)<=microtime(v.issuedAt)||microtime(v.expiresAt)-microtime(v.issuedAt)>BigInt(300000000)
     ||microtime(v.updatedAt)<microtime(v.issuedAt)||microtime(v.updatedAt)>=microtime(v.expiresAt))throw unavailable()
    return {status:'applied',record:{operationRef:confirmationRef,binding:{...binding},state:'cancelled',version:Number(v.version),issuedAt:v.issuedAt,expiresAt:v.expiresAt,updatedAt:v.updatedAt}}
   }catch{throw unavailable()}
  },
  async issueConfirmation(actor,binding,expiresAt){
   try{
    if(!(expiresAt instanceof Date)||!Number.isFinite(expiresAt.getTime())||!await authorized(actor,binding))throw unavailable()
    // Caller expiry cannot extend the DB's authoritative five-minute TTL.
    const value=await invoke('assistant_durable_v1_issue',{p_workspace:binding.workspaceId,p_capability:binding.capability,p_digest:binding.argumentsDigest})
    if(!exact(value,'confirmationRef,state,version,issuedAt,expiresAt,record'))throw unavailable()
    const record=confirmation(value.record,binding)
    if(value.confirmationRef!==record.operationRef||value.state!==record.state||value.version!==record.version
     ||value.issuedAt!==record.issuedAt||value.expiresAt!==record.expiresAt)throw unavailable()
    return record
   }catch{throw unavailable()}
  },
  async confirmReserveEnqueue(actor,command){
   try{
    if(!command||!await authorized(actor,command.binding))return {status:'forbidden'}
    if(!ref(command.confirmationRef)||!key(command.idempotencyKey)||!command.command
     ||!ref(command.command.commandRef)||!capability(command.command.dispatcher))throw unavailable()
    const value=await invoke('assistant_durable_v1_confirm_reserve',{
     p_workspace:command.binding.workspaceId,p_confirmation:command.confirmationRef,p_capability:command.binding.capability,
     p_digest:command.binding.argumentsDigest,p_key:command.idempotencyKey,p_dispatcher:command.command.dispatcher,
     p_command:command.command.commandRef,p_request:actor.requestId})
    if(exact(value,'status')&&typeof value.status==='string'&&['conflict','invalid_confirmation','forbidden'].includes(value.status))
     return {status:value.status as 'conflict'|'invalid_confirmation'|'forbidden'}
    if(!exact(value,'status,operationRef,state,version,record')||typeof value.status!=='string'||!['reserved','existing'].includes(value.status))throw unavailable()
    const record=reservation(value.record,command.binding,command.idempotencyKey)
    if(value.operationRef!==record.operationRef||value.state!==record.state||value.version!==record.version)throw unavailable()
    return {status:value.status as 'reserved'|'existing',record}
   }catch{throw unavailable()}
  },
 }
}
