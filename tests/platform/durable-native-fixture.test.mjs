import test from 'node:test'
import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import { existsSync } from 'node:fs'
import { createDurableNativeFixtureV1 } from '../../scripts/platform/durable-native-fixture.mjs'
import { NATIVE_POSTGRES_OFFICIAL_IMAGE } from '../../scripts/security/native-postgres/expected-image.mjs'
import { openPersistentNativeFixtureSessionV1 } from '../../scripts/security/native-postgres/persistent-fixture-session.mjs'

const privateMarker = 'private-synthetic-marker@example.invalid'
const contract = 'telecom.native-resource.v1'
const ownerKey = 'telecom.native-resource-owner'

function prepare(t) {
  const previous = { ...process.env }
  Object.assign(process.env, { CI: 'true', GITHUB_ACTIONS: 'true', TELECOM_NATIVE_RESOURCE_DISPOSABLE: 'true', DOCKER_HOST: 'unix:///var/run/docker.sock', DOCKER_CONTEXT: '', NODE_ENV: 'test', APP_ENV: 'test', ALLOW_PRODUCTION_TESTS: 'false', OPENAI_API_KEY: privateMarker })
  delete process.env.TELECOM_NATIVE_TEST_CONTAINER
  t.after(() => {
    t.mock.restoreAll()
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]
    Object.assign(process.env, previous)
  })
}
function engine(t, options = {}) {
  prepare(t)
  const state = { calls: [], mutations: [], container: null, volume: null, start: 1700000000000, system: '7342561234567891234', config: null, refuseVolume: false, ...options }
  t.mock.method(childProcess, 'execFileSync', (file, args, settings) => {
    assert.equal(file, 'docker')
    assert.equal(args[0], '--config'); assert.equal(args[2], '--host')
    assert.equal(args[3], 'unix:///var/run/docker.sock')
    assert.ok(!JSON.stringify(settings.env).includes(privateMarker))
    assert.equal(settings.env.DOCKER_CONTEXT, '')
    assert.equal(settings.windowsHide, true)
    state.config = args[1]
    const a = args.slice(4); state.calls.push(a)
    if (a[0] === 'info') return 'linux\n'
    if (a[0] === 'pull') { if (state.pullFailure) throw Error(privateMarker); assert.equal(a[1], NATIVE_POSTGRES_OFFICIAL_IMAGE); return '' }
    if (a[0] === 'volume') {
      if (a[1] === 'create') {
        const labels = Object.fromEntries(a.flatMap((v, i) => v === '--label' ? [a[i + 1].split('=')] : []))
        state.volume = { Name: a.at(-1), Driver: 'local', CreatedAt: '2026-10-13T08:00:00Z', Mountpoint: '/synthetic/private-volume', Labels: labels, Options: null }
        state.mutations.push('create-volume'); return state.volume.Name
      }
      if (a[1] === 'inspect') return JSON.stringify(state.volume ? [state.volume] : [])
      if (a[1] === 'ls') return state.volume?.Name ?? ''
      if (a[1] === 'rm') { assert.ok(!a.includes('--force')); if (state.refuseVolume) throw Error(privateMarker); state.mutations.push('remove-volume'); state.volume = null; return '' }
    }
    if (a[0] === 'container') {
      if (a[1] === 'create') {
        const labels = Object.fromEntries(a.flatMap((v, i) => v === '--label' ? [a[i + 1].split('=')] : []))
        state.container = { Id: 'a'.repeat(64), Name: '/' + a[a.indexOf('--name') + 1], Created: '2026-10-13T08:00:00Z', Image: 'sha256:' + 'b'.repeat(64), Config: { Image: a.at(-1), Labels: labels }, HostConfig: { NetworkMode: 'none', Privileged: false, PidMode: '', PortBindings: {} }, Mounts: [{ Type: 'volume', Name: state.volume.Name, Destination: '/var/lib/postgresql/data', RW: true }] }
        assert.ok(a.includes('POSTGRES_DB=telecom_test')); state.mutations.push('create-container')
        if (state.createReplyLost) throw Error(privateMarker)
        return state.container.Id
      }
      if (a[1] === 'inspect') return JSON.stringify(state.container ? [state.container] : [])
      if (a[1] === 'ls') return state.container?.Id ?? ''
      if (a[1] === 'start') { if (state.startFailure) throw Error(privateMarker); state.mutations.push('start'); return state.container.Id }
      if (a[1] === 'restart') { state.mutations.push('restart'); if (!state.noStartChange) state.start += 1000; if (state.changeSystem) state.system = '999'; return state.container.Id }
      if (a[1] === 'rm') { state.mutations.push('remove-container'); state.container = null; return '' }
    }
    if (a[0] === 'exec') return JSON.stringify({ system: state.system, started: state.start, database: 'telecom_test', publicRelations: state.nonempty ? 1 : 0, ...(state.extraSnapshot ? { private_data: privateMarker } : {}) })
    throw Error('Unexpected mocked command')
  })
  return state
}
const closedError = code => error => error.message === 'NATIVE_RESOURCE_' + code && error.cause === undefined && !String(error.stack).includes(privateMarker)

test('requires an explicit disposable CI and rejects arguments and production before Docker', async t => {
  prepare(t); let calls = 0
  t.mock.method(childProcess, 'execFileSync', () => { calls++; throw Error(privateMarker) })
  await assert.rejects(createDurableNativeFixtureV1('existing'), closedError('ARGUMENTS_REJECTED'))
  delete process.env.TELECOM_NATIVE_RESOURCE_DISPOSABLE
  await assert.rejects(createDurableNativeFixtureV1(), closedError('DISPOSABLE_CI_REQUIRED'))
  process.env.TELECOM_NATIVE_RESOURCE_DISPOSABLE = 'true'; process.env.NODE_ENV = 'production'
  await assert.rejects(createDurableNativeFixtureV1(), closedError('PRODUCTION_DENIED'))
  assert.equal(calls, 0)
})
test('remote host/context and existing private binding are rejected before engine contact', async t => {
  prepare(t); let calls = 0
  t.mock.method(childProcess, 'execFileSync', () => { calls++; throw Error(privateMarker) })
  process.env.DOCKER_HOST = 'ssh://' + privateMarker
  await assert.rejects(createDurableNativeFixtureV1(), closedError('REMOTE_ENDPOINT_REJECTED'))
  process.env.DOCKER_HOST = 'unix:///var/run/docker.sock'; process.env.DOCKER_CONTEXT = 'remote'
  await assert.rejects(createDurableNativeFixtureV1(), closedError('REMOTE_CONTEXT_REJECTED'))
  process.env.DOCKER_CONTEXT = ''; process.env.TELECOM_NATIVE_TEST_CONTAINER = 'c'.repeat(64)
  await assert.rejects(createDurableNativeFixtureV1(), closedError('EXISTING_BINDING_REJECTED'))
  assert.equal(calls, 0)
})
test('returns the exact frozen private interface and fences all receiver-selected targets', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1()
  try {
    assert.deepEqual(Object.keys(f).sort(), ['close', 'contract', 'environment', 'restart'])
    assert.equal(f.contract, contract); assert.ok(Object.isFrozen(f) && Object.isFrozen(f.environment))
    assert.deepEqual(Object.keys(f.environment), ['TELECOM_NATIVE_TEST_CONTAINER'])
    const before = s.calls.length
    await assert.rejects(f.restart('c'.repeat(64)), closedError('ARGUMENTS_REJECTED'))
    await assert.rejects(f.close({ container: 'c'.repeat(64) }), closedError('ARGUMENTS_REJECTED'))
    assert.equal(s.calls.length, before)
  } finally { await f.close() }
  assert.ok(!existsSync(s.config))
})
test('restart and concurrent idempotent closes serialize on the same resource', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1()
  process.env.DOCKER_HOST = 'ssh://' + privateMarker
  await Promise.all([f.restart(), f.close(), f.close()])
  assert.deepEqual(s.mutations.slice(-3), ['restart', 'remove-container', 'remove-volume'])
  const before = s.calls.length
  await assert.rejects(f.restart(), closedError('CLOSED')); await f.close()
  assert.equal(s.calls.length, before); assert.ok(!existsSync(s.config))
})
test('foreign volume ownership prevents both restart and the first removal', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1(), original = s.volume.Labels[ownerKey]
  try {
    s.volume.Labels[ownerKey] = 'foreign'; const before = s.mutations.length
    await assert.rejects(f.restart(), closedError('OWNERSHIP_REJECTED'))
    await assert.rejects(f.close(), closedError('OWNERSHIP_REJECTED'))
    assert.equal(s.mutations.length, before)
  } finally { s.volume.Labels[ownerKey] = original; await f.close() }
})
test('same-name replacement and image drift never redirect restart or close', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1(), original = structuredClone(s.container)
  try {
    s.container.Id = 'c'.repeat(64); const before = s.mutations.length
    await assert.rejects(f.restart(), closedError('OWNERSHIP_REJECTED'))
    s.container = structuredClone(original); s.container.Image = 'sha256:' + 'd'.repeat(64)
    await assert.rejects(f.close(), closedError('IDENTITY_REJECTED'))
    assert.equal(s.mutations.length, before)
  } finally { s.container = original; await f.close() }
})
test('privileged or exposed resource drift is refused without mutation', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1()
  try {
    s.container.HostConfig.Privileged = true; const before = s.mutations.length
    await assert.rejects(f.restart(), closedError('OWNERSHIP_REJECTED'))
    s.container.HostConfig.Privileged = false; s.container.HostConfig.PortBindings = { '5432/tcp': [{ HostPort: '5432' }] }
    await assert.rejects(f.close(), closedError('OWNERSHIP_REJECTED'))
    assert.equal(s.mutations.length, before)
  } finally { s.container.HostConfig.PortBindings = {}; await f.close() }
})
test('same storage and strictly later postmaster are measured rather than assumed', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1()
  try {
    s.noStartChange = true
    await assert.rejects(f.restart(), closedError('RESTART_EVIDENCE_REJECTED'))
    s.noStartChange = false; s.changeSystem = true
    await assert.rejects(f.restart(), closedError('RESTART_EVIDENCE_REJECTED'))
  } finally { await f.close() }
})
test('snapshot extensions and pre-populated databases fail closed and clean only owned resources', async t => {
  const s = engine(t, { extraSnapshot: true })
  await assert.rejects(createDurableNativeFixtureV1(), closedError('SNAPSHOT_REJECTED'))
  assert.equal(s.container, null); assert.equal(s.volume, null); assert.ok(!existsSync(s.config))
  s.extraSnapshot = false; s.nonempty = true
  await assert.rejects(createDurableNativeFixtureV1(), closedError('EMPTY_DATABASE_REQUIRED'))
  assert.equal(s.container, null); assert.equal(s.volume, null); assert.ok(!existsSync(s.config))
})
test('lost creation reply and failed start retain closed errors and verify owned teardown', async t => {
  const s = engine(t, { createReplyLost: true })
  await assert.rejects(createDurableNativeFixtureV1(), closedError('COMMAND_FAILED'))
  assert.equal(s.container, null); assert.equal(s.volume, null); assert.ok(!existsSync(s.config))
  s.createReplyLost = false; s.startFailure = true
  await assert.rejects(createDurableNativeFixtureV1(), closedError('START_UNAVAILABLE'))
  assert.equal(s.container, null); assert.equal(s.volume, null); assert.ok(!existsSync(s.config))
})
test('failed pull emits no provider output, credentials or unsafe cleanup command', async t => {
  const s = engine(t, { pullFailure: true })
  await assert.rejects(createDurableNativeFixtureV1(), closedError('IMAGE_PULL_UNAVAILABLE'))
  assert.equal(s.mutations.length, 0); assert.ok(!existsSync(s.config))
})
test('close refuses a shared volume instead of forcing removal and can retry safely', async t => {
  const s = engine(t), f = await createDurableNativeFixtureV1()
  s.refuseVolume = true
  await assert.rejects(f.close(), closedError('VOLUME_CLOSE_FAILED'))
  assert.equal(s.container, null); assert.ok(s.volume)
  s.refuseVolume = false; await f.close(); await f.close()
  assert.equal(s.volume, null); assert.ok(!existsSync(s.config))
})

test('native own resource, independent consumer sessions, persisted storage, actual restart and teardown', { skip: process.env.RUN_NATIVE_RESOURCE_PROOF !== 'true' }, async () => {
  const fixture = await createDurableNativeFixtureV1()
  const container = fixture.environment.TELECOM_NATIVE_TEST_CONTAINER
  let volume, first, second
  const oldBinding = process.env.TELECOM_NATIVE_TEST_CONTAINER
  const safeDocker = args => {
    try { return childProcess.execFileSync('docker', ['--host', 'unix:///var/run/docker.sock', ...args], { encoding: 'utf8', timeout: 10000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim() }
    catch { throw Error('NATIVE_RESOURCE_PROOF_QUERY_FAILED') }
  }
  const query = sql => safeDocker(['exec', '-u', 'postgres', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'telecom_test', '-c', sql])
  const privateJson = value => { try { return JSON.parse(value) } catch { throw Error('NATIVE_RESOURCE_PROOF_INSPECTION_FAILED') } }
  const observation = () => privateJson(query("select json_build_object('system',system_identifier::text,'started',floor(extract(epoch from pg_postmaster_start_time())*1000)::bigint,'database',current_database()) from pg_control_system();"))
  try {
    const metadata = privateJson(safeDocker(['container', 'inspect', container]))[0]
    volume = metadata.Mounts[0].Name
    assert.ok(metadata.Id === container && metadata.Config.Image === NATIVE_POSTGRES_OFFICIAL_IMAGE, 'EXACT_PINNED_OWN_RESOURCE')
    assert.ok(metadata.HostConfig.NetworkMode === 'none' && !Object.keys(metadata.HostConfig.PortBindings ?? {}).length, 'NO_PUBLISHED_NETWORK')
    assert.ok(query("select count(*) from pg_class where relnamespace='public'::regnamespace;") === '0', 'EMPTY_TELECOM_DATABASE')
    process.env.TELECOM_NATIVE_TEST_CONTAINER = container
    first = await openPersistentNativeFixtureSessionV1(); second = await openPersistentNativeFixtureSessionV1()
    assert.ok(first.backend > 0 && second.backend > 0 && first.backend !== second.backend, 'ACTUAL_INDEPENDENT_CONSUMER_BACKENDS')
    assert.ok(await first.query('select 1;') === '1' && await second.query('select 1;') === '1', 'ACTUAL_ADMITTED_CONNECTION_READS')
    await first.close(); await second.close(); first = second = null
    if (oldBinding === undefined) delete process.env.TELECOM_NATIVE_TEST_CONTAINER; else process.env.TELECOM_NATIVE_TEST_CONTAINER = oldBinding
    await assert.rejects(fixture.restart('0'.repeat(64)), closedError('ARGUMENTS_REJECTED'))
    query("create table public.w5_resource_probe (id integer primary key, value text not null);insert into public.w5_resource_probe values (1,'synthetic-only');")
    const before = observation()
    await fixture.restart()
    const after = observation(), retained = privateJson(safeDocker(['container', 'inspect', container]))[0]
    assert.ok(before.database === 'telecom_test' && after.database === 'telecom_test', 'SAME_DATABASE')
    assert.ok(before.system === after.system && after.started > before.started, 'SAME_CLUSTER_ACTUAL_LATER_POSTMASTER')
    assert.ok(metadata.Id === retained.Id && metadata.Created === retained.Created && retained.Mounts[0].Name === volume, 'SAME_CONTAINER_AND_STORAGE')
    assert.ok(query("select count(*) from public.w5_resource_probe where id=1 and value='synthetic-only';") === '1', 'SYNTHETIC_STORAGE_PERSISTED')
  } finally {
    try { if (first) await first.close(); if (second) await second.close() }
    finally {
      if (oldBinding === undefined) delete process.env.TELECOM_NATIVE_TEST_CONTAINER; else process.env.TELECOM_NATIVE_TEST_CONTAINER = oldBinding
      await fixture.close(); await fixture.close()
    }
  }
  assert.ok(safeDocker(['container', 'ls', '-a', '-q', '--filter', 'id=' + container]) === '', 'OWN_CONTAINER_REMOVAL_CONFIRMED')
  assert.ok(safeDocker(['volume', 'ls', '--filter', 'name=^' + volume + '$', '--format', '{{.Name}}']) === '', 'OWN_VOLUME_REMOVAL_CONFIRMED')
  console.log(JSON.stringify({ contract, scope: 'RESOURCE_ONLY_NOT_BUSINESS_DURABILITY', result: 'PASS', independent_connections: 2, same_cluster_restart: 'PASS', storage: 'PASS_SYNTHETIC_PROBE', teardown: 'PASS', full23: 'NOT_RUN', business_ai_writes: 'OFF' }))
})
