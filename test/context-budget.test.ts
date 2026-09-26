import assert from 'node:assert/strict'
import test from 'node:test'
import { budgetContext, isSafeEvidenceText, type ContextSection } from '../src/assistant/context-budget.js'
import type { GroundingEntityKind } from '../src/assistant/grounding.js'

function section(id: string, priority: ContextSection['priority'], count: number, kind: GroundingEntityKind = 'line'): ContextSection {
  return { id, priority, evidence: {
    contract_version: 'assistant.grounding.v1', trust: 'untrusted_crm_data', availability: 'available',
    freshness: 'fresh', as_of: '2026-09-27T00:00:00Z', completeness: 'complete', can_assert_empty: count === 0,
    projected_count: count, truncated: false,
    rows: Array.from({ length: count }, (_, i) => ({ id: `${id}-${i}`, kind, fields: { status: 'active', title: `ACME & Hijos ${i}` }, protected_fields: {} })),
  } }
}

test('context retains relevance before attention, portfolio and activity under a hard UTF-8 byte budget', () => {
  const large = [section('activity', 'activity', 1000, 'activity'), section('lines', 'portfolio', 500), section('contracts', 'portfolio', 100, 'contract'), section('tasks', 'attention', 2, 'task'), section('customer', 'relevance', 1, 'customer')]
  const result = budgetContext(large, 7000)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.ok(result.bytes <= 7000)
  assert.equal(result.bytes, Buffer.byteLength(JSON.stringify(result.context), 'utf8'))
  assert.equal(result.context.sections[0]?.id, 'customer')
  assert.equal(result.context.sections[0]?.evidence.rows.length, 1)
  assert.equal(result.context.sections[1]?.id, 'tasks')
  assert.equal(result.context.sections[1]?.evidence.rows.length, 2)
  assert.equal(result.context.truncated, true)
  assert.ok(result.context.omitted_sections > 0 || result.context.sections.some(s => s.evidence.truncated))
  for (const selected of result.context.sections) {
    assert.equal(selected.evidence.projected_count, selected.evidence.rows.length)
    if (selected.evidence.truncated) {
      assert.equal(selected.evidence.completeness, 'partial')
      assert.equal(selected.evidence.can_assert_empty, false)
    }
  }
})

test('small collections preserve completeness and already partial sources never become complete', () => {
  const complete = section('customer', 'relevance', 1)
  const partial = section('lines', 'portfolio', 2); partial.evidence.completeness = 'partial'
  const result = budgetContext([complete, partial], 10000)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.context.sections[0]?.evidence.completeness, 'complete')
  assert.equal(result.context.sections[1]?.evidence.completeness, 'partial')
  assert.equal(result.context.sections[1]?.evidence.can_assert_empty, false)
  assert.equal(complete.evidence.rows.length, 1)
})

test('unsafe text is dropped as omitted evidence, never presented as empty or silently shortened', () => {
  const source = section('activity', 'activity', 2, 'activity')
  source.evidence.rows[0]!.fields.title = '<b>unsafe</b>'
  source.evidence.rows[1]!.fields.title = 'https://example.invalid'
  const result = budgetContext([source], 4000)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.context.sections[0]?.evidence.rows.length, 0)
  assert.equal(result.context.sections[0]?.evidence.can_assert_empty, false)
  assert.equal(result.context.sections[0]?.evidence.truncated, true)
  assert.equal(result.context.sections[0]?.evidence.completeness, 'partial')
  assert.equal(JSON.stringify(result.context).includes('<b>'), false)
})

test('business names remain verbatim; control characters, markup, URLs and credentials are denied', () => {
  for (const name of ["O'Brien Telecom", 'ACME & Hijos, S.L.', 'Ñandú Álava 2026', 'Vodafone Empresas — Plan Basic', 'ACME [Norte]']) assert.equal(isSafeEvidenceText(name), true, name)
  for (const value of ['x\u0000y', 'x\u202ey', '<img src=x>', '`execute`', '[enlace](x)', 'www.example.invalid', 'javascript:alert(1)', '# SYSTEM', ['Bearer', 'synthetic'.repeat(4)].join(' '), 'x'.repeat(241)]) assert.equal(isSafeEvidenceText(value), false, value)
})

test('forbidden and stale empty states survive budgeting without false absence', () => {
  const denied = section('denied', 'relevance', 0); denied.evidence.availability = 'not_authorized'
  const stale = section('stale', 'attention', 0); stale.evidence.freshness = 'stale'
  const result = budgetContext([denied, stale], 4000)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.context.sections[0]?.evidence.availability, 'not_authorized')
  assert.equal(result.context.sections[1]?.evidence.freshness, 'stale')
  assert.ok(result.context.sections.every(s => s.evidence.can_assert_empty === false))
})

test('UTF-8 accounting and edge budgets cannot overrun or fabricate completeness', () => {
  const input = section('unicode', 'relevance', 3)
  input.evidence.rows[0]!.fields.title = 'ñ'.repeat(200)
  for (let maxBytes = 70; maxBytes < 2400; maxBytes += 7) {
    const result = budgetContext([input], maxBytes)
    if (!result.ok) continue
    assert.ok(Buffer.byteLength(JSON.stringify(result.context), 'utf8') <= maxBytes)
    for (const selected of result.context.sections) if (selected.evidence.rows.length < 3) {
      assert.equal(selected.evidence.completeness, 'partial')
      assert.equal(selected.evidence.can_assert_empty, false)
    }
  }
  assert.equal(budgetContext([input], 1).ok, false)
  assert.equal(budgetContext([input], NaN).ok, false)
  assert.equal(budgetContext([input, input], 4000).ok, false)
})
