import assert from 'node:assert/strict'
import {test} from 'node:test'
import {DURABLE_PROCESS_CONTRACT,DURABLE_PROCESS_SCENARIOS,validateDurableObservation,validateAuditOutageObservation} from '../../src/assistant/durable-process-spec-v3.ts'
const good={operationCount:1,executionAuthorizations:1,effectCount:1,originalAuditIntents:2,deliveredOriginalEvents:2,pendingOriginalEvents:0,
 unauthorizedRows:0,forbiddenTransitions:0,unregisteredDispatches:0,automaticRedispatches:0,state:'completed',
 reservationAuditIntents:1,outcomeAuditIntents:1,otherAuditIntents:0,outcomeDeliveredEvents:1,outcomePendingEvents:0,
 baselineOriginalAuditIntents:0,baselineDeliveredOriginalEvents:0,baselinePendingOriginalEvents:0,baselineAuditContentDigest:'a'.repeat(64),persistedBaselineAuditContentDigest:'a'.repeat(64)}
test('complete-ledger protocol retains23 scenarios/four20 races and admits both mandatory original events',()=>{
 assert.equal(DURABLE_PROCESS_CONTRACT,'assistant.durable-process.v3');assert.equal(DURABLE_PROCESS_SCENARIOS.length,23)
 assert.equal(DURABLE_PROCESS_SCENARIOS.filter(s=>s.workers===20).length,4)
 assert.ok(validateDurableObservation('reserve_race',good))
 assert.ok(validateDurableObservation('kill_after_effect',{...good,originalAuditIntents:3,deliveredOriginalEvents:3,otherAuditIntents:1}))
 assert.equal(validateDurableObservation('kill_before_effect',good),false)
 assert.ok(validateDurableObservation('kill_before_effect',{...good,executionAuthorizations:2}))
})
test('missing reservation/outcome/intermediate delivery and mismatched whole-ledger sums fail closed',()=>{
 for(const delta of [{reservationAuditIntents:0,originalAuditIntents:1,deliveredOriginalEvents:1},
  {outcomeAuditIntents:0,outcomeDeliveredEvents:0,otherAuditIntents:1},
  {originalAuditIntents:3,otherAuditIntents:1,pendingOriginalEvents:1},
  {originalAuditIntents:3,deliveredOriginalEvents:3},{outcomeDeliveredEvents:0,outcomePendingEvents:1},
  {otherAuditIntents:Number.MAX_SAFE_INTEGER,originalAuditIntents:Number.MAX_SAFE_INTEGER,deliveredOriginalEvents:Number.MAX_SAFE_INTEGER},
  {baselineOriginalAuditIntents:3,baselinePendingOriginalEvents:3}])assert.equal(validateDurableObservation('reserve_race',{...good,...delta}),false)
 for(const delta of [{effectCount:2},{executionAuthorizations:2},{unauthorizedRows:1},{forbiddenTransitions:1},{unregisteredDispatches:1},{automaticRedispatches:1}])
  assert.equal(validateDurableObservation('reserve_race',{...good,...delta}),false)
})
test('negative scenarios preserve an already valid audited recovery baseline without any new outcome or audit mutation',()=>{
 const baseline={...good,executionAuthorizations:0,effectCount:0,state:'reconciliation_required',outcomeAuditIntents:0,
  outcomeDeliveredEvents:0,otherAuditIntents:1,deliveredOriginalEvents:0,pendingOriginalEvents:2,
  baselineOriginalAuditIntents:2,baselinePendingOriginalEvents:2}
 for(const id of ['cross_workspace_lookup','cross_actor_lookup','changed_digest','revoked_principal'] as const){
  assert.ok(validateDurableObservation(id,baseline))
  for(const delta of [{originalAuditIntents:0,reservationAuditIntents:0,otherAuditIntents:0,pendingOriginalEvents:0,baselineOriginalAuditIntents:0,baselinePendingOriginalEvents:0},
   {originalAuditIntents:3,otherAuditIntents:2,pendingOriginalEvents:3},{persistedBaselineAuditContentDigest:'b'.repeat(64)},
   {deliveredOriginalEvents:1,pendingOriginalEvents:1},{executionAuthorizations:1},{effectCount:1}])
   assert.equal(validateDurableObservation(id,{...baseline,...delta}),false)
 }
})
test('legacy ambiguous evidence, hidden/symbol/accessor fields and hostile descriptors cannot certify the ledger',()=>{
 const {reservationAuditIntents:_,...incomplete}=good;void _
 assert.equal(validateDurableObservation('reserve_race',incomplete),false)
 let calls=0
 for(const key of Object.keys(good)){
  const accessor={...good};Object.defineProperty(accessor,key,{enumerable:true,get(){calls++;return good[key as keyof typeof good]}})
  assert.equal(validateDurableObservation('reserve_race',accessor),false)
  const hidden={...good};Object.defineProperty(hidden,key,{enumerable:false,value:good[key as keyof typeof good]})
  assert.equal(validateDurableObservation('reserve_race',hidden),false)
 }
 assert.equal(calls,0)
 assert.equal(validateDurableObservation('reserve_race',{...good,[Symbol('private')]:true}),false)
 assert.equal(validateDurableObservation('reserve_race',new Proxy(good,{ownKeys(){throw Error('private raw evidence')}})),false)
 assert.equal(validateDurableObservation('reserve_race',{...good,baselineAuditContentDigest:'private'}),false)
 assert.equal(validateDurableObservation('reserve_race',{...good,baselineAuditContentDigest:{toString(){calls++;return 'a'.repeat(64)}}}),false)
 assert.equal(calls,0)
})
test('audit outage retains all intents and a pending outcome until the actual recovery drain',()=>{
 const pending={...good,deliveredOriginalEvents:1,pendingOriginalEvents:1,outcomeDeliveredEvents:0,outcomePendingEvents:1}
 assert.ok(validateAuditOutageObservation(pending));assert.equal(validateDurableObservation('audit_delivery_outage',pending),false)
 assert.equal(validateAuditOutageObservation(good),false)
 for(const delta of [{reservationAuditIntents:0,originalAuditIntents:1,deliveredOriginalEvents:0},
  {effectCount:2},{outcomeAuditIntents:0},{pendingOriginalEvents:0}])assert.equal(validateAuditOutageObservation({...pending,...delta}),false)
 let calls=0;const accessor={...pending};Object.defineProperty(accessor,'outcomePendingEvents',{enumerable:true,get(){calls++;return 1}})
 assert.equal(validateAuditOutageObservation(accessor),false);assert.equal(calls,0)
})
