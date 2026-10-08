import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreReadPlanV2, type ReadPlanExpectationV2 } from '../../src/assistant/evaluation/plan-score-v2.ts'
import { parseProductReadPlanV2 } from '../../src/assistant/product-read-plan-v2.ts'
import { readFileSync } from 'node:fs'

const expected = { id: 'active', text: 'Clientes activos', decisions: ['plan'], capability: 'crm.customer.list', arguments: { status: 'active' } }
const node = (arguments_: Record<string, string | number> = { status: 'active' }) => ({ id: 'customers', capability: 'crm.customer.list', arguments: Object.entries(arguments_).map(([field, value]) => ({ field, value })), bindings: [] })
const parse = (nodes: unknown[], decision = 'plan') => parseProductReadPlanV2({ version: 2, decision, nodes }, [])
test('exact semantic score accepts ordering/default page only, rejects additional unrequested filters', () => {
  assert.equal(scoreReadPlanV2(parse([node()]), expected).argumentCorrect, true)
  assert.equal(scoreReadPlanV2(parse([node({ sort: 'id_asc', limit: 100, status: 'active' })]), expected).argumentCorrect, true)
  const wrongArguments: Record<string, string | number>[] = [{ status: 'inactive' }, {}, { status: 'active', limit: 1 }, { status: 'active', source: 'manual' }]
  for (const args of wrongArguments)
    assert.equal(scoreReadPlanV2(parse([node(args)]), expected).argumentCorrect, false)
})
test('a correct node alongside an unrelated read never passes, even with valid runtime plan', () => {
  const plan = parse([node(), { ...node(), id: 'more', capability: 'crm.task.list', arguments: [] }])
  assert.ok(plan); assert.equal(scoreReadPlanV2(plan, expected).capabilityCorrect, false)
  assert.equal(scoreReadPlanV2(plan, expected).argumentCorrect, false)
  assert.equal(scoreReadPlanV2(null, expected).validPlan, false)
})
test('abstention expectations cannot pass merely because one allowed decision accompanies a query', () => {
  const abstain = { id: 'denied', text: 'otro workspace', decisions: ['abstain', 'clarify'] }
  assert.equal(scoreReadPlanV2(parse([], 'abstain'), abstain).argumentCorrect, true)
  assert.equal(scoreReadPlanV2(parse([], 'clarify'), abstain).capabilityCorrect, true)
  assert.equal(scoreReadPlanV2(parse([node()]), abstain).capabilityCorrect, false)
})
test('all authored single-query golden expectations are executable closed contracts or explicit abstentions', () => {
  const rows = readFileSync(new URL('../../evals/assistant/product-v2.jsonl', import.meta.url), 'utf8').trim().split('\n').map(line => JSON.parse(line) as ReadPlanExpectationV2)
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length)
  for (const row of rows) {
    const plan = row.capability ? parse([{ ...node({ ...row.arguments }), capability: row.capability }]) : parse([], row.decisions[0])
    assert.ok(plan, row.id); assert.equal(scoreReadPlanV2(plan, row).argumentCorrect, true, row.id)
  }
})
