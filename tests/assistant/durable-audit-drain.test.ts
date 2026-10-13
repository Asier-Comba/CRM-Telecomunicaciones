import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDurableAuditDrainV1,originalAuditPacketV1} from '../../src/assistant/durable-audit-drain.ts'
import type {OriginalAuditPacketV1} from '../../src/assistant/durable-audit-drain.ts'
import type {DurableAuditDeliveryPortV1,OriginalAuditEventV1,AuditDeliveryClaimV1} from '../../src/assistant/durable-audit-delivery-port.ts'
const event:OriginalAuditEventV1={eventRef:'a'.repeat(64),workspaceId:'b2000000-0000-4000-8000-000000000001',operationRef:'b'.repeat(64),
 operationVersion:1,actorId:'a1000000-0000-4000-8000-000000000001',capability:'fixture.audit',argumentsDigest:'c'.repeat(64),
 event:'assistant.operation.reserved',requestId:'original_audit_request_reference',createdAt:'2026-10-11T03:45:00.000001Z',reasonCode:null}
const claim:AuditDeliveryClaimV1={workspaceId:event.workspaceId,eventRef:event.eventRef,workerRef:'typed_audit_worker_reference',grantVersion:1,
 version:2,fence:1,claimRef:'d'.repeat(64),claimedAt:'2026-10-11T03:46:00.000001Z',leaseExpiresAt:'2026-10-11T03:51:00.000001Z'}
function receipt(p:OriginalAuditPacketV1){return {status:'accepted',workspaceId:p.event.workspaceId,eventRef:p.event.eventRef,
 contentDigest:p.contentDigest,digestAlgorithm:p.digestAlgorithm,receiptRef:'original_audit_sink_receipt_reference'}}
function fixture(){
 const calls:string[]=[]
 const port:DurableAuditDeliveryPortV1={
  listEligible:async()=>{calls.push('list');return {status:'applied',items:[{createdAt:event.createdAt,eventRef:event.eventRef,version:1}],nextCursor:null}},
  claim:async()=>{calls.push('claim');return {status:'applied',claim,event}},
  ack:async(c,r)=>{calls.push('ack');assert.deepEqual(c,claim);assert.equal(r,'original_audit_sink_receipt_reference');return {status:'applied',version:3}},
 }
 return {port,calls}
}
test('audit drain sends closed original metadata and confirms only a content-bound receipt',async()=>{
 const f=fixture()
 const drain=createDurableAuditDrainV1({port:f.port,deliver:async(p,s)=>{
  f.calls.push('sink');assert.equal(s.aborted,false);assert.ok(Object.isFrozen(p));assert.ok(Object.isFrozen(p.event))
  assert.deepEqual(p.event,event);assert.equal('claimRef'in p,false);assert.equal('workerRef'in p.event,false);return receipt(p)
 }})
 assert.deepEqual(await drain.processPage(),{status:'page_processed',listed:1,delivered:1,skipped:0,uncertain:0,blocker:null,nextCursor:null})
 assert.deepEqual(f.calls,['list','claim','sink','ack'])
})
test('versioned audit content identity includes every original field and excludes insertion order',()=>{
 const packet=originalAuditPacketV1(event)
 assert.equal(originalAuditPacketV1(Object.fromEntries(Object.entries(event).reverse()) as OriginalAuditEventV1).contentDigest,packet.contentDigest)
 for(const key of Object.keys(event)){
  const altered={...event,[key]:key==='operationVersion'?2:key==='reasonCode'?'internal_safe':String(event[key as keyof OriginalAuditEventV1])+'_changed'} as OriginalAuditEventV1
  assert.notEqual(originalAuditPacketV1(altered).contentDigest,packet.contentDigest,key)
 }
 assert.match(packet.contentDigest,/^[0-9a-f]{64}$/)
})
test('unknown sink outcome and mismatched receipt never acknowledge or advance the cursor',async()=>{
 const packet=originalAuditPacketV1(event);let getters=0
 const accessor=Object.defineProperty({...receipt(packet)},'contentDigest',{get(){getters++;return packet.contentDigest},enumerable:true})
 for(const bad of [undefined,{...receipt(packet),eventRef:'f'.repeat(64)},{...receipt(packet),workspaceId:'other'},
  {...receipt(packet),contentDigest:'e'.repeat(64)},{...receipt(packet),digestAlgorithm:'future'},
  {...receipt(packet),receiptRef:'short'},{...receipt(packet),privateBody:'private'},accessor]){
  const f=fixture();const result=await createDurableAuditDrainV1({port:f.port,deliver:async()=>bad}).processPage()
  assert.equal(result.status,'unavailable');assert.equal(result.uncertain,1);assert.equal(result.nextCursor,null)
  assert.deepEqual(f.calls,['list','claim'])
 }
 assert.equal(getters,0)
})
test('sink acceptance followed by lost ACK reply stops with uncertainty and retains the original content on retry',async()=>{
 const f=fixture();const accepted=new Map<string,OriginalAuditPacketV1>();let sinkCalls=0
 f.port.ack=async()=>{f.calls.push('ack');throw new Error('private upstream detail')}
 const drain=createDurableAuditDrainV1({port:f.port,deliver:async(p)=>{
  sinkCalls++;const prior=accepted.get(p.event.eventRef)
  if(prior)assert.deepEqual(p,prior);else accepted.set(p.event.eventRef,p)
  return {...receipt(p),status:prior?'already_accepted':'accepted'}
 }})
 assert.equal((await drain.processPage()).uncertain,1)
 f.port.ack=async()=>({status:'applied',version:3})
 const retried=await drain.processPage();assert.equal(retried.delivered,1);assert.equal(accepted.size,1);assert.equal(sinkCalls,2)
 assert.equal(JSON.stringify(retried).includes('private'),false)
})
test('claim conflicts skip without a sink; revoked authority and exhausted versions remain visible blockers',async()=>{
 const f=fixture();let sinkCalls=0
 const drain=createDurableAuditDrainV1({port:f.port,deliver:async(p)=>{sinkCalls++;return receipt(p)}})
 f.port.claim=async()=>({status:'version_conflict'})
 assert.equal((await drain.processPage()).skipped,1);assert.equal(sinkCalls,0)
 f.port.claim=async()=>({status:'forbidden'})
 assert.equal((await drain.processPage()).blocker,'authority');assert.equal(sinkCalls,0)
 f.port.listEligible=async()=>({status:'applied',items:[{createdAt:event.createdAt,eventRef:event.eventRef,version:Number.MAX_SAFE_INTEGER}],nextCursor:null})
 let claims=0;f.port.claim=async()=>{claims++;return {status:'version_conflict'}}
 const blocked=await drain.processPage();assert.equal(blocked.listed,1);assert.equal(blocked.blocker,'version_exhausted');assert.equal(claims,0)
})
test('one bounded page returns its private continuation and an empty page never claims global emptiness',async()=>{
 const f=fixture();const cursor={createdAt:event.createdAt,eventRef:event.eventRef}
 f.port.listEligible=async(after)=>{assert.deepEqual(after,cursor);return {status:'applied',items:[],nextCursor:null}}
 const empty=await createDurableAuditDrainV1({port:f.port,deliver:async(p)=>receipt(p)}).processPage(cursor)
 assert.equal(empty.status,'empty_page');assert.equal(empty.delivered,0)
 f.port.listEligible=async()=>({status:'applied',items:[{createdAt:event.createdAt,eventRef:event.eventRef,version:1}],nextCursor:cursor})
 const done=await createDurableAuditDrainV1({port:f.port,deliver:async(p)=>receipt(p)}).processPage()
 assert.deepEqual(done.nextCursor,cursor);assert.ok(Object.isFrozen(done.nextCursor))
})
test('cancellation and whole-page deadline stop ignored sink promises and prevent any late ACK',async()=>{
 for(const cancelled of [false,true]){
  const f=fixture(),control=new AbortController();let release:((v:unknown)=>void)|undefined
  const drain=createDurableAuditDrainV1({port:f.port,timeoutMs:10,deliver:async()=>{
   if(cancelled)control.abort()
   return new Promise(r=>{release=r})
  }})
  const result=await drain.processPage(undefined,control.signal)
  assert.equal(result.status,cancelled?'cancelled':'unavailable');assert.equal(result.uncertain,1)
  release?.(receipt(originalAuditPacketV1(event)));await new Promise(r=>setTimeout(r,0))
  assert.deepEqual(f.calls,['list','claim']);assert.equal(result.nextCursor,null)
 }
 const f=fixture(),control=new AbortController();control.abort()
 assert.equal((await createDurableAuditDrainV1({port:f.port,deliver:async(p)=>receipt(p)}).processPage(undefined,control.signal)).status,'cancelled')
 assert.deepEqual(f.calls,[])
})
