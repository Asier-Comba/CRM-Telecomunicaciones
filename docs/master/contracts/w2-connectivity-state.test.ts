import assert from 'node:assert/strict'
import test from 'node:test'

import {
  connectivityPolicy,
  createOnlineConnectivityState,
  transitionConnectivity,
} from './w2-connectivity-state.ts'
import type { TenantEpoch } from './w2-tenant-boundary.ts'

const epochA = 'epoch_a' as TenantEpoch
const epochB = 'epoch_b' as TenantEpoch

test('offline with no authorized snapshot is an explicit empty shell', () => {
  const state = transitionConnectivity(createOnlineConnectivityState(epochA), {
    type: 'went_offline',
  })
  assert.deepEqual(state, { status: 'offline_empty', tenantEpoch: epochA })
  assert.deepEqual(connectivityPolicy(state), {
    showOfflineNotice: true,
    dataIsStale: false,
    readAllowed: false,
    mutationsAllowed: false,
    queueMutations: false,
    persistentTenantCacheAllowed: false,
  })
})

test('offline snapshot remains visible only as stale read-only data', () => {
  let state = createOnlineConnectivityState<{ count: number }>(epochA)
  state = transitionConnectivity(state, {
    type: 'authorized_snapshot_received',
    tenantEpoch: epochA,
    data: { count: 3 },
    asOf: '2026-09-26T12:00:00Z',
  })
  state = transitionConnectivity(state, { type: 'went_offline' })

  assert.equal(state.status, 'offline_with_snapshot')
  assert.deepEqual(connectivityPolicy(state), {
    showOfflineNotice: true,
    dataIsStale: true,
    readAllowed: true,
    mutationsAllowed: false,
    queueMutations: false,
    persistentTenantCacheAllowed: false,
  })
})

test('wrong epoch and impossible snapshot time are rejected', () => {
  const initial = createOnlineConnectivityState<{ count: number }>(epochA)
  const wrongEpoch = transitionConnectivity(initial, {
    type: 'authorized_snapshot_received',
    tenantEpoch: epochB,
    data: { count: 99 },
    asOf: '2026-09-26T12:00:00Z',
  })
  const badDate = transitionConnectivity(initial, {
    type: 'authorized_snapshot_received',
    tenantEpoch: epochA,
    data: { count: 99 },
    asOf: '2026-02-31T12:00:00Z',
  })

  assert.deepEqual(wrongEpoch, initial)
  assert.deepEqual(badDate, initial)
})

test('revocation, logout and workspace switch scrub offline snapshots', () => {
  for (const type of [
    'access_revoked',
    'logout',
    'workspace_switched',
  ] as const) {
    let state = createOnlineConnectivityState<{ secret: string }>(epochA)
    state = transitionConnectivity(state, {
      type: 'authorized_snapshot_received',
      tenantEpoch: epochA,
      data: { secret: 'tenant-a-protected' },
      asOf: '2026-09-26T12:00:00Z',
    })
    state = transitionConnectivity(state, { type: 'went_offline' })
    state = transitionConnectivity(state, { type })

    assert.deepEqual(state, { status: 'access_revoked', tenantEpoch: null })
    assert.equal(JSON.stringify(state).includes('tenant-a-protected'), false)
  }
})

test('coming online keeps stale snapshot only until server refresh replaces it', () => {
  let state = createOnlineConnectivityState<{ count: number }>(epochA)
  state = transitionConnectivity(state, {
    type: 'authorized_snapshot_received',
    tenantEpoch: epochA,
    data: { count: 1 },
    asOf: '2026-09-26T12:00:00Z',
  })
  state = transitionConnectivity(state, { type: 'went_offline' })
  state = transitionConnectivity(state, { type: 'went_online' })
  state = transitionConnectivity(state, {
    type: 'authorized_snapshot_received',
    tenantEpoch: epochA,
    data: { count: 2 },
    asOf: '2026-09-26T12:01:00Z',
  })

  assert.equal(state.status, 'online')
  if (state.status === 'online') {
    assert.deepEqual(state.authorizedSnapshot?.data, { count: 2 })
  }
})
