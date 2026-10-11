import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreReadPlanV2, type ReadPlanExpectationV2, type ReadNodeExpectationV2 } from '../../src/assistant/evaluation/plan-score-v2.ts'
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
test('213 authored expectations cover32 reads, exact references and closed dependent plans', () => {
  const rows = readFileSync(new URL('../../evals/assistant/product-v2.jsonl', import.meta.url), 'utf8').trim().split('\n').map(line => JSON.parse(line) as ReadPlanExpectationV2)
  assert.equal(rows.length, 213)
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length)
  assert.equal(new Set(rows.map(row => row.text)).size, rows.length)
  const covered = new Set<string>()
  for (const row of rows) {
    const wanted: readonly ReadNodeExpectationV2[] = row.nodes ?? (row.capability ? [{ capability: row.capability, arguments: row.arguments }] : [])
    const nodes = wanted.map((value, index) => {
      covered.add(value.capability)
      return { id: 'step_'+index, capability: value.capability,
        arguments: Object.entries(value.arguments ?? {}).map(([field, value]) => ({ field, value })),
        bindings: (value.bindings ?? []).map(binding => ({ field: binding.field,
          handle: binding.handle ?? null, nodeId: binding.node === undefined ? null : 'step_'+binding.node })) }
    })
    const plan = parseProductReadPlanV2({ version: 2, decision: row.decisions[0], nodes }, row.references ?? [])
    assert.ok(plan, row.id); assert.equal(scoreReadPlanV2(plan, row).argumentCorrect, true, row.id)
  }
  assert.equal(covered.size, 32)
  assert.equal(rows.filter(row => row.category === 'unique_dependency').length, 5)
  assert.equal(rows.filter(row => row.category === 'multiple_entities').length, 5)
  assert.equal(rows.filter(row => row.category === 'rag_gap').length, 5)
})

test('dependent plan scoring compares source identity after harmless node renaming and rejects changed joins', () => {
  const expected: ReadPlanExpectationV2 = { id: 'dependency', text: 'Tarifas de un único operador', decisions: ['plan'], nodes: [
    { capability: 'crm.operator.list', arguments: { status: 'active' } },
    { capability: 'crm.plan.list', bindings: [{ field: 'operator_id', node: 0 }] },
  ] }
  const nodes = [
    { id: 'first', capability: 'crm.operator.list', arguments: [{ field: 'status', value: 'active' }], bindings: [] },
    { id: 'second', capability: 'crm.plan.list', arguments: [], bindings: [{ field: 'operator_id', handle: null, nodeId: 'first' }] },
  ]
  assert.equal(scoreReadPlanV2(parse(nodes), expected).argumentCorrect, true)
  const renamed = structuredClone(nodes); renamed[0].id = 'renamed'; renamed[1].bindings[0].nodeId = 'renamed'
  assert.equal(scoreReadPlanV2(parse(renamed), expected).argumentCorrect, true)
  const unrelated = [...nodes, { id: 'third', capability: 'crm.task.list', arguments: [], bindings: [] }]
  assert.equal(scoreReadPlanV2(parse(unrelated), expected).capabilityCorrect, false)
  const reference = 'ref_other_authorized'
  const switched = [nodes[0], { ...nodes[1], bindings: [{ field: 'operator_id', handle: reference, nodeId: null }] }]
  assert.equal(scoreReadPlanV2(parseProductReadPlanV2({ version: 2, decision: 'plan', nodes: switched }, [reference]), expected).argumentCorrect, false)
})

test('offered reference substitution and extra queries never earn a passing score', () => {
  const expected: ReadPlanExpectationV2 = { id: 'reference', text: 'Contacto del cliente seleccionado', decisions: ['plan'],
    nodes: [{ capability: 'crm.contact.list', bindings: [{ field: 'customer_id', handle: 'selected' }] }] }
  const bound = (handle: string) => ({ id: 'contacts', capability: 'crm.contact.list', arguments: [], bindings: [{ field: 'customer_id', handle, nodeId: null }] })
  const read = (nodes: unknown[]) => parseProductReadPlanV2({ version: 2, decision: 'plan', nodes }, ['selected', 'other'])
  assert.equal(scoreReadPlanV2(read([bound('selected')]), expected).argumentCorrect, true)
  assert.equal(scoreReadPlanV2(read([bound('other')]), expected).argumentCorrect, false)
  assert.equal(scoreReadPlanV2(read([bound('selected'), { ...bound('other'), id: 'extra' }]), expected).capabilityCorrect, false)
  assert.equal(scoreReadPlanV2(read([{ ...bound('selected'), bindings: [] }]), expected).argumentCorrect, false)
})
