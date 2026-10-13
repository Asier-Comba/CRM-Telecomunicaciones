import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createNativeDurableOperationInspectorV3} from '../../scripts/security/native-postgres/durable-operation-inspection-v3.mjs'
import {validateDurableObservation} from '../../src/assistant/durable-process-spec-v3.ts'
const scope={workspaceId:'10000000-0000-4000-8000-000000000001',actorId:'20000000-0000-4000-8000-000000000001',capability:'fixture.complete',
 argumentsDigest:'a'.repeat(64),operationRef:'operation_'+'b'.repeat(24)}
// Controlled SQL transport only; physical measurements are separate native job.
test('operation slice is fixed-scope immutable and never admits a full21 observation',async()=>{
 const held={...scope};let statement=''
 const inspector=createNativeDurableOperationInspectorV3(async(sql:string)=>{statement=sql;return JSON.stringify([{...scope,state:'completed'}])},held)
 held.actorId='30000000-0000-4000-8000-000000000001'
 const result=await inspector.inspect();assert.deepEqual(result,{operationCount:1,state:'completed'});assert.ok(Object.isFrozen(result))
 assert.ok(statement.includes('public.assistant_operations'));assert.ok(!statement.includes('delete')&&!statement.includes('update'))
 assert.equal(validateDurableObservation('reserve_race',result),false)
})
test('missing duplicate or mismatched binding cannot become absence or an invented successful count',async()=>{
 for(const rows of [[],[{...scope,state:'completed'},{...scope,state:'completed'}],...['workspaceId','actorId','capability','argumentsDigest','operationRef'].map(key=>[{...scope,[key]:'wrong',state:'completed'}]),[{...scope,state:'unknown'}]]){
  const inspector=createNativeDurableOperationInspectorV3(async()=>JSON.stringify(rows),scope)
  await assert.rejects(inspector.inspect(),{message:'NATIVE_OPERATION_INSPECTION_UNAVAILABLE'})
 }
})
test('invalid scope accessors fail before SQL and raw query errors never enter evidence',async()=>{
 let queries=0,getters=0;const hostile={...scope};Object.defineProperty(hostile,'actorId',{enumerable:true,get(){getters++;return scope.actorId}})
 assert.throws(()=>createNativeDurableOperationInspectorV3(async()=>{queries++;return '[]'},hostile),/NATIVE_OPERATION_INSPECTION_UNAVAILABLE/)
 assert.equal(queries,0);assert.equal(getters,0)
 const failed=createNativeDurableOperationInspectorV3(async()=>{throw Error('private native SQL material')},scope)
 await assert.rejects(failed.inspect(),{message:'NATIVE_OPERATION_INSPECTION_UNAVAILABLE'})
})
