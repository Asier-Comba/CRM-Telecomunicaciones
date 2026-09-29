import assert from 'node:assert/strict'
import test from 'node:test'

import { summarizeEvalRun, type EvalObservation } from '../src/assistant/eval-metrics.js'

function observation(overrides: Partial<EvalObservation>): EvalObservation {
  return {
    caseId: 'lookup-001',
    capabilityCorrect: true,
    argumentsCorrect: true,
    entityCorrect: true,
    grounded: true,
    actionSuccess: null,
    hallucinated: false,
    latencyMs: 100,
    inputTokens: 20,
    outputTokens: 10,
    costMicrousd: 30,
    ...overrides,
  }
}

test('aggregates quality, latency, token and cost metrics deterministically', () => {
  const summary = summarizeEvalRun([
    observation({ caseId: 'lookup-001', latencyMs: 100, actionSuccess: true }),
    observation({
      caseId: 'injection-001',
      capabilityCorrect: false,
      argumentsCorrect: false,
      entityCorrect: false,
      grounded: false,
      actionSuccess: false,
      hallucinated: true,
      latencyMs: 300,
      inputTokens: 30,
      outputTokens: 20,
      costMicrousd: 50,
    }),
  ])

  assert.deepEqual(summary, {
    total: 2,
    capabilityAccuracy: 0.5,
    argumentAccuracy: 0.5,
    entityAccuracy: 0.5,
    groundedRate: 0.5,
    actionSuccessRate: 0.5,
    hallucinationRate: 0.5,
    latencyMs: { mean: 200, p95: 300 },
    tokens: { input: 50, output: 30 },
    costMicrousd: 80,
  })
})

test('rejects malformed or empty eval observations', () => {
  assert.throws(() => summarizeEvalRun([]), /empty_eval_run/)
  assert.throws(() => summarizeEvalRun([observation({ latencyMs: Number.NaN })]), /invalid_eval_latency/)
  assert.throws(() => summarizeEvalRun([observation({ inputTokens: 1.5 })]), /invalid_eval_input_tokens/)
})
