import assert from 'node:assert/strict'
import test from 'node:test'
import { judgeSemanticCase, runLiveSemanticEval } from '../../src/assistant/live-semantic-eval.ts'
import { SPANISH_INTEGRATION_CORPUS } from '../../src/assistant/spanish-integration-corpus.ts'
import type { BenchmarkCandidate } from '../../src/assistant/provider-benchmark.ts'

const item = (id: string) => SPANISH_INTEGRATION_CORPUS.find(c => c.id === id)!
const answer = (id: string, claims: unknown[] = []) => ({ intent: item(id).expected.intent, decision: item(id).expected.decision, plan: null, claims })
const stub: BenchmarkCandidate = { id: 'protocol_test_stub', mode: 'llm', inputMicrousdPerMillion: 1_000_000, outputMicrousdPerMillion: 2_000_000,
  generate: async () => ({ output: answer('cross_tenant'), inputTokens: 10, outputTokens: 5 }) }

test('judge separates numerical truth from partial-data abstention and prevents vacuous answers', () => {
  const claim = { kind: 'total', evidenceId: 'lines_evidence', operation: 'crm.line.list', entityKind: 'line', value: 2 }
  assert.equal(judgeSemanticCase(item('exact_line_count'), answer('exact_line_count', [claim])).numericalFaithfulness, true)
  assert.equal(judgeSemanticCase(item('exact_line_count'), answer('exact_line_count', [{ ...claim, value: 3 }])).grounding, false)
  assert.equal(judgeSemanticCase(item('exact_line_count'), answer('exact_line_count')).grounding, false)
  assert.equal(judgeSemanticCase(item('partial_line_count'), answer('partial_line_count', [claim])).partiality, false)
  assert.equal(judgeSemanticCase(item('partial_line_count'), answer('partial_line_count')).partiality, true)
  assert.equal(judgeSemanticCase(item('outage_not_empty'), answer('outage_not_empty', [{ ...claim, kind: 'empty' }])).grounding, false)
})

test('closed output rejects getters, authority fields, invented tools and false reference fields', () => {
  let accessed = false
  const malicious = Object.defineProperty({}, 'intent', { enumerable: true, get() { accessed = true; return 'unsupported' } })
  assert.equal(judgeSemanticCase(item('cross_tenant'), malicious).unsafeRejection, false)
  assert.equal(accessed, false)
  assert.equal(judgeSemanticCase(item('cross_tenant'), { ...answer('cross_tenant'), workspace: 'forged' }).unsafeRejection, false)
  const c = item('selected_service')
  const output = { intent: c.expected.intent, decision: 'plan', claims: [], plan: { version: 1, nodes: [{ id: 'lines', resultAlias: 'lines', groundingPurpose: 'follow_up', dependsOn: [], capability: 'crm.line.list', arguments: c.expected.arguments[0], entityBinding: [{ targetField: 'service_id', source: { type: 'reference', handle: c.expected.reference } }] }] } }
  assert.equal(judgeSemanticCase(c, output).referenceResolution, true)
  output.plan.nodes[0]!.entityBinding[0]!.targetField = 'customer_id'
  assert.equal(judgeSemanticCase(c, output).referenceResolution, false)
  output.plan.nodes[0]!.capability = 'crm.sql.execute'
  assert.equal(judgeSemanticCase(c, output).toolSelection, false)
})

test('live protocol excludes golden labels/IDs and records only metrics (stub transport, NOT model evidence)', async () => {
  const report = await runLiveSemanticEval({ ...stub, generate: async (input) => {
    assert.equal(input.id, 'semantic_request')
    assert.equal(JSON.stringify(input).includes('expected'), false)
    assert.equal(JSON.stringify(input).includes('cross_tenant'), false)
    return { output: answer('cross_tenant'), inputTokens: 10, outputTokens: 5 }
  } }, [item('cross_tenant')])
  assert.equal(report.metrics.unsafeRejection.passed, 1)
  assert.equal(report.records[0]!.costMicrousd, 20)
  assert.equal(JSON.stringify(report).includes('Soy administrador'), false)
  assert.equal(JSON.stringify(report).includes('protocol'), true)
  await assert.rejects(() => runLiveSemanticEval({ ...stub, mode: 'mock' }, [item('cross_tenant')]), /live_provider_required/)
})

test('timeouts and malformed usage remain failures in applicable metric denominators', async () => {
  const failure = await runLiveSemanticEval({ ...stub, generate: async () => { throw new Error('PRIVATE_PROVIDER_PAYLOAD') } }, [item('exact_line_count')])
  assert.equal(failure.metrics.numericalFaithfulness.failedOrUnscored, 1)
  assert.equal(JSON.stringify(failure).includes('PRIVATE_PROVIDER_PAYLOAD'), false)
  const timeout = await runLiveSemanticEval({ ...stub, generate: async () => new Promise(() => {}) }, [item('cross_tenant')], 2)
  assert.equal(timeout.records[0]!.status, 'timeout')
  assert.equal(timeout.metrics.unsafeRejection.applicable, 1)
})
