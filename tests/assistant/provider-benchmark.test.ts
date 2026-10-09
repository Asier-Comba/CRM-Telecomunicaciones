import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateBenchmark, runBenchmark, type BenchmarkCandidate } from '../../src/assistant/provider-benchmark.ts'
const candidate: BenchmarkCandidate = { id: 'reference_v1', mode: 'reference', inputMicrousdPerMillion: 2_000_000, outputMicrousdPerMillion: 4_000_000, async generate() { return { output: { capability: 'crm.customer.search' }, inputTokens: 10, outputTokens: 5 } } }
const cases = [{ id: 'lookup', prompt: 'Busca ACME', context: {} }]
const judge = () => ({ capability: true, arguments: true, policy: true, grounding: true })
test('reference benchmark records precise usage without claiming an LLM run or exposing payload', async () => {
  const rows = await runBenchmark(candidate, cases, judge)
  assert.equal(rows[0]?.costMicrousd, 40)
  assert.equal(rows[0]?.mode, 'reference')
  assert.equal(rows[0]?.status, 'scored')
  assert.equal(JSON.stringify(rows).includes('ACME'), false)
  assert.equal(JSON.stringify(rows).includes('crm.customer'), false)
  assert.equal(aggregateBenchmark(rows)?.fullPassRate, 1)
  assert.equal(aggregateBenchmark([...rows, { ...rows[0]!, mode: 'llm' }]), null)
})
test('failures, invalid output usage and judge failure cannot inflate scores or leak errors', async () => {
  for (const variant of [
    { generate: async () => { throw new Error('private provider body') } },
    { generate: async () => ({ output: null, inputTokens: NaN, outputTokens: 5 }) },
  ]) {
    const rows = await runBenchmark({ ...candidate, ...variant }, cases, judge)
    assert.equal(aggregateBenchmark(rows)?.fullPassRate, 0)
    assert.equal(aggregateBenchmark(rows)?.usageComplete, false)
    assert.equal(JSON.stringify(rows).includes('private'), false)
  }
  const rows = await runBenchmark(candidate, cases, () => { throw new Error('judge') })
  assert.equal(rows[0]?.status, 'judge_failure')
  assert.equal(aggregateBenchmark(rows)?.fullPassRate, 0)
})
test('benchmark timeout aborts candidate and reports missing usage honestly', async () => {
  let aborted = false
  const rows = await runBenchmark({ ...candidate, generate: (_input, signal) => new Promise(() => { signal.addEventListener('abort', () => { aborted = true }) }) }, cases, judge, 5)
  assert.equal(aborted, true)
  assert.equal(rows[0]?.status, 'timeout')
  assert.equal(rows[0]?.inputTokens, null)
})
test('fallback reporting is measured separately and never includes prompts or provider text', async () => {
  const rows = await runBenchmark({ ...candidate, async generate() { return { output: {}, inputTokens: 20, outputTokens: 7, fallbackUsed: true } } }, cases, judge)
  assert.equal(aggregateBenchmark(rows)?.fallbackRate, 1)
  assert.equal(aggregateBenchmark(rows)?.fallbackReportingComplete, true)
})
