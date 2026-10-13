import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDurableNativeWorkerConnectionV3} from '../../scripts/security/native-postgres/durable-native-driver-connection-v3.mjs'

const backend=1234,application='durable_node_'+'a'.repeat(32)
const scope={workspaceId:'10000000-0000-4000-8000-000000000001',actorId:'10000000-0000-4000-8000-000000000002',capability:'fixture.operation',argumentsDigest:'a'.repeat(64),operationRef:'operation_'+'b'.repeat(32)}
const identity=()=>JSON.stringify({backend,database:'telecom_test',application})

test('operation slice uses its captured binding between two reads of the admitted backend',async()=>{
 let release!:(value:string)=>void,closed=0
 const statements:string[]=[]
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
  statements.push(sql)
  return sql.includes('assistant_operations')?JSON.stringify([{...scope,state:'completed'}]):statements.length===1?new Promise<string>(done=>{release=done}):identity()
 },close:async()=>{closed++}}))
 await driver.connectWorker()
 const mutable={...scope},pending=driver.inspectWorkerOperation(mutable)
 mutable.actorId='10000000-0000-4000-8000-000000000003'
 release(identity())
 assert.deepEqual(await pending,{operationCount:1,state:'completed'})
 assert.equal(statements.length,3)
 assert.ok(statements[1]!.includes(scope.operationRef))
 assert.ok(!statements[1]!.includes(mutable.actorId))
 await driver.closeWorker();assert.equal(closed,1)
})

test('foreign operation binding or changed backend retires the connection without exposing facts',async()=>{
 for(const mutation of ['actor','backend']){
  let identities=0,closed=0
  const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
   if(sql.includes('assistant_operations'))return JSON.stringify([{...scope,actorId:mutation==='actor'?'10000000-0000-4000-8000-000000000003':scope.actorId,state:'completed'}])
   identities++;return JSON.stringify({backend:mutation==='backend'&&identities===2?backend+1:backend,database:'telecom_test',application})
  },close:async()=>{closed++}}))
  await driver.connectWorker()
  await assert.rejects(driver.inspectWorkerOperation(scope),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
  await driver.closeWorker();assert.equal(closed,1)
  await assert.rejects(driver.inspectWorkerOperation(scope),/UNAVAILABLE/)
 }
})

test('close during the operation query discards its late result and closes only its owned session',async()=>{
 let release!:(value:string)=>void,entered!:(value:void)=>void,closed=0
 const started=new Promise<void>(done=>{entered=done})
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
  if(!sql.includes('assistant_operations'))return identity()
  entered();return new Promise<string>(done=>{release=done})
 },close:async()=>{closed++}}))
 await driver.connectWorker()
 const pending=driver.inspectWorkerOperation(scope),denied=assert.rejects(pending,{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await started;await driver.closeWorker()
 release(JSON.stringify([{...scope,state:'completed'}]))
 await denied;assert.equal(closed,1)
})

test('hostile binding descriptors are rejected before any database query',async()=>{
 let queries=0,getters=0,closed=0
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async()=>{queries++;return identity()},close:async()=>{closed++}}))
 await driver.connectWorker()
 const hostile={...scope};Object.defineProperty(hostile,'actorId',{enumerable:true,get(){getters++;throw Error('private fixture material')}})
 await assert.rejects(driver.inspectWorkerOperation(hostile),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 assert.equal(queries,0);assert.equal(getters,0);assert.equal(closed,1)
})
