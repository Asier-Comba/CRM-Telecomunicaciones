import assert from 'node:assert/strict'
import test from 'node:test'
import { AuthorizedTelecomReadServiceV1 } from '../../src/lib/server/telecom-read-service-v1.ts'

const context = { actor_id: 'synthetic-actor-A', workspace_id: 'synthetic-workspace-A', principal_kind: 'user', scope_epoch: 'scope-A' }
const envelope = () => ({ contract_version: 'telecom.v1', scope_epoch: 'scope-A', source_state: 'available', permission: 'authorized', items: [], completeness: { kind: 'complete' }, continuation: null, freshness: { kind: 'fresh', as_of: '2026-09-26T00:00:00Z' }, error: null })
function fixture(result) {
  let calls = 0
  const repository = new Proxy({}, { get: () => async () => { calls++; return result } })
  return { service: new AuthorizedTelecomReadServiceV1(repository, { authorize: async () => true }), calls: () => calls }
}

test('W4 reproduction: impossible calendar dates reach repository', async () => {
  for (const date of ['2026-02-30', '2026-99-99', '0000-00-00']) {
    const { service, calls } = fixture(envelope())
    const result = await service.taskList(context, { limit: 20, continuation: null, from: date, to: date })
    assert.equal(result.source_state, 'available')
    assert.equal(calls(), 1)
  }
})

test('W4 reproduction: correctly scoped outer envelope passes different nested scope', async () => {
  const value = { ...envelope(), items: [{ contract_version: 'telecom.v1', scope_epoch: 'scope-B', id: 'synthetic-B-customer' }] }
  const { service } = fixture(value)
  assert.equal((await service.customerSearch(context, { query: 'synthetic', limit: 20, continuation: null })).items[0].scope_epoch, 'scope-B')
})

test('W4 reproduction: repository extra fields and unsafe error detail pass unchanged', async () => {
  const value = { ...envelope(), source_state: 'error', error: { code: 'internal_safe', retryable: false, message: 'SYNTHETIC_PRIVATE_PROVIDER_DETAIL' }, private_internal_field: 'SYNTHETIC_PRIVATE_VALUE' }
  const { service } = fixture(value)
  const result = await service.taskList(context, { limit: 20, continuation: null })
  assert.equal(result.private_internal_field, 'SYNTHETIC_PRIVATE_VALUE')
  assert.equal(result.error.message, 'SYNTHETIC_PRIVATE_PROVIDER_DETAIL')
})

test('W4 positive control: inverted dates do not reach repository', async () => {
  const { service, calls } = fixture(envelope())
  const result = await service.taskList(context, { limit: 20, continuation: null, from: '2026-10-02', to: '2026-10-01' })
  assert.equal(result.error.code, 'validation')
  assert.equal(calls(), 0)
})
