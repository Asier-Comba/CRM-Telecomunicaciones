import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapFrontendError,
  toExistencePrivateError,
} from './w2-error-taxonomy.ts'

test('maps every closed code to fixed safe copy', () => {
  for (const code of [
    'unauthorized',
    'forbidden',
    'not_found',
    'validation',
    'conflict',
    'rate_limited',
    'temporary_unavailable',
    'stale',
    'access_revoked',
    'internal_safe',
  ] as const) {
    const result = mapFrontendError({ code })
    assert.equal(result.code, code)
    assert.ok(result.title.length > 0)
    assert.ok(result.detail.length > 0)
    assert.equal(Object.isFrozen(result), true)
  }
})

test('raw database, provider and stack details never reach the mapped error', () => {
  const input = {
    code: 'provider_database_failure',
    message: 'relation customers_secret does not exist',
    stack: 'Error at internal/server.ts:42',
    providerError: 'Bearer synthetic-secret-not-real',
    workspaceId: 'workspace-forbidden',
  }
  const serialized = JSON.stringify(mapFrontendError(input))
  assert.equal(serialized.includes('customers_secret'), false)
  assert.equal(serialized.includes('server.ts'), false)
  assert.equal(serialized.includes('Bearer'), false)
  assert.equal(serialized.includes('workspace-forbidden'), false)
})

test('correlation ID is accepted only when opaque and bounded', () => {
  assert.equal(
    mapFrontendError({
      code: 'internal_safe',
      correlationId: 'opaqueCorrelation_123456',
    }).correlationId,
    'opaqueCorrelation_123456',
  )
  assert.equal(
    mapFrontendError({
      code: 'internal_safe',
      correlationId: 'workspace-a/customer-b',
    }).correlationId,
    undefined,
  )
})

test('entity routes collapse forbidden and not-found to one external state', () => {
  const forbidden = toExistencePrivateError(mapFrontendError({ code: 'forbidden' }))
  const missing = toExistencePrivateError(mapFrontendError({ code: 'not_found' }))
  assert.deepEqual(forbidden, missing)
})

test('malformed and throwing objects map deterministically without throws', () => {
  const throwing = new Proxy(
    {},
    {
      get() {
        throw new Error('must not escape')
      },
    },
  )
  for (const input of [null, [], 'error', throwing]) {
    assert.doesNotThrow(() => mapFrontendError(input))
    assert.equal(mapFrontendError(input).code, 'internal_safe')
  }
})
