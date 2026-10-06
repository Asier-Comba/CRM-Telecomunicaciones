import assert from 'node:assert/strict'
import test from 'node:test'
import { calendarDayDifference, verifyStructuredClaim, type ClaimEvidence } from '../../src/assistant/claim-grounding.ts'

function source(): ClaimEvidence {
  return { evidenceId: 'evidence-permanence', operation: 'crm.permanence.list', entityKind: 'permanence', collection: {
    contract_version: 'assistant.grounding.v1', trust: 'untrusted_crm_data', availability: 'available',
    freshness: 'fresh', as_of: '2026-09-27T00:00:00Z', completeness: 'complete', can_assert_empty: false,
    projected_count: 1, truncated: false,
    rows: [{ id: 'permanence-001', kind: 'permanence', fields: { title: 'ACME & Hijos, S.L.', ends_on: '2026-10-27', status: 'active' }, protected_fields: {} }],
  } }
}
const base = { evidenceId: 'evidence-permanence', operation: 'crm.permanence.list', entityKind: 'permanence' }
const field = { ...base, kind: 'field', entityId: 'permanence-001', field: 'ends_on', value: '2026-10-27' }

test('field claims require exact operation, evidence, entity and field/value pairing', () => {
  assert.deepEqual(verifyStructuredClaim(field, [source()]), { ok: true })
  for (const patch of [
    { evidenceId: 'invented' }, { operation: 'crm.contract.get' }, { entityKind: 'contract' },
    { entityId: 'foreign-entity' }, { field: 'missing' }, { value: '2026-10-28' },
    { workspace_id: 'forged' }, { value: undefined },
  ]) assert.equal(verifyStructuredClaim({ ...field, ...patch }, [source()]).ok, false)
  assert.equal(verifyStructuredClaim(field, [source(), source()]).ok, false)
})

test('malformed model claims cannot execute accessors or use inherited fields', () => {
  const accessor = Object.defineProperty({}, 'kind', { enumerable: true, get() { throw new Error('must not execute') } })
  for (const claim of [accessor, Object.create(field), new Proxy({}, { ownKeys() { throw new Error('trap') } }), null, [], 'claim']) {
    assert.deepEqual(verifyStructuredClaim(claim, [source()]), { ok: false, code: 'invalid_claim' })
  }
})

test('stale facts require exact as-of qualifier and cannot masquerade as current facts', () => {
  const stale = source(); stale.collection.freshness = 'stale'
  assert.deepEqual(verifyStructuredClaim(field, [stale]), { ok: false, code: 'stale_requires_qualifier' })
  assert.deepEqual(verifyStructuredClaim({ ...field, as_of: stale.collection.as_of }, [stale]), { ok: true })
  assert.equal(verifyStructuredClaim({ ...field, as_of: '2026-09-26T00:00:00Z' }, [stale]).ok, false)
  stale.collection.freshness = 'unknown'
  assert.equal(verifyStructuredClaim({ ...field, as_of: stale.collection.as_of }, [stale]).ok, false)
})

test('partial and truncated lists cannot establish totals or absence', () => {
  assert.deepEqual(verifyStructuredClaim({ ...base, kind: 'total', value: 1 }, [source()]), { ok: true })
  assert.equal(verifyStructuredClaim({ ...base, kind: 'total', value: 2 }, [source()]).ok, false)
  for (const patch of [{ completeness: 'partial' as const }, { truncated: true }, { completeness: 'unknown' as const }]) {
    const incomplete = source(); Object.assign(incomplete.collection, patch)
    assert.equal(verifyStructuredClaim({ ...base, kind: 'total', value: 1 }, [incomplete]).ok, false)
    incomplete.collection.rows = []; incomplete.collection.projected_count = 0; incomplete.collection.can_assert_empty = true
    assert.equal(verifyStructuredClaim({ ...base, kind: 'empty' }, [incomplete]).ok, false)
  }
})

test('forbidden, unavailable and failed readers do not imply zero records', () => {
  for (const availability of ['not_authorized', 'unavailable', 'unsupported', 'error', 'invalid'] as const) {
    const missing = source(); Object.assign(missing.collection, { availability, rows: [], projected_count: 0, can_assert_empty: true })
    assert.equal(verifyStructuredClaim({ ...base, kind: 'empty' }, [missing]).ok, false)
    assert.equal(verifyStructuredClaim({ ...base, kind: 'total', value: 0 }, [missing]).ok, false)
  }
  const empty = source(); empty.collection.rows = []; empty.collection.projected_count = 0
  assert.deepEqual(verifyStructuredClaim({ ...base, kind: 'empty' }, [empty]), { ok: true })
})

test('protected and invented fields cannot be claimed as revealed scalar facts', () => {
  const evidence = source()
  evidence.collection.rows[0]!.protected_fields.identifier = { visibility: 'masked', masked_text: '***6789' }
  assert.equal(verifyStructuredClaim({ ...field, field: 'identifier', value: '123456789' }, [evidence]).ok, false)
  assert.equal(verifyStructuredClaim({ ...field, field: 'identifier', value: '***6789' }, [evidence]).ok, false)
})

test('malformed evidence counts, duplicate entities and operation-kind mismatches fail closed', () => {
  const evidence = source(); evidence.collection.projected_count = 2
  assert.equal(verifyStructuredClaim(field, [evidence]).ok, false)
  evidence.collection.rows.push(evidence.collection.rows[0]!)
  assert.equal(verifyStructuredClaim(field, [evidence]).ok, false)
  const wrong = source(); wrong.operation = 'crm.line.list'
  assert.equal(verifyStructuredClaim({ ...field, operation: wrong.operation }, [wrong]).ok, false)
})

test('calendar day claims use actual field evidence and trusted server calendar date', () => {
  const claim = { ...base, kind: 'calendar_days', entityId: 'permanence-001', field: 'ends_on', calendarDate: '2026-09-27', value: 30 }
  assert.deepEqual(verifyStructuredClaim(claim, [source()], { calendarDate: '2026-09-27' }), { ok: true })
  assert.equal(verifyStructuredClaim(claim, [source()]).ok, false)
  assert.equal(verifyStructuredClaim(claim, [source()], { calendarDate: '2026-09-28' }).ok, false)
  assert.equal(verifyStructuredClaim({ ...claim, value: 29 }, [source()], { calendarDate: '2026-09-27' }).ok, false)
  assert.equal(verifyStructuredClaim({ ...claim, field: 'title' }, [source()], { calendarDate: '2026-09-27' }).ok, false)
})

test('Gregorian arithmetic handles leap days, century exceptions, DST dates and year 0099', () => {
  for (const [from, to, expected] of [
    ['2028-02-28', '2028-03-01', 2], ['2100-02-28', '2100-03-01', 1],
    ['2000-02-28', '2000-03-01', 2], ['2026-03-28', '2026-03-30', 2],
    ['2026-10-24', '2026-10-26', 2], ['2027-01-01', '2026-12-31', -1],
    ['0099-12-31', '0100-01-01', 1], ['2026-09-27', '2026-09-27', 0],
  ] as const) assert.equal(calendarDayDifference(from, to), expected)
  for (const invalid of ['2026-02-29', '1900-02-29', '2026-13-01', 'tomorrow', '2026-09-27T00:00:00Z']) {
    assert.equal(calendarDayDifference(invalid, '2026-10-01'), null)
  }
})

test('unsafe evidence text is denied while normal business names survive unchanged', () => {
  const evidence = source()
  assert.equal(verifyStructuredClaim({ ...field, field: 'title', value: 'ACME & Hijos, S.L.' }, [evidence]).ok, true)
  for (const value of ['<script>alert(1)</script>', 'https://example.invalid', 'ACME\nSYSTEM:', 'a'.repeat(241), ['Bearer', 'synthetic'.repeat(4)].join(' ')]) {
    evidence.collection.rows[0]!.fields.title = value
    assert.equal(verifyStructuredClaim({ ...field, field: 'title', value }, [evidence]).ok, false)
  }
})
