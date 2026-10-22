import childProcess from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, lstatSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { acquireNativeImageV1 } from '../security/native-postgres/expected-image.mjs'
import { nativeResourceQueryFailureCategory } from './native-resource-query-error.mjs'

const contract = 'telecom.native-resource.v1'
const label = 'telecom.native-resource'
const ownerLabel = 'telecom.native-resource-owner'
const idPattern = /^[0-9a-f]{64}$/
const imagePattern = /^sha256:[0-9a-f]{64}$/
const fail = code => new Error('NATIVE_RESOURCE_' + code)
const localEndpoint = value => value === 'unix:///var/run/docker.sock' || /^npipe:\/\/\/\/\.\/pipe\/(docker_engine|dockerDesktopLinuxEngine)$/.test(value)
const snapshotSql = "select json_build_object('system',system_identifier::text,'started',floor(extract(epoch from pg_postmaster_start_time())*1000)::bigint,'database',current_database(),'publicRelations',(select count(*) from pg_class where relnamespace='public'::regnamespace)) from pg_control_system();"
function pullFailure(error) {
  try {
    if (error?.code === 'ENOBUFS') return fail('IMAGE_PULL_OUTPUT_LIMIT')
    if (error?.code === 'ETIMEDOUT') return fail('IMAGE_PULL_TIMEOUT')
    const text = (typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '').slice(0, 65536)
    if (/toomanyrequests|rate.?limit|\b429\b/i.test(text)) return fail('IMAGE_PULL_RATE_LIMITED')
    if (/x509|certificate|\btls\b/i.test(text)) return fail('IMAGE_PULL_TLS_FAILED')
    if (/unauthorized|authentication required|error getting credentials|\b401\b/i.test(text)) return fail('IMAGE_PULL_AUTH_UNAVAILABLE')
    if (/manifest unknown|not found|\b404\b/i.test(text)) return fail('IMAGE_PULL_REFERENCE_UNAVAILABLE')
    if (/connection refused|connection reset|no such host|network|timeout|deadline exceeded/i.test(text)) return fail('IMAGE_PULL_NETWORK_UNAVAILABLE')
  } catch { /* Never allow diagnostic parsing to expose a provider error. */ }
  return fail('IMAGE_PULL_UNAVAILABLE')
}

/** Creates only a new CI fixture. No existing-container, connection or SQL input. */
export async function createDurableNativeFixtureV1(...argumentsReceived) {
  if (argumentsReceived.length) throw fail('ARGUMENTS_REJECTED')
  if (process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true' || process.env.TELECOM_NATIVE_RESOURCE_DISPOSABLE !== 'true') throw fail('DISPOSABLE_CI_REQUIRED')
  if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production' || process.env.ALLOW_PRODUCTION_TESTS === 'true') throw fail('PRODUCTION_DENIED')
  if (process.env.TELECOM_NATIVE_TEST_CONTAINER) throw fail('EXISTING_BINDING_REJECTED')
  if (process.env.DOCKER_CONTEXT && process.env.DOCKER_CONTEXT !== 'default') throw fail('REMOTE_CONTEXT_REJECTED')
  const endpoint = process.env.DOCKER_HOST || (process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock')
  if (!localEndpoint(endpoint)) throw fail('REMOTE_ENDPOINT_REJECTED')

  let temporaryRoot, configDirectory, configIdentity
  try {
    temporaryRoot = realpathSync(tmpdir())
    configDirectory = mkdtempSync(join(temporaryRoot, 'telecom-native-docker-'))
    configIdentity = lstatSync(configDirectory)
  } catch { throw fail('PRIVATE_CONFIGURATION_UNAVAILABLE') }
  const environment = {}
  for (const key of ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE']) {
    if (process.env[key] !== undefined) environment[key] = process.env[key]
  }
  // Private empty Docker configuration: no registry login or personal context.
  Object.assign(environment, { DOCKER_HOST: endpoint, DOCKER_CONTEXT: '', DOCKER_TLS_VERIFY: '', DOCKER_CERT_PATH: '' })
  const token = randomBytes(24).toString('hex')
  const name = 'telecom-native-resource-' + token
  const volume = 'telecom-native-data-' + token
  let container, containerIdentity, volumeIdentity, initialSnapshot, image
  let volumeAttempted = false, containerAttempted = false, closed = false
  let queue = Promise.resolve()

  function docker(args, code = 'COMMAND_FAILED', timeout = 10000) {
    try {
      return childProcess.execFileSync('docker', ['--config', configDirectory, '--host', endpoint, ...args], {
        env: environment, encoding: 'utf8', timeout, maxBuffer: 65536,
        windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    } catch (error) {
      if (code === 'IMAGE_PULL_UNAVAILABLE') throw pullFailure(error)
      throw fail(code === 'QUERY_UNAVAILABLE' ? 'QUERY_' + nativeResourceQueryFailureCategory(error) : code)
    }
  }
  function json(args) {
    try { return JSON.parse(docker(args)) } catch { throw fail('INSPECTION_UNAVAILABLE') }
  }
  function verifyVolume() {
    const records = json(['volume', 'inspect', volume])
    const v = Array.isArray(records) && records.length === 1 ? records[0] : null
    if (!v || v.Name !== volume || v.Driver !== 'local' || v.Labels?.[label] !== contract || v.Labels?.[ownerLabel] !== token || !v.CreatedAt || !v.Mountpoint || Object.keys(v.Options ?? {}).length) throw fail('OWNERSHIP_REJECTED')
    if (volumeIdentity && (v.CreatedAt !== volumeIdentity.created || v.Mountpoint !== volumeIdentity.mountpoint)) throw fail('IDENTITY_REJECTED')
    volumeIdentity ??= { created: v.CreatedAt, mountpoint: v.Mountpoint }
  }
  function verifyContainer() {
    if (!idPattern.test(container ?? '')) throw fail('IDENTITY_REJECTED')
    const records = json(['container', 'inspect', container])
    const c = Array.isArray(records) && records.length === 1 ? records[0] : null
    const mount = c?.Mounts?.length === 1 ? c.Mounts[0] : null
    if (!c || c.Id !== container || c.Name !== '/' + name || typeof c.Created !== 'string' || !Number.isFinite(Date.parse(c.Created)) || c.Config?.Image !== image || !imagePattern.test(c.Image ?? '') || c.Config?.Labels?.[label] !== contract || c.Config?.Labels?.[ownerLabel] !== token || c.HostConfig?.NetworkMode !== 'none' || c.HostConfig?.Privileged !== false || c.HostConfig?.PidMode !== '' || Object.keys(c.HostConfig?.PortBindings ?? {}).length || !mount || mount.Type !== 'volume' || mount.Name !== volume || mount.Destination !== '/var/lib/postgresql/data' || mount.RW !== true) throw fail('OWNERSHIP_REJECTED')
    if (containerIdentity && (c.Created !== containerIdentity.created || c.Image !== containerIdentity.image)) throw fail('IDENTITY_REJECTED')
    containerIdentity ??= { created: c.Created, image: c.Image }
    verifyVolume()
  }
  function containerExists() {
    const ids = docker(['container', 'ls', '-a', '-q', '--no-trunc', '--filter', container ? 'id=' + container : 'name=^/' + name + '$'])
    if (!ids) return false
    if (!idPattern.test(ids) || (container && ids !== container)) throw fail('IDENTITY_REJECTED')
    container ??= ids
    return true
  }
  function volumeExists() {
    const names = docker(['volume', 'ls', '--filter', 'name=^' + volume + '$', '--format', '{{.Name}}'])
    if (names && names !== volume) throw fail('IDENTITY_REJECTED')
    return names === volume
  }
  function readSnapshot() {
    let s
    // The entrypoint's temporary initialization postmaster is socket-only.
    // Loopback TCP inside this network-none container admits only final startup.
    const raw = docker(['exec', '-u', 'postgres', container, 'psql', '-h', '127.0.0.1', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'telecom_test', '-c', snapshotSql], 'QUERY_UNAVAILABLE', 5000)
    try { s = JSON.parse(raw) } catch { throw fail('QUERY_RESPONSE_INVALID') }
    if (!s || Object.keys(s).sort().join(',') !== 'database,publicRelations,started,system' || s.database !== 'telecom_test' || !/^[0-9]{1,20}$/.test(s.system) || !Number.isSafeInteger(s.started) || s.started <= 0 || !Number.isSafeInteger(s.publicRelations) || s.publicRelations < 0) throw fail('SNAPSHOT_REJECTED')
    return s
  }
  async function ready() {
    const until = performance.now() + 60000
    let lastCategory = 'UNAVAILABLE'
    while (performance.now() < until) {
      try { return readSnapshot() } catch (error) {
        if (!/^NATIVE_RESOURCE_QUERY_(TIMEOUT|OUTPUT_LIMIT|SQL_FAILED|TRANSPORT_FAILED|CLIENT_UNAVAILABLE|INTERRUPTED|CLIENT_OR_SQL_FAILED|UNAVAILABLE)$/.test(error.message)) throw error
        lastCategory = error.message.slice('NATIVE_RESOURCE_QUERY_'.length)
      }
      await delay(250)
    }
    throw fail('READINESS_TIMEOUT_' + lastCategory)
  }
  function removePrivateConfiguration() {
    try {
      const actual = realpathSync(configDirectory), state = lstatSync(configDirectory)
      if (actual !== resolve(configDirectory) || dirname(actual) !== temporaryRoot || !basename(actual).startsWith('telecom-native-docker-') || state.isSymbolicLink() || !state.isDirectory() || state.dev !== configIdentity.dev || state.ino !== configIdentity.ino) throw fail('CONFIGURATION_CLEANUP_REJECTED')
      rmSync(actual, { recursive: true, force: false })
    } catch { throw fail('CONFIGURATION_CLEANUP_REJECTED') }
  }
  async function teardown() {
    const hasContainer = containerAttempted && containerExists()
    const hasVolume = volumeAttempted && volumeExists()
    // Validate every resource before the first removal, then revalidate at removal.
    if (hasContainer) verifyContainer()
    if (hasVolume) verifyVolume()
    if (hasContainer) {
      verifyContainer()
      docker(['container', 'rm', '--force', container], 'CONTAINER_CLOSE_FAILED')
      if (containerExists()) throw fail('CONTAINER_CLOSE_UNCONFIRMED')
    }
    if (hasVolume) {
      verifyVolume()
      // No force: Docker must refuse a volume used by another container.
      docker(['volume', 'rm', volume], 'VOLUME_CLOSE_FAILED')
      if (volumeExists()) throw fail('VOLUME_CLOSE_UNCONFIRMED')
    }
    removePrivateConfiguration()
    closed = true
  }
  function serial(operation) {
    const result = queue.then(operation)
    queue = result.catch(() => {})
    return result
  }

  try {
    if (docker(['info', '--format', '{{.OSType}}']) !== 'linux') throw fail('LINUX_ENGINE_REQUIRED')
    image = acquireNativeImageV1(reference => docker(['pull', '--quiet', reference], 'IMAGE_PULL_UNAVAILABLE', 120000))
    volumeAttempted = true
    if (docker(['volume', 'create', '--driver', 'local', '--label', label + '=' + contract, '--label', ownerLabel + '=' + token, volume]) !== volume) throw fail('IDENTITY_REJECTED')
    verifyVolume()
    containerAttempted = true
    container = docker(['container', 'create', '--name', name, '--label', label + '=' + contract, '--label', ownerLabel + '=' + token, '--network', 'none', '--mount', 'type=volume,source=' + volume + ',target=/var/lib/postgresql/data', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--env', 'POSTGRES_DB=telecom_test', image])
    verifyContainer()
    docker(['container', 'start', container], 'START_UNAVAILABLE')
    initialSnapshot = await ready()
    verifyContainer()
    if (initialSnapshot.publicRelations !== 0) throw fail('EMPTY_DATABASE_REQUIRED')
  } catch (error) {
    try { await teardown() } catch { throw fail('CREATE_FAILED_CLEANUP_REQUIRED') }
    throw /^NATIVE_RESOURCE_[A-Z_]+$/.test(error?.message ?? '') ? error : fail('CREATE_FAILED')
  }
  return Object.freeze({
    contract,
    environment: Object.freeze({ TELECOM_NATIVE_TEST_CONTAINER: container }),
    restart(...args) {
      if (args.length) return Promise.reject(fail('ARGUMENTS_REJECTED'))
      return serial(async () => {
        if (closed) throw fail('CLOSED')
        verifyContainer()
        const before = readSnapshot()
        if (before.system !== initialSnapshot.system) throw fail('STORAGE_IDENTITY_REJECTED')
        docker(['container', 'restart', container], 'RESTART_UNAVAILABLE', 30000)
        const after = await ready()
        verifyContainer()
        if (after.system !== before.system || after.started <= before.started) throw fail('RESTART_EVIDENCE_REJECTED')
      })
    },
    close(...args) {
      if (args.length) return Promise.reject(fail('ARGUMENTS_REJECTED'))
      return serial(async () => { if (!closed) await teardown() })
    },
  })
}
