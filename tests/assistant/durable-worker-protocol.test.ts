import test from 'node:test'
import assert from 'node:assert/strict'
import { fork, spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { once } from 'node:events'

test('worker protocol reaches the requested barrier and terminates by observed SIGKILL', async () => {
  // IPC/process-mechanics test only. Backend ID is deliberately synthetic;
  // this does not run the native DB acceptance suite or prove persistence.
  const directory = await mkdtemp(join(tmpdir(), 'w3-worker-protocol-'))
  const adapter = join(directory, 'synthetic-driver.mjs')
  await writeFile(adapter, 'export async function connectWorker(){return 1234}\nexport async function execute(job,checkpoint){await checkpoint("test_cutpoint");return {done:true}}\n')
  const child = fork(resolve('scripts/durable-process-worker.mjs'), [adapter], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000)
  try {
    const [ready] = await once(child, 'message')
    assert.deepEqual(ready, { type: 'ready', backendPid: 1234 })
    const checkpoint = once(child, 'message')
    child.send({ killAt: 'test_cutpoint' })
    assert.deepEqual((await checkpoint)[0], { type: 'checkpoint', name: 'test_cutpoint' })
    const exited = once(child, 'exit')
    assert.equal(child.kill('SIGKILL'), true)
    const [code, signal] = await exited
    assert.equal(code, null)
    assert.equal(signal, 'SIGKILL')
  } finally {
    clearTimeout(timeout)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
})

test('portable native runner reaches driver prerequisite without obsolete dist build', () => {
  const result = spawnSync(process.execPath, ['scripts/durable-process-acceptance.mjs'], { encoding: 'utf8' })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /Required: absolute local W2 acceptance driver path/)
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/)
})

test('native runner exits safely for missing and non-disposable adapters without invoking them', async () => {
  const root=resolve(tmpdir()),directory=await mkdtemp(join(root,'w3-native-prereq-'))
  try {
    const adapter=join(directory,'wrong-driver.mjs')
    await writeFile(adapter,'export const metadata={contract:"synthetic-wrong",backend:"hosted_remote",disposable:false};export function setupScenario(){throw Error("must not execute")}\n')
    for(const [path,message] of [[join(directory,'absent.mjs'),'adapter_load_failed'],[adapter,'disposable_native_postgres_driver_required']]) {
      const result=spawnSync(process.execPath,['scripts/durable-process-acceptance.mjs',path],{encoding:'utf8',timeout:5000})
      assert.equal(result.status,2);assert.equal(result.signal,null);assert.match(result.stderr,new RegExp(message));assert.doesNotMatch(result.stderr,/UV_HANDLE_CLOSING|must not execute/);assert.equal(result.stdout,'')
    }
  } finally {
    assert.equal(dirname(resolve(directory)),root);assert.match(basename(directory),/^w3-native-prereq-/)
    await rm(directory,{recursive:true,force:true})
  }
})

test('incomplete drivers are rejected before synthetic fixture setup; complete exports still reach setup', async () => {
  // Structural prerequisite test only; no PostgreSQL, business effect or native
  // durability claim. Marker proves whether setup ran, not just an exit code.
  const root=resolve(tmpdir()),directory=await mkdtemp(join(root,'w3-export-admission-'))
  const adapter=join(directory,'synthetic-driver.mjs'),marker=join(directory,'setup.marker')
  const names=['setupScenario','connectWorker','execute','inspectBoundary','inspectScenario','cleanupScenario']
  const metadata='import {writeFileSync} from "node:fs";export const metadata={contract:"assistant.durable-process.v2",backend:"native_postgres",disposable:true};\n'
  const functions=names.map(name=>name==='setupScenario'
    ? 'export function setupScenario(){writeFileSync('+JSON.stringify(marker)+',"SYNTHETIC_SETUP_CALLED");throw Error("synthetic setup abort: never serialize this adapter error")}\n'
    : 'export function '+name+'(){throw Error("must not execute native path")}\n')
  try {
    let variant=0
    for(const name of names)for(const malformed of [false,true]){
      const moduleSource=metadata+functions.map((code,index)=>names[index]===name?(malformed?'export const '+name+'=0;\n':''):code).join('')
      // Distinct module file also avoids any possibility of an import cache hit.
      const path=join(directory,'incomplete-'+(variant++)+'.mjs')
      await writeFile(path,moduleSource)
      const result=spawnSync(process.execPath,['scripts/durable-process-acceptance.mjs',path],{encoding:'utf8',timeout:5000})
      assert.equal(result.status,2);assert.equal(result.signal,null);assert.equal(result.stdout,'')
      assert.match(result.stderr,/durable_driver_exports_required/)
      assert.doesNotMatch(result.stderr,/synthetic setup abort|must not execute native path|durable_acceptance_failed/)
      await assert.rejects(access(marker),{code:'ENOENT'})
    }
    await writeFile(adapter,metadata+functions.join(''))
    const complete=spawnSync(process.execPath,['scripts/durable-process-acceptance.mjs',adapter],{encoding:'utf8',timeout:5000})
    assert.equal(complete.status,1);assert.equal(complete.signal,null);assert.equal(complete.stdout,'')
    assert.match(complete.stderr,/"code":"durable_acceptance_failed"/)
    assert.doesNotMatch(complete.stderr,/durable_driver_exports_required|synthetic setup abort|must not execute native path/)
    assert.equal(await readFile(marker,'utf8'),'SYNTHETIC_SETUP_CALLED')
  } finally {
    assert.equal(dirname(resolve(directory)),root);assert.match(basename(directory),/^w3-export-admission-/)
    await rm(directory,{recursive:true,force:true})
  }
})
