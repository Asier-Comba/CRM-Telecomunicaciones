import assert from 'node:assert/strict'
import test from 'node:test'

import {
  nextLargeCollectionWindow,
  presentLargeCollection,
} from './w2-large-collection.ts'
import {
  normalizeCollectionSource,
  type CollectionContinuation,
} from './w2-collection-envelope.ts'

const asOf = '2026-09-26T12:00:00Z'
const items = Array.from({ length: 500 }, (_, index) => ({
  id: `synthetic_${index}`,
  label: `Cuenta sintética ${index}`,
}))

test('large complete accounts render a bounded local window with known total', () => {
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items,
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })
  const first = presentLargeCollection(section)
  const second = presentLargeCollection(
    section,
    nextLargeCollectionWindow(first.visibleCount),
  )

  assert.equal(first.visibleItems.length, 25)
  assert.deepEqual(first.total, { kind: 'known', value: 500 })
  assert.deepEqual(first.action, {
    kind: 'show_more_local',
    remainingKnown: 475,
  })
  assert.equal(second.visibleItems.length, 50)
  assert.equal(second.retainTriggerFocus, true)
})

test('DOM rendering remains capped and exposes a virtual window', () => {
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items,
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })
  const model = presentLargeCollection(section, Number.MAX_SAFE_INTEGER)

  assert.equal(model.visibleItems.length, 75)
  assert.equal(model.rendering, 'windowed')
  assert.deepEqual(model.action, { kind: 'virtual_window', nextStart: 75 })
})

test('partial collections never invent a total or false empty state', () => {
  const section = normalizeCollectionSource<{ id: string }>({
    sourceStatus: 'available',
    items: [],
    completeness: { kind: 'partial', continuation: null },
    freshness: { kind: 'fresh', asOf },
  })
  const model = presentLargeCollection(section)

  assert.equal(model.state, 'partial')
  assert.deepEqual(model.total, { kind: 'unknown' })
  assert.deepEqual(model.action, { kind: 'incomplete_no_action' })
})

test('remote continuation appears only after local authorized items are visible', () => {
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items: items.slice(0, 50),
    completeness: {
      kind: 'partial',
      continuation: 'cursor_next' as CollectionContinuation,
    },
    freshness: { kind: 'fresh', asOf },
  })
  const first = presentLargeCollection(section)
  const second = presentLargeCollection(section, 50)

  assert.equal(first.action.kind, 'show_more_local')
  assert.equal(second.action.kind, 'load_more_remote')
  assert.deepEqual(second.total, { kind: 'unknown' })
})

test('stale or unauthorized collections never expose continuation actions', () => {
  const stale = normalizeCollectionSource({
    sourceStatus: 'available',
    items: items.slice(0, 10),
    completeness: {
      kind: 'partial',
      continuation: 'cursor_stale' as CollectionContinuation,
    },
    freshness: { kind: 'stale', asOf, notice: null },
  })
  const denied = normalizeCollectionSource<never>({
    sourceStatus: 'not_authorized',
  })

  assert.deepEqual(presentLargeCollection(stale).action, {
    kind: 'incomplete_no_action',
  })
  assert.deepEqual(presentLargeCollection(denied), {
    state: 'not_authorized',
    visibleItems: [],
    visibleCount: 0,
    total: { kind: 'unknown' },
    action: { kind: 'none' },
    rendering: 'none',
    retainTriggerFocus: false,
  })
})

test('input order remains server-owned and stable across local windows', () => {
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items,
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })
  const model = presentLargeCollection(section, 50)

  assert.deepEqual(
    model.visibleItems.map(({ id }) => id),
    items.slice(0, 50).map(({ id }) => id),
  )
})
