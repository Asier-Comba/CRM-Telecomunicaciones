import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isStrictIsoDate,
  isStrictIsoUtcDateTime,
  safelyParseUnknown,
} from './w2-runtime-validation.ts'

test('accepts real calendar dates including a valid leap day', () => {
  for (const value of ['2024-02-29', '2026-01-01', '1999-12-31']) {
    assert.equal(isStrictIsoDate(value), true, value)
  }
})

test('rejects impossible and malformed calendar dates', () => {
  for (const value of [
    '2025-02-29',
    '2026-02-30',
    '2026-02-31',
    '2026-00-10',
    '2026-13-10',
    '2026-01-00',
    '2026-01-32',
    '2026-1-01',
  ]) {
    assert.equal(isStrictIsoDate(value), false, value)
  }
})

test('accepts valid UTC timestamps even when the date is stale', () => {
  for (const value of [
    '2024-02-29T23:59:59Z',
    '2001-01-01T00:00:00.123Z',
  ]) {
    assert.equal(isStrictIsoUtcDateTime(value), true, value)
  }
})

test('rejects impossible dates, malformed timezone and bad offsets', () => {
  for (const value of [
    '2026-02-31T08:00:00Z',
    '2026-13-01T08:00:00Z',
    '2025-02-29T08:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T08:60:00Z',
    '2026-01-01T08:00:60Z',
    '2026-01-01T08:00:00',
    '2026-01-01T08:00:00+25:00',
    '2026-01-01T08:00:00+02:00',
    '2026-01-01 08:00:00Z',
  ]) {
    assert.equal(isStrictIsoUtcDateTime(value), false, value)
  }
})

test('safe parser converts cycles, throwing getters and oversized input to rejects', () => {
  const cyclic: { self?: unknown } = {}
  cyclic.self = cyclic
  const throwing = Object.defineProperty({}, 'value', {
    enumerable: true,
    get() {
      throw new Error('must not escape')
    },
  })

  for (const value of [cyclic, throwing, 'x'.repeat(1024)]) {
    assert.doesNotThrow(() =>
      safelyParseUnknown(
        value,
        () => ({ ok: true, value: 'accepted' }),
        64,
      ),
    )
    assert.equal(
      safelyParseUnknown(
        value,
        () => ({ ok: true, value: 'accepted' }),
        64,
      ).ok,
      false,
    )
  }
})
