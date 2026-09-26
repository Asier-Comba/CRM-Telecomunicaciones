import test from 'node:test'
import assert from 'node:assert/strict'
import { containsTenantSelector, containsHighConfidenceSecret, validateValue } from '../src/assistant/schema.js'
test('recursive guards fail closed on cycles and deep graphs without stack overflow', () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle
  let deep: unknown = 'ordinary'
  for (let index = 0; index < 100; index++) deep = { child: deep }
  for (const input of [cycle, deep, { values: Array(10001).fill('ordinary') }]) {
    assert.equal(containsTenantSelector(input), true)
    assert.equal(containsHighConfidenceSecret(input), true)
    assert.equal(validateValue({ type: 'string', maxLength: 20 }, input).ok, false)
  }
})
test('scanners and serialization do not invoke accessors or toJSON', () => {
  let called = 0
  const getter = { get title() { called++; return 'ordinary' } }
  const customJson = { toJSON() { called++; return 'ordinary' } }
  for (const input of [getter, customJson, Object.create({ inherited: 'data' }), { [Symbol('hidden')]: 'data' }]) {
    assert.equal(containsTenantSelector(input), true)
    assert.equal(containsHighConfidenceSecret(input), true)
    assert.equal(validateValue({ type: 'string', maxLength: 20 }, input).ok, false)
  }
  assert.equal(called, 0)
})
test('tenant keys are case-insensitive while repeated ordinary DTO references remain valid data', () => {
  for (const key of ['WORKSPACE_ID', 'WorkspaceId', 'tenant-id', 'TENANT']) assert.equal(containsTenantSelector({ nested: [{ [key]: 'other' }] }), true)
  const row = { title: 'ACME & Hijos, S.L.', active: true, amount: 120 }
  assert.equal(containsTenantSelector([row, row]), false)
  assert.equal(containsHighConfidenceSecret([row, row]), false)
})
