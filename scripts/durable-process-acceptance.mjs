import { fork } from 'node:child_process'
import { isAbsolute } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { DURABLE_PROCESS_CONTRACT, DURABLE_PROCESS_SCENARIOS, validateDurableObservation, validateAuditOutageObservation, validateRollbackEvidence, validateDatabaseRestartEvidence, validateClaimFenceEvidence, validateImmutableAuditEvidence } from '../src/assistant/durable-process-spec-v3.ts'

// Usage on repository Node24: node scripts/durable-process-acceptance.mjs /absolute/W2-driver.mjs
// Driver receives credentials through its own approved local environment, never CLI JSON.
async function main() {
const modulePath = process.argv[2]
if (!modulePath || !isAbsolute(modulePath)) {
  console.error('Required: absolute local W2 acceptance driver path; no database evidence produced.')
  process.exitCode = 2; return
}
let driver
try { driver = await import(pathToFileURL(modulePath).href) } catch {
  console.error('adapter_load_failed'); process.exitCode = 2; return
}
if (!driver.metadata || Object.keys(driver.metadata).sort().join(',') !== 'backend,contract,disposable' ||
  driver.metadata.contract !== DURABLE_PROCESS_CONTRACT || driver.metadata.backend !== 'native_postgres' || driver.metadata.disposable !== true) {
  console.error('disposable_native_postgres_driver_required'); process.exitCode = 2; return
}
const requiredExports = ['setupScenario', 'connectWorker', 'execute', 'inspectBoundary', 'inspectScenario', 'cleanupScenario']
if (requiredExports.some(name => typeof driver[name] !== 'function')) {
  console.error('durable_driver_exports_required'); process.exitCode = 2; return
}
const workerPath = fileURLToPath(new URL('./durable-process-worker.mjs', import.meta.url))
const active = new Set()
function launch(job) {
  const child = fork(workerPath, [modulePath], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
  active.add(child)
  const identity = { clientPid: child.pid, backendPid: undefined }
  let release
  const ready = new Promise(resolve => { release = resolve })
  let reached = false
  let done = false
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('worker_timeout')) }, 30000)
    child.on('message', message => {
      if (message.type === 'ready') { identity.backendPid = message.backendPid; release() }
      if (message.type === 'checkpoint' && message.name === job.killAt) { reached = true; child.kill('SIGKILL') }
      if (message.type === 'result') { done = true; clearTimeout(timer); resolve(message.result) }
      if (message.type === 'error') { clearTimeout(timer); reject(new Error('worker_failed')) }
    })
    child.on('error', () => { clearTimeout(timer); release(); reject(new Error('worker_launch_failed')) })
    child.on('exit', (code, signal) => {
      active.delete(child); clearTimeout(timer); release()
      if (reached && signal === 'SIGKILL') resolve({ killedAt: job.killAt })
      else if (!done) reject(new Error('worker_exited_without_result'))
    })
  })
  // Observe errors even if a worker dies before every peer reaches the barrier.
  void result.catch(() => {})
  return { identity, ready, start() { child.send(job) }, result }
}

const report = []
try {
  for (const scenario of DURABLE_PROCESS_SCENARIOS) {
    const fixture = await driver.setupScenario(scenario.id)
    assert.equal(typeof fixture, 'string') // opaque synthetic fixture ref only
    assert.match(fixture, /^[A-Za-z0-9_-]{1,160}$/)
    try {
      const jobs = Array.from({ length: scenario.workers }, () => launch({ fixture, scenario: scenario.id, action: scenario.action, ...('killAt' in scenario ? { killAt: scenario.killAt } : {}) }))
      await Promise.all(jobs.map(job => job.ready))
      assert.equal(new Set(jobs.map(job => job.identity.clientPid)).size, scenario.workers)
      assert.ok(jobs.every(job => Number.isSafeInteger(job.identity.backendPid) && job.identity.backendPid > 0))
      assert.equal(new Set(jobs.map(job => job.identity.backendPid)).size, scenario.workers)
      jobs.forEach(job => job.start())
      const outcomes = await Promise.all(jobs.map(job => job.result))
      if ('killAt' in scenario) assert.equal(outcomes[0]?.killedAt, scenario.killAt)
      if (scenario.workers === 20) assert.equal(outcomes.filter(o => o?.authorization === 'granted').length, 1)
      if (scenario.id === 'lease_expiry') {
        assert.equal((await driver.inspectScenario(fixture)).state, 'reconciliation_required')
      }
      if (scenario.id === 'atomic_operation_outbox') {
        const evidence = await driver.inspectBoundary(fixture)
        assert.equal(validateRollbackEvidence(evidence), true)
      }
      if (scenario.id === 'database_restart') {
        assert.equal(validateDatabaseRestartEvidence(await driver.inspectBoundary(fixture)), true)
      }
      if (scenario.id === 'claim_fencing') {
        assert.equal(validateClaimFenceEvidence(await driver.inspectBoundary(fixture)), true)
      }
      if (['audit_ack_loss', 'audit_content_conflict', 'kill_after_transition'].includes(scenario.id)) {
        assert.equal(validateImmutableAuditEvidence(await driver.inspectBoundary(fixture)), true)
      }
      if (scenario.id === 'audit_delivery_outage') {
        const beforeDrain = await driver.inspectScenario(fixture)
        assert.equal(validateAuditOutageObservation(beforeDrain), true)
      }
      const identities = jobs.map(job => job.identity)
      if (scenario.recover) {
        // Fresh independent process/connection after crash; adapter verifies receipt
        // or absence before any retry. Recovery includes draining the original audit.
        const recovery = launch({ fixture, scenario: scenario.id, action: 'recover_and_drain' })
        await recovery.ready; recovery.start(); await recovery.result
        assert.ok(Number.isSafeInteger(recovery.identity.backendPid) && recovery.identity.backendPid > 0)
        assert.ok(!identities.some(id => id.clientPid === recovery.identity.clientPid))
        identities.push(recovery.identity)
      }
      const observation = await driver.inspectScenario(fixture)
      assert.equal(validateDurableObservation(scenario.id, observation), true, `invalid evidence: ${scenario.id}`)
      report.push({ scenario: scenario.id, workers: scenario.workers, identities, ...('killAt' in scenario ? { killedAt: scenario.killAt, signal: 'SIGKILL' } : {}), passed: true })
    } finally {
      const remaining = [...active]
      await Promise.all(remaining.map(child => new Promise(resolve => {
        child.once('exit', resolve); child.kill('SIGKILL')
      })))
      await driver.cleanupScenario(fixture)
    }
  }
  console.log(JSON.stringify({ contract: DURABLE_PROCESS_CONTRACT, backend: 'native_postgres', scenarios: report }))
} catch {
  // Do not serialize raw adapter errors/observations, which may contain DSNs.
  console.error(JSON.stringify({ code: 'durable_acceptance_failed', completed: report }))
  process.exitCode = 1
} finally {
  for (const child of active) child.kill('SIGKILL')
}
}
await main()
