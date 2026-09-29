import assert from 'node:assert/strict'
import test from 'node:test'

import type { AssistantPlan } from '../src/assistant/plan.js'
import {
  canUseFallback,
  estimateCostMicrousd,
  type ModelRoutingConfig,
  routePlanner,
  routePresentation,
  validateModelCallTelemetry,
} from '../src/assistant/model-routing.js'

const config: ModelRoutingConfig = {
  fast_structured: {
    primaryModel: 'provider/fast-v1',
    fallbackModel: 'provider/deep-v1',
    maxInputTokens: 32_000,
    maxOutputTokens: 2_000,
    inputMicrousdPerMillionTokens: 200_000,
    outputMicrousdPerMillionTokens: 800_000,
  },
  deep_planner: {
    primaryModel: 'provider/deep-v1',
    fallbackModel: 'provider/backup-v1',
    maxInputTokens: 128_000,
    maxOutputTokens: 4_000,
    inputMicrousdPerMillionTokens: 1_000_000,
    outputMicrousdPerMillionTokens: 4_000_000,
  },
  long_context_summary: {
    primaryModel: 'provider/long-v1',
    maxInputTokens: 256_000,
    maxOutputTokens: 6_000,
    inputMicrousdPerMillionTokens: 500_000,
    outputMicrousdPerMillionTokens: 2_000_000,
  },
}

const plan: AssistantPlan = {
  version: 1,
  speechAct: 'read',
  goals: [{ id: 'g1', capability: 'crm.customer.get', input: { customerId: 'customer-a' }, dependsOn: [] }],
}

test('model routing keeps simple plans economical and escalates measurable complexity', () => {
  assert.equal(routePlanner(config, {
    transcriptTurns: 1,
    transcriptCharacters: 80,
    contextCharacters: 500,
    candidateEntityCount: 1,
    priorStructuredOutputFailures: 0,
  }).lane, 'fast_structured')

  assert.equal(routePlanner(config, {
    transcriptTurns: 2,
    transcriptCharacters: 200,
    contextCharacters: 500,
    candidateEntityCount: 3,
    priorStructuredOutputFailures: 0,
  }).reasonCode, 'entity_ambiguity')

  assert.equal(routePlanner(config, {
    transcriptTurns: 1,
    transcriptCharacters: 80,
    contextCharacters: 500,
    candidateEntityCount: 1,
    priorStructuredOutputFailures: 1,
  }).reasonCode, 'structured_output_retry')
})

test('presentation routing uses result size and validated plan structure, never prompt regex', () => {
  assert.equal(routePresentation(config, plan, { sourceCharacters: 1_000, sourceRows: 5 }).lane, 'fast_structured')
  assert.equal(routePresentation(config, plan, { sourceCharacters: 50_000, sourceRows: 5 }).lane, 'long_context_summary')
  assert.equal(routePresentation(config, {
    ...plan,
    goals: [plan.goals[0]!, { ...plan.goals[0]!, id: 'g2' }, { ...plan.goals[0]!, id: 'g3' }],
  }, { sourceCharacters: 2_000, sourceRows: 10 }).lane, 'deep_planner')
})

test('fallback is bounded to one retry and safe transient outcomes', () => {
  const decision = routePlanner(config, {
    transcriptTurns: 1,
    transcriptCharacters: 80,
    contextCharacters: 0,
    candidateEntityCount: 0,
    priorStructuredOutputFailures: 0,
  })
  assert.equal(canUseFallback(decision, 'provider_unavailable', 1), true)
  assert.equal(canUseFallback(decision, 'invalid_structured_output', 2), false)
  assert.equal(canUseFallback(decision, 'policy_block', 1), false)
})

test('routing telemetry measures cost without prompt or CRM payload fields', () => {
  assert.equal(estimateCostMicrousd(config, 'fast_structured', 1_000, 500), 600)
  assert.doesNotThrow(() => validateModelCallTelemetry({
    policyVersion: 1,
    requestId: 'request-routing-0001',
    stage: 'planner',
    lane: 'fast_structured',
    model: 'provider/fast-v1',
    fallbackUsed: false,
    outcome: 'success',
    inputTokens: 1_000,
    outputTokens: 500,
    latencyMs: 250,
    estimatedCostMicrousd: 600,
  }))
  assert.throws(() => validateModelCallTelemetry({
    policyVersion: 1,
    requestId: 'request-routing-0001',
    stage: 'planner',
    lane: 'fast_structured',
    model: 'provider/fast-v1',
    fallbackUsed: false,
    outcome: 'success',
    inputTokens: -1,
    outputTokens: 0,
    latencyMs: 1,
    estimatedCostMicrousd: 0,
  }), /invalid_token_count/)
})
