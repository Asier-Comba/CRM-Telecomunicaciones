import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createActiveTenantCache,
  parseTenantCacheKey,
  readTenantCache,
  transitionTenantCache,
  type TenantCacheKey,
} from './w2-tenant-cache.ts'
import type {
  ProtectedRequestRef,
  TenantEpoch,
} from './w2-tenant-boundary.ts'

const epochA = 'epoch_a' as TenantEpoch
const epochB = 'epoch_b' as TenantEpoch
const requestA = 'request_a' as ProtectedRequestRef
const requestB = 'request_b' as ProtectedRequestRef

const key = (overrides: Partial<TenantCacheKey> = {}): TenantCacheKey => ({
  tenantEpoch: epochA,
  authenticatedScopeRef: 'scope_a',
  transportContractVersion: 'telecom.v0',
  presentationVersion: 'w2.presentation.v0-candidate',
  resourceKind: 'customer',
  entityRef: 'entity_same',
  projectionRef: 'customer_identity',
  ...overrides,
})

test('cache key parser requires tenant, scope, versions, namespace and projection', () => {
  const parsed = parseTenantCacheKey(key())
  assert.equal(parsed.ok, true)

  for (const invalid of [
    { ...key(), tenantEpoch: '../tenant-b' },
    { ...key(), resourceKind: 'invoice' },
    { ...key(), projectionRef: '' },
    { ...key(), workspaceId: 'caller-chosen' },
    null,
    [],
  ]) {
    assert.equal(parseTenantCacheKey(invalid).ok, false)
  }
})

test('same entity string cannot collide across tenant, namespace or version', () => {
  let state = createActiveTenantCache<string>(epochA)
  const customer = key()
  const contract = key({ resourceKind: 'contract' })
  const nextPresentation = key({ presentationVersion: 'w2.presentation.v1' })

  for (const [requestRef, cacheKey, data] of [
    [requestA, customer, 'customer-data'],
    [requestB, contract, 'contract-data'],
    ['request_c' as ProtectedRequestRef, nextPresentation, 'v1-data'],
  ] as const) {
    state = transitionTenantCache(state, {
      type: 'request_started',
      requestRef,
      key: cacheKey,
    })
    state = transitionTenantCache(state, {
      type: 'response_committed',
      requestRef,
      key: cacheKey,
      data,
    })
  }

  assert.equal(readTenantCache(state, customer), 'customer-data')
  assert.equal(readTenantCache(state, contract), 'contract-data')
  assert.equal(readTenantCache(state, nextPresentation), 'v1-data')
  assert.equal(readTenantCache(state, key({ tenantEpoch: epochB })), null)
})

test('new request for the exact key supersedes the old attempt', () => {
  const cacheKey = key()
  let state = createActiveTenantCache<string>(epochA)
  state = transitionTenantCache(state, {
    type: 'request_started',
    requestRef: requestA,
    key: cacheKey,
  })
  state = transitionTenantCache(state, {
    type: 'request_started',
    requestRef: requestB,
    key: cacheKey,
  })
  state = transitionTenantCache(state, {
    type: 'response_committed',
    requestRef: requestA,
    key: cacheKey,
    data: 'old',
  })
  assert.equal(readTenantCache(state, cacheKey), null)

  state = transitionTenantCache(state, {
    type: 'response_committed',
    requestRef: requestB,
    key: cacheKey,
    data: 'new',
  })
  assert.equal(readTenantCache(state, cacheKey), 'new')
})

test('purge is a write fence against a response that finished parsing earlier', () => {
  const cacheKey = key()
  let state = createActiveTenantCache<string>(epochA)
  state = transitionTenantCache(state, {
    type: 'request_started',
    requestRef: requestA,
    key: cacheKey,
  })
  state = transitionTenantCache(state, {
    type: 'security_boundary_changed',
    reason: 'workspace_switched',
    nextTenantEpoch: epochB,
  })
  state = transitionTenantCache(state, {
    type: 'response_committed',
    requestRef: requestA,
    key: cacheKey,
    data: 'parsed-before-purge',
  })
  state = transitionTenantCache(state, {
    type: 'access_granted',
    tenantEpoch: epochB,
  })

  assert.equal(state.phase, 'active')
  assert.equal(state.tenantEpoch, epochB)
  assert.deepEqual(state.entries, [])
  assert.equal(readTenantCache(state, cacheKey), null)
})

test('late wrong grant and access-lost grant cannot reactivate cache', () => {
  let switching = transitionTenantCache(createActiveTenantCache(epochA), {
    type: 'security_boundary_changed',
    reason: 'workspace_switched',
    nextTenantEpoch: epochB,
  })
  switching = transitionTenantCache(switching, {
    type: 'access_granted',
    tenantEpoch: epochA,
  })
  assert.equal(switching.phase, 'reauthorizing')

  let revoked = transitionTenantCache(createActiveTenantCache(epochA), {
    type: 'security_boundary_changed',
    reason: 'access_revoked',
  })
  revoked = transitionTenantCache(revoked, {
    type: 'access_granted',
    tenantEpoch: epochA,
  })
  assert.equal(revoked.phase, 'access_lost')
})

test('aborted request and consumed ABA reference never write', () => {
  const cacheKey = key()
  let state = createActiveTenantCache<string>(epochA)
  state = transitionTenantCache(state, {
    type: 'request_started',
    requestRef: requestA,
    key: cacheKey,
  })
  state = transitionTenantCache(state, {
    type: 'request_aborted',
    requestRef: requestA,
  })
  state = transitionTenantCache(state, {
    type: 'request_started',
    requestRef: requestA,
    key: cacheKey,
  })
  state = transitionTenantCache(state, {
    type: 'response_committed',
    requestRef: requestA,
    key: cacheKey,
    data: 'resurrected',
  })

  assert.equal(readTenantCache(state, cacheKey), null)
  assert.deepEqual(state.pending, [])
})
