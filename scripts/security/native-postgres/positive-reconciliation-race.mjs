import assert from 'node:assert/strict'
import {fork} from 'node:child_process'

/** Actual Node processes and persistent native backends, not SQL child counters. */
export function runIndependentPositiveReconciliationRaceV1(inputs,fixture,terminateBackends){
 return runIndependentRace(inputs,fixture,terminateBackends,'reconcile')
}
export function runIndependentUnconfirmedReservationRaceV1(inputs,fixture,terminateBackends){
 return runIndependentRace(inputs,fixture,terminateBackends,'reserve')
}
export function runIndependentCompletionRaceV1(inputs,fixture,terminateBackends){
 return runIndependentRace(inputs,fixture,terminateBackends,'complete')
}
export function runIndependentConfirmedReserveStartRaceV1(inputs,fixture,terminateBackends){
 return runIndependentRace(inputs,fixture,terminateBackends,'reserve_start')
}
async function runIndependentRace(inputs,fixture,terminateBackends,mode){
 assert.equal(inputs.length,20)
 const children=[],sessions=new Map(),states=new Map()
 let connected=0,prepared=0,reserved=0
 const reservations=new Map()
 const results=inputs.map(input=>new Promise((resolve,reject)=>{
  const child=fork(new URL(mode==='reserve_start'?'./start-execution-worker.mjs':'./positive-reconciliation-worker.mjs',import.meta.url),[],{
   execArgv:['--max-old-space-size=128','--experimental-transform-types'],stdio:['ignore','ignore','ignore','ipc'],serialization:'json',
  })
  children.push(child);states.set(child,'starting')
  let result
  const timer=setTimeout(()=>{reject(Error('INDEPENDENT_RECONCILIATION_WATCHDOG'));child.kill('SIGKILL')},30000)
  child.on('error',()=>reject(Error('INDEPENDENT_RECONCILIATION_UNAVAILABLE')))
  child.on('message',m=>{
   try{
    if(m.phase==='failed'){
     assert.equal(m.code,'INDEPENDENT_RECONCILIATION_WORKER_FAILED');assert.ok(['CONNECT','PREPARE','COMMIT_BARRIER','COMMIT','READBACK','RESULT','POSTCOMMIT','RECOVER'].includes(m.stage))
     reject(Error('INDEPENDENT_RECONCILIATION_WORKER_'+m.stage));return
    }
    assert.equal(m.pid,child.pid);assert.ok(Number.isSafeInteger(m.backend)&&m.backend>0)
    if(m.phase==='connected'){
     assert.equal(states.get(child),'starting');assert.match(m.application,/^durable_node_[0-9a-f]{32}$/)
     sessions.set(child,{backend:m.backend,application:m.application});states.set(child,'connected')
     if(++connected===20){assert.equal(new Set([...sessions.values()].map(x=>x.backend)).size,20);for(const c of children)c.send({phase:'start'})}
    }else if(m.phase==='prepared'){
     assert.equal(states.get(child),'connected');assert.equal(m.backend,sessions.get(child).backend);states.set(child,'prepared')
     if(++prepared===20)for(const c of children)c.send({phase:'release'})
    }else if(m.phase==='reserved'){
     assert.equal(mode,'reserve_start');assert.equal(states.get(child),'prepared');assert.equal(m.backend,sessions.get(child).backend)
     assert.ok(['reserved','existing'].includes(m.status));assert.match(m.operationRef,/^[A-Za-z0-9_-]{24,200}$/);assert.match(m.recordDigest,/^[0-9a-f]{64}$/)
     reservations.set(child,{status:m.status,operationRef:m.operationRef,recordDigest:m.recordDigest});states.set(child,'reserved')
     if(++reserved===20){
      assert.equal([...reservations.values()].filter(r=>r.status==='reserved').length,1)
      assert.equal(new Set([...reservations.values()].map(r=>r.operationRef)).size,1)
      assert.equal(new Set([...reservations.values()].map(r=>r.recordDigest)).size,1)
      for(const c of children)c.send({phase:'authorize'})
     }
    }else if(m.phase==='result'){
     assert.equal(states.get(child),mode==='reserve_start'?'reserved':'prepared');assert.equal(m.backend,sessions.get(child).backend)
     assert.ok((mode==='reserve'?['reserved','existing']:['applied','version_conflict']).includes(m.status))
     states.set(child,'result');result={status:m.status}
     if(mode==='reserve'){
      assert.match(m.operationRef,/^[A-Za-z0-9_-]{24,200}$/);assert.match(m.recordDigest,/^[0-9a-f]{64}$/)
      result={...result,operationRef:m.operationRef,recordDigest:m.recordDigest}
     }
    }else throw Error('INVALID_PHASE')
   }catch{reject(Error('INDEPENDENT_RECONCILIATION_PROTOCOL_FAILED'))}
  })
  child.once('exit',(code,signal)=>{
   clearTimeout(timer)
   if(code===0&&signal===null&&result)resolve(result)
   else reject(Error('INDEPENDENT_RECONCILIATION_WORKER_FAILED'))
  })
  const command={...input,actor:{...input.actor,permissions:[...input.actor.permissions]},now:input.now.toISOString()}
  child.send({...fixture,mode,commit:command})
 }))
 try{
  const settled=await Promise.all(results)
  assert.equal(connected,20);assert.equal(prepared,20);assert.equal(new Set(children.map(c=>c.pid)).size,20)
  assert.equal(settled.filter(r=>r.status===(mode==='reserve'?'reserved':'applied')).length,1)
  assert.equal(settled.filter(r=>r.status===(mode==='reserve'?'existing':'version_conflict')).length,19)
  if(mode==='reserve'){
   assert.equal(new Set(settled.map(r=>r.operationRef)).size,1);assert.equal(new Set(settled.map(r=>r.recordDigest)).size,1)
  }
  if(mode==='reserve_start')assert.equal(reserved,20)
  return {settled,nodeProcesses:20,nativeBackends:20,sameConnection:true,...(mode==='reserve_start'?{reservations:children.map(c=>reservations.get(c))}:{})}
 }finally{
  for(const c of children)if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL')
  // Limit termination to the measured backend/application identity in this race.
  if(sessions.size)await terminateBackends([...sessions.values()])
 }
}
