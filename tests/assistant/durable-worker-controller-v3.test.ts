import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve,dirname,basename} from 'node:path'
import {once} from 'node:events'
import {pathToFileURL} from 'node:url'

// Real Node IPC/process/exit checks with a deliberately synthetic backend ID.
// This is not DB evidence, verified absence, same-resource restart or Full23.
const controller=process.env.W3_WORKER_PROTOCOL_CONTROLLER
  ? await import(pathToFileURL(resolve(process.env.W3_WORKER_PROTOCOL_CONTROLLER)).href)
  : await import('../../scripts/durable-process-worker-controller-v3.mjs')

async function fixture(source:string,run:(modulePath:string,active:Set<import('node:child_process').ChildProcess>)=>Promise<void>){
  const root=resolve(tmpdir()),directory=await mkdtemp(join(root,'w3-worker-order-')),active=new Set<import('node:child_process').ChildProcess>()
  try{
    const modulePath=join(directory,'synthetic-driver.mjs')
    await writeFile(modulePath,source)
    await run(modulePath,active)
  }finally{
    await Promise.all([...active].map(async child=>{
      if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGKILL');await exited}
    }))
    assert.equal(dirname(resolve(directory)),root);assert.match(basename(directory),/^w3-worker-order-/)
    await rm(directory,{recursive:true,force:true})
  }
}
const launch=(modulePath:string,active:Set<import('node:child_process').ChildProcess>,job:Record<string,string>={fixture:'synthetic',scenario:'reserve_race',action:'execute'})=>controller.launchDurableWorkerV3({modulePath,active,job,timeoutMs:1500})
const prefix='export async function connectWorker(){return 1234}\n'

test('v3 worker rejects a result before the parent start barrier',async()=>{
  await fixture('process.send({type:"result",result:{authorization:"granted"}});\n'+prefix+'export async function execute(){return {authorization:"granted"}}',async(path,active)=>{
    const job=launch(path,active)
    await assert.rejects(job.result,/worker_protocol_invalid/)
  })
})
test('v3 worker refuses an invalid backend identity before ready',async()=>{
  await fixture('export async function connectWorker(){return "1234"}\nexport async function execute(){return {}}',async(path,active)=>{
    const job=launch(path,active)
    await assert.rejects(job.ready,/worker_protocol_invalid/)
    await assert.rejects(job.result,/worker_protocol_invalid/)
  })
})
test('v3 worker refuses identity substitution after the start barrier',async()=>{
  await fixture(prefix+'export async function execute(){process.send({type:"ready",backendPid:9999});return {authorization:"granted"}}',async(path,active)=>{
    const job=launch(path,active);await job.ready;job.start()
    await assert.rejects(job.result,/worker_protocol_invalid/)
    assert.equal(job.identity.backendPid,1234)
  })
})
test('v3 worker result followed by abnormal exit cannot pass',async()=>{
  await fixture(prefix+'export async function execute(){process.send({type:"result",result:{authorization:"granted"}});setTimeout(()=>process.exit(17),30);await new Promise(()=>{})}',async(path,active)=>{
    const job=launch(path,active);await job.ready;job.start()
    await assert.rejects(job.result,/worker_exited_without_result/)
  })
})
test('v3 worker result without process exit remains bounded and cannot pass',async()=>{
  await fixture(prefix+'export async function execute(){process.send({type:"result",result:{authorization:"granted"}});setInterval(()=>{},1000);await new Promise(()=>{})}',async(path,active)=>{
    const job=launch(path,active);await job.ready;job.start()
    await assert.rejects(job.result,/worker_timeout/)
  })
})
test('v3 worker success requires observed clean exit and immutable identity',async()=>{
  await fixture(prefix+'export async function execute(){return {authorization:"granted"}}',async(path,active)=>{
    const job=launch(path,active);await job.ready
    const child=[...active][0]!;assert.equal(child.exitCode,null)
    job.start();assert.deepEqual(await job.result,{authorization:'granted'})
    assert.equal(child.exitCode,0);assert.equal(child.signalCode,null);assert.equal(active.size,0)
    assert.equal(Object.isFrozen(job.identity),true)
  })
})
test('v3 worker cut requires the requested checkpoint and observed SIGKILL',async()=>{
  await fixture(prefix+'export async function execute(job,checkpoint){await checkpoint("after_effect_before_completion");return {authorization:"granted"}}',async(path,active)=>{
    const job=launch(path,active,{fixture:'synthetic',scenario:'kill_after_effect',action:'execute',killAt:'after_effect_before_completion'})
    await job.ready;const child=[...active][0]!;job.start()
    assert.deepEqual(await job.result,{killedAt:'after_effect_before_completion'})
    assert.equal(child.exitCode,null);assert.equal(child.signalCode,'SIGKILL');assert.equal(active.size,0)
  })
})
