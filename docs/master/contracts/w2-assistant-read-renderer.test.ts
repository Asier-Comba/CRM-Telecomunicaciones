import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseAssistantReadResponse,
  toAssistantReadRenderModel,
  type AssistantReadTaxonomy,
} from './w2-assistant-read-renderer.ts'

const taxonomy: AssistantReadTaxonomy = {
  version: 'telecom.taxonomy.v0',
  modules: new Set(['customers']),
  entityTypes: new Set(['customer']),
}

const valid = () => ({
  contractVersion: 1,
  answer: 'Resultado sintético.',
  status: 'SUCCESS',
  grounded: true,
  blocks: {
    table: {
      columns: [
        { key: 'name', label: 'Cliente' },
        { key: 'amount', label: 'Importe', format: 'currency', currency: 'EUR' },
      ],
      rows: [{ name: 'Empresa de ejemplo', amount: 25 }],
      rowIdentity: { key: 'name' },
      truncated: false,
    },
    notice: { code: 'synthetic_result', retryable: false },
    followUps: [
      { label: 'Acotar', prompt: 'Acota el resultado', kind: 'refine' },
    ],
  },
  meta: {
    requestId: 'request_synthetic_001',
    partial: false,
    taxonomyVersion: taxonomy.version,
  },
})

test('validated READ blocks become a text-only render model', () => {
  const parsed = parseAssistantReadResponse(valid(), taxonomy)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const model = toAssistantReadRenderModel(parsed.value)
  assert.equal(model.answerText, 'Resultado sintético.')
  assert.equal(model.table?.rows.length, 1)
  assert.equal(model.followUps?.[0]?.kind, 'refine')
  assert.equal(model.confirmation, null)
})

test('root malformed and extra-field payloads reject without throwing', () => {
  const throwing = new Proxy(
    {},
    { getOwnPropertyDescriptor: () => { throw new Error('raw provider') } },
  )
  for (const input of [
    null,
    [],
    'text',
    { ...valid(), extra: true },
    { ...valid(), contractVersion: 2 },
    { ...valid(), status: 'EXECUTE' },
    { ...valid(), blocks: null },
    { ...valid(), meta: [] },
    throwing,
  ]) {
    assert.doesNotThrow(() => parseAssistantReadResponse(input, taxonomy))
    assert.equal(parseAssistantReadResponse(input, taxonomy).ok, false)
  }
})

test('present-but-invalid optional blocks reject instead of disappearing', () => {
  for (const [name, value] of [
    ['table', null],
    ['notice', false],
    ['followUps', {}],
    ['entities', null],
    ['navigation', false],
    ['confirmation', null],
  ] as const) {
    const input = valid()
    input.blocks = { ...input.blocks, [name]: value } as typeof input.blocks
    assert.equal(parseAssistantReadResponse(input, taxonomy).ok, false, name)
  }
})

test('table parser rejects malformed identity, cells, currency and continuation', () => {
  const invalidTables = [
    { ...valid().blocks.table, columns: [] },
    {
      ...valid().blocks.table,
      columns: [
        { key: 'same', label: 'A' },
        { key: 'same', label: 'B' },
      ],
    },
    {
      ...valid().blocks.table,
      columns: [{ key: 'amount', label: 'Importe', format: 'currency' }],
    },
    { ...valid().blocks.table, rows: [{ name: { nested: true } }] },
    {
      ...valid().blocks.table,
      rows: [{ name: 1 }, { name: '1' }],
      rowIdentity: { key: 'name' },
    },
    { ...valid().blocks.table, truncated: true, continuation: {} },
    {
      ...valid().blocks.table,
      truncated: true,
      continuation: { total: -1 },
    },
  ]

  for (const table of invalidTables) {
    const input = valid()
    input.blocks.table = table as typeof input.blocks.table
    assert.equal(parseAssistantReadResponse(input, taxonomy).ok, false)
  }
})

test('truncated tables require a meaningful bounded continuation', () => {
  const input = valid()
  input.blocks.table = {
    ...input.blocks.table,
    truncated: true,
    continuation: { cursor: 'cursor_opaque', total: 250 },
  } as typeof input.blocks.table

  const parsed = parseAssistantReadResponse(input, taxonomy)
  assert.equal(parsed.ok, true)
})

test('entity and navigation require an exact injected taxonomy', () => {
  const input = valid()
  input.blocks = {
    ...input.blocks,
    entities: [
      { entityType: 'customer', entityId: 'customer_a', label: 'Ejemplo' },
    ],
    navigation: {
      module: 'customers',
      entityType: 'customer',
      entityId: 'customer_a',
      view: 'detail',
    },
  } as typeof input.blocks

  assert.equal(parseAssistantReadResponse(input).ok, false)
  assert.equal(parseAssistantReadResponse(input, taxonomy).ok, true)
  assert.equal(
    parseAssistantReadResponse(
      {
        ...input,
        meta: { ...input.meta, taxonomyVersion: 'wrong' },
      },
      taxonomy,
    ).ok,
    false,
  )
})

test('ungrounded answers cannot carry evidence blocks', () => {
  const input = valid()
  input.grounded = false
  assert.equal(parseAssistantReadResponse(input, taxonomy).ok, false)
})

test('follow-ups remain prompt-only and never accept action semantics', () => {
  const input = valid()
  input.blocks.followUps = [
    { label: 'Ejecutar', prompt: 'Hazlo', kind: 'action' },
  ] as never
  assert.equal(parseAssistantReadResponse(input, taxonomy).ok, false)
})

test('confirmation transport is visible but has no mutation controls', () => {
  const input = valid()
  input.blocks = {
    ...input.blocks,
    confirmation: {
      confirmationId: 'confirmation_opaque_001',
      capability: 'customer_note_write',
      status: 'pending',
      title: 'Confirmación pendiente',
      summary: 'Vista previa sintética.',
      risk: 'safe_write',
      expiresAt: '2026-09-26T13:00:00Z',
      allowedActions: ['confirm', 'cancel'],
    },
  } as typeof input.blocks
  const parsed = parseAssistantReadResponse(input, taxonomy)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const model = toAssistantReadRenderModel(parsed.value)
  assert.equal(model.confirmation?.interaction, 'release_disabled')
  assert.deepEqual(model.confirmation?.actions, [])
  assert.equal('confirmationId' in (model.confirmation ?? {}), false)
})

test('confirmation rejects impossible dates and altered action order', () => {
  for (const confirmation of [
    {
      confirmationId: 'confirmation_opaque_001',
      capability: 'customer_note_write',
      status: 'pending',
      title: 'Confirmación',
      summary: 'Sintética',
      risk: 'safe_write',
      expiresAt: '2026-02-31T13:00:00Z',
      allowedActions: ['confirm', 'cancel'],
    },
    {
      confirmationId: 'confirmation_opaque_001',
      capability: 'customer_note_write',
      status: 'pending',
      title: 'Confirmación',
      summary: 'Sintética',
      risk: 'safe_write',
      expiresAt: '2026-09-26T13:00:00Z',
      allowedActions: ['cancel', 'confirm'],
    },
  ]) {
    const input = valid()
    input.blocks = { ...input.blocks, confirmation } as typeof input.blocks
    assert.equal(parseAssistantReadResponse(input, taxonomy).ok, false)
  }
})

test('secret-shaped material is rejected even inside otherwise valid text', () => {
  for (const answer of [
    'Bearer ABCDEFGHIJKLMNOPQRST',
    'AWS_SECRET_ACCESS_KEY=abcdefghijklmnop',
  ]) {
    assert.equal(
      parseAssistantReadResponse({ ...valid(), answer }, taxonomy).ok,
      false,
    )
  }
})
