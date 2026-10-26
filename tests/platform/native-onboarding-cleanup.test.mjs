import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { isExpectedNativeImage } from '../../scripts/security/native-postgres/expected-image.mjs'

// Execute the actual harness, replacing only its process/filesystem boundaries.
// No Docker process, database, network, or source transformation is used here.
async function simulate(scenario) {
  const calls = [], logs = [], reads = []
  const context = vm.createContext({
    process: { env: { TELECOM_NATIVE_TEST_CONTAINER: 'a'.repeat(64) } },
    console: { log: message => logs.push(message) },
    setTimeout, clearTimeout,
  })
  const fakeSpawn = (command, args) => {
    assert.equal(command, 'docker')
    assert.deepEqual(Array.from(args.slice(0, 5)), ['exec', '-i', '-u', 'postgres', 'a'.repeat(64)])
    const operation = args[5]
    calls.push(Array.from(args.slice(5)))
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.kill = () => { throw new Error('unexpected timeout or output overflow') }
    child.stdin = { end() {
      queueMicrotask(() => {
        if (operation === 'createdb' && scenario === 'spawn-error') {
          child.emit('error', new Error('synthetic launch failure'))
          child.emit('close', null)
          return
        }
        assert.ok(['createdb', 'psql', 'dropdb'].includes(operation))
        const fails = operation === 'psql'
          || (operation === 'createdb' && scenario === 'already-exists')
          || (operation === 'dropdb' && scenario === 'cleanup-error')
        child.emit('close', fails ? 1 : 0)
      })
    } }
    return child
  }
  const exportsByModule = {
    'node:assert/strict': { default: assert },
    'node:child_process': {
      spawn: fakeSpawn,
      spawnSync(command, args) {
        assert.equal(command, 'docker')
        assert.deepEqual(Array.from(args), ['inspect', '--format={{.Config.Image}}', 'a'.repeat(64)])
        return { status: 0, stdout: 'postgres:16\n' }
      },
    },
    'node:fs': {
      readFileSync(path) { reads.push(path); assert.equal(path, 'scripts/security/native-postgres/bootstrap.sql'); return '' },
      readdirSync() { throw new Error('unexpected migration read after bootstrap failure') },
    },
    './expected-image.mjs': { isExpectedNativeImage },
  }
  const source = readFileSync(new URL('../../scripts/security/native-postgres/onboarding-provision-races.mjs', import.meta.url), 'utf8')
  const harnessModule = new vm.SourceTextModule(source, { context })
  await harnessModule.link(specifier => {
    assert.ok(Object.hasOwn(exportsByModule, specifier), 'unexpected harness dependency')
    const entries = Object.entries(exportsByModule[specifier])
    return new vm.SyntheticModule(entries.map(([key]) => key), function () {
      for (const [key, value] of entries) this.setExport(key, value)
    }, { context })
  })
  let error = null
  try { await harnessModule.evaluate() } catch (failure) { error = failure.message }
  return { calls, logs, reads, error }
}

if (process.argv[2] === '--simulate') {
  console.log(JSON.stringify(await simulate(process.argv[3])))
} else {
  const run = scenario => {
    const child = spawnSync(process.execPath, ['--experimental-vm-modules', fileURLToPath(import.meta.url), '--simulate', scenario], {
      encoding: 'utf8', timeout: 10000,
    })
    assert.equal(child.status, 0, child.stderr)
    return JSON.parse(child.stdout)
  }
  const drops = result => result.calls.filter(args => args[0] === 'dropdb')

  test('failed creation of an existing database never attempts to drop it', () => {
    const result = run('already-exists')
    assert.ok(result.error, 'creation must still fail')
    assert.equal(result.calls[0][0], 'createdb')
    assert.deepEqual(result.reads, [])
    assert.deepEqual(drops(result), [])
    assert.deepEqual(result.logs, [], 'must not claim a teardown of an unowned database')
  })
  test('creation process error never attempts to drop an unowned database', () => {
    const result = run('spawn-error')
    assert.equal(result.error, 'synthetic launch failure')
    assert.deepEqual(drops(result), [])
    assert.deepEqual(result.logs, [])
  })
  test('failure after successful creation still drops exactly the owned database', () => {
    const result = run('bootstrap-error')
    assert.match(result.error, /native onboarding SQL failed/)
    assert.deepEqual(result.reads, ['scripts/security/native-postgres/bootstrap.sql'])
    assert.deepEqual(drops(result), [['dropdb', '--force', '-U', 'postgres', result.calls[0].at(-1)]])
    assert.deepEqual(result.logs, ['ONBOARDING NATIVE RACES TEARDOWN PASS'])
  })
  test('owned database teardown failure remains a failure without a PASS marker', () => {
    const result = run('cleanup-error')
    assert.match(result.error, /disposable onboarding race teardown failed/)
    assert.equal(drops(result).length, 1)
    assert.deepEqual(result.logs, [])
  })
}
