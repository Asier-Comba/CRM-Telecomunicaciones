import assert from 'node:assert/strict'
import {fork} from 'node:child_process'

/** Actual Node processes and persistent native backends, not SQL child counters. */
export async function runIndependentPositiveReconciliationRaceV1(inputs,fixture,terminateBackends){
 assert.equal(inputs.length,20)
 const children=[],sessions=new Map(),states=new Map()
 let connected=0,prepared=0
 const results=inputs.map(input=>new Promise((resolve,reject)=>{
  const child=fork(new URL('./positive-reconciliation-worker.mjs',import.meta.url),[],{
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
    }else if(m.phase==='result'){
     assert.equal(states.get(child),'prepared');assert.equal(m.backend,sessions.get(child).backend);assert.ok(['applied','version_conflict'].includes(m.status))
     states.set(child,'result');result={status:m.status}
    }else throw Error('INVALID_PHASE')
   }catch{reject(Error('INDEPENDENT_RECONCILIATION_PROTOCOL_FAILED'))}
  })
  child.once('exit',(code,signal)=>{
   clearTimeout(timer)
   if(code===0&&signal===null&&result)resolve(result)
   else reject(Error('INDEPENDENT_RECONCILIATION_WORKER_FAILED'))
  })
  const command={...input,actor:{...input.actor,permissions:[...input.actor.permissions]},now:input.now.toISOString()}
  child.send({...fixture,commit:command})
 }))
 try{
  const settled=await Promise.all(results)
  assert.equal(connected,20);assert.equal(prepared,20);assert.equal(new Set(children.map(c=>c.pid)).size,20)
  assert.equal(settled.filter(r=>r.status==='applied').length,1);assert.equal(settled.filter(r=>r.status==='version_conflict').length,19)
  return {settled,nodeProcesses:20,nativeBackends:20,sameConnection:true}
 }finally{
  for(const c of children)if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL')
  // Limit termination to the measured backend/application identity in this race.
  if(sessions.size)await terminateBackends([...sessions.values()])
 }
}
