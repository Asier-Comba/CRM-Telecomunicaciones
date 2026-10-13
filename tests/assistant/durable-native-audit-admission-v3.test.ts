import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createNativeDurableAuditInspectorV3} from '../../scripts/security/native-postgres/durable-audit-inspection-v3.mjs'
const scope={workspaceId:'10000000-0000-4000-8000-000000000001',actorId:'20000000-0000-4000-8000-000000000001',
 capability:'fixture.complete',argumentsDigest:'a'.repeat(64),operationRef:'operation_'+'b'.repeat(24)}
const reserved={...scope,eventRef:'c'.repeat(64),event:'assistant.operation.reserved',contentDigest:'d'.repeat(64),deliveryState:'pending'}
// Controlled SQL transport; no native resource, Auth or business absence claim.
test('audit admission denies scope accessors without invoking them or SQL',()=>{
 let getters=0,queries=0;const hostile={...scope}
 Object.defineProperty(hostile,'actorId',{enumerable:true,get(){getters++;return scope.actorId}})
 assert.throws(()=>createNativeDurableAuditInspectorV3(async()=>{queries++;return '[]'},hostile),{message:'NATIVE_AUDIT_INSPECTION_UNAVAILABLE'})
 assert.equal(getters,0);assert.equal(queries,0)
})
test('audit admission cannot replace an invalid descriptor with a Proxy get result',()=>{
 let gets=0,queries=0
 const hostile=new Proxy({...scope,workspaceId:'invalid'},{get(target,key,receiver){if(key==='workspaceId'){gets++;return scope.workspaceId}return Reflect.get(target,key,receiver)}})
 assert.throws(()=>createNativeDurableAuditInspectorV3(async()=>{queries++;return '[]'},hostile),{message:'NATIVE_AUDIT_INSPECTION_UNAVAILABLE'})
 assert.equal(gets,0);assert.equal(queries,0)
})
test('audit admission rejects invalid binding before a readonly query can be prepared',()=>{
 let queries=0
 for(const malformed of [{...scope,operationRef:"' private SQL material"},{...scope,argumentsDigest:'short'},{...scope,unexpected:'private'}]){
  assert.throws(()=>createNativeDurableAuditInspectorV3(async()=>{queries++;return '[]'},malformed),{message:'NATIVE_AUDIT_INSPECTION_UNAVAILABLE'})
 }
 assert.equal(queries,0)
})
test('valid audit binding is captured once and retains every original ledger entry',async()=>{
 const mutable={...scope};let calls=0,statement=''
 const inspector=createNativeDurableAuditInspectorV3(async(sql:string)=>{statement=sql;calls++;return JSON.stringify([reserved])},mutable)
 mutable.workspaceId='30000000-0000-4000-8000-000000000001'
 await inspector.captureBaseline();const observation=await inspector.inspect()
 assert.equal(calls,2);assert.ok(statement.includes(scope.workspaceId));assert.ok(!statement.includes(mutable.workspaceId))
 assert.equal(observation.originalAuditIntents,1);assert.equal(observation.baselineOriginalAuditIntents,1)
 assert.equal(observation.pendingOriginalEvents,1);assert.equal(observation.outcomeAuditIntents,0)
 assert.ok(Object.isFrozen(observation))
})
