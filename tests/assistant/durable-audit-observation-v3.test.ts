import test from 'node:test'
import assert from 'node:assert/strict'
import {captureDurableAuditBaselineV3,inspectDurableAuditLedgerV3,type DurableAuditBaselineV3} from '../../src/assistant/durable-audit-observation-v3.ts'
import {createNativeDurableAuditInspectorV3} from '../../scripts/security/native-postgres/durable-audit-inspection-v3.mjs'

const scope={workspaceId:'00000000-0000-4000-8000-000000000001',actorId:'00000000-0000-4000-8000-000000000002',operationRef:'synthetic_operation_ref_123456',capability:'fixture.ledger',argumentsDigest:'a'.repeat(64)}
const row=(number:number,event='assistant.operation.reserved',deliveryState='pending')=>({...scope,eventRef:number.toString(16).padStart(64,'0'),event,contentDigest:'b'.repeat(64),deliveryState})
const initial=()=>[row(1),row(2,'assistant.operation.effect_applied'),row(3,'assistant.operation.recovery_required')]

for(const event of ['assistant.capability.completed','assistant.operation.reconciliation'])test('v3 whole audit ledger counts reservation/intermediate/outcome separately: '+event,()=>{
  const baseline=captureDurableAuditBaselineV3(scope,initial())!;assert.ok(baseline)
  const pending=inspectDurableAuditLedgerV3(baseline,[...initial(),row(4,event)])!
  assert.equal(pending.originalAuditIntents,4);assert.equal(pending.pendingOriginalEvents,4);assert.equal(pending.outcomePendingEvents,1)
  const observed=inspectDurableAuditLedgerV3(baseline,[...initial(),row(4,event)].map(r=>({...r,deliveryState:'delivered'})))!
  assert.equal(observed.originalAuditIntents,4);assert.equal(observed.deliveredOriginalEvents,4);assert.equal(observed.pendingOriginalEvents,0)
  assert.equal(observed.reservationAuditIntents,1);assert.equal(observed.otherAuditIntents,2);assert.equal(observed.outcomeAuditIntents,1)
  assert.equal(observed.outcomeDeliveredEvents,1);assert.equal(observed.baselineOriginalAuditIntents,3);assert.equal(observed.baselinePendingOriginalEvents,3)
  assert.equal(observed.baselineAuditContentDigest,observed.persistedBaselineAuditContentDigest);assert.equal(Object.keys(observed).length,13)
  assert.equal(Object.isFrozen(observed),true);assert.equal('effectCount' in observed,false)
})
test('v3 audit baseline cannot be forged, replaced by an outcome or captured from another binding',()=>{
  assert.equal(inspectDurableAuditLedgerV3({} as DurableAuditBaselineV3,initial()),null)
  assert.equal(captureDurableAuditBaselineV3(scope,[row(4,'assistant.capability.completed')]),null)
  assert.equal(captureDurableAuditBaselineV3(scope,[row(1),{...row(2),workspaceId:'00000000-0000-4000-8000-000000000009'}]),null)
  assert.equal(captureDurableAuditBaselineV3(scope,[]),null)
})
test('v3 audit readback denies missing/duplicate/changed originals and missing delivery without inventing zero',()=>{
  const baseline=captureDurableAuditBaselineV3(scope,initial())!
  const mutate=(change:Record<string,unknown>)=>initial().map((r,i)=>i===1?{...r,...change}:r)
  for(const corrupt of [initial().slice(1),[...initial(),row(2)],mutate({contentDigest:'c'.repeat(64)}),mutate({event:'assistant.operation.reserved'}),mutate({deliveryState:null}),mutate({actorId:'00000000-0000-4000-8000-000000000099'})])
    assert.equal(inspectDurableAuditLedgerV3(baseline,corrupt),null)
})
test('v3 audit baseline snapshots input and refuses accessor/sparse/private material',()=>{
  const raw=initial(),baseline=captureDurableAuditBaselineV3(scope,raw)!
  raw[0]!.contentDigest='d'.repeat(64);assert.ok(inspectDurableAuditLedgerV3(baseline,initial()))
  let read=false
  const accessor={...row(1),get contentDigest(){read=true;return 'b'.repeat(64)}}
  assert.equal(captureDurableAuditBaselineV3(scope,[accessor]),null);assert.equal(read,false)
  assert.equal(captureDurableAuditBaselineV3(scope,[row(1),,row(3)]),null)
  assert.equal(captureDurableAuditBaselineV3(scope,[{...row(1),[Symbol('private')]:'hidden'}]),null)
  assert.equal(inspectDurableAuditLedgerV3(baseline,[...initial(),row(4,'assistant.operation.reconciliation'),row(5,'assistant.capability.completed')]),null)
})
test('native audit inspector reads a whole LEFT JOIN ledger and rejects capture/inspect races',async()=>{
  // SQL-port orchestration only, with synthetic rows; actual native reads run
  // separately in completion/reconciliation fixtures and require their own CI.
  let release!:(value:string)=>void,calls=0
  const query=(statement:string)=>{calls++;assert.match(statement,/left join public.assistant_audit_delivery_outbox/);assert.match(statement,/to_jsonb\(i\)::text/)
    return calls===1?new Promise<string>(resolve=>{release=resolve}):Promise.resolve(JSON.stringify(initial()))}
  const inspector=createNativeDurableAuditInspectorV3(query,scope)
  const pending=inspector.captureBaseline()
  await assert.rejects(inspector.captureBaseline(),/ALREADY_CAPTURED/);await assert.rejects(inspector.inspect(),/BASELINE_REQUIRED/)
  release(JSON.stringify(initial()));await pending
  assert.equal((await inspector.inspect()).originalAuditIntents,3);assert.equal(calls,2)
})
test('native audit inspector suppresses raw SQL errors and never admits an unavailable baseline',async()=>{
  const inspector=createNativeDurableAuditInspectorV3(async()=>{throw Error('private SQL credentials fixture marker')},scope)
  await assert.rejects(inspector.captureBaseline(),{message:'NATIVE_AUDIT_INSPECTION_UNAVAILABLE'})
  await assert.rejects(inspector.inspect(),{message:'NATIVE_AUDIT_BASELINE_REQUIRED'})
})
