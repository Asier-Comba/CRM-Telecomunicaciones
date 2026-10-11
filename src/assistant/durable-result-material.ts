import type {AccessClass,CapabilityResult,ExecutionContext,IdempotencyBinding,ValueSchema} from './contracts.ts'
import type {DurableIdempotencyRecord,ServerEffectCommand} from './durable-contracts.ts'
import type {CapabilityRegistry} from './registry.ts'
import type {CommandMaterialAuthorityV1} from './durable-command-material.ts'
import {canonicalArgumentsV1,argumentsDigest} from './runtime.ts'
import {validateValue,containsTenantSelector,containsHighConfidenceSecret} from './schema.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'
import {DurableReservationUnavailable} from './durable-reservation-port.ts'

export type ResultRegistrationV1=Readonly<{dispatcher:string;capability:string;schemaVersion:number;
 authorizeResult:(context:ExecutionContext,record:Readonly<DurableIdempotencyRecord>,result:Readonly<CapabilityResult>)=>Promise<boolean>}>
declare const preparedResult:unique symbol
export type PreparedResultMaterialV1=Readonly<{[preparedResult]:true}>
type PrivateResult={binding:IdempotencyBinding;operationRef:string;version:number;receiptRef:string;command:ServerEffectCommand;
 recordDigest:string;epoch:string;permission:string;accessClass:AccessClass;confirmationPolicy:string;schemaVersion:number;schemaDigest:string;canonicalResult:string;reconciliationAdmission:boolean}
const prepared=new WeakMap<object,PrivateResult>(),fail=()=>new DurableReservationUnavailable()
function exact(v:unknown,fields:string):v is Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.getOwnPropertySymbols(v).length)return false
 const descriptors=Object.getOwnPropertyDescriptors(v)
 return Object.values(descriptors).every(x=>'value'in x&&x.enumerable)&&Object.keys(descriptors).sort().join(',')===fields.split(',').sort().join(',')
}
const sameBinding=(a:IdempotencyBinding,b:IdempotencyBinding)=>a.actorId===b.actorId&&a.workspaceId===b.workspaceId&&a.capability===b.capability&&a.argumentsDigest===b.argumentsDigest
function active(v:CommandMaterialAuthorityV1|null):v is CommandMaterialAuthorityV1{return Boolean(v&&v.authentication==='user_session'&&typeof v.scopeEpoch==='string'&&v.scopeEpoch.length>0&&v.scopeEpoch.length<=256)}
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
function timestamp(v:unknown):v is string{
 if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))return false
 const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(v)
 return Boolean(m&&Number(m[2])<24&&Number(m[3])<60&&Number(m[4])<60&&new Date(m[1]+'T00:00:00Z').toISOString().slice(0,10)===m[1])
}
const micros=(v:string)=>BigInt(Date.parse(v))*BigInt(1000)+BigInt((/\.(\d{1,6})/.exec(v)?.[1].padEnd(6,'0')??'000000').slice(3))
function assertMaterialRecordV1(value:unknown,reconciliation=false):asserts value is DurableIdempotencyRecord{
 if(!value||typeof value!=='object')throw fail()
 const v=value as Record<string,unknown>
 const fields='operationRef,idempotencyKey,binding,state,attempt,version,leaseExpiresAt,createdAt,updatedAt,effectReceiptRef'
 if(!(exact(v,fields)||exact(v,fields+',result')||(reconciliation&&exact(v,fields+',failureCode'))))throw fail()
 const quarantined=reconciliation&&v.state==='reconciliation_required'
 if(!exact(v,fields+(v.state==='completed'?',result':quarantined?',failureCode':''))
  ||!exact(v.binding,'actorId,workspaceId,capability,argumentsDigest')||!uuid(v.binding.actorId)||!uuid(v.binding.workspaceId)
  ||typeof v.binding.capability!=='string'||!/^[a-z][a-z0-9.:_-]{2,119}$/.test(v.binding.capability)
  ||typeof v.binding.argumentsDigest!=='string'||!/^[0-9a-f]{64}$/.test(v.binding.argumentsDigest)
  ||typeof v.operationRef!=='string'||!/^[A-Za-z0-9_-]{24,200}$/.test(v.operationRef)
  ||typeof v.idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(v.idempotencyKey)
  ||typeof v.effectReceiptRef!=='string'||!/^[A-Za-z0-9_-]{24,200}$/.test(v.effectReceiptRef)
  ||!Number.isSafeInteger(v.attempt)||Number(v.attempt)<1||!Number.isSafeInteger(v.version)||Number(v.version)<3||Number(v.version)>=Number.MAX_SAFE_INTEGER
  ||(v.state!=='effect_applied'&&v.state!=='completed'&&!quarantined)||(v.state==='completed'&&Number(v.version)<4)
  ||(quarantined&&(Number(v.version)<4||!['internal_safe','temporary_unavailable'].includes(String(v.failureCode))))
  ||!timestamp(v.createdAt)||!timestamp(v.updatedAt)||!timestamp(v.leaseExpiresAt)||micros(v.updatedAt)<micros(v.createdAt)
  ||micros(v.leaseExpiresAt)<=micros(v.createdAt)||micros(v.leaseExpiresAt)>micros(v.updatedAt)+BigInt(300000000)||containsHighConfidenceSecret(v))throw fail()
}
export function assertResultRecordV1(value:unknown):asserts value is DurableIdempotencyRecord{assertMaterialRecordV1(value)}
export function assertVerifiedReconciliationRecordV1(value:unknown):asserts value is DurableIdempotencyRecord{
 assertMaterialRecordV1(value,true);if(value.state!=='reconciliation_required')throw fail()
}
/** A reference/digest supplied by a caller is never an admitted result. */
export function preparedResultParametersV1(handle:PreparedResultMaterialV1,current:CommandMaterialAuthorityV1|null,record:DurableIdempotencyRecord,command:ServerEffectCommand){
 const material=prepared.get(handle)
 if(!material)throw fail()
 assertMaterialRecordV1(record,material.reconciliationAdmission)
 if(!material||!active(current)||!sameBinding(material.binding,record.binding)||material.operationRef!==record.operationRef||material.version!==record.version
  ||material.recordDigest!==argumentsDigest(record as unknown as Record<string,unknown>)
  ||material.receiptRef!==record.effectReceiptRef||current.actorId!==record.binding.actorId||current.workspaceId!==record.binding.workspaceId||current.scopeEpoch!==material.epoch
  ||!current.permissions.has(record.binding.capability)||!current.permissions.has(material.permission)||command.dispatcher!==material.command.dispatcher||command.commandRef!==material.command.commandRef)throw fail()
 return Object.freeze({schemaVersion:material.schemaVersion,schemaDigest:material.schemaDigest,canonicalResult:material.canonicalResult,accessClass:material.accessClass,confirmationPolicy:material.confirmationPolicy})
}
export function createDurableResultMaterialProducerV1(deps:{registry:CapabilityRegistry;registrations:readonly ResultRegistrationV1[];
 authority:()=>Promise<CommandMaterialAuthorityV1|null>;
 // Trusted server composition only. Default completion callers cannot admit quarantine.
 allowVerifiedReconciliation?:true;
 // Required private original-effect outcome lookup, never a model/provider body.
 loadOutcome:(authority:Readonly<CommandMaterialAuthorityV1>,record:Readonly<DurableIdempotencyRecord>,command:Readonly<ServerEffectCommand>)=>Promise<unknown>;
}){
 const registrations=deps.registrations.map(registration=>{
  const definition=deps.registry.get(registration.capability)
  if(!definition||definition.accessClass==='READ'||!definition.idempotencyRequired||typeof registration.authorizeResult!=='function'
   ||!/^[a-z][a-z0-9.:_-]{2,119}$/.test(registration.dispatcher)
   ||!Number.isInteger(registration.schemaVersion)||registration.schemaVersion<1||registration.schemaVersion>2147483647)throw fail()
  return Object.freeze({...registration,definition:Object.freeze({...definition,outputSchema:structuredClone(definition.outputSchema)})})
 })
 if(new Set(registrations.map(r=>r.dispatcher)).size!==registrations.length)throw fail()
 function admitted(schema:ValueSchema,value:unknown,capability:string):value is CapabilityResult{
  return exact(value,'status,capability,data')&&value.status==='SUCCESS'&&value.capability===capability
   &&!containsHighConfidenceSecret(value)&&!containsTenantSelector(value.data)&&validateValue(schema,value.data,{maxBytes:32768}).ok
   &&Buffer.byteLength(JSON.stringify(value),'utf8')<=32768
 }
 return {
  async prepare(inputRecord:DurableIdempotencyRecord,inputCommand:ServerEffectCommand,value:unknown,requestId:string,parentSignal?:AbortSignal):Promise<PreparedResultMaterialV1>{
   const stop=new AbortController(),cancel=()=>stop.abort(),signal=stop.signal
   parentSignal?.addEventListener('abort',cancel,{once:true});if(parentSignal?.aborted)cancel()
   try{return await boundedAwaitV2(async()=>{
    assertMaterialRecordV1(inputRecord,deps.allowVerifiedReconciliation===true)
    if(containsHighConfidenceSecret(inputRecord)||containsHighConfidenceSecret(inputCommand)||!exact(inputCommand,'dispatcher,commandRef')
     ||!Number.isSafeInteger(inputRecord.version)||inputRecord.version<3||inputRecord.version>=Number.MAX_SAFE_INTEGER
     ||!(['effect_applied','completed'].includes(inputRecord.state)||(deps.allowVerifiedReconciliation===true&&inputRecord.state==='reconciliation_required'))||typeof inputRecord.effectReceiptRef!=='string'
     ||!/^[A-Za-z0-9_-]{24,200}$/.test(inputRecord.effectReceiptRef)||!exact(inputRecord.binding,'actorId,workspaceId,capability,argumentsDigest')
     ||!/^[A-Za-z0-9_-]{24,200}$/.test(inputRecord.operationRef)||!/^[A-Za-z0-9_-]{24,200}$/.test(inputCommand.commandRef)
     ||!/^[0-9a-f]{64}$/.test(inputRecord.binding.argumentsDigest)
     ||typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(requestId))throw fail()
    const record=structuredClone(inputRecord),command=Object.freeze({...inputCommand})
    const registered=registrations.find(r=>r.dispatcher===command.dispatcher&&r.capability===record.binding.capability)
    const before=await boundedAwaitV2(()=>deps.authority(),signal)
    if(!registered||!active(before)||before.actorId!==record.binding.actorId||before.workspaceId!==record.binding.workspaceId
     ||!before.permissions.has(registered.definition.permission)||!before.permissions.has(record.binding.capability)
     ||!admitted(registered.definition.outputSchema,value,record.binding.capability))throw fail()
    const result=JSON.parse(JSON.stringify(value)) as CapabilityResult,canonicalResult=canonicalArgumentsV1(result)
    const observed=await boundedAwaitV2(()=>deps.loadOutcome(Object.freeze({...before}),structuredClone(record),command),signal)
    if(!exact(observed,'binding,operationRef,command,receiptRef,result,sourceAuthority')||observed.sourceAuthority!=='registered_result_source.v1'
     ||!exact(observed.binding,'actorId,workspaceId,capability,argumentsDigest')||!sameBinding(observed.binding as IdempotencyBinding,record.binding)
     ||observed.operationRef!==record.operationRef||!exact(observed.command,'dispatcher,commandRef')
     ||observed.command.dispatcher!==command.dispatcher||observed.command.commandRef!==command.commandRef||observed.receiptRef!==record.effectReceiptRef
     ||!admitted(registered.definition.outputSchema,observed.result,record.binding.capability)||canonicalArgumentsV1(observed.result)!==canonicalResult)throw fail()
    const context=(authority:CommandMaterialAuthorityV1):ExecutionContext=>({actorId:authority.actorId,workspaceId:authority.workspaceId,permissions:authority.permissions,requestId,now:new Date()})
    if(!(await boundedAwaitV2(()=>registered.authorizeResult(context(before),structuredClone(record),result),signal)))throw fail()
    const after=await boundedAwaitV2(()=>deps.authority(),signal)
    if(!active(after)||after.actorId!==before.actorId||after.workspaceId!==before.workspaceId||after.scopeEpoch!==before.scopeEpoch
     ||!after.permissions.has(registered.definition.permission)||!after.permissions.has(record.binding.capability)
     ||!(await boundedAwaitV2(()=>registered.authorizeResult(context(after),structuredClone(record),result),signal)))throw fail()
    if(signal?.aborted||canonicalArgumentsV1(result)!==canonicalResult)throw fail()
    const handle=Object.freeze(Object.create(null)) as PreparedResultMaterialV1
    prepared.set(handle,{binding:{...record.binding},operationRef:record.operationRef,version:record.version,receiptRef:record.effectReceiptRef!,
     command:{...command},recordDigest:argumentsDigest(record as unknown as Record<string,unknown>),epoch:after.scopeEpoch,permission:registered.definition.permission,accessClass:registered.definition.accessClass,schemaVersion:registered.schemaVersion,
     confirmationPolicy:registered.definition.confirmationPolicy,schemaDigest:argumentsDigest(registered.definition.outputSchema as unknown as Record<string,unknown>),canonicalResult,reconciliationAdmission:deps.allowVerifiedReconciliation===true})
    return handle
   },signal)}catch{throw fail()}finally{stop.abort();parentSignal?.removeEventListener('abort',cancel)}
  },
 }
}
