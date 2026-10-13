import assert from 'node:assert/strict'
import {fork} from 'node:child_process'

/** Commit proof is independently read before an actual owned Node SIGKILL. */
export async function runPositiveReconciliationProcessCutV1(input,fixture,inspectCommitted,terminateBackends){
 return runProcessCut(input,fixture,inspectCommitted,terminateBackends,false)
}
export async function runCompletionProcessCutV1(input,fixture,inspectCommitted,terminateBackends){
 return runProcessCut(input,fixture,inspectCommitted,terminateBackends,true)
}
async function runProcessCut(input,fixture,inspectCommitted,terminateBackends,normalCompletion){
 const killMode=normalCompletion?'complete_kill_after_commit':'kill_after_commit',recoverMode=normalCompletion?'complete_recover_only':'recover_only'
 let committedRecordDigest
 const children=[],sessions=[]
 async function single(mode,command){
  const child=fork(new URL('./positive-reconciliation-worker.mjs',import.meta.url),[],{
   execArgv:['--max-old-space-size=128','--experimental-transform-types'],stdio:['ignore','ignore','ignore','ipc'],serialization:'json',
  });children.push(child)
  let stage='starting',session,recovered,observedCommit=false
  const result=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{reject(Error('POSITIVE_PROCESS_CUT_WATCHDOG'));child.kill('SIGKILL')},30000)
   child.on('error',()=>reject(Error('POSITIVE_PROCESS_CUT_UNAVAILABLE')))
   child.on('message',async m=>{
    try{
     if(m.phase==='failed'){
      assert.equal(m.code,'INDEPENDENT_RECONCILIATION_WORKER_FAILED');assert.ok(['CONNECT','PREPARE','COMMIT_BARRIER','COMMIT','READBACK','RESULT','POSTCOMMIT','RECOVER'].includes(m.stage))
      reject(Error('POSITIVE_PROCESS_CUT_WORKER_'+m.stage));return
     }
     assert.equal(m.pid,child.pid);assert.ok(Number.isSafeInteger(m.backend)&&m.backend>0)
     if(m.phase==='connected'){
      assert.equal(stage,'starting');assert.match(m.application,/^durable_node_[0-9a-f]{32}$/)
      session={backend:m.backend,application:m.application};sessions.push(session);stage='connected';child.send({phase:'start'})
     }else if(m.phase==='prepared'){
      assert.equal(mode,killMode);assert.equal(stage,'connected');assert.equal(m.backend,session.backend)
      stage='prepared';child.send({phase:'release'})
     }else if(m.phase==='committed'){
      assert.equal(mode,killMode);assert.equal(stage,'prepared');assert.equal(m.backend,session.backend);stage='inspecting'
      committedRecordDigest=await inspectCommitted()
      if(normalCompletion)assert.match(committedRecordDigest,/^[0-9a-f]{64}$/)
      observedCommit=true;stage='killing';assert.equal(child.kill('SIGKILL'),true)
     }else if(m.phase==='recovered'){
      assert.equal(mode,recoverMode);assert.equal(stage,'connected');assert.equal(m.backend,session.backend)
      assert.match(m.receiptDigest,/^[0-9a-f]{64}$/);assert.match(m.resultDigest,/^[0-9a-f]{64}$/)
      stage='recovered';recovered={receiptDigest:m.receiptDigest,resultDigest:m.resultDigest}
      if(normalCompletion){assert.equal(m.recordDigest,committedRecordDigest);recovered.recordDigest=m.recordDigest}
     }else throw Error('INVALID_PROCESS_CUT_PHASE')
    }catch{reject(Error('POSITIVE_PROCESS_CUT_PROTOCOL_OR_PERSISTENCE_FAILED'))}
   })
   child.once('exit',(code,signal)=>{
    clearTimeout(timer)
    if(mode===killMode&&observedCommit&&stage==='killing'&&signal==='SIGKILL'&&code===null)resolve({pid:child.pid,backend:session.backend,signal})
    else if(mode===recoverMode&&stage==='recovered'&&code===0&&signal===null)resolve({pid:child.pid,backend:session.backend,...recovered})
    else reject(Error('POSITIVE_PROCESS_CUT_REAL_EXIT_NOT_OBSERVED'))
   })
   child.send({...fixture,mode,commit:{...command,actor:{...command.actor,permissions:[...command.actor.permissions]},now:command.now.toISOString()}})
  })
  return result
 }
 try{
  const killed=await single(killMode,input)
  await terminateBackends([...sessions])
  const recovery={...input,actor:{...input.actor,requestId:fixture.recoveryRequestId}}
  const replay=await single(recoverMode,recovery)
  assert.notEqual(replay.pid,killed.pid);assert.notEqual(replay.backend,killed.backend)
  return {signal:killed.signal,independentRecovery:true,receiptDigest:replay.receiptDigest,resultDigest:replay.resultDigest,...(normalCompletion?{recordDigest:replay.recordDigest}:{})}
 }finally{
  for(const child of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL')
  if(sessions.length)await terminateBackends([...sessions])
 }
}
