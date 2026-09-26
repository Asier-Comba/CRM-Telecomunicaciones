import test from 'node:test'
import assert from 'node:assert/strict'
import { routeModelV2 } from '../src/assistant/model-routing-v2.js'
const simple = { ambiguity: 1, planNodes: 1, resultRows: 1, resultBytes: 100, summarySections: 0, risk: 'READ' }
test('routing v2 separates exact lookup, ambiguity and large grounded summary', () => {
  assert.equal(routeModelV2(simple)?.lane, 'FAST')
  assert.equal(routeModelV2({ ...simple, ambiguity: 3 })?.lane, 'REASONING')
  assert.equal(routeModelV2({ ...simple, planNodes: 4 })?.lane, 'REASONING')
  assert.equal(routeModelV2({ ...simple, resultRows: 500, summarySections: 6 })?.lane, 'LONG_GROUNDED')
  for (const risk of ['SAFE_WRITE', 'SENSITIVE_WRITE', 'IRREVERSIBLE']) assert.deepEqual(routeModelV2({ ...simple, risk }), { version: 2, lane: 'REASONING', executionAllowed: false, reason: 'write_blocked' })
})
test('routing rejects non-finite, extra prompt content and hostile getters', () => {
  for (const value of [null, [], { ...simple, prompt: 'private' }, { ...simple, resultRows: NaN }, { ...simple, planNodes: 9 }, { ...simple, ambiguity: Infinity }, { ...simple, risk: 'ADMIN' }]) assert.equal(routeModelV2(value), null)
  assert.equal(routeModelV2({ ...simple, get ambiguity() { throw new Error('must_not_execute') } }), null)
})
