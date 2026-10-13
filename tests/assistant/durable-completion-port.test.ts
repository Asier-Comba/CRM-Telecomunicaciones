import test from 'node:test'
import assert from 'node:assert/strict'
import {CapabilityRegistry} from '../../src/assistant/registry.ts'
import type {AuditEvent,CapabilityResult} from '../../src/assistant/contracts.ts'
import type {DurableIdempotencyRecord} from '../../src/assistant/durable-contracts.ts'
import type {DurableBusinessPortV1,EffectWorkerAuthorityV1} from '../../src/assistant/durable-business-outbox-port.ts'
import {createDurableResultMaterialProducerV1} from '../../src/assistant/durable-result-material.ts'
import {createDurableCompletionPortV1} from '../../src/assistant/durable-completion-port.ts'
import {createDurableAuditDeliveryPortV1,type OriginalAuditEventV1} from '../../src/assistant/durable-audit-delivery-port.ts'
import {originalAuditPacketV1,ORIGINAL_CAPABILITY_AUDIT_CONTENT_V1} from '../../src/assistant/durable-audit-drain.ts'
const actorId='a1000000-0000-4000-8000-000000000001',workspaceId='b2000000-0000-4000-8000-000000000001',capability='fixture.completion.finalize',permission='fixture:completion:write'
const binding={actorId,workspaceId,capability,argumentsDigest:'a'.repeat(64)},requestId='completion_original_request_012345',eventRef='c'.repeat(64)
const actor={actorId,workspaceId,authentication:'user_session' as const,requestId,permissions:new Set([capability,permission])}
const command={dispatcher:capability,commandRef:'completion_command_reference_001'}
const before:DurableIdempotencyRecord={operationRef:'completion_operation_reference_001',idempotencyKey:'completion_key_'+'0123456789',binding,state:'effect_applied',attempt:1,version:3,
 createdAt:'2026-10-11T04:00:00Z',updatedAt:'2026-10-11T04:00:01Z',leaseExpiresAt:'2026-10-11T04:05:00Z',effectReceiptRef:'completion_original_receipt_reference'}
const result:CapabilityResult={status:'SUCCESS',capability,data:{customerRef:'d4000000-0000-4000-8000-000000000001',label:'Synthetic'}}
const audit:AuditEvent={event:'assistant.capability.completed',requestId,actorId,workspaceId,capability,accessClass:'SAFE_WRITE',status:'SUCCESS',reasonCode:'capability_success',confirmationState:'accepted',idempotencyState:'reserved',durationMs:123}
const completed={...before,state:'completed' as const,version:4,updatedAt:'2026-10-11T04:00:02Z',result}
const input={operationRef:before.operationRef,binding,expectedVersion:3,result,eventRef,auditIntent:audit}
function fixture(policy:'none'|'preview_confirm'='preview_confirm'){
 let worker:EffectWorkerAuthorityV1|null={...actor,permissions:new Set([capability,permission,'assistant:audit:deliver']),scopeEpoch:'scope1',workerRef:'completion_worker_reference_001',capability,dispatcher:capability,schemaVersion:1,grantVersion:1}
 let readable=true,source:unknown={binding,operationRef:before.operationRef,command,receiptRef:before.effectReceiptRef,result,sourceAuthority:'registered_result_source.v1'}
 let loaded:unknown=null
 const calls:{name:string;p:Readonly<Record<string,string>>;signal:AbortSignal}[]=[],registry=new CapabilityRegistry()
 registry.register({contractVersion:3,name:capability,description:'Synthetic completion boundary',permission,accessClass:'SAFE_WRITE',confirmationPolicy:policy,idempotencyRequired:true,
  inputSchema:{type:'object',properties:{},required:[],additionalProperties:false},outputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:36},label:{type:'string',maxLength:120}},required:['customerRef','label'],additionalProperties:false},
  outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},tenantScope:{source:'server_context',modelMayChooseWorkspace:false},authorize:async()=>({allowed:true}),handler:async()=>{throw Error('handler_must_not_run')},projectOutput:()=>null})
 const deps={registry,registrations:[{dispatcher:capability,capability,schemaVersion:1,authorizeResult:async()=>readable}],authority:async()=>worker,loadOutcome:async():Promise<unknown>=>structuredClone(source)}
 const producer=createDurableResultMaterialProducerV1(deps)
 const business={loadAuthorizedOperation:async()=>structuredClone(before)} as unknown as DurableBusinessPortV1
 const completionDeps={business,currentWorker:async()=>worker,producer,loadCommand:async()=>command,loadConfirmationOrigin:undefined as undefined|(()=>Promise<unknown>),
  invoke:async(name:string,p:Readonly<Record<string,string>>,signal:AbortSignal):Promise<{data:unknown;error:unknown}>=>{calls.push({name,p,signal});return {data:name==='assistant_durable_v1_load_result'?loaded:{status:'applied',record:structuredClone(completed)},error:null}}}
 return {deps,completionDeps,calls,port:createDurableCompletionPortV1(completionDeps),setWorker:(v:EffectWorkerAuthorityV1|null)=>{worker=v},worker:()=>worker!,setReadable:(v:boolean)=>{readable=v},setSource:(v:unknown)=>{source=v},setLoaded:(v:unknown)=>{loaded=v}}
}
test('completion rejects a one-microsecond backward reply and admits equal, later and offset-equivalent instants',async()=>{
 const prior={...before,updatedAt:'2026-10-11T04:00:01.123456Z'}
 for(const [updatedAt,allowed] of [
  ['2026-10-11T04:00:01.123455Z',false],
  ['2026-10-11T04:00:01.123456Z',true],
  ['2026-10-11T04:00:01.123457Z',true],
  ['2026-10-11T05:00:01.123456+01:00',true],
 ] as const){
  const f=fixture();f.completionDeps.business.loadAuthorizedOperation=async()=>structuredClone(prior)
  f.completionDeps.invoke=async(name,p,signal)=>{f.calls.push({name,p,signal});return {data:{status:'applied',record:{...completed,updatedAt}},error:null}}
  const pending=createDurableCompletionPortV1(f.completionDeps).completeOperationWithAuditIntent(actor,input)
  if(allowed)assert.equal((await pending).status,'applied');else await assert.rejects(pending)
  assert.equal(f.calls.length,1);assert.ok(f.calls[0].signal.aborted)
 }
})
test('completion sends registered safe material and all original audit fields in one private call',async()=>{
 const f=fixture(),value=await f.port.completeOperationWithAuditIntent(actor,input)
 assert.equal(value.status,'applied');assert.equal(f.calls.length,1)
 const {name,p,signal}=f.calls[0];assert.equal(name,'assistant_durable_v1_complete');assert.equal(p.p_receipt,before.effectReceiptRef)
 assert.deepEqual(JSON.parse(p.p_result),result);assert.deepEqual(JSON.parse(p.p_audit),audit);assert.equal(Object.keys(JSON.parse(p.p_audit)).length,11)
 assert.equal(p.p_event,eventRef);assert.match(p.p_schema_digest,/^[0-9a-f]{64}$/);assert.ok(signal.aborted)
})
test('forged receipt source, returned resource denial, wrong capability and unprojected result never reach completion RPC',async()=>{
 for(const kind of ['source','resource','capability','private']){
  const f=fixture();let candidate=input
  if(kind==='source')f.setSource({binding,operationRef:before.operationRef,command,receiptRef:'forged_original_receipt_reference',result,sourceAuthority:'registered_result_source.v1'})
  if(kind==='resource')f.setReadable(false)
  if(kind==='capability')candidate={...input,result:{...result,capability:'foreign.capability'}}
  if(kind==='private')candidate={...input,result:{...result,data:{customerRef:'d4000000-0000-4000-8000-000000000001',label:'Synthetic',workspaceId}}}
  await assert.rejects(f.port.completeOperationWithAuditIntent(actor,candidate));assert.equal(f.calls.length,0)
 }
})
test('incomplete or changed original audit fails before the private mutation',async()=>{
 const patches=[{durationMs:undefined},{durationMs:-1},{actorId:workspaceId},{requestId:'completion_retry_request_0123456789'},{status:'EMPTY'},{accessClass:'READ'},{reasonCode:'replacement'},
  {confirmationState:'not_applicable'},{idempotencyState:'replayed'},{extra:'forbidden'}]
 for(const patch of patches){const f=fixture();await assert.rejects(f.port.completeOperationWithAuditIntent(actor,{...input,auditIntent:{...audit,...patch} as AuditEvent}));assert.equal(f.calls.length,0)}
})
test('foreign original actor, tenant, version and digest deny mutation',async()=>{
 for(const candidate of [{...input,expectedVersion:4},{...input,binding:{...binding,argumentsDigest:'b'.repeat(64)}},{...input,binding:{...binding,workspaceId:actorId}},
  {...input,operationRef:'foreign_operation_reference_001'}]){const f=fixture();await assert.rejects(f.port.completeOperationWithAuditIntent(actor,candidate));assert.equal(f.calls.length,0)}
 const f=fixture();await assert.rejects(f.port.completeOperationWithAuditIntent({...actor,authentication:'service_principal'},input));assert.equal(f.calls.length,0)
})
test('grant, scope epoch and permission revocation during private outcome admission deny mutation',async()=>{
 for(const patch of [{grantVersion:2},{scopeEpoch:'scope2'},{permissions:new Set([capability])}]){
  const f=fixture();f.deps.loadOutcome=async()=>{f.setWorker({...f.worker(),...patch});return {binding,operationRef:before.operationRef,command,receiptRef:before.effectReceiptRef,result,sourceAuthority:'registered_result_source.v1'}}
  await assert.rejects(f.port.completeOperationWithAuditIntent(actor,input));assert.equal(f.calls.length,0)
 }
})
test('whole-call deadline stops a late outcome source before completion',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();let release!:(v:unknown)=>void
 f.deps.loadOutcome=async()=>new Promise(resolve=>{release=resolve})
 const pending=f.port.completeOperationWithAuditIntent(actor,input),denied=assert.rejects(pending)
 for(let i=0;i<30;i++)await Promise.resolve();assert.equal(typeof release,'function');t.mock.timers.tick(10000);await denied
 release({binding,operationRef:before.operationRef,command,receiptRef:before.effectReceiptRef,result,sourceAuthority:'registered_result_source.v1'})
 for(let i=0;i<30;i++)await Promise.resolve();assert.equal(f.calls.length,0)
})
test('ignored completion reply remains unavailable after deadline and its signal is aborted',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();let release!:(v:{data:unknown;error:null})=>void
 f.completionDeps.invoke=async(name,p,signal)=>{f.calls.push({name,p,signal});return new Promise(resolve=>{release=resolve})}
 const pending=createDurableCompletionPortV1(f.completionDeps).completeOperationWithAuditIntent(actor,input),denied=assert.rejects(pending)
 for(let i=0;i<100;i++)await Promise.resolve();assert.equal(f.calls.length,1);assert.equal(typeof release,'function')
 t.mock.timers.tick(10000);await denied;assert.ok(f.calls[0].signal.aborted)
 release({data:{status:'applied',record:completed},error:null});for(let i=0;i<12;i++)await Promise.resolve()
 assert.equal(f.calls.length,1)
})
test('malformed or changed completion receipt never exposes a successful result',async()=>{
 for(const patch of [{version:3},{result:{...result,data:{customerRef:'d4000000-0000-4000-8000-000000000001',label:'Changed'}}},{effectReceiptRef:'replaced_original_receipt_reference'},{binding:{...binding,workspaceId:actorId}},{privateValue:'forbidden'}]){
  const f=fixture();f.completionDeps.invoke=async(name,p,signal)=>{f.calls.push({name,p,signal});return {data:{status:'applied',record:{...completed,...patch}},error:null}}
  await assert.rejects(createDurableCompletionPortV1(f.completionDeps).completeOperationWithAuditIntent(actor,input));assert.equal(f.calls.length,1);assert.ok(f.calls[0].signal.aborted)
 }
})
test('completed replay revalidates private original outcome and current returned-resource authorization',async()=>{
 const f=fixture();f.setLoaded({record:completed,command})
 assert.deepEqual((await f.port.loadAuthorizedOperation(actor,before.operationRef,new Date()))?.result,result)
 f.setReadable(false);await assert.rejects(f.port.loadAuthorizedOperation(actor,before.operationRef,new Date()))
 assert.ok(f.calls.every(x=>x.name==='assistant_durable_v1_load_result'))
})
test('completed replay keeps an expired original grant denied and accepts a separately admitted current worker',async()=>{
 const f=fixture(),expired={...f.worker(),grantVersion:2},fresh={...f.worker(),workerRef:'fresh_restart_worker_reference_001',grantVersion:1}
 f.setWorker(expired)
 f.completionDeps.invoke=async(name,p,signal)=>{f.calls.push({name,p,signal});return p.p_worker===fresh.workerRef&&p.p_authority_version==='1'?{data:{record:completed,command},error:null}:{data:null,error:{code:'42501'}}}
 await assert.rejects(f.port.loadAuthorizedOperation(actor,before.operationRef,new Date()))
 const current=createDurableCompletionPortV1({...f.completionDeps,currentWorker:async()=>fresh})
 const replay=await current.loadAuthorizedOperation(actor,before.operationRef,new Date());assert.ok(replay);assert.deepEqual(replay.result,result)
 assert.equal(f.worker().grantVersion,2);assert.equal(f.worker().workerRef,expired.workerRef)
 assert.deepEqual(f.calls.map(call=>[call.p.p_worker,call.p.p_authority_version]),[[expired.workerRef,'2'],[fresh.workerRef,'1']])
})
test('returned resource revocation after the committed reply blocks result exposure without a second mutation',async()=>{
 const f=fixture();f.completionDeps.invoke=async(name,p,signal)=>{f.calls.push({name,p,signal});f.setReadable(false);return {data:{status:'applied',record:structuredClone(completed)},error:null}}
 await assert.rejects(createDurableCompletionPortV1(f.completionDeps).completeOperationWithAuditIntent(actor,input))
 assert.equal(f.calls.length,1);assert.ok(f.calls[0].signal.aborted)
})
test('completed replay refuses changed command, source content and unregistered state',async()=>{
 for(const loaded of [{record:completed,command:{...command,dispatcher:'foreign.dispatcher'}},{record:{...completed,result:{...result,data:{customerRef:'d4000000-0000-4000-8000-000000000001',label:'Changed'}}},command},
  {record:{...completed,state:'effect_applied'},command}]){const f=fixture();f.setLoaded(loaded);await assert.rejects(f.port.loadAuthorizedOperation(actor,before.operationRef,new Date()))}
})
const originalEvent:OriginalAuditEventV1={eventRef,workspaceId,operationRef:before.operationRef,operationVersion:4,actorId,capability,argumentsDigest:binding.argumentsDigest,
 event:'assistant.capability.completed',requestId,createdAt:'2026-10-11T04:00:02Z',reasonCode:'capability_success',capabilityEvent:audit}
test('completion delivery retains all eleven original fields and its content digest covers each one',()=>{
 const packet=originalAuditPacketV1(originalEvent);assert.equal(packet.digestAlgorithm,ORIGINAL_CAPABILITY_AUDIT_CONTENT_V1)
 assert.deepEqual(packet.event,originalEvent);assert.ok(Object.isFrozen(packet.event));assert.ok(packet.event.event==='assistant.capability.completed'&&Object.isFrozen(packet.event.capabilityEvent))
 for(const field of Object.keys(audit)){
  const changed={...audit,[field]:field==='durationMs'?124:'changed'} as AuditEvent
  assert.notEqual(originalAuditPacketV1({...originalEvent,capabilityEvent:changed}).contentDigest,packet.contentDigest)
 }
})
test('delegated audit claim rejects missing or substituted original completion content',async()=>{
 for(const original of [originalEvent,{...originalEvent,capabilityEvent:undefined},{...originalEvent,capabilityEvent:{...audit,actorId:workspaceId}},
  {...originalEvent,capabilityEvent:{...audit,durationMs:null}},{...originalEvent,capabilityEvent:{...audit,extra:'forbidden'}}]){
  const f=fixture(),port=createDurableAuditDeliveryPortV1({currentWorker:async()=>f.worker(),invoke:async()=>({error:null,data:{status:'applied',version:2,fence:1,claimRef:'a'.repeat(64),workerRef:f.worker().workerRef,grantVersion:1,
   claimedAt:'2026-10-11T04:01:00Z',leaseExpiresAt:'2026-10-11T04:06:00Z',event:original}})})
  if(original===originalEvent)assert.equal((await port.claim(eventRef,1)).status,'applied');else await assert.rejects(port.claim(eventRef,1))
 }
})

test('unconfirmed completion requires private original provenance and a registered SAFE none policy',async()=>{
 const original={...audit,confirmationState:'not_applicable' as const}
 const f=fixture('none');f.completionDeps.loadConfirmationOrigin=async()=> 'not_applicable'
 const port=createDurableCompletionPortV1(f.completionDeps)
 assert.equal((await port.completeOperationWithAuditIntent(actor,{...input,auditIntent:original})).status,'applied')
 assert.deepEqual(JSON.parse(f.calls[0].p.p_audit),original)
 const unsafe=fixture();unsafe.completionDeps.loadConfirmationOrigin=async()=> 'not_applicable'
 await assert.rejects(createDurableCompletionPortV1(unsafe.completionDeps).completeOperationWithAuditIntent(actor,{...input,auditIntent:original}));assert.equal(unsafe.calls.length,0)
 const substituted=fixture('none');substituted.completionDeps.loadConfirmationOrigin=async()=> 'not_applicable'
 await assert.rejects(createDurableCompletionPortV1(substituted.completionDeps).completeOperationWithAuditIntent(actor,input));assert.equal(substituted.calls.length,0)
})
