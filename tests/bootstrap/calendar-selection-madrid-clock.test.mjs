import assert from 'node:assert/strict'
import test from 'node:test'
import { calendarDate, weekStart } from '../../src/features/product/model.ts'

test('calendar selection fixture date stays in the displayed Madrid week across UTC Sunday midnight and both DST seasons', () => {
  for (const [instant, expected] of [['2026-10-11T22:30:00Z', '2026-10-12'],
    ['2026-03-29T22:30:00Z', '2026-03-30'], ['2026-10-25T23:30:00Z', '2026-10-26']]) {
    const day = calendarDate(instant)
    assert.equal(day, expected)
    assert.equal(weekStart(day), expected)
    assert.notEqual(weekStart(new Date(instant).toISOString().slice(0, 10)), weekStart(day))
  }
})
