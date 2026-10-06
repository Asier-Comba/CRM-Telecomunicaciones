import test from 'node:test'
import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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
