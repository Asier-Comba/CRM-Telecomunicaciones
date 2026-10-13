import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CapabilityRegistry} from '../../src/assistant/registry.ts'
import {argumentsDigest} from '../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../src/assistant/durable-command-material.ts'
import type {PreparedCommandMaterialV1} from '../../src/assistant/durable-command-material.ts'
import {createDurableBusinessOutboxPortV1} from '../../src/assistant/durable-business-outbox-port.ts'
import type {EffectWorkerAuthorityV1} from '../../src/assistant/durable-business-outbox-port.ts'
import {DurableReservationUnavailable} from '../../src/assistant/durable-reservation-port.ts'
import {createDurableAuditDeliveryPortV1,DurableAuditDeliveryUnavailable} from '../../src/assistant/durable-audit-delivery-port.ts'
const capability='fixture.effect.typed',requestId='effect_typed_original_request',receiptRef='effect_typed_verified_receipt_reference',claimFence='v1:1:'+ 'a'.repeat(64)
const binding={actorId:'a1000000-0000-4000-8000-000000000001',workspaceId:'b2000000-0000-4000-8000-000000000001',capability,argumentsDigest:argumentsDigest({})}
const command={dispatcher:capability,commandRef:'effect_typed_command_reference'}
const authority:EffectWorkerAuthorityV1={...binding,authentication:'user_session',permissions:new Set([capability,'fixture:write']),scopeEpoch:'current_membership_v1',
 workerRef:'effect_typed_worker_reference',capability,dispatcher:capability,schemaVersion:1,grantVersion:1}
const actor={...authority,requestId},outboxRef='effect_typed_outbox_reference',operationRef='b'.repeat(64)
function fixture(){
 let current:EffectWorkerAuthorityV1|null=authority,version=1,load:()=>Promise<unknown>=async()=>({outboxRef,operationRef,binding,command,version})
 let authorize=async()=>true,verify:(claim:string,receipt:string)=>Promise<unknown>=async(claim,receipt)=>claim===claimFence&&receipt===receiptRef?admission():null
 let project:(v:unknown)=>unknown=v=>v
 const calls:{name:string;params:Readonly<Record<string,string>>;signal:AbortSignal}[]=[]
 const registry=new CapabilityRegistry()
 registry.register({contractVersion:3,name:capability,description:'Disposable effect authority fixture',inputSchema:{type:'object',properties:{},required:[],additionalProperties:false},
 outputSchema:{type:'null'},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},permission:'fixture:write',accessClass:'SAFE_WRITE',confirmationPolicy:'none',
 idempotencyRequired:true,tenantScope:{source:'server_context',modelMayChooseWorkspace:false},authorize:async()=>await authorize()?{allowed:true}:{allowed:false,reason:'resource_not_accessible'},handler:async()=>{throw Error('no_handler')},projectOutput:()=>null})
 const producer=createDurableCommandMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:async()=>current,loadDraft:async()=>({binding,command,schemaVersion:1,arguments:{}})})
 const reservation=createDurableMaterialReservationPortV1({authority:async()=>current,producer,invoke:async()=>{throw Error('reservation_not_called')}})
 const deps={reservation,currentWorker:async()=>current,producer,loadOutbox:async()=>load(),verifyReceipt:async(_w:unknown,_m:unknown,claim:string,receipt:string)=>verify(claim,receipt),
  invoke:async(name:string,params:Readonly<Record<string,string>>,signal:AbortSignal)=>{
   calls.push({name,params,signal});version++
   const r={outboxRef,operationRef,binding,command,state:name==='assistant_durable_v1_claim_effect'?'dispatching':'delivered',attempt:2,version,
    createdAt:'2026-10-11T06:00:00.000001Z',updatedAt:'2026-10-11T06:01:00.000001Z',
    ...(name==='assistant_durable_v1_claim_effect'?{leaseExpiresAt:'2026-10-11T06:05:00.000001Z'}:{receiptRef})}
   return {data:project({status:'applied',record:r,...(name==='assistant_durable_v1_claim_effect'?{claimFence}:{})}),error:null}
  }}
 const port=createDurableBusinessOutboxPortV1(deps)
 return {port,deps,calls,authority:(v:EffectWorkerAuthorityV1|null)=>{current=v},version:(v:number)=>{version=v},load:(f:()=>Promise<unknown>)=>{load=f},
  verify:(f:(claim:string,receipt:string)=>Promise<unknown>)=>{verify=f},authorize:(f:()=>Promise<boolean>)=>{authorize=f},project:(f:(v:unknown)=>unknown)=>{project=f}}
}
function admission(){return {...binding,outboxRef,operationRef,dispatcher:command.dispatcher,commandRef:command.commandRef,claimFence,receiptRef,receiptAuthority:'registered_effect_source.v1'}}
const safe=(e:unknown)=>e instanceof DurableReservationUnavailable&&!e.message.includes('private')
const claim=(f:ReturnType<typeof fixture>)=>f.port.claimOutbox(actor,outboxRef,1)
const ack=(f:ReturnType<typeof fixture>)=>f.port.ackOutbox(actor,outboxRef,2,claimFence,receiptRef)
test('eight real lifecycle methods require registered prepared material and a scoped verified receipt',async()=>{
 const f=fixture();assert.equal(Object.keys(f.port).length,8)
 const c=await claim(f);assert.equal(c.status,'applied');if(c.status!=='applied')throw Error('expected_claim')
 assert.equal(c.claimFence,claimFence);assert.equal(c.record.state,'dispatching');assert.ok(Object.isFrozen(c.record.binding))
 assert.equal((await ack(f)).status,'applied');assert.equal(f.calls.length,2)
 assert.equal(f.calls[1].name,'assistant_durable_v1_ack_effect');assert.equal(f.calls[1].params.p_fence,'1');assert.equal(f.calls[1].params.p_claim,'a'.repeat(64))
 assert.ok(f.calls.every(c=>Object.isFrozen(c.params)&&c.signal.aborted));assert.ok(!JSON.stringify(c.record).includes('canonicalArguments'))
})
test('revoked, foreign or service workers and current resource denial make no mutation',async()=>{
 for(const value of [null,{...authority,authentication:'service_principal'},{...authority,workspaceId:'b2000000-0000-4000-8000-000000000002'},
  {...authority,permissions:new Set<string>()}]){
  const f=fixture();f.authority(value as EffectWorkerAuthorityV1|null);await assert.rejects(claim(f),safe);assert.equal(f.calls.length,0)
 }
 const f=fixture();f.authorize(async()=>false);await assert.rejects(claim(f),safe);assert.equal(f.calls.length,0)
})
test('private metadata is closed and bound; null and old versions remain safe observations',async()=>{
 let getters=0
 for(const value of [{outboxRef,operationRef,binding:{...binding,workspaceId:'other'},command,version:1},
  {outboxRef,operationRef,binding,command,version:1,arguments:{}},Object.defineProperty({outboxRef,operationRef,binding,command},'version',{enumerable:true,get(){getters++;return 1}})]){
  const f=fixture();f.load(async()=>value);await assert.rejects(claim(f),safe);assert.equal(f.calls.length,0)
 }
 assert.equal(getters,0)
 const f=fixture();f.load(async()=>null);assert.equal((await claim(f)).status,'not_found');assert.equal(f.calls.length,0)
 const conflict=fixture();conflict.version(2);assert.equal((await claim(conflict)).status,'version_conflict');assert.equal(conflict.calls.length,0)
})
test('forged handles and different worker schema versions cannot authorize a claim',async()=>{
 const f=fixture();f.authority({...authority,schemaVersion:2});await assert.rejects(claim(f),safe);assert.equal(f.calls.length,0)
 const forged=fixture(),port=createDurableBusinessOutboxPortV1({...forged.deps,producer:{prepare:async()=>Object.freeze({}) as PreparedCommandMaterialV1}})
 await assert.rejects(port.claimOutbox(actor,outboxRef,1),safe);assert.equal(forged.calls.length,0)
})
test('another receipt tenant, event binding, proof, source or hidden material never ACKs',async()=>{
 let getters=0
 for(const value of [{...admission(),workspaceId:'other'},{...admission(),operationRef:'other'},{...admission(),argumentsDigest:'c'.repeat(64)},
  {...admission(),claimFence:'v1:2:'+'a'.repeat(64)},{...admission(),receiptAuthority:'caller'}, {...admission(),rawOutcome:'private'},
  Object.defineProperty({...admission()},'receiptRef',{enumerable:true,get(){getters++;return receiptRef}})]){
  const f=fixture();f.version(2);f.verify(async()=>value);await assert.rejects(ack(f),safe);assert.equal(f.calls.length,0)
 }
 assert.equal(getters,0)
})
test('malformed and missing ACK proofs cannot become a new claim',async()=>{
 for(const value of [undefined,'v1:0:'+'a'.repeat(64),'v1:-1:'+'a'.repeat(64),'v1:01:'+'a'.repeat(64),'v1:9007199254740992:'+'a'.repeat(64),'v1:1:malformed']){
  const f=fixture();f.version(2);await assert.rejects(f.port.ackOutbox(actor,outboxRef,2,value as string,receiptRef),safe);assert.equal(f.calls.length,0)
 }
})
test('permissions revoked after receipt verification and a changed grant reject persistence',async()=>{
 const f=fixture();f.version(2);f.verify(async()=>{f.authority({...authority,permissions:new Set([capability])});return admission()})
 await assert.rejects(ack(f),safe);assert.equal(f.calls.length,0)
 const changed=fixture();changed.authorize(async()=>{changed.authority({...authority,grantVersion:2});return true})
 await assert.rejects(claim(changed),safe);assert.equal(changed.calls.length,0)
})
test('closed database projections reject hidden command data, wrong versions and malformed fences',async()=>{
 for(const project of [(v:unknown)=>({...v as object,rawArguments:{}}),()=>({status:'applied',record:{},claimFence}),
  (v:unknown)=>({...v as object,claimFence:'v1:0:'+'a'.repeat(64)})]){
  const f=fixture();f.project(project);await assert.rejects(claim(f),safe)
 }
})
test('an ignored slow receipt verifier cannot send ACK after the whole-call deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();f.version(2);let checks=0,release!:(v:unknown)=>void,entered!:()=>void
 f.authorize(async()=>{if(++checks===1)t.mock.timers.tick(5000);return true})
 const loaded=new Promise<void>(resolve=>{entered=resolve}),held=new Promise<unknown>(resolve=>{release=resolve})
 f.verify(async()=>{entered();return held})
 const denied=assert.rejects(ack(f),safe);await loaded;t.mock.timers.tick(5000);await denied
 release(admission());await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(f.calls.length,0)
})
test('effect-applied original audit metadata can be delivered only with its valid version and reason',async()=>{
 const eventRef='e'.repeat(64),event={eventRef,workspaceId:binding.workspaceId,operationRef,operationVersion:3,actorId:binding.actorId,capability,
  argumentsDigest:binding.argumentsDigest,event:'assistant.operation.effect_applied',requestId,createdAt:'2026-10-11T06:01:00.000001Z',reasonCode:null}
 let value:unknown=event
 const port=createDurableAuditDeliveryPortV1({currentWorker:async()=>({...authority,grantVersion:1,permissions:new Set(['assistant:audit:deliver'])}),invoke:async()=>({error:null,data:{status:'applied',version:2,fence:1,claimRef:'a'.repeat(64),workerRef:authority.workerRef,grantVersion:1,
  claimedAt:'2026-10-11T06:01:00.000001Z',leaseExpiresAt:'2026-10-11T06:06:00.000001Z',event:value}})})
 const accepted=await port.claim(eventRef,1);assert.equal(accepted.status,'applied')
 for(const invalid of [{...event,operationVersion:2},{...event,reasonCode:'internal_safe'},{...event,receiptRef}]){
  value=invalid;await assert.rejects(port.claim(eventRef,1),e=>e instanceof DurableAuditDeliveryUnavailable)
 }
})
