import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createDurableAuditDeliveryPortV1,DurableAuditDeliveryUnavailable} from '../../src/assistant/durable-audit-delivery-port.ts'
import type {AuditWorkerAuthorityV1,AuditDeliveryRpcV1} from '../../src/assistant/durable-audit-delivery-port.ts'
const worker:AuditWorkerAuthorityV1={authentication:'user_session',actorId:'a1000000-0000-4000-8000-000000000001',
 workspaceId:'b2000000-0000-4000-8000-000000000001',workerRef:'typed_audit_worker_reference',capability:'fixture.audit',grantVersion:1,permissions:new Set(['assistant:audit:deliver'])}
const original={eventRef:'a'.repeat(64),workspaceId:worker.workspaceId,operationRef:'b'.repeat(64),operationVersion:1,
 actorId:'a1000000-0000-4000-8000-000000000002',capability:worker.capability,argumentsDigest:'c'.repeat(64),
 event:'assistant.operation.reserved',requestId:'original_audit_request_reference',createdAt:'2026-10-11T03:45:00Z',reasonCode:null}
const receipt={status:'applied',version:2,fence:1,claimRef:'d'.repeat(64),workerRef:worker.workerRef,grantVersion:1,
 claimedAt:'2026-10-11T03:46:00.000001Z',leaseExpiresAt:'2026-10-11T03:51:00.000001Z',event:original}
function fixture(){
 let data:unknown=receipt,error:unknown=null,current:AuditWorkerAuthorityV1|null=worker
 const calls:{operation:AuditDeliveryRpcV1;input:Readonly<Record<string,string>>}[]=[]
 const port=createDurableAuditDeliveryPortV1({currentWorker:async()=>current,invoke:async(operation,input)=>{calls.push({operation,input});return {data,error}}})
 return {port,calls,data:(v:unknown)=>{data=v},error:(v:unknown)=>{error=v},worker:(v:AuditWorkerAuthorityV1|null)=>{current=v}}
}
const safe=(e:unknown)=>e instanceof DurableAuditDeliveryUnavailable&&!e.message.includes('private')

test('audit delivery uses a fresh scoped worker and preserves the different original actor/request',async()=>{
 const f=fixture(),claimed=await f.port.claim(original.eventRef,1);assert.equal(claimed.status,'applied')
 if(claimed.status!=='applied')throw new Error('missing_claim')
 assert.deepEqual(claimed.event,original);assert.ok(Object.isFrozen(claimed.event));assert.ok(Object.isFrozen(claimed.claim))
 assert.deepEqual(f.calls[0],{operation:'assistant_durable_v1_claim_audit',input:{p_workspace:worker.workspaceId,p_worker:worker.workerRef,
  p_authority_version:'1',p_event:original.eventRef,p_version:'1'}})
 assert.ok(Object.isFrozen(f.calls[0].input));f.data({status:'applied',version:3})
 assert.deepEqual(await f.port.ack(claimed.claim,'typed_audit_sink_receipt_ref'),{status:'applied',version:3})
 assert.equal(f.calls[1].input.p_fence,'1');assert.equal(f.calls[1].input.p_claim,receipt.claimRef)
})
test('caller data cannot pick worker identity or bypass absent/current grant and tenant checks',async()=>{
 const f=fixture(),claimed=await f.port.claim(original.eventRef,1);if(claimed.status!=='applied')throw new Error('missing_claim')
 f.worker({...worker,permissions:new Set()});assert.deepEqual(await f.port.claim(original.eventRef,1),{status:'forbidden'})
 assert.deepEqual(await f.port.ack(claimed.claim,'typed_audit_sink_receipt_ref'),{status:'forbidden'})
 f.worker({...worker,grantVersion:2});assert.deepEqual(await f.port.ack(claimed.claim,'typed_audit_sink_receipt_ref'),{status:'forbidden'})
 f.worker({...worker,workspaceId:'b2000000-0000-4000-8000-000000000002'});assert.deepEqual(await f.port.ack(claimed.claim,'typed_audit_sink_receipt_ref'),{status:'forbidden'})
 f.worker({...worker,workerRef:'another_audit_worker_reference'});assert.deepEqual(await f.port.ack(claimed.claim,'typed_audit_sink_receipt_ref'),{status:'forbidden'})
 assert.equal(f.calls.length,1)
})
test('malformed audit content, hidden fields and accessors cannot become original sink events',async()=>{
 const f=fixture();let invoked=0
 for(const bad of [{...original,workspaceId:'b2000000-0000-4000-8000-000000000002'},
  {...original,capability:'fixture.foreign'},{...original,event:'assistant.operation.completed'},
  {...original,reasonCode:'private provider body'},{...original,private:'body'},
  Object.defineProperty({...original},'requestId',{enumerable:true,get(){invoked++;return original.requestId}}),
  Object.defineProperty({...original},'private',{enumerable:false,value:'body'}),{...original,[Symbol('private')]:'body'},
  {...original,operationVersion:Number.MAX_SAFE_INTEGER+1}]){
  f.data({...receipt,event:bad});await assert.rejects(f.port.claim(original.eventRef,1),safe)
 }
 assert.equal(invoked,0)
})
test('audit claim admission requires exact successor, grant, owner, proof and bounded microsecond lease',async()=>{
 const f=fixture()
 for(const bad of [{...receipt,version:3},{...receipt,fence:0},{...receipt,claimRef:'https://private.example'},
  {...receipt,workerRef:'another_audit_worker_reference'},{...receipt,grantVersion:2},
  {...receipt,leaseExpiresAt:'2026-10-11T03:51:00.000002Z'},
  {...receipt,event:{...original,createdAt:'2099-01-01T00:00:00Z'}},{...receipt,private:'body'}]){
  f.data(bad);await assert.rejects(f.port.claim(original.eventRef,1),safe)
 }
 for(const status of ['forbidden','not_found','version_conflict','invalid_transition']){
  f.data({status});assert.deepEqual(await f.port.claim(original.eventRef,1),{status})
 }
})
test('grant revocation while the claim reply is delayed withholds all original content',async()=>{
 let allowed=true
 const port=createDurableAuditDeliveryPortV1({currentWorker:async()=>allowed?worker:null,
  invoke:async()=>{allowed=false;return {data:receipt,error:null}}})
 await assert.rejects(port.claim(original.eventRef,1),safe)
})
test('unsafe inputs make zero calls; fenced ack requires exact success and closes private failures',async()=>{
 const f=fixture();for(const version of [0,-1,1.5,Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER]){
  await assert.rejects(f.port.claim(original.eventRef,version),safe)
 }
 await assert.rejects(f.port.claim('https://private.example',1),safe);assert.equal(f.calls.length,0)
 const r=await f.port.claim(original.eventRef,1);if(r.status!=='applied')throw new Error('missing_claim')
 f.data({status:'applied',version:4});await assert.rejects(f.port.ack(r.claim,'typed_audit_sink_receipt_ref'),safe)
 for(const status of ['forbidden','not_found','version_conflict','invalid_claim']){
  f.data({status});assert.deepEqual(await f.port.ack(r.claim,'typed_audit_sink_receipt_ref'),{status})
 }
 f.error({message:'private SQL and provider body'});await assert.rejects(f.port.ack(r.claim,'typed_audit_sink_receipt_ref'),safe)
})
