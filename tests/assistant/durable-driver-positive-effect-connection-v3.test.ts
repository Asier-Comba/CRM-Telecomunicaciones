import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDurableNativeWorkerConnectionV3} from '../../scripts/security/native-postgres/durable-native-driver-connection-v3.mjs'
// Controlled SQL/session data only; no physical backend or commercial effects.
const backend=1234,application='durable_node_'+'a'.repeat(32),nonce='1'.repeat(24),sink='completion_native_receipts_'+nonce
const scope={workspaceId:'10000000-0000-4000-8000-000000000001',actorId:'10000000-0000-4000-8000-000000000002',capability:'fixture.complete.n'+nonce,argumentsDigest:'a'.repeat(64),operationRef:'operation_'+'b'.repeat(32)}
const identity=()=>JSON.stringify({backend,database:'telecom_test',application})
const row={workspaceId:scope.workspaceId,outboxRef:'c'.repeat(64),receiptRef:'d'.repeat(64),admission:{...scope,outboxRef:'c'.repeat(64),receiptRef:'d'.repeat(64),dispatcher:scope.capability,commandRef:'command_'+'e'.repeat(24),claimFence:'v1:1:'+'f'.repeat(64),receiptAuthority:'registered_effect_source.v1'}}

test('driver positive effect pins the private receipt binding across both admitted-backend fences',async()=>{
 let release!:(value:string)=>void,closed=0
 const statements:string[]=[]
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
  statements.push(sql);return sql.includes('completion_native_receipts_')?JSON.stringify([row]):statements.length===1?new Promise<string>(done=>{release=done}):identity()
 },close:async()=>{closed++}}))
 await driver.connectWorker();const mutable={...scope},pending=driver.inspectWorkerPositiveEffect(sink,mutable)
 mutable.operationRef='changed_'+'0'.repeat(32);release(identity())
 const observed=await pending;assert.deepEqual(observed,{effectCount:1});assert.equal(Object.isFrozen(observed),true)
 assert.equal(statements.length,3);assert.ok(statements[1]!.includes(scope.operationRef));assert.ok(!statements[1]!.includes(mutable.operationRef))
 await driver.closeWorker();assert.equal(closed,1)
})
test('driver positive effect rejects missing foreign receipts and backend replacement instead of reporting zero',async()=>{
 for(const fault of ['empty','foreign','backend']){
  let identities=0,closed=0
  const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
   if(sql.includes('completion_native_receipts_'))return JSON.stringify(fault==='empty'?[]:[fault==='foreign'?{...row,workspaceId:'foreign'}:row])
   identities++;return JSON.stringify({backend:fault==='backend'&&identities===2?backend+1:backend,database:'telecom_test',application})
  },close:async()=>{closed++}}))
  await driver.connectWorker();await assert.rejects(driver.inspectWorkerPositiveEffect(sink,scope),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
  await driver.closeWorker();assert.equal(closed,1);await assert.rejects(driver.inspectWorkerPositiveEffect(sink,scope),/UNAVAILABLE/)
 }
})
test('driver positive effect rejects hostile sink and binding before SQL or descriptor getters',async()=>{
 for(const fault of ['sink','binding']){
  let queries=0,getters=0,closed=0
  const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async()=>{queries++;return identity()},close:async()=>{closed++}}))
  await driver.connectWorker();const hostile={...scope}
  Object.defineProperty(hostile,'actorId',{enumerable:true,get(){getters++;throw Error('private fixture binding')}})
  await assert.rejects(driver.inspectWorkerPositiveEffect(fault==='sink'?sink+"';drop table":sink,fault==='binding'?hostile:scope),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
  assert.equal(queries,0);assert.equal(getters,0);await driver.closeWorker();assert.equal(closed,1)
 }
})
test('driver positive effect close during receipt read discards late facts and raw SQL detail',async()=>{
 let release!:(value:string)=>void,entered!:()=>void,closed=0
 const started=new Promise<void>(done=>{entered=done})
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
  if(!sql.includes('completion_native_receipts_'))return identity()
  entered();return new Promise<string>(done=>{release=done})
 },close:async()=>{closed++}}))
 await driver.connectWorker();const pending=driver.inspectWorkerPositiveEffect(sink,scope),denied=assert.rejects(pending,{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await started;await driver.closeWorker();release(JSON.stringify([row]));await denied;assert.equal(closed,1)
 const failed=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async()=>{throw Error('private SQL receipt detail')},close:async()=>{}}))
 await failed.connectWorker();await assert.rejects(failed.inspectWorkerPositiveEffect(sink,scope),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
})
