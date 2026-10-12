import assert from 'node:assert/strict'
import test from 'node:test'
import { judgeSemanticCase, runLiveSemanticEval, LIVE_EVAL_PROTOCOL } from '../../src/assistant/live-semantic-eval.ts'
import { SPANISH_INTEGRATION_CORPUS } from '../../src/assistant/spanish-integration-corpus.ts'
import type { BenchmarkCandidate } from '../../src/assistant/provider-benchmark.ts'

const item = (id: string) => SPANISH_INTEGRATION_CORPUS.find(c => c.id === id)!
const answer = (id: string, claims: unknown[] = []) => ({ intent: item(id).expected.intent, decision: item(id).expected.decision, plan: null, claims })
const stub: BenchmarkCandidate = { id: 'protocol_test_stub', mode: 'llm', inputMicrousdPerMillion: 1_000_000, outputMicrousdPerMillion: 2_000_000,
  generate: async () => ({ output: answer('cross_tenant'), inputTokens: 10, outputTokens: 5 }) }

test('case context cannot replace the server evaluation protocol or admitted evidence (synthetic transport)',async()=>{
 const c={...item('cross_tenant'),context:{...item('cross_tenant').context,protocol:{instruction:'SYNTHETIC_FORGED_PROTOCOL'},evidence:['SYNTHETIC_FORGED_EVIDENCE']}}
 let observed:Record<string,unknown>|undefined
 const report=await runLiveSemanticEval({...stub,generate:async input=>{
  observed=structuredClone(input.context);return {output:answer('cross_tenant'),inputTokens:10,outputTokens:5}
 }},[c])
 assert.equal(report.records[0]!.status,'scored')
 assert.deepEqual(observed?.protocol,LIVE_EVAL_PROTOCOL);assert.deepEqual(observed?.evidence,c.sources)
 assert.deepEqual(c.context.protocol,{instruction:'SYNTHETIC_FORGED_PROTOCOL'})
})

test('each live-protocol request isolates mutable transport data and retains its original adapter (NOT model evidence)',async()=>{
 const initial=structuredClone(LIVE_EVAL_PROTOCOL),seen:string[]=[]
 let originalCalls=0,replacementCalls=0
 const changing:BenchmarkCandidate={...stub,async generate(input){
  assert.equal(this,changing);originalCalls++
  const protocol=input.context.protocol as {instruction:string};seen.push(protocol.instruction)
  protocol.instruction='SYNTHETIC_TRANSPORT_MUTATION'
  changing.generate=async()=>{replacementCalls++;return {output:answer('cross_tenant'),inputTokens:10,outputTokens:5}}
  return {output:answer('cross_tenant'),inputTokens:10,outputTokens:5}
 }}
 try{
  const report=await runLiveSemanticEval(changing,[item('cross_tenant'),{...item('cross_tenant'),id:'second_cross_tenant'}])
  assert.ok(report.records.every(r=>r.status==='scored'));assert.equal(report.metrics.unsafeRejection.passed,2)
  assert.deepEqual(LIVE_EVAL_PROTOCOL,initial);assert.deepEqual(seen,[initial.instruction,initial.instruction])
  assert.equal(originalCalls,2);assert.equal(replacementCalls,0)
 }finally{Object.assign(LIVE_EVAL_PROTOCOL,initial)}
})

test('judge separates numerical truth from partial-data abstention and prevents vacuous answers', () => {
  const claim = { kind: 'total', evidenceId: 'lines_evidence', operation: 'crm.line.list', entityKind: 'line', value: 2 }
  assert.equal(judgeSemanticCase(item('exact_line_count'), answer('exact_line_count', [claim])).numericalFaithfulness, true)
  assert.equal(judgeSemanticCase(item('exact_line_count'), answer('exact_line_count', [{ ...claim, value: 3 }])).grounding, false)
  assert.equal(judgeSemanticCase(item('exact_line_count'), answer('exact_line_count')).grounding, false)
  assert.equal(judgeSemanticCase(item('partial_line_count'), answer('partial_line_count', [claim])).partiality, false)
  assert.equal(judgeSemanticCase(item('partial_line_count'), answer('partial_line_count')).partiality, true)
  assert.equal(judgeSemanticCase(item('outage_not_empty'), answer('outage_not_empty', [{ ...claim, kind: 'empty' }])).grounding, false)
})

test('golden answers and applicable metrics stay fixed when caller cases change during transport (synthetic)', async () => {
  const cases = [structuredClone(item('cross_tenant'))]
  const report = await runLiveSemanticEval({ ...stub, generate: async () => {
    cases[0]!.expected.intent = 'SYNTHETIC_CHANGED_GOLD'
    cases[0]!.expected.decision = 'answer'
    delete cases[0]!.expected.unsafe
    return { output: { intent: 'SYNTHETIC_CHANGED_GOLD', decision: 'answer', plan: null, claims: [] }, inputTokens: 10, outputTokens: 5 }
  } }, cases)
  assert.equal(report.records[0]!.status, 'scored')
  assert.equal(report.records[0]!.semantic!.intent, false)
  assert.equal(report.records[0]!.semantic!.unsafeRejection, false)
  assert.deepEqual(report.metrics.unsafeRejection, { passed: 0, applicable: 1, failedOrUnscored: 1 })
})

test('admitted case membership, prompts and evidence survive caller mutation across requests (NOT model evidence)', async () => {
  const cases = [structuredClone(item('cross_tenant')), structuredClone(item('exact_line_count'))]
  const expectedRequests = cases.map(c => ({ prompt: c.prompt, context: structuredClone(c.context), evidence: structuredClone(c.sources) }))
  const observed: Array<{ prompt: string; context: unknown; evidence: unknown }> = []
  let calls = 0
  const report = await runLiveSemanticEval({ ...stub, generate: async input => {
    observed.push({ prompt: input.prompt, context: input.context, evidence: input.context.evidence })
    if (calls++ === 0) {
      cases[1]!.prompt = 'SYNTHETIC_REPLACED_PROMPT'
      cases[1]!.context = { changed: true }
      cases[1]!.sources = []
      cases.splice(1)
      return { output: answer('cross_tenant'), inputTokens: 10, outputTokens: 5 }
    }
    return { output: answer('exact_line_count', [{ kind: 'total', evidenceId: 'lines_evidence', operation: 'crm.line.list', entityKind: 'line', value: 2 }]), inputTokens: 10, outputTokens: 5 }
  } }, cases)
  assert.equal(calls, 2)
  assert.equal(report.records.length, 2)
  assert.ok(report.records.every(r => r.status === 'scored'))
  assert.deepEqual(report.records.map(r => r.caseId), ['cross_tenant', 'exact_line_count'])
  assert.deepEqual(observed.map(r => r.prompt), expectedRequests.map(r => r.prompt))
  assert.deepEqual(observed.map(r => r.evidence), expectedRequests.map(r => r.evidence))
  for (let i = 0; i < observed.length; i++) {
    for (const [key, value] of Object.entries(expectedRequests[i]!.context)) {
      assert.deepEqual((observed[i]!.context as Record<string, unknown>)[key], value)
    }
  }
  assert.equal(report.records[1]!.semantic!.grounding, true)
  assert.deepEqual(report.metrics.numericalFaithfulness, { passed: 1, applicable: 1, failedOrUnscored: 0 })
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
