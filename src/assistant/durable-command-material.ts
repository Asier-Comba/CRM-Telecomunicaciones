import type {IdempotencyBinding,ExecutionContext} from './contracts.ts'
import type {ServerEffectCommand} from './durable-contracts.ts'
import type {CapabilityRegistry} from './registry.ts'
import {argumentsDigest,canonicalArgumentsV1} from './runtime.ts'
import {validateObject,containsTenantSelector,containsHighConfidenceSecret} from './schema.ts'
import {boundedAwaitV2} from './bounded-await-v2.ts'
import {createDurableReservationPortV1,DurableReservationUnavailable} from './durable-reservation-port.ts'
import type {ReservationAuthorityV1,ReservationRpcV1} from './durable-reservation-port.ts'

export type CommandMaterialAuthorityV1=ReservationAuthorityV1&{authentication:'user_session';scopeEpoch:string}
type Registration=Readonly<{dispatcher:string;capability:string;schemaVersion:number}>
declare const preparedCommand:unique symbol
export type PreparedCommandMaterialV1=Readonly<{[preparedCommand]:true}>
type PrivateMaterial={binding:IdempotencyBinding;command:ServerEffectCommand;epoch:string;permission:string;schemaVersion:number;
 canonicalArguments:string;digestAlgorithm:'w3-canonical-json-localeCompare-sha256-v1';producerRuntime:string}
const prepared=new WeakMap<object,PrivateMaterial>()
const fail=()=>new DurableReservationUnavailable()
function exact(v:unknown,fields:string):v is Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.getOwnPropertySymbols(v).length)return false
 const d=Object.getOwnPropertyDescriptors(v)
 return Object.values(d).every(x=>'value'in x&&x.enumerable)&&Object.keys(d).sort().join(',')===fields.split(',').sort().join(',')
}
const sameBinding=(a:IdempotencyBinding,b:IdempotencyBinding)=>a.actorId===b.actorId&&a.workspaceId===b.workspaceId&&a.capability===b.capability&&a.argumentsDigest===b.argumentsDigest
function active(a:CommandMaterialAuthorityV1|null):a is CommandMaterialAuthorityV1{
 return Boolean(a&&a.authentication==='user_session'&&typeof a.scopeEpoch==='string'&&a.scopeEpoch.length>0&&a.scopeEpoch.length<=256)
}
export function createDurableCommandMaterialProducerV1(deps:{
 // Reviewed server definitions/versions and private draft source. None is model input.
 registry:CapabilityRegistry;registrations:readonly Registration[]
 authority:()=>Promise<CommandMaterialAuthorityV1|null>
 loadDraft:(authority:Readonly<CommandMaterialAuthorityV1>,command:Readonly<ServerEffectCommand>)=>Promise<unknown>
}){
 const registrations=deps.registrations.map(r=>{
  const definition=deps.registry.get(r.capability)
  return Object.freeze({...r,definition:definition?Object.freeze({...definition,inputSchema:structuredClone(definition.inputSchema)}):null})
 })
 if(new Set(registrations.map(r=>r.dispatcher)).size!==registrations.length||registrations.some(r=>
  !/^[a-z][a-z0-9.:_-]{2,119}$/.test(r.dispatcher)||!Number.isInteger(r.schemaVersion)||r.schemaVersion<1||r.schemaVersion>2147483647))throw fail()
 return {
  async prepare(inputBinding:IdempotencyBinding,inputCommand:ServerEffectCommand,requestId:string,signal?:AbortSignal):Promise<PreparedCommandMaterialV1>{
   try{
    if(!exact(inputBinding,'actorId,workspaceId,capability,argumentsDigest')||!exact(inputCommand,'dispatcher,commandRef')
     ||typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(requestId))throw fail()
    const binding=Object.freeze({...inputBinding}),command=Object.freeze({...inputCommand})
    const before=await boundedAwaitV2(()=>deps.authority(),signal)
    const registered=registrations.find(r=>r.dispatcher===command.dispatcher&&r.capability===binding.capability)
    const definition=registered?.definition
    if(!active(before)||before.actorId!==binding.actorId||before.workspaceId!==binding.workspaceId||!registered||!definition
     ||definition.accessClass==='READ'||!definition.idempotencyRequired||!before.permissions.has(definition.permission)
     ||!before.permissions.has(binding.capability))throw fail()
    const draft=await boundedAwaitV2(()=>deps.loadDraft(Object.freeze({...before}),Object.freeze({...command})),signal)
    if(!exact(draft,'binding,command,schemaVersion,arguments')||!exact(draft.binding,'actorId,workspaceId,capability,argumentsDigest')
     ||!sameBinding(draft.binding as IdempotencyBinding,binding)||!exact(draft.command,'dispatcher,commandRef')
     ||draft.command.dispatcher!==command.dispatcher||draft.command.commandRef!==command.commandRef||draft.schemaVersion!==registered.schemaVersion
     ||!validateObject(definition.inputSchema,draft.arguments).ok||containsTenantSelector(draft.arguments)||containsHighConfidenceSecret(draft.arguments))throw fail()
    const args=JSON.parse(JSON.stringify(draft.arguments)) as Record<string,unknown>
    if(argumentsDigest(args)!==binding.argumentsDigest)throw fail()
    const context=(a:CommandMaterialAuthorityV1):ExecutionContext=>({actorId:a.actorId,workspaceId:a.workspaceId,permissions:a.permissions,requestId,now:new Date()})
    if(!(await boundedAwaitV2(()=>definition.authorize(context(before),args),signal)).allowed)throw fail()
    const after=await boundedAwaitV2(()=>deps.authority(),signal)
    if(!active(after)||after.actorId!==before.actorId||after.workspaceId!==before.workspaceId||after.scopeEpoch!==before.scopeEpoch
     ||!after.permissions.has(definition.permission)||!after.permissions.has(binding.capability)
     ||!(await boundedAwaitV2(()=>definition.authorize(context(after),args),signal)).allowed)throw fail()
    // An authorizer receives validated data, but cannot mutate the original binding.
    if(signal?.aborted||argumentsDigest(args)!==binding.argumentsDigest)throw fail()
    const handle=Object.freeze(Object.create(null)) as PreparedCommandMaterialV1
    prepared.set(handle,{binding:{...binding},command:{...command},epoch:after.scopeEpoch,permission:definition.permission,schemaVersion:registered.schemaVersion,
     canonicalArguments:canonicalArgumentsV1(args),digestAlgorithm:'w3-canonical-json-localeCompare-sha256-v1',
     producerRuntime:'node'+process.versions.node+'_icu'+process.versions.icu})
    return handle
   }catch{throw fail()}
  },
 }
}
export function createDurableMaterialReservationPortV1(deps:{
 authority:()=>Promise<CommandMaterialAuthorityV1|null>
 producer:ReturnType<typeof createDurableCommandMaterialProducerV1>
 invoke:(operation:ReservationRpcV1|'assistant_durable_v1_confirm_reserve_material',input:Readonly<Record<string,string>>,signal?:AbortSignal)=>Promise<{data:unknown;error:unknown}>
}){
 return createDurableReservationPortV1({authority:deps.authority,invoke:async(operation,input,signal)=>{
  if(operation!=='assistant_durable_v1_confirm_reserve')return deps.invoke(operation,input,signal)
  const current=await boundedAwaitV2(()=>deps.authority(),signal);if(!active(current))throw fail()
  const binding={actorId:current.actorId,workspaceId:input.p_workspace,capability:input.p_capability,argumentsDigest:input.p_digest}
  const command={dispatcher:input.p_dispatcher,commandRef:input.p_command}
  const handle=await deps.producer.prepare(binding,command,input.p_request,signal),material=prepared.get(handle)
  const fresh=await boundedAwaitV2(()=>deps.authority(),signal)
  if(signal?.aborted||!material||!active(fresh)||fresh.actorId!==binding.actorId||fresh.workspaceId!==binding.workspaceId||fresh.scopeEpoch!==material.epoch
   ||!fresh.permissions.has(binding.capability)||!fresh.permissions.has(material.permission)||!sameBinding(material.binding,binding)||material.command.commandRef!==command.commandRef
   ||material.command.dispatcher!==command.dispatcher)throw fail()
  return deps.invoke('assistant_durable_v1_confirm_reserve_material',Object.freeze({...input,p_material:JSON.stringify({schemaVersion:material.schemaVersion,
   digestAlgorithm:material.digestAlgorithm,producerRuntime:material.producerRuntime,canonicalArguments:material.canonicalArguments})}),signal)
 }})
}
