import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDurableNativeWorkerConnectionV3} from '../../scripts/security/native-postgres/durable-native-driver-connection-v3.mjs'

// Controlled constructor/SQL adapters only; physical evidence is a separate
// native job probe. No resource creation, PostgreSQL or full23 claimed here.
const application='durable_node_'+'a'.repeat(32),backend=1234
const row=()=>JSON.stringify({backend,database:'telecom_test',application})
test('one worker cannot replace a connecting or already admitted connection',async()=>{
 let resolve!:(value:unknown)=>void,opens=0,closed=0
 const owner={backend,application,query:async(sql:string)=>{assert.ok(sql.includes('pg_backend_pid()'));return row()},close:async()=>{closed++}}
 const driver=createDurableNativeWorkerConnectionV3(()=>{opens++;return new Promise(done=>{resolve=done})})
 const first=driver.connectWorker();await assert.rejects(driver.connectWorker(),/DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE/)
 resolve(owner);assert.equal(await first,backend);await assert.rejects(driver.connectWorker(),/UNAVAILABLE/)
 assert.deepEqual(await driver.inspectWorkerConnection(),{backend});assert.equal(opens,1)
 await Promise.all([driver.closeWorker(),driver.closeWorker()]);assert.equal(closed,1)
 await assert.rejects(driver.inspectWorkerConnection(),/UNAVAILABLE/)
})
test('an invalid supplied backend or leaked constructor error never becomes ready',async()=>{
 let closed=0
 const invalid=createDurableNativeWorkerConnectionV3(async()=>({backend:0,application,query:async()=>row(),close:async()=>{closed++}}))
 await assert.rejects(invalid.connectWorker(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'});assert.equal(closed,1)
 const failed=createDurableNativeWorkerConnectionV3(async()=>{throw Error('private-connection-material')})
 await assert.rejects(failed.connectWorker(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await assert.rejects(failed.connectWorker(),/UNAVAILABLE/)
})
test('same-connection read rejects substituted backend database or application and retires once',async()=>{
 for(const mutation of [{backend:backend+1},{database:'another_database'},{application:'another_application'}]){
  let closed=0
  const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async()=>JSON.stringify({...JSON.parse(row()),...mutation}),close:async()=>{closed++}}))
  assert.equal(await driver.connectWorker(),backend)
  await assert.rejects(driver.inspectWorkerConnection(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
  await driver.closeWorker();assert.equal(closed,1);await assert.rejects(driver.connectWorker(),/UNAVAILABLE/)
 }
})
test('close during connection admission waits for its owned session and denies a late ready identity',async()=>{
 let resolve!:(value:unknown)=>void,closed=0
 const driver=createDurableNativeWorkerConnectionV3(()=>new Promise(done=>{resolve=done}))
 const pending=driver.connectWorker(),ending=driver.closeWorker()
 const denied=assert.rejects(pending,/DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE/)
 resolve({backend,application,query:async()=>row(),close:async()=>{closed++}})
 await denied;await ending;assert.equal(closed,1)
 await assert.rejects(driver.inspectWorkerConnection(),/UNAVAILABLE/)
})

test('close joins an inspection retirement still awaiting its owned session',async()=>{
 let release!:()=>void,entered!:()=>void,closes=0,finished=false
 const retiring=new Promise<void>(done=>{entered=done}),gate=new Promise<void>(done=>{release=done})
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,
  query:async()=>JSON.stringify({backend:backend+1,database:'telecom_test',application}),
  close:async()=>{closes++;entered();await gate}}))
 await driver.connectWorker()
 const denied=assert.rejects(driver.inspectWorkerConnection(),/UNAVAILABLE/)
 await retiring
 const ending=driver.closeWorker().then(()=>{finished=true})
 await new Promise<void>(done=>setImmediate(done))
 assert.equal(finished,false,'closing cannot finish ahead of the owned retirement')
 release();await denied;await ending;assert.equal(closes,1)
})

test('a failed inspection retirement remains a failed close instead of disappearing',async()=>{
 let closes=0
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,
  query:async()=>JSON.stringify({backend:backend+1,database:'telecom_test',application}),
  close:async()=>{closes++;throw Error('private-cleanup-material')}}))
 await driver.connectWorker()
 await assert.rejects(driver.inspectWorkerConnection(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await assert.rejects(driver.closeWorker(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await assert.rejects(driver.closeWorker(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 assert.equal(closes,1)
})
