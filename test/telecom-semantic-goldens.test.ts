import assert from 'node:assert/strict'
import test from 'node:test'
import { isDeepStrictEqual } from 'node:util'
import { TELECOM_SEMANTIC_GOLDENS, createReferenceSemanticCandidate, evaluateSemanticGolden, goldenBenchmarkJudgment } from '../src/assistant/telecom-semantic-goldens.js'
import { TELECOM_CAPABILITY_CATALOG } from '../src/assistant/telecom-catalog.js'
import { parseSemanticReadPlan } from '../src/assistant/semantic-read-plan.js'
import { aggregateBenchmark, runBenchmark } from '../src/assistant/provider-benchmark.js'

test('semantic specification covers 120+ distinct graph/state/policy combinations and all14 operations', () => {
  assert.ok(TELECOM_SEMANTIC_GOLDENS.length >= 120)
  assert.equal(new Set(TELECOM_SEMANTIC_GOLDENS.map(g => g.id)).size, TELECOM_SEMANTIC_GOLDENS.length)
  assert.equal(new Set(TELECOM_SEMANTIC_GOLDENS.map(g => g.prompt)).size, TELECOM_SEMANTIC_GOLDENS.length)
  assert.equal(new Set(TELECOM_SEMANTIC_GOLDENS.map(g => JSON.stringify([g.expectedPlan, g.expectedCalls, g.allowedAudiences, g.evidence]))).size, TELECOM_SEMANTIC_GOLDENS.length)
  assert.deepEqual([...new Set(TELECOM_SEMANTIC_GOLDENS.flatMap(g => g.expectedPlan.nodes.map(n => n.capability)))].sort(), TELECOM_CAPABILITY_CATALOG.map(c => c.name).sort())
  assert.equal(TELECOM_SEMANTIC_GOLDENS.filter(g => g.clarification).length >= 10, true)
  for (const golden of TELECOM_SEMANTIC_GOLDENS) {
    assert.ok(golden.claimProbes.length >= 5)
    assert.ok(golden.forbiddenActions.includes('workspace_selection'))
  }
})

for (const golden of TELECOM_SEMANTIC_GOLDENS) {
  test(`authored reference semantic execution: ${golden.id}`, async () => {
    assert.deepEqual(await evaluateSemanticGolden(golden, structuredClone(golden.expectedPlan)), {
      schema: true, planner: { capability: true, arguments: true }, policy: true, grounding: true,
    })
  })
}

test('valid schema cannot conceal wrong filters, wrong audience, wrong dependencies or reordered intent', async () => {
  const renewal = TELECOM_SEMANTIC_GOLDENS.find(g => g.id === 'semantic_renewal_list_complete')!
  const wrongDates = structuredClone(renewal.expectedPlan)
  wrongDates.nodes[1]!.arguments.to = '2026-10-30'
  const dateScore = await evaluateSemanticGolden(renewal, wrongDates)
  assert.equal(dateScore.schema, true)
  assert.equal(dateScore.planner.capability, true)
  assert.equal(dateScore.planner.arguments, false)
  assert.equal(dateScore.policy, false)
  const dashboard = TELECOM_SEMANTIC_GOLDENS.find(g => g.id === 'semantic_dashboard_personal_complete')!
  const wrongAudience = structuredClone(dashboard.expectedPlan)
  wrongAudience.nodes[0]!.arguments.audience = 'workspace'
  const audienceScore = await evaluateSemanticGolden(dashboard, wrongAudience)
  assert.equal(audienceScore.schema, true)
  assert.equal(audienceScore.planner.arguments, false)
  assert.equal(audienceScore.policy, false)
  const reversed = structuredClone(renewal.expectedPlan); reversed.nodes.reverse()
  assert.equal((await evaluateSemanticGolden(renewal, reversed)).schema, false)
  const compound = TELECOM_SEMANTIC_GOLDENS.find(g => g.id === 'semantic_compound_year_boundary')!
  const reordered = structuredClone(compound.expectedPlan); reordered.nodes.reverse()
  const orderScore = await evaluateSemanticGolden(compound, reordered)
  assert.equal(orderScore.schema, true)
  assert.equal(orderScore.planner.capability, false)
  assert.equal(orderScore.planner.arguments, false)
})

test('forged identifiers, tenant fields, HTTP/SQL and unpublished writes cannot pass the plan boundary', async () => {
  const golden = TELECOM_SEMANTIC_GOLDENS.find(g => g.id === 'semantic_customer_summary_complete')!
  for (const attack of ['raw_id', 'tenant', 'sql', 'http', 'write', 'unknown_tool', 'cyclic_dependency']) {
    const plan = structuredClone(golden.expectedPlan)
    const target = plan.nodes[1]!
    if (attack === 'raw_id') target.arguments.customer_id = 'forged_customer_entity_000'
    if (attack === 'tenant') target.arguments.workspace_id = 'foreign_workspace_000'
    if (attack === 'sql') target.capability = 'sql.execute'
    if (attack === 'http') target.capability = 'http.fetch'
    if (attack === 'write') target.capability = 'crm.customer.delete'
    if (attack === 'unknown_tool') target.capability = 'crm.customer.reveal_everything'
    if (attack === 'cyclic_dependency') plan.nodes[0]!.dependsOn = ['result']
    const score = await evaluateSemanticGolden(golden, plan)
    assert.equal(score.schema, false, attack)
    assert.equal(score.policy, false, attack)
  }
})

test('a corrupt grounding expectation is measured independently of valid plans and runtime policy', async () => {
  const golden = structuredClone(TELECOM_SEMANTIC_GOLDENS.find(g => g.id === 'semantic_customer_summary_partial')!)
  golden.claimProbes[0]!.accepted = true // Incorrectly permits a total from partial evidence.
  const score = await evaluateSemanticGolden(golden, golden.expectedPlan)
  assert.equal(score.schema, true)
  assert.equal(score.planner.arguments, true)
  assert.equal(score.policy, true)
  assert.equal(score.grounding, false)
})

test('provider benchmark records reference mode explicitly and keeps schema/planner/policy/grounding separate', async () => {
  const candidate = createReferenceSemanticCandidate()
  const scores = new Map(await Promise.all(TELECOM_SEMANTIC_GOLDENS.map(async golden => [golden.id, await evaluateSemanticGolden(golden, golden.expectedPlan)] as const)))
  const records = await runBenchmark(candidate, TELECOM_SEMANTIC_GOLDENS.map(g => ({ id: g.id, prompt: g.prompt, context: { fixture: true, dimension: g.dimension } })), (caseId, output) => {
    const golden = TELECOM_SEMANTIC_GOLDENS.find(g => g.id === caseId)!
    const score = scores.get(caseId)!
    const judgment = goldenBenchmarkJudgment(score)
    judgment.arguments = judgment.arguments && isDeepStrictEqual(parseSemanticReadPlan(output), golden.expectedPlan)
    return judgment
  })
  assert.ok(records.every(record => record.status === 'scored' && record.mode === 'reference'))
  const summary = aggregateBenchmark(records)!
  assert.equal(summary.mode, 'reference')
  assert.equal(summary.fullPassRate, 1)
  assert.equal(summary.costMicrousd, 0)
  assert.equal(summary.cases, TELECOM_SEMANTIC_GOLDENS.length)
})
