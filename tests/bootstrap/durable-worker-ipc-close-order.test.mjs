import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import {EventEmitter} from 'node:events'
import {syncBuiltinESMExports} from 'node:module'
import test,{mock} from 'node:test'
import {fileURLToPath} from 'node:url'
import {launchDurableWorkerV3} from '../../scripts/durable-process-worker-controller-v3.mjs'

async function fixture(run){
  const child=new EventEmitter();child.pid=12345;child.kill=()=>true;child.send=(_work,callback)=>callback?.(null)
  mock.method(childProcess,'fork',()=>child);syncBuiltinESMExports()
  const active=new Set()
  try{
    const job=launchDurableWorkerV3({modulePath:fileURLToPath(new URL('./synthetic-driver-unused.mjs',import.meta.url)),job:{fixture:'synthetic',scenario:'reserve_race',action:'execute'},active,timeoutMs:1000})
    child.emit('message',{type:'ready',backendPid:56789});await job.ready;job.start()
    await run({job,child,active})
  }finally{
    child.emit('exit',null,'SIGKILL');child.emit('close',null,'SIGKILL')
    mock.restoreAll();syncBuiltinESMExports()
  }
}
// Deliberately synthetic event-order regression; no process/DB/native proof.
test('a buffered ordered result may arrive after observed exit but before IPC close',async()=>{
  await fixture(async({job,child})=>{
    child.emit('exit',0,null)
    child.emit('message',{type:'result',result:{authorization:'granted'}})
    child.emit('close',0,null)
    assert.deepEqual(await job.result,{authorization:'granted'})
  })
})
test('a clean exit and earlier result do not resolve until channel closure is observed',async()=>{
  await fixture(async({job,child})=>{
    let settled=false;void job.result.then(()=>{settled=true},()=>{settled=true})
    child.emit('message',{type:'result',result:{authorization:'granted'}});child.emit('exit',0,null)
    await Promise.resolve();assert.equal(settled,false)
    child.emit('close',0,null);assert.deepEqual(await job.result,{authorization:'granted'})
  })
})
test('closure cannot turn missing results abnormal exits or late duplicate messages into success',async()=>{
  for(const variant of ['missing','abnormal','duplicate'])await fixture(async({job,child})=>{
    if(variant!=='missing')child.emit('message',{type:'result',result:{authorization:'granted'}})
    child.emit('exit',variant==='abnormal'?17:0,null)
    if(variant==='duplicate')child.emit('message',{type:'result',result:{authorization:'granted'}})
    child.emit('close',variant==='abnormal'?17:0,null)
    await assert.rejects(job.result,/worker_exited_without_result|worker_protocol_invalid/)
  })
})
