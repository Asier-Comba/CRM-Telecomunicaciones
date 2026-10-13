import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CapabilityRegistry} from '../../src/assistant/registry.ts'
import {CAPABILITY_CONTRACT_VERSION} from '../../src/assistant/contracts.ts'
import type {CapabilityDefinition} from '../../src/assistant/contracts.ts'
import {argumentsDigest} from '../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../src/assistant/durable-command-material.ts'
import type {CommandMaterialAuthorityV1,PreparedCommandMaterialV1} from '../../src/assistant/durable-command-material.ts'
import {DurableReservationUnavailable} from '../../src/assistant/durable-reservation-port.ts'
const capability='fixture.command.material',requestId='command_material_original_request'
const input={customerRef:'synthetic_customer_reference',label:'fixture'}
const binding={actorId:'a1000000-0000-4000-8000-000000000001',workspaceId:'b2000000-0000-4000-8000-000000000001',capability,argumentsDigest:argumentsDigest(input)}
const command={dispatcher:capability,commandRef:'command_material_typed_reference'}
const authority:CommandMaterialAuthorityV1={authentication:'user_session',actorId:binding.actorId,workspaceId:binding.workspaceId,
 permissions:new Set([capability,'fixture:write']),scopeEpoch:'membership_v1_workspace_v1'}
const actor={...authority,requestId}
function fixture(){
 let current:CommandMaterialAuthorityV1|null=authority,draft:unknown={binding,command,schemaVersion:1,arguments:input},authCalls=0
 let loadDraft:()=>Promise<unknown>=async()=>draft
 let authorityReads=0,onAuthority:((read:number)=>void)=()=>{}
 const resolveAuthority=async()=>{onAuthority(++authorityReads);return current}
 let authorize:(values:Record<string,unknown>)=>Promise<boolean>=async()=>true
 const registry=new CapabilityRegistry()
 const definition:CapabilityDefinition={contractVersion:CAPABILITY_CONTRACT_VERSION,name:capability,description:'Disposable validated argument fixture',
  inputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},
  outputSchema:{type:'null'},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},permission:'fixture:write',accessClass:'SAFE_WRITE',
  confirmationPolicy:'none',idempotencyRequired:true,tenantScope:{source:'server_context',modelMayChooseWorkspace:false},
  authorize:async(_context,values)=>{authCalls++;return await authorize(values)?{allowed:true}:{allowed:false,reason:'resource_not_accessible'}},
  handler:async()=>{throw new Error('handler_must_not_run')},projectOutput:()=>null}
 registry.register(definition)
 const producer=createDurableCommandMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:resolveAuthority,loadDraft:async()=>loadDraft()})
 const calls:{operation:string;input:Readonly<Record<string,string>>}[]=[]
 const port=createDurableMaterialReservationPortV1({producer,authority:resolveAuthority,invoke:async(operation,params)=>{
  calls.push({operation,input:params});return {error:null,data:{status:'reserved',operationRef:'a'.repeat(64),state:'reserved',version:1,
   record:{operationRef:'a'.repeat(64),idempotencyKey:'material_typed_idempotency',binding,state:'reserved',attempt:1,version:1,
    leaseExpiresAt:'2026-10-11T05:05:00.000001Z',createdAt:'2026-10-11T05:00:00.000001Z',updatedAt:'2026-10-11T05:00:00.000001Z'}}}
 }})
 return {producer,port,calls,definition,authCalls:()=>authCalls,draft:(v:unknown)=>{draft=v},load:(f:()=>Promise<unknown>)=>{loadDraft=f},onAuthority:(f:(read:number)=>void)=>{onAuthority=f},authority:(v:CommandMaterialAuthorityV1|null)=>{current=v},authorize:(f:(values:Record<string,unknown>)=>Promise<boolean>)=>{authorize=f}}
}
const safe=(e:unknown)=>e instanceof DurableReservationUnavailable&&!e.message.includes('private')
const reserve=(f:ReturnType<typeof fixture>)=>f.port.confirmReserveEnqueue(actor,{confirmationRef:'b'.repeat(64),binding,idempotencyKey:'material_typed_idempotency',command})
test('registered command arguments remain behind an opaque handle and enter only the atomic material RPC',async()=>{
 const f=fixture(),handle=await f.producer.prepare(binding,command,requestId)
 assert.equal(JSON.stringify(handle),'{}');assert.ok(Object.isFrozen(handle));assert.equal(Object.getOwnPropertySymbols(handle).length,0)
 assert.equal((await reserve(f)).status,'reserved');assert.equal(f.calls.length,1)
 assert.equal(f.calls[0].operation,'assistant_durable_v1_confirm_reserve_material');assert.ok(Object.isFrozen(f.calls[0].input))
 const m=JSON.parse(f.calls[0].input.p_material)
 assert.deepEqual(Object.keys(m).sort(),['canonicalArguments','digestAlgorithm','producerRuntime','schemaVersion'])
 assert.equal(m.canonicalArguments,'{"customerRef":"synthetic_customer_reference","label":"fixture"}')
 assert.equal(m.digestAlgorithm,'w3-canonical-json-localeCompare-sha256-v1');assert.equal(m.schemaVersion,1)
 assert.match(m.producerRuntime,/^node[0-9.]+_icu[0-9.]+$/);assert.equal(f.authCalls(),4)
})
test('changed arguments, binding, version and unregistered dispatchers have zero commit calls',async()=>{
 for(const draft of [{binding,command,schemaVersion:2,arguments:input},{binding,command,schemaVersion:1,arguments:{...input,label:'changed'}},
  {binding:{...binding,workspaceId:'other'},command,schemaVersion:1,arguments:input},
  {binding,command:{...command,dispatcher:'fixture.other.material'},schemaVersion:1,arguments:input}]){
  const f=fixture();f.draft(draft);await assert.rejects(reserve(f),safe);assert.equal(f.calls.length,0)
 }
 const f=fixture();await assert.rejects(f.producer.prepare(binding,{...command,dispatcher:'fixture.missing.material'},requestId),safe)
 assert.equal(f.calls.length,0)
})
test('unsafe argument structure, tenant selectors and sensitive values never invoke getters or commit',async()=>{
 let getters=0
 const accessor=Object.defineProperty({...input},'label',{get(){getters++;return 'fixture'},enumerable:true})
 for(const args of [accessor,{...input,workspaceId:binding.workspaceId},{...input,label:'x'.repeat(49)},
  {...input,label:'Bearer '+ 'a'.repeat(24)},Object.assign(Object.create({}),input)]){
  const f=fixture();f.draft({binding,command,schemaVersion:1,arguments:args});await assert.rejects(reserve(f),safe);assert.equal(f.calls.length,0)
 }
 assert.equal(getters,0)
})
test('current resource denial and changed authority epoch after a read deny persistence',async()=>{
 const denied=fixture();denied.authorize(async()=>false);await assert.rejects(reserve(denied),safe);assert.equal(denied.calls.length,0)
 const revoked=fixture();revoked.authorize(async()=>{revoked.authority({...authority,scopeEpoch:'membership_v2_workspace_v1'});return true})
 await assert.rejects(reserve(revoked),safe);assert.equal(revoked.calls.length,0)
 const permissions=fixture();permissions.authority({...authority,permissions:new Set([capability])})
 await assert.rejects(reserve(permissions),safe);assert.equal(permissions.calls.length,0)
})
test('a fake prepared handle cannot submit arbitrary argument material',async()=>{
 const calls:string[]=[]
 const port=createDurableMaterialReservationPortV1({authority:async()=>authority,producer:{prepare:async()=>Object.freeze({}) as PreparedCommandMaterialV1},
  invoke:async(name)=>{calls.push(name);return {data:null,error:null}}})
 await assert.rejects(port.confirmReserveEnqueue(actor,{confirmationRef:'b'.repeat(64),binding,idempotencyKey:'material_typed_idempotency',command}),safe)
 assert.deepEqual(calls,[])
})
test('permission revocation during the last resource check cannot commit prepared material',async()=>{
 const f=fixture()
 f.authorize(async()=>{if(f.authCalls()===2)f.authority({...authority,permissions:new Set([capability])});return true})
 await assert.rejects(reserve(f),safe);assert.equal(f.calls.length,0)
})
test('a resource authorizer cannot replace validated arguments before persistence',async()=>{
 const f=fixture();f.authorize(async values=>{values.label='replacement';return true})
 await assert.rejects(reserve(f),safe);assert.equal(f.calls.length,0)
 assert.equal(input.label,'fixture')
})
test('the reservation deadline aborts preparation even when the private draft ignores cancellation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const f=fixture();let release!:(v:unknown)=>void,entered!:()=>void
 const loaded=new Promise<void>(resolve=>{entered=resolve}),held=new Promise<unknown>(resolve=>{release=resolve})
 f.onAuthority(read=>{if(read===3)t.mock.timers.tick(5000)})
 f.load(async()=>{entered();return held})
 const pending=reserve(f),denied=assert.rejects(pending,safe)
 await loaded;t.mock.timers.tick(5000);await denied
 release({binding,command,schemaVersion:1,arguments:input})
 await new Promise<void>(resolve=>setImmediate(resolve))
 assert.equal(f.calls.length,0);assert.equal(f.authCalls(),0)
})
