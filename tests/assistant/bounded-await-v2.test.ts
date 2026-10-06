import test from 'node:test'
import assert from 'node:assert/strict'
import { boundedAwaitV2 } from '../../src/assistant/bounded-await-v2.ts'
test('cancelled authority cannot initiate a repository request', async () => {
  const controller = new AbortController(); controller.abort(); let starts = 0
  await assert.rejects(boundedAwaitV2(async () => { starts++; return 'forged' }, controller.signal), /cancelled/); assert.equal(starts, 0)
})
test('hung repository is unavailable; late rejection is consumed without factual output', async () => {
  let lateReject: (reason: Error) => void = () => {}
  const pending = new Promise<string>((_, reject) => { lateReject = reject })
  await assert.rejects(boundedAwaitV2(() => pending, undefined, 5), /unavailable/)
  lateReject(new Error('synthetic_late_failure'))
})
