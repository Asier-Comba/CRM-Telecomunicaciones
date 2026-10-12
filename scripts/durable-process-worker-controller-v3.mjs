import {fork} from 'node:child_process'
import {isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'

const workerPath=fileURLToPath(new URL('./durable-process-worker.mjs',import.meta.url))
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value)
const exact=(value,keys)=>object(value)&&Object.keys(value).sort().join(',')===keys.sort().join(',')

/** Own-process protocol only. A ready PID is still measured by the driver on its
 * execution connection; this controller does not certify PostgreSQL or effects.
 * Success requires ordered ready/start/result AND observed clean process exit.
 * A cut requires the requested checkpoint AND observed SIGKILL, never a reply. */
export function launchDurableWorkerV3({modulePath,job,active,timeoutMs=30000}) {
  if(!isAbsolute(modulePath)||!object(job)||!(active instanceof Set)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('worker_launch_invalid')
  const work=Object.freeze({...job})
  const child=fork(workerPath,[modulePath],{stdio:['ignore','ignore','ignore','ipc']})
  active.add(child)
  const identity={clientPid:child.pid,backendPid:undefined}
  let phase='connecting',failure=null,outcome,resolveReady,rejectReady,resolveResult,rejectResult
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject})
  const result=new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject})
  // Parent may still be collecting peer barriers when either promise rejects.
  void ready.catch(()=>{});void result.catch(()=>{})
  function fail(code){
    if(failure)return
    failure=Error(code);rejectReady(failure);rejectResult(failure)
    child.kill('SIGKILL')
  }
  const timer=setTimeout(()=>fail('worker_timeout'),timeoutMs)
  child.on('message',message=>{
    if(failure)return
    if(exact(message,['type','backendPid'])&&message.type==='ready'){
      if(phase!=='connecting'||!Number.isSafeInteger(message.backendPid)||message.backendPid<1)return fail('worker_protocol_invalid')
      identity.backendPid=message.backendPid;Object.freeze(identity)
      phase='ready';resolveReady();return
    }
    if(exact(message,['type','name'])&&message.type==='checkpoint'){
      if(phase!=='started'||!work.killAt||message.name!==work.killAt)return fail('worker_protocol_invalid')
      phase='cut';child.kill('SIGKILL');return
    }
    if(exact(message,['type','result'])&&message.type==='result'){
      if(phase!=='started'||work.killAt||!object(message.result))return fail('worker_protocol_invalid')
      outcome=message.result;phase='reported';return
    }
    if(exact(message,['type','code'])&&message.type==='error'&&message.code==='adapter_execution_failed')return fail('worker_failed')
    fail('worker_protocol_invalid')
  })
  child.on('error',()=>fail('worker_launch_failed'))
  child.on('exit',(code,signal)=>{
    clearTimeout(timer);active.delete(child)
    if(failure)return
    if(phase==='cut'&&code===null&&signal==='SIGKILL')resolveResult({killedAt:work.killAt})
    else if(phase==='reported'&&code===0&&signal===null)resolveResult(outcome)
    else fail('worker_exited_without_result')
  })
  return {identity,ready,result,start(){
    if(phase!=='ready'||failure){fail('worker_protocol_invalid');throw Error('worker_protocol_invalid')}
    phase='started'
    child.send(work,error=>{if(error)fail('worker_launch_failed')})
  }}
}
