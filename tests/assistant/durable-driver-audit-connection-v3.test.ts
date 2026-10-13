import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDurableNativeWorkerConnectionV3} from '../../scripts/security/native-postgres/durable-native-driver-connection-v3.mjs'

// Synthetic SQL/session seams. Native fixture evidence belongs to its own SHA.
const backend=1234,application='durable_node_'+'a'.repeat(32)
const scope={workspaceId:'10000000-0000-4000-8000-000000000001',actorId:'10000000-0000-4000-8000-000000000002',capability:'fixture.audit',argumentsDigest:'a'.repeat(64),operationRef:'operation_'+'b'.repeat(32)}
const identity=()=>JSON.stringify({backend,database:'telecom_test',application})
const row=(n:number,event='assistant.operation.reserved',deliveryState='pending')=>({...scope,eventRef:String(n).padStart(64,'0'),event,contentDigest:'c'.repeat(64),deliveryState})

test('driver audit captures before work and reads the whole unchanged baseline on one admitted connection',async()=>{
 let closed=0,rows=[row(1),row(2,'assistant.operation.effect_applied')]
 const statements:string[]=[]
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
  statements.push(sql);return sql.includes('assistant_original_audit_intents')?JSON.stringify(rows):identity()
 },close:async()=>{closed++}}))
 await driver.connectWorker();const mutable={...scope},audit=driver.createWorkerAuditInspector(mutable)
 mutable.actorId='10000000-0000-4000-8000-000000000003'
 await audit.captureBaseline();rows=[...rows,row(3,'assistant.capability.completed')].map(r=>({...r,deliveryState:'delivered'}))
 const observed=await audit.inspect()
 assert.equal(Object.keys(observed).length,13);assert.equal(observed.originalAuditIntents,3);assert.equal(observed.deliveredOriginalEvents,3)
 assert.equal(observed.baselineOriginalAuditIntents,2);assert.equal(observed.baselinePendingOriginalEvents,2)
 assert.equal(observed.baselineAuditContentDigest,observed.persistedBaselineAuditContentDigest)
 assert.equal(statements.length,6);assert.equal(statements[1],statements[4]);assert.match(statements[1]!,/left join public.assistant_audit_delivery_outbox/)
 assert.equal(Object.isFrozen(observed),true);await driver.closeWorker();assert.equal(closed,1)
})

test('driver audit refuses hostile bindings before SQL and cannot inspect without its captured baseline',async()=>{
 let queries=0,getters=0,closed=0
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async()=>{queries++;return identity()},close:async()=>{closed++}}))
 await driver.connectWorker();const hostile={...scope}
 Object.defineProperty(hostile,'actorId',{enumerable:true,get(){getters++;throw Error('private binding')}})
 assert.throws(()=>driver.createWorkerAuditInspector(hostile),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 assert.equal(queries,0);assert.equal(getters,0)
 await assert.rejects(driver.createWorkerAuditInspector(scope).inspect(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await driver.closeWorker();assert.equal(closed,1)
})

test('driver audit rejects changed backend or baseline content and retires its owned connection once',async()=>{
 for(const fault of ['backend','ledger']){
  let identities=0,closed=0,reads=0
  const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
   if(sql.includes('assistant_original_audit_intents')){reads++;return JSON.stringify([{...row(1),contentDigest:fault==='ledger'&&reads===2?'d'.repeat(64):'c'.repeat(64)}])}
   identities++;return JSON.stringify({backend:fault==='backend'&&identities===4?backend+1:backend,database:'telecom_test',application})
  },close:async()=>{closed++}}))
  await driver.connectWorker();const audit=driver.createWorkerAuditInspector(scope);await audit.captureBaseline()
  await assert.rejects(audit.inspect(),{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
  await driver.closeWorker();assert.equal(closed,1);await assert.rejects(audit.inspect(),/UNAVAILABLE/)
 }
})

test('driver audit close during held ledger read discards late private facts without reopening',async()=>{
 let release!:(s:string)=>void,entered!:()=>void,closed=0
 const started=new Promise<void>(done=>{entered=done})
 const driver=createDurableNativeWorkerConnectionV3(async()=>({backend,application,query:async(sql:string)=>{
  if(!sql.includes('assistant_original_audit_intents'))return identity()
  entered();return new Promise<string>(done=>{release=done})
 },close:async()=>{closed++}}))
 await driver.connectWorker();const audit=driver.createWorkerAuditInspector(scope),pending=audit.captureBaseline()
 const denial=assert.rejects(pending,{message:'DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE'})
 await started;await driver.closeWorker();release(JSON.stringify([row(1)]));await denial
 assert.equal(closed,1);await assert.rejects(audit.inspect(),/UNAVAILABLE/);await assert.rejects(driver.connectWorker(),/UNAVAILABLE/)
})
