import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {CapabilityRegistry} from '../../src/assistant/registry.ts'
import type {CapabilityResult} from '../../src/assistant/contracts.ts'
import type {DurableIdempotencyRecord} from '../../src/assistant/durable-contracts.ts'
import type {VerifiedReconciliationCommit} from '../../src/assistant/durable-db-contract.ts'
import type {EffectWorkerAuthorityV1} from '../../src/assistant/durable-business-outbox-port.ts'
import type {DurableUnconfirmedReservationPortV1} from '../../src/assistant/durable-unconfirmed-reservation-port.ts'
import {createDurableResultMaterialProducerV1,preparedResultParametersV1,assertResultRecordV1} from '../../src/assistant/durable-result-material.ts'
import {createDurablePositiveReconciliationPortV1} from '../../src/assistant/durable-positive-reconciliation-port.ts'
import {createDurableAuditDeliveryPortV1} from '../../src/assistant/durable-audit-delivery-port.ts'
import {originalAuditPacketV1,ORIGINAL_RECONCILIATION_AUDIT_CONTENT_V1} from '../../src/assistant/durable-audit-drain.ts'

const actorId='a1000000-0000-4000-8000-000000000001',workspaceId='b2000000-0000-4000-8000-000000000001',capability='fixture.positive.reconcile',permission='fixture:reconcile:write'
const actor={actorId,workspaceId,authentication:'user_session' as const,requestId:'positive_original_request_reference',permissions:new Set([capability,permission,'assistant:operation:reconcile'])}
const binding={actorId,workspaceId,capability,argumentsDigest:'a'.repeat(64)},command={dispatcher:capability,commandRef:'positive_command_reference_0001'}
const record:DurableIdempotencyRecord={operationRef:'positive_operation_reference_001',idempotencyKey:'positive_original_key_reference',binding,state:'reconciliation_required',version:4,attempt:1,failureCode:'internal_safe',effectReceiptRef:'positive_original_receipt_reference',createdAt:'2026-10-11T05:00:00Z',leaseExpiresAt:'2026-10-11T05:05:00Z',updatedAt:'2026-10-11T05:10:00Z'}
const result:CapabilityResult={status:'SUCCESS',capability,data:{customerRef:'d4000000-0000-4000-8000-000000000001',label:'Synthetic'}}
const audit={event:'assistant.operation.reconciliation' as const,requestId:actor.requestId,actorId,workspaceId,operationRef:record.operationRef,requestedOutcome:'completed' as const,decision:'completed' as const,reasonCode:'reconciliation_applied'}
const eventRef=createHash('sha256').update(JSON.stringify([workspaceId,record.operationRef,4])).digest('hex')
const completed:DurableIdempotencyRecord={...record,state:'completed',version:5,updatedAt:'2026-10-11T05:10:01Z',result};delete completed.failureCode
const input:VerifiedReconciliationCommit={actor,operationRef:record.operationRef,expectedVersion:4,binding,idempotencyKey:record.idempotencyKey,resolution:{outcome:'completed',result},auditIntent:audit,eventRef,now:new Date('2026-10-11T05:10:00Z')}
function fixture(){
 let worker:EffectWorkerAuthorityV1|null={...actor,scopeEpoch:'scope1',workerRef:'positive_worker_reference_0001',capability,dispatcher:capability,schemaVersion:1,grantVersion:1}
 let readable=true,source:unknown={binding,operationRef:record.operationRef,command,receiptRef:record.effectReceiptRef,result,sourceAuthority:'registered_result_source.v1'}
 const calls:{name:string;params:Readonly<Record<string,string>>;signal:AbortSignal}[]=[],registry=new CapabilityRegistry()
 registry.register({contractVersion:3,name:capability,description:'Synthetic positive reconciliation',permission,accessClass:'SAFE_WRITE',confirmationPolicy:'none',idempotencyRequired:true,
  inputSchema:{type:'object',properties:{},required:[],additionalProperties:false},outputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:36},label:{type:'string',maxLength:120}},required:['customerRef','label'],additionalProperties:false},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},tenantScope:{source:'server_context',modelMayChooseWorkspace:false},authorize:async()=>({allowed:true}),handler:async()=>{throw Error('handler_must_not_run')},projectOutput:()=>null})
 const materialDeps={registry,registrations:[{dispatcher:capability,capability,schemaVersion:1,authorizeResult:async()=>readable}],authority:async()=>worker,loadOutcome:async()=>structuredClone(source)}
 const producer=createDurableResultMaterialProducerV1({...materialDeps,allowVerifiedReconciliation:true})
 // Boundary-only parent mock. Physical constructor/SQL proof is separate.
 const reservation={loadAuthorizedOperation:async()=>structuredClone(record)} as unknown as DurableUnconfirmedReservationPortV1
 const deps={reservation,currentWorker:async()=>worker,producer,loadCommand:async():Promise<unknown>=>command,
  invoke:async(name:'assistant_durable_v1_reconcile_completed',params:Readonly<Record<string,string>>,signal:AbortSignal):Promise<{data:unknown;error:unknown}>=>{calls.push({name,params,signal});return {data:{status:'applied',record:structuredClone(completed),eventRef,auditIntentPersisted:true},error:null}}}
 return {deps,materialDeps,producer,calls,port:createDurablePositiveReconciliationPortV1(deps),worker:()=>worker!,setWorker:(w:EffectWorkerAuthorityV1|null)=>{worker=w},setReadable:(v:boolean)=>{readable=v},setSource:(v:unknown)=>{source=v}}
}
test('positive reconciliation rejects a one-microsecond backward reply and admits equal, later and offset-equivalent instants',async()=>{
 const prior={...record,updatedAt:'2026-10-11T05:10:00.123456Z'}
 for(const [updatedAt,allowed] of [
  ['2026-10-11T05:10:00.123455Z',false],
  ['2026-10-11T05:10:00.123456Z',true],
  ['2026-10-11T05:10:00.123457Z',true],
  ['2026-10-11T06:10:00.123456+01:00',true],
 ] as const){
  const f=fixture();f.deps.reservation.loadAuthorizedOperation=async()=>structuredClone(prior)
  f.deps.invoke=async(name,params,signal)=>{f.calls.push({name,params,signal});return {data:{status:'applied',record:{...completed,updatedAt},eventRef,auditIntentPersisted:true},error:null}}
  const pending=createDurablePositiveReconciliationPortV1(f.deps).commitVerifiedReconciliation(structuredClone(input))
  if(allowed)assert.equal((await pending).status,'applied');else await assert.rejects(pending)
  assert.equal(f.calls.length,1);assert.ok(f.calls[0].signal.aborted)
 }
})

test('positive reconciliation sends original opaque result receipt and full eight-field audit in one private mutation',async()=>{
 const f=fixture(),actual=await f.port.commitVerifiedReconciliation(structuredClone(input));assert.equal(actual.status,'applied')
 assert.equal(f.calls.length,1);const call=f.calls[0]
 assert.equal(call.name,'assistant_durable_v1_reconcile_completed');assert.equal(call.params.p_receipt,record.effectReceiptRef);assert.equal(call.params.p_version,'4');assert.equal(call.params.p_event,eventRef)
 assert.deepEqual(JSON.parse(call.params.p_audit),audit);assert.equal(Object.keys(JSON.parse(call.params.p_audit)).length,8);assert.deepEqual(JSON.parse(call.params.p_result),result);assert.equal(call.signal.aborted,true)
})

test('quarantine admission is opt-in server composition and opaque handle binds its original failure version and receipt',async()=>{
 const f=fixture();assert.throws(()=>assertResultRecordV1(record))
 await assert.rejects(createDurableResultMaterialProducerV1(f.materialDeps).prepare(record,command,result,actor.requestId))
 const handle=await f.producer.prepare(record,command,result,actor.requestId);assert.equal(JSON.stringify(handle),'{}')
 for(const changed of [{...record,failureCode:'temporary_unavailable'},{...record,version:5},{...record,effectReceiptRef:'another_original_receipt_reference'}])assert.throws(()=>preparedResultParametersV1(handle,f.worker(),changed,command))
})

test('retryable and terminal absence cannot enter the positive physical path or infer an effect from expired lease',async()=>{
 for(const outcome of ['failed_retryable','failed_terminal'] as const){const f=fixture();assert.deepEqual(await f.port.commitVerifiedReconciliation({...structuredClone(input),resolution:{outcome,failureCode:'effect_absence_verified_'+(outcome==='failed_retryable'?'retryable':'terminal')}}),{status:'invalid_transition'});assert.equal(f.calls.length,0)}
})

test('forged audit identity provenance or original binding is refused before private mutation',async()=>{
 for(const change of [
  (c:VerifiedReconciliationCommit)=>{c.eventRef='f'.repeat(64)},
  (c:VerifiedReconciliationCommit)=>{c.auditIntent.actorId='a1000000-0000-4000-8000-000000000002'},
  (c:VerifiedReconciliationCommit)=>{c.auditIntent.reasonCode='verified_effect_absence'},
  (c:VerifiedReconciliationCommit)=>{c.auditIntent.requestId='another_original_request_reference'},
  (c:VerifiedReconciliationCommit)=>{c.binding.argumentsDigest='b'.repeat(64)},
  (c:VerifiedReconciliationCommit)=>{c.idempotencyKey='another_original_key_reference'},
 ]){const f=fixture(),c=structuredClone(input);change(c);const observed=await f.port.commitVerifiedReconciliation(c).catch(()=>null);assert.notEqual(observed?.status,'applied');assert.equal(f.calls.length,0)}
})

test('original private outcome and current resource permission are mandatory',async()=>{
 for(const source of [null,{binding,operationRef:record.operationRef,command,receiptRef:'another_original_receipt_reference',result,sourceAuthority:'registered_result_source.v1'},{binding,operationRef:record.operationRef,command,receiptRef:record.effectReceiptRef,result:{...result,data:{label:'Foreign'}},sourceAuthority:'registered_result_source.v1'}]){const f=fixture();f.setSource(source);await assert.rejects(f.port.commitVerifiedReconciliation(structuredClone(input)));assert.equal(f.calls.length,0)}
 const denied=fixture();denied.setReadable(false);await assert.rejects(denied.port.commitVerifiedReconciliation(structuredClone(input)));assert.equal(denied.calls.length,0)
})

test('private grant scope and reconciliation permission are checked again before mutation',async()=>{
 for(const changed of [null,{...fixture().worker(),grantVersion:2},{...fixture().worker(),scopeEpoch:'scope2'},{...fixture().worker(),permissions:new Set([capability,permission])}]){
  const f=fixture();f.deps.loadCommand=async()=>{f.setWorker(changed);return command};await assert.rejects(createDurablePositiveReconciliationPortV1(f.deps).commitVerifiedReconciliation(structuredClone(input)));assert.equal(f.calls.length,0)
 }
})

test('a private applied envelope cannot substitute original receipt result version audit or lease',async()=>{
 for(const change of [
  (r:DurableIdempotencyRecord)=>{r.effectReceiptRef='another_original_receipt_reference'},
  (r:DurableIdempotencyRecord)=>{r.version=6},(r:DurableIdempotencyRecord)=>{r.attempt=2},
  (r:DurableIdempotencyRecord)=>{r.leaseExpiresAt='2026-10-11T05:06:00Z'},
  (r:DurableIdempotencyRecord)=>{r.result={...result,data:{customerRef:result.data&&typeof result.data==='object'&&!Array.isArray(result.data)?result.data.customerRef:'',label:'Substituted'}}},
 ]){const f=fixture();f.deps.invoke=async(name,params,signal)=>{f.calls.push({name,params,signal});const r=structuredClone(completed);change(r);return {data:{status:'applied',record:r,eventRef,auditIntentPersisted:true},error:null}};await assert.rejects(createDurablePositiveReconciliationPortV1(f.deps).commitVerifiedReconciliation(structuredClone(input)));assert.equal(f.calls.length,1)}
})

test('postcommit revocation refuses success while preserving commit uncertainty',async()=>{
 const f=fixture(),invoke=f.deps.invoke;f.deps.invoke=async(...args)=>{const response=await invoke(...args);f.setReadable(false);return response}
 await assert.rejects(createDurablePositiveReconciliationPortV1(f.deps).commitVerifiedReconciliation(structuredClone(input)));assert.equal(f.calls.length,1)
})

test('a late original command lookup cannot initiate reconciliation after its whole deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();let release!:(v:unknown)=>void
 f.deps.loadCommand=()=>new Promise(resolve=>{release=resolve});const denied=assert.rejects(createDurablePositiveReconciliationPortV1(f.deps).commitVerifiedReconciliation(structuredClone(input)))
 for(let i=0;i<100;i++)await Promise.resolve();assert.equal(typeof release,'function');t.mock.timers.tick(10000);await denied;release(command)
 for(let i=0;i<100;i++)await Promise.resolve();assert.equal(f.calls.length,0)
})

test('delivery retains all eight original reconciliation fields in a distinct versioned content digest',async()=>{
 const f=fixture(),w={...f.worker(),permissions:new Set([...f.worker().permissions,'assistant:audit:deliver'])}
 const event={eventRef,workspaceId,operationRef:record.operationRef,operationVersion:5,actorId,capability,argumentsDigest:binding.argumentsDigest,event:'assistant.operation.reconciliation',requestId:actor.requestId,createdAt:'2026-10-11T05:10:01Z',reasonCode:'reconciliation_applied',reconciliationEvent:audit}
 const port=createDurableAuditDeliveryPortV1({currentWorker:async()=>w,invoke:async()=>({data:{status:'applied',version:2,fence:1,claimRef:'d'.repeat(64),workerRef:w.workerRef,grantVersion:1,claimedAt:'2026-10-11T05:10:02Z',leaseExpiresAt:'2026-10-11T05:15:02Z',event},error:null})})
 const claimed=await port.claim(eventRef,1);assert.equal(claimed.status,'applied');if(claimed.status!=='applied')throw Error('expected_claim')
 const packet=originalAuditPacketV1(claimed.event);assert.equal(packet.digestAlgorithm,ORIGINAL_RECONCILIATION_AUDIT_CONTENT_V1)
 assert.ok('reconciliationEvent' in packet.event);if(!('reconciliationEvent' in packet.event))throw Error('expected_original')
 assert.deepEqual(packet.event.reconciliationEvent,audit);assert.equal(Object.keys(packet.event.reconciliationEvent).length,8)
 const changed=originalAuditPacketV1({...claimed.event,event:'assistant.operation.reconciliation',reasonCode:'reconciliation_applied',reconciliationEvent:{...audit,requestId:'different_original_request_reference'}})
 assert.notEqual(changed.contentDigest,packet.contentDigest)
})

test('a delivery projection cannot replace the original reconciliation identity or omit any original field',async()=>{
 const f=fixture(),w={...f.worker(),permissions:new Set([...f.worker().permissions,'assistant:audit:deliver'])}
 for(const nested of [{...audit,requestedOutcome:'failed_terminal'},{...audit,decision:'failed_retryable'},{...audit,requestId:'another_original_request_reference'},
  {...audit,operationRef:'another_operation_reference_001'},{...audit,reasonCode:'verified_effect_absence'},
  {event:audit.event,requestId:audit.requestId,actorId,workspaceId,operationRef:audit.operationRef,requestedOutcome:audit.requestedOutcome,decision:audit.decision},
  {...audit,privateField:'SYNTHETIC_PRIVATE_VALUE'}]){
  const port=createDurableAuditDeliveryPortV1({currentWorker:async()=>w,invoke:async()=>({data:{status:'applied',version:2,fence:1,claimRef:'d'.repeat(64),workerRef:w.workerRef,grantVersion:1,claimedAt:'2026-10-11T05:10:02Z',leaseExpiresAt:'2026-10-11T05:15:02Z',event:{eventRef,workspaceId,operationRef:record.operationRef,operationVersion:5,actorId,capability,argumentsDigest:binding.argumentsDigest,event:'assistant.operation.reconciliation',requestId:actor.requestId,createdAt:'2026-10-11T05:10:01Z',reasonCode:'reconciliation_applied',reconciliationEvent:nested}},error:null})})
  await assert.rejects(port.claim(eventRef,1))
 }
})
