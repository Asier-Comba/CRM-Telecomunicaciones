import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDataView,
  toLabelledCards,
  type DataViewColumn,
  type DataViewRow,
} from './w2-data-view.ts'
import {
  normalizeCollectionSource,
  type CollectionContinuation,
} from './w2-collection-envelope.ts'

const asOf = '2026-09-26T12:00:00Z'
const columns: readonly DataViewColumn[] = [
  { id: 'customer', label: 'Cliente', isRowHeader: true, critical: true },
  { id: 'status', label: 'Estado', isRowHeader: false, critical: true },
  { id: 'renewal', label: 'Renovación', isRowHeader: false, critical: true },
]
const rows: readonly DataViewRow[] = [
  {
    rowKey: 'row_a',
    cells: {
      customer: 'Empresa sintética',
      status: 'Activa',
      renewal: '2026-10-15',
    },
  },
]

const section = () =>
  normalizeCollectionSource({
    sourceStatus: 'available',
    items: rows,
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })

test('wide table has caption, one row header and named keyboard scroll region', () => {
  const result = createDataView({
    accessibleLabel: 'Contratos del cliente',
    caption: 'Contratos activos y próximos a renovar',
    columns,
    section: section(),
    viewport: 'wide',
    wideOverflow: true,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.model.presentation, 'semantic_table')
  assert.equal(result.model.rowHeaderColumnId, 'customer')
  assert.deepEqual(result.model.horizontalScrollRegion, {
    role: 'region',
    label: 'Contratos del cliente: desplazamiento horizontal',
    keyboardFocusable: true,
  })
})

test('compact cards preserve every label-value association and critical field', () => {
  const result = createDataView({
    accessibleLabel: 'Contratos del cliente',
    caption: 'Contratos activos y próximos a renovar',
    columns,
    section: section(),
    viewport: 'compact',
    wideOverflow: false,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return

  const cards = toLabelledCards(result.model)
  assert.equal(result.model.presentation, 'labelled_cards')
  assert.equal(cards[0].rowHeader, 'Empresa sintética')
  assert.deepEqual(
    cards[0].fields.map(({ label, value, critical }) => ({
      label,
      value,
      critical,
    })),
    [
      { label: 'Cliente', value: 'Empresa sintética', critical: true },
      { label: 'Estado', value: 'Activa', critical: true },
      { label: 'Renovación', value: '2026-10-15', critical: true },
    ],
  )
})

test('load-more exists only for fresh partial data with continuation', () => {
  const partial = normalizeCollectionSource({
    sourceStatus: 'available',
    items: rows,
    completeness: {
      kind: 'partial',
      continuation: 'cursor_next' as CollectionContinuation,
    },
    freshness: { kind: 'fresh', asOf },
  })
  const result = createDataView({
    accessibleLabel: 'Resultados',
    caption: 'Resultados parciales',
    columns,
    section: partial,
    viewport: 'wide',
    wideOverflow: false,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.model.pagination, {
    state: 'more_available',
    continuation: 'cursor_next',
    actionLabel: 'Cargar más',
  })
})

test('unknown continuation, stale and revoked states expose no load action', () => {
  const sections = [
    normalizeCollectionSource({
      sourceStatus: 'available',
      items: rows,
      completeness: { kind: 'partial', continuation: null },
      freshness: { kind: 'fresh', asOf },
    }),
    normalizeCollectionSource({
      sourceStatus: 'available',
      items: rows,
      completeness: {
        kind: 'partial',
        continuation: 'cursor_stale' as CollectionContinuation,
      },
      freshness: { kind: 'stale', asOf, notice: null },
    }),
    normalizeCollectionSource<DataViewRow>({ sourceStatus: 'not_authorized' }),
  ]

  const states = sections.map((dataSection) => {
    const result = createDataView({
      accessibleLabel: 'Resultados',
      caption: 'Resultados protegidos',
      columns,
      section: dataSection,
      viewport: 'wide',
      wideOverflow: false,
    })
    assert.equal(result.ok, true)
    return result.ok ? result.model.pagination.state : 'invalid'
  })
  assert.deepEqual(states, [
    'incomplete_no_action',
    'continuation_expired',
    'unavailable',
  ])
})

test('duplicate keys, missing cells or multiple row headers reject', () => {
  const duplicateRows = normalizeCollectionSource({
    sourceStatus: 'available',
    items: [rows[0], rows[0]],
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })
  const duplicate = createDataView({
    accessibleLabel: 'Resultados',
    caption: 'Resultados',
    columns,
    section: duplicateRows,
    viewport: 'wide',
    wideOverflow: false,
  })
  const badHeaders = createDataView({
    accessibleLabel: 'Resultados',
    caption: 'Resultados',
    columns: columns.map((column) => ({ ...column, isRowHeader: true })),
    section: section(),
    viewport: 'wide',
    wideOverflow: false,
  })

  assert.deepEqual(duplicate, { ok: false, reason: 'duplicate_row_key' })
  assert.deepEqual(badHeaders, { ok: false, reason: 'invalid_structure' })
})
