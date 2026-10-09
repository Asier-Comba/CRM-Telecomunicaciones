import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSemanticReadPlan, type SemanticReadNode } from '../../src/assistant/semantic-read-plan.ts'

export const lookupNode: SemanticReadNode = {
  id: 'lookup', capability: 'crm.customer.search', arguments: { query: 'ACME', limit: 10, continuation: null },
  dependsOn: [], entityBinding: [], resultAlias: 'customers', groundingPurpose: 'lookup',
}
export const dependentNode: SemanticReadNode = {
  id: 'renewals', capability: 'crm.renewal.list', arguments: { limit: 10, continuation: null, from: '2026-09-01', to: '2026-09-30' },
  dependsOn: ['lookup'], entityBinding: [{ targetField: 'customer_id', source: { type: 'node', nodeId: 'lookup' } }],
  resultAlias: 'renewals', groundingPurpose: 'follow_up',
}
test('closed semantic read DAG accepts typed prerequisite bindings and detached copy', () => {
  const input = { version: 1, nodes: [structuredClone(lookupNode), structuredClone(dependentNode)] }
  const plan = parseSemanticReadPlan(input)
  assert.ok(plan)
  input.nodes[0]!.arguments.query = 'changed'
  assert.equal(plan.nodes[0]!.arguments.query, 'ACME')
})
test('semantic read DAG rejects writes, forged IDs, aliases, cycles, raw cursors and wrong entity kinds', () => {
  const invalid = [
    [lookupNode, { ...dependentNode, capability: 'crm.task.create' }],
    [lookupNode, { ...dependentNode, resultAlias: lookupNode.resultAlias }],
    [{ ...lookupNode, dependsOn: ['renewals'] }, dependentNode],
    [lookupNode, { ...dependentNode, dependsOn: [] }],
    [{ ...lookupNode, dependsOn: new Array(1) }],
    [{ ...lookupNode, arguments: { ...lookupNode.arguments, assigned_user_id: 'forged_user_id_1234' } }],
    [{ ...lookupNode, arguments: { ...lookupNode.arguments, continuation: 'cursor_opaque_1234567' } }],
    [lookupNode, { ...dependentNode, capability: 'crm.line.list', arguments: { limit: 10, continuation: null }, entityBinding: [{ targetField: 'service_id', source: { type: 'node', nodeId: 'lookup' } }] }],
    [{ ...lookupNode, http: 'https://invalid.example' }],
    Array.from({ length: 9 }, (_, i) => ({ ...lookupNode, id: `n${i}`, resultAlias: `r${i}` })),
    [{ ...lookupNode, arguments: { ...lookupNode.arguments, query: 'x'.repeat(17000) } }],
  ]
  for (const nodes of invalid) assert.equal(parseSemanticReadPlan({ version: 1, nodes }), null)
})
test('read plan never invokes accessors from untrusted structured values', () => {
  let invoked = false
  const bad = { ...lookupNode, arguments: { get query() { invoked = true; return 'ACME' }, limit: 10, continuation: null } }
  assert.equal(parseSemanticReadPlan({ version: 1, nodes: [bad] }), null)
  assert.equal(invoked, false)
})
