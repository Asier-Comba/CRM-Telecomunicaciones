// CI-only replacement for an Actions `services:` PostgreSQL container, whose pull
// cannot fall back when the first official publisher rate-limits the runner IP.
// `start` acquires the pinned index through acquireNativeImageV1 (only
// RATE_LIMITED moves to the second publisher), runs it without network, waits
// for the final postmaster, verifies the effective digest and exports the id.
// `stop` removes only the container this job created. Output: fixed categories.
import childProcess from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { acquireNativeImageV1, isPinnedNativeImageV1 } from './expected-image.mjs'
import { nativeImagePullFailureV1 } from '../../platform/durable-native-fixture.mjs'

const label = 'telecom.ci-native-service=v1'
const fail = code => new Error('NATIVE_CI_SERVICE_' + code)
const docker = (args, code, timeout = 60000) => {
  try { return childProcess.execFileSync('docker', args, { encoding: 'utf8', timeout, maxBuffer: 1 << 20, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim() }
  catch { throw fail(code) }
}

export async function startCiNativeServiceV1(env = process.env) {
  if (env.CI !== 'true' || env.GITHUB_ACTIONS !== 'true' || !env.GITHUB_ENV || !/^\d+$/.test(env.GITHUB_RUN_ID ?? '')) throw fail('CI_REQUIRED')
  if (env.TELECOM_NATIVE_TEST_CONTAINER) throw fail('EXISTING_BINDING_REJECTED')
  const image = acquireNativeImageV1(reference => {
    try { childProcess.execFileSync('docker', ['pull', '--quiet', reference], { encoding: 'utf8', timeout: 120000, maxBuffer: 1 << 20, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }) }
    catch (error) { throw nativeImagePullFailureV1(error) }
  })
  const container = docker(['run', '--detach', '--name', 'telecom-ci-native-' + env.GITHUB_RUN_ID + '-' + (env.GITHUB_RUN_ATTEMPT ?? '1'), '--label', label, '--network', 'none',
    '--env', 'POSTGRES_PASSWORD=synthetic-test-only', image], 'CREATE_FAILED')
  if (!/^[0-9a-f]{64}$/.test(container)) throw fail('CREATE_FAILED')
  const metadata = JSON.parse(docker(['container', 'inspect', container], 'INSPECT_FAILED'))[0]
  const digests = JSON.parse(docker(['image', 'inspect', '--format', '{{json .RepoDigests}}', metadata.Image], 'INSPECT_FAILED'))
  if (metadata.Config.Image !== image || !isPinnedNativeImageV1(image, digests) || metadata.HostConfig.NetworkMode !== 'none') throw fail('EXACT_PINNED_REJECTED')
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if (docker(['exec', '-u', 'postgres', container, 'cat', '/proc/1/comm'], 'NOT_READY', 10000) === 'postgres') {
        docker(['exec', '-u', 'postgres', container, 'pg_isready', '-U', 'postgres'], 'NOT_READY', 10000)
        appendFileSync(env.GITHUB_ENV, 'TELECOM_NATIVE_TEST_CONTAINER=' + container + '\n')
        return { container, image }
      }
    } catch { /* initialising: the entrypoint is still PID 1 or the server is not accepting connections */ }
    await delay(2000)
  }
  throw fail('NOT_READY')
}

export function stopCiNativeServiceV1(env = process.env) {
  const container = env.TELECOM_NATIVE_TEST_CONTAINER
  if (!container) return
  if (!/^[0-9a-f]{64}$/.test(container)) throw fail('BINDING_REJECTED')
  const labels = JSON.parse(docker(['container', 'inspect', '--format', '{{json .Config.Labels}}', container], 'INSPECT_FAILED'))
  if (labels?.['telecom.ci-native-service'] !== 'v1') throw fail('OWNERSHIP_REJECTED')
  docker(['rm', '--force', '--volumes', container], 'REMOVE_FAILED')
}

if (process.argv[1]?.endsWith('ci-service-container.mjs')) {
  const command = process.argv[2]
  try {
    if (command === 'start') { const { image } = await startCiNativeServiceV1(); console.log(JSON.stringify({ contract: 'telecom.ci-native-service.v1', result: 'READY', publisher: image.split('/')[0] })) }
    else if (command === 'stop') { stopCiNativeServiceV1(); console.log(JSON.stringify({ contract: 'telecom.ci-native-service.v1', result: 'REMOVED' })) }
    else throw fail('ARGUMENTS_REJECTED')
  } catch (error) {
    const category = /^NATIVE_(CI_SERVICE|RESOURCE_IMAGE_PULL)_[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'NATIVE_CI_SERVICE_UNAVAILABLE'
    console.error(category); process.exitCode = 1
  }
}
