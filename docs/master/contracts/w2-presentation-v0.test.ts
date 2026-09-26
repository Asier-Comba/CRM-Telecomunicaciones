import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialSectionState,
  isAppRouteDescriptor,
  transitionSection,
  type OpaqueId,
  type SafeUiError,
} from './w2-presentation-v0.ts'

const updatedAt = '2026-09-26T08:00:00Z'
const retryableError: SafeUiError = {
  code: 'temporarily_unavailable',
  message: 'No se ha podido actualizar esta sección.',
  retryable: true,
}

test('initial failure is an error and never a false empty state', () => {
  const next = transitionSection(initialSectionState<string[]>(), {
    type: 'load_failed',
    error: retryableError,
  })

  assert.deepEqual(next, { status: 'error', error: retryableError })
})

test('successful empty result is explicit', () => {
  const next = transitionSection(initialSectionState<string[]>(), {
    type: 'empty_received',
    updatedAt,
  })

  assert.deepEqual(next, { status: 'empty', updatedAt })
})

test('refresh keeps known data visible and marks failure as stale', () => {
  const ready = transitionSection(initialSectionState<string[]>(), {
    type: 'data_received',
    data: ['item-1'],
    updatedAt,
    completeness: { kind: 'complete' },
  })
  const refreshing = transitionSection(ready, { type: 'load_started' })
  const stale = transitionSection(refreshing, {
    type: 'load_failed',
    error: retryableError,
  })

  assert.equal(refreshing.status, 'refreshing')
  assert.deepEqual(stale, {
    status: 'stale',
    data: ['item-1'],
    updatedAt,
    completeness: { kind: 'complete' },
    refreshError: retryableError,
  })
})

test('access revocation discards protected data and remains fail closed', () => {
  const ready = transitionSection(initialSectionState<string[]>(), {
    type: 'data_received',
    data: ['protected-item'],
    updatedAt,
    completeness: { kind: 'complete' },
  })
  const forbidden = transitionSection(ready, { type: 'access_revoked' })
  const attemptedReload = transitionSection(forbidden, {
    type: 'data_received',
    data: ['must-not-return'],
    updatedAt,
    completeness: { kind: 'complete' },
  })

  assert.deepEqual(forbidden, { status: 'forbidden' })
  assert.deepEqual(attemptedReload, { status: 'forbidden' })
})

test('closed route descriptors accept known shapes', () => {
  assert.equal(
    isAppRouteDescriptor({
      kind: 'customer',
      customerId: 'customer-synthetic-1' as OpaqueId,
    }),
    true,
  )
  assert.equal(
    isAppRouteDescriptor({ kind: 'dashboard', queue: 'renewals' }),
    true,
  )
})

test('closed route descriptors reject URLs, extra fields and unknown kinds', () => {
  assert.equal(
    isAppRouteDescriptor({ kind: 'customer', customerId: 'c-1', url: 'https://example.test' }),
    false,
  )
  assert.equal(
    isAppRouteDescriptor({ kind: 'external_url', url: 'https://example.test' }),
    false,
  )
  assert.equal(
    isAppRouteDescriptor({ kind: 'dashboard', queue: 'executive_kpi' }),
    false,
  )
})

test('route descriptor identifiers are bounded opaque references', () => {
  assert.equal(isAppRouteDescriptor({ kind: 'task', taskId: '' }), false)
  assert.equal(
    isAppRouteDescriptor({ kind: 'task', taskId: 'x'.repeat(257) }),
    false,
  )
})

test('route descriptor identifiers reject path, query and control syntax', () => {
  for (const taskId of [
    'task/other',
    '../task',
    'task?workspace=other',
    'task#fragment',
    'task%2Fother',
    'task other',
    'task\nother',
    'task\\other',
  ]) {
    assert.equal(isAppRouteDescriptor({ kind: 'task', taskId }), false, taskId)
  }

  assert.equal(
    isAppRouteDescriptor({
      kind: 'task',
      taskId: '018f2c31-73ef-7f6b-b56a-0242ac120002',
    }),
    true,
  )
})
