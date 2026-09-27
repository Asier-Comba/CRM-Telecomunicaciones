import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isStrictCalendarDateV1,
  isStrictInstantV1,
  parseTelecomCollectionV1,
} from '../../src/lib/server/telecom-runtime-v1.ts'
import { AuthorizedTelecomReadServiceV1 } from '../../src/lib/server/telecom-read-service-v1.ts'

test('strict calendar validator rejects rollover and accepts Gregorian leap days', () => {
  for (const value of ['2024-02-29', '2000-02-29', '2026-01-01']) {
    assert.equal(isStrictCalendarDateV1(value), true, value)
  }
  for (const value of [
    '2025-02-29', '1900-02-29', '2026-02-30', '2026-00-10',
    '2026-13-01', '2026-04-31', '2026-01-00', '2026-01-32',
  ]) assert.equal(isStrictCalendarDateV1(value), false, value)
})

test('strict instant validator rejects malformed zones and impossible offsets', () => {
  for (const value of [
    '2024-02-29T00:00:00Z',
    '2026-09-27T12:30:45.123+14:00',
    '2026-09-27T12:30:45-13:45',
  ]) assert.equal(isStrictInstantV1(value), true, value)
  for (const value of [
    '2025-02-29T00:00:00Z',
    '2026-09-27T24:00:00Z',
    '2026-09-27T12:60:00Z',
    '2026-09-27T12:00:60Z',
    '2026-09-27T12:00:00+14:01',
    '2026-09-27T12:00:00+24:00',
    '2026-09-27T12:00:00+1:00',
    '2026-09-27T12:00:00',
  ]) assert.equal(isStrictInstantV1(value), false, value)
})

test('scope revocation after repository await removes protected output', async () => {
  let current = true
  const context = {
    actor_id: '11111111-1111-1111-1111-111111111111',
    workspace_id: '22222222-2222-2222-2222-222222222222',
    principal_kind: 'user',
    scope_epoch: 'scope-epoch-0001',
  }
  const repository = new Proxy({}, {
    get: () => async () => {
      current = false
      return {
        contract_version: 'telecom.v1', scope_epoch: context.scope_epoch,
        source_state: 'available', permission: 'authorized', items: [],
        completeness: { kind: 'complete' }, continuation: null,
        freshness: { kind: 'fresh', as_of: '2026-09-27T12:00:00Z' }, error: null,
      }
    },
  })
  const service = new AuthorizedTelecomReadServiceV1(repository, {
    authorize: async () => true,
    authorizeReference: async () => true,
    authorizeCapability: async () => true,
    isCurrent: () => current,
    now: () => '2026-09-27T12:00:00Z',
  })
  const result = await service.taskList(context, { limit: 20, continuation: null })
  assert.equal(result.source_state, 'error')
  assert.equal(result.error.code, 'access_revoked')
  assert.equal(result.items, null)
})

const parsePolicy = {
  scopeEpoch: 'scope-epoch-0001',
  now: '2026-09-27T12:00:00Z',
  isCurrent: () => true,
  currentNow: () => '2026-09-27T12:00:00Z',
  authorizeReference: async () => true,
  authorizeCapability: async () => true,
}

function validTaskCollection() {
  return {
    contract_version: 'telecom.v1',
    scope_epoch: parsePolicy.scopeEpoch,
    source_state: 'available',
    permission: 'authorized',
    items: [],
    completeness: { kind: 'complete' },
    continuation: null,
    freshness: { kind: 'fresh', as_of: '2026-09-27T12:00:00Z' },
    error: null,
  }
}

test('runtime snapshot rejects cycles, accessors and exotic objects without invoking them', async () => {
  const cyclic = validTaskCollection()
  cyclic.self = cyclic

  let getterCalls = 0
  const accessor = validTaskCollection()
  Object.defineProperty(accessor, 'private_value', {
    enumerable: true,
    get() {
      getterCalls += 1
      throw new Error('must not execute')
    },
  })

  const hostileProxy = new Proxy(validTaskCollection(), {
    getPrototypeOf() { throw new Error('hostile proxy') },
  })

  for (const value of [cyclic, accessor, hostileProxy, new Date()]) {
    const result = await parseTelecomCollectionV1('task.list', value, parsePolicy)
    assert.deepEqual(result, { ok: false, code: 'invalid' })
  }
  assert.equal(getterCalls, 0)
})

test('bounded deterministic runtime fuzz always fails closed without uncaught exceptions', async () => {
  let seed = 0x51f15e
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed
  }
  for (let index = 0; index < 256; index += 1) {
    const envelope = structuredClone(validTaskCollection())
    const choice = next() % 8
    if (choice === 0) envelope[`unknown_${next()}`] = next()
    if (choice === 1) envelope.permission = ['denied', next(), null][next() % 3]
    if (choice === 2) envelope.freshness.as_of = `${next()}-99-99T25:61:61+24:00`
    if (choice === 3) envelope.items = [{ id: String(next()) }]
    if (choice === 4) envelope.completeness = { kind: 'partial', has_more: false }
    if (choice === 5) envelope.continuation = String(next())
    if (choice === 6) envelope.scope_epoch = `foreign-${next()}`
    if (choice === 7) envelope.source_state = { nested: next() }

    const result = await parseTelecomCollectionV1('task.list', envelope, parsePolicy)
    assert.equal(result.ok, false, `case ${index}`)
    assert.match(result.code, /^(invalid|access_revoked)$/)
  }
})

test('runtime parser enforces aggregate string and collection bounds', async () => {
  const oversizedString = validTaskCollection()
  oversizedString.unknown = 'x'.repeat(4_001)
  const oversizedCollection = validTaskCollection()
  oversizedCollection.items = Array.from({ length: 101 }, () => null)

  for (const value of [oversizedString, oversizedCollection]) {
    const result = await parseTelecomCollectionV1('task.list', value, parsePolicy)
    assert.deepEqual(result, { ok: false, code: 'invalid' })
  }
})
