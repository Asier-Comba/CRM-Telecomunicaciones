import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canClaimCollectionEmpty,
  canContinueCollection,
  canShowCollectionTotal,
  hasUsableCollectionData,
  normalizeCollectionSource,
  type CollectionContinuation,
  type CollectionSource,
} from './w2-collection-envelope.ts'
import { mapFrontendError } from './w2-error-taxonomy.ts'

const asOf = '2026-09-26T12:00:00Z'
const cursor = 'next_page_opaque' as CollectionContinuation

test('unsupported, unavailable, denied and error never collapse to empty data', () => {
  const sources: readonly CollectionSource<string>[] = [
    { sourceStatus: 'unsupported', reason: 'contract_not_published' },
    { sourceStatus: 'unavailable', notice: null },
    { sourceStatus: 'not_authorized' },
    {
      sourceStatus: 'error',
      error: mapFrontendError({ code: 'temporary_unavailable' }),
    },
  ]

  for (const source of sources) {
    const section = normalizeCollectionSource(source)
    assert.equal(section.data, null)
    assert.equal(section.completeness, null)
    assert.equal(section.nextCursor, null)
    assert.equal(canClaimCollectionEmpty(section), false)
  }
})

test('only a fresh complete zero-item collection can claim empty', () => {
  const section = normalizeCollectionSource<string>({
    sourceStatus: 'available',
    items: [],
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })

  assert.equal(section.state, 'empty')
  assert.equal(canClaimCollectionEmpty(section), true)
  assert.equal(canShowCollectionTotal(section), true)
})

test('complete data is ready and has a trustworthy total', () => {
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items: ['contract-a'],
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })

  assert.equal(section.state, 'ready')
  assert.equal(hasUsableCollectionData(section), true)
  assert.equal(canShowCollectionTotal(section), true)
  assert.equal(canContinueCollection(section), false)
})

test('partial zero-item data remains partial with or without continuation', () => {
  for (const continuation of [cursor, null] as const) {
    const section = normalizeCollectionSource<string>({
      sourceStatus: 'available',
      items: [],
      completeness: { kind: 'partial', continuation },
      freshness: { kind: 'fresh', asOf },
    })

    assert.equal(section.state, 'partial')
    assert.equal(canClaimCollectionEmpty(section), false)
    assert.equal(canShowCollectionTotal(section), false)
    assert.equal(canContinueCollection(section), continuation !== null)
  }
})

test('stale data remains visible but continuation is never actionable', () => {
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items: ['contract-a'],
    completeness: { kind: 'partial', continuation: cursor },
    freshness: {
      kind: 'stale',
      asOf,
      notice: mapFrontendError({ code: 'stale' }),
    },
  })

  assert.equal(section.state, 'stale')
  assert.equal(hasUsableCollectionData(section), true)
  assert.equal(section.nextCursor, null)
  assert.equal(canContinueCollection(section), false)
  assert.equal(canShowCollectionTotal(section), false)
})

test('invalid freshness and unsafe continuations fail closed', () => {
  const badDate = normalizeCollectionSource({
    sourceStatus: 'available',
    items: ['contract-a'],
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf: '2026-02-31T12:00:00Z' },
  })
  const badCursor = normalizeCollectionSource({
    sourceStatus: 'available',
    items: ['contract-a'],
    completeness: {
      kind: 'partial',
      continuation: '../tenant-b' as CollectionContinuation,
    },
    freshness: { kind: 'fresh', asOf },
  })

  assert.equal(badDate.state, 'error')
  assert.equal(badCursor.state, 'error')
  assert.equal(badDate.data, null)
  assert.equal(badCursor.nextCursor, null)
})

test('normalization detaches collection arrays from caller mutation', () => {
  const items = ['contract-a']
  const section = normalizeCollectionSource({
    sourceStatus: 'available',
    items,
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })
  items.push('contract-b')

  assert.deepEqual(section.data, ['contract-a'])
})
