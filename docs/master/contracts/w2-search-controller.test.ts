import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialSearchState,
  parseSearchPagePresentation,
  searchTelemetryProjection,
  transitionSearch,
  W2_SEARCH_PRESENTATION_VERSION,
} from './w2-search-controller.ts'
import type { OpaqueId } from './w2-presentation-v0.ts'
import type {
  ProtectedRequestRef,
  TenantEpoch,
} from './w2-tenant-boundary.ts'

const epochA = 'epoch_a' as TenantEpoch
const epochB = 'epoch_b' as TenantEpoch
const requestA = 'request_a' as ProtectedRequestRef
const requestB = 'request_b' as ProtectedRequestRef

const page = (items: unknown[] = [
  {
    entityRef: 'customer_a' as OpaqueId,
    kind: 'customer',
    label: 'Empresa sintética',
    destination: { kind: 'customer', customerId: 'customer_a' as OpaqueId },
  },
]) => ({
  contractVersion: W2_SEARCH_PRESENTATION_VERSION,
  asOf: '2026-09-26T12:00:00Z',
  items,
  completeness: { kind: 'complete' },
})

const loading = () => {
  let state = transitionSearch(initialSearchState(), { type: 'contract_published' })
  state = transitionSearch(state, { type: 'query_changed', query: '  empresa  ' })
  return transitionSearch(state, {
    type: 'request_started',
    query: 'empresa',
    tenantEpoch: epochA,
    requestRef: requestA,
  })
}

test('search remains unsupported until W1 publishes an adapter contract', () => {
  const state = transitionSearch(initialSearchState(), {
    type: 'query_changed',
    query: 'empresa',
  })
  assert.deepEqual(state, { status: 'unsupported' })
})

test('presentation page parser is closed, bounded and route-safe', () => {
  const valid = parseSearchPagePresentation(page())
  assert.equal(valid.ok, true)

  for (const input of [
    null,
    [],
    { ...page(), workspaceId: 'caller-chosen' },
    page(Array.from({ length: 51 }, (_, index) => ({
      entityRef: `customer_${index}`,
      kind: 'customer',
      label: `Synthetic ${index}`,
      destination: { kind: 'customer', customerId: `customer_${index}` },
    }))),
    page([
      {
        entityRef: 'customer_a',
        kind: 'customer',
        label: 'Empresa',
        destination: { kind: 'customer', customerId: '../tenant-b' },
      },
    ]),
  ]) {
    assert.doesNotThrow(() => parseSearchPagePresentation(input))
    assert.equal(parseSearchPagePresentation(input).ok, false)
  }
})

test('query is trimmed, bounded and never searches one character locally', () => {
  let state = transitionSearch(initialSearchState(), { type: 'contract_published' })
  state = transitionSearch(state, { type: 'query_changed', query: ' a ' })
  assert.deepEqual(state, { status: 'idle', query: '' })
  state = transitionSearch(state, {
    type: 'query_changed',
    query: 'x'.repeat(121),
  })
  assert.deepEqual(state, { status: 'idle', query: '' })
})

test('only matching epoch and request may publish parsed results', () => {
  const current = loading()
  const parsed = parseSearchPagePresentation(page())
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const wrongEpoch = transitionSearch(current, {
    type: 'page_received',
    tenantEpoch: epochB,
    requestRef: requestA,
    page: parsed.value,
  })
  const wrongRequest = transitionSearch(current, {
    type: 'page_received',
    tenantEpoch: epochA,
    requestRef: requestB,
    page: parsed.value,
  })
  const accepted = transitionSearch(current, {
    type: 'page_received',
    tenantEpoch: epochA,
    requestRef: requestA,
    page: parsed.value,
  })

  assert.deepEqual(wrongEpoch, current)
  assert.deepEqual(wrongRequest, current)
  assert.equal(accepted.status, 'ready')
})

test('empty requires complete evidence while partial zero remains partial', () => {
  const complete = parseSearchPagePresentation(page([]))
  const partial = parseSearchPagePresentation({
    ...page([]),
    completeness: { kind: 'partial', continuation: null },
  })
  assert.equal(complete.ok, true)
  assert.equal(partial.ok, true)
  if (!complete.ok || !partial.ok) return

  assert.equal(
    transitionSearch(loading(), {
      type: 'page_received',
      tenantEpoch: epochA,
      requestRef: requestA,
      page: complete.value,
    }).status,
    'empty',
  )
  assert.equal(
    transitionSearch(loading(), {
      type: 'page_received',
      tenantEpoch: epochA,
      requestRef: requestA,
      page: partial.value,
    }).status,
    'partial',
  )
})

test('revocation clears query/results and is absorbing', () => {
  const revoked = transitionSearch(loading(), { type: 'access_revoked' })
  const late = transitionSearch(revoked, {
    type: 'query_changed',
    query: 'tenant anterior',
  })

  assert.deepEqual(revoked, { status: 'access_revoked', query: '' })
  assert.deepEqual(late, revoked)
})

test('browser telemetry never contains the search query', () => {
  const state = loading()
  const telemetry = searchTelemetryProjection(state)
  assert.deepEqual(telemetry, { status: 'loading', query: 'redacted' })
  assert.equal(JSON.stringify(telemetry).includes('empresa'), false)
})
