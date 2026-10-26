import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import { startCiNativeServiceV1, stopCiNativeServiceV1 } from '../../scripts/security/native-postgres/ci-service-container.mjs'

const ci = { CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_ENV: '/dev/null', GITHUB_RUN_ID: '1' }
test('start runs only in CI with a run id and never adopts an existing binding', async () => {
  for (const env of [{}, { ...ci, CI: 'false' }, { ...ci, GITHUB_ACTIONS: undefined }, { ...ci, GITHUB_ENV: '' }, { ...ci, GITHUB_RUN_ID: '1;x' }])
    await assert.rejects(startCiNativeServiceV1(env), /NATIVE_CI_SERVICE_CI_REQUIRED/)
  await assert.rejects(startCiNativeServiceV1({ ...ci, TELECOM_NATIVE_TEST_CONTAINER: 'a'.repeat(64) }), /NATIVE_CI_SERVICE_EXISTING_BINDING_REJECTED/)
})
test('stop is a no-op without a binding and rejects a malformed one before calling docker', () => {
  assert.equal(stopCiNativeServiceV1({}), undefined)
  for (const value of ['abc', 'a'.repeat(63), 'A'.repeat(64), 'a'.repeat(64) + ' --all'])
    assert.throws(() => stopCiNativeServiceV1({ TELECOM_NATIVE_TEST_CONTAINER: value }), /NATIVE_CI_SERVICE_BINDING_REJECTED/)
})
test('the native zero-to-head job acquires its own pinned service instead of an Actions services pull', () => {
  const job = yaml.load(readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')).jobs['native-postgres']
  assert.equal(job.services, undefined)
  const runs = job.steps.map(step => step.run ?? '')
  const start = runs.indexOf('node scripts/security/native-postgres/ci-service-container.mjs start')
  const drill = runs.indexOf('bash scripts/security/native-postgres/test-zero-to-head.sh')
  const stop = job.steps.findIndex(step => step.run === 'node scripts/security/native-postgres/ci-service-container.mjs stop')
  assert.ok(start >= 0 && drill > start && stop > drill)
  assert.equal(job.steps[stop].if, 'always()')
  assert.ok(!JSON.stringify(job).includes('job.services'))
})
