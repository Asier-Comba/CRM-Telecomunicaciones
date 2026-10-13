import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createNativePositiveEffectInspectorV3} from '../../scripts/security/native-postgres/durable-positive-effect-inspection-v3.mjs'
import {validateDurableObservation} from '../../src/assistant/durable-process-spec-v3.ts'
const nonce='1'.repeat(24),sink='completion_native_receipts_'+nonce
const scope={workspaceId:'10000000-0000-4000-8000-000000000001',actorId:'20000000-0000-4000-8000-000000000001',
 capability:'fixture.complete.n'+nonce,argumentsDigest:'a'.repeat(64),operationRef:'operation_'+'b'.repeat(24)}
const row={workspaceId:scope.workspaceId,outboxRef:'c'.repeat(64),receiptRef:'d'.repeat(64),admission:{...scope,outboxRef:'c'.repeat(64),receiptRef:'d'.repeat(64),
 dispatcher:scope.capability,commandRef:'command_'+'e'.repeat(24),claimFence:'v1:1:'+'f'.repeat(64),receiptAuthority:'registered_effect_source.v1'}}
test('positive count reads the owned receipt ledger with fixed binding and cannot admit full21',async()=>{
 let statement='';const mutable={...scope}
 const inspector=createNativePositiveEffectInspectorV3(async(sql:string)=>{statement=sql;return JSON.stringify([row])},sink,mutable)
 mutable.operationRef='changed_'+'0'.repeat(24)
 const result=await inspector.inspect();assert.deepEqual(result,{effectCount:1});assert.ok(Object.isFrozen(result))
 assert.ok(statement.includes('public.'+sink)&&statement.includes(scope.operationRef)&&!statement.includes(mutable.operationRef))
 assert.equal(validateDurableObservation('reserve_race',result),false)
})
test('missing duplicate foreign malformed receipt or invalid fixture never becomes effect0 or query leakage',async()=>{
 for(const rows of [[],[row,row],[{...row,workspaceId:'foreign'}],[{...row,receiptRef:'0'.repeat(64)}],
  ...['actorId','argumentsDigest','capability','operationRef','workspaceId','dispatcher','commandRef','claimFence','receiptAuthority'].map(key=>[{...row,admission:{...row.admission,[key]:'invalid'}}])]){
  const inspector=createNativePositiveEffectInspectorV3(async()=>JSON.stringify(rows),sink,scope)
  await assert.rejects(inspector.inspect(),{message:'NATIVE_POSITIVE_EFFECT_INSPECTION_UNAVAILABLE'})
 }
 let queries=0,getters=0;const hostile={...scope};Object.defineProperty(hostile,'actorId',{enumerable:true,get(){getters++;return scope.actorId}})
 for(const [name,binding] of [['production_receipts',scope],[sink+"';drop table",scope],[sink,{...scope,capability:'different.fixture'}],[sink,hostile]] as const){
  assert.throws(()=>createNativePositiveEffectInspectorV3(async()=>{queries++;return '[]'},name,binding),{message:'NATIVE_POSITIVE_EFFECT_INSPECTION_UNAVAILABLE'})
 }
 assert.equal(queries,0);assert.equal(getters,0)
 await assert.rejects(createNativePositiveEffectInspectorV3(async()=>{throw Error('private SQL receipt material')},sink,scope).inspect(),{message:'NATIVE_POSITIVE_EFFECT_INSPECTION_UNAVAILABLE'})
})
