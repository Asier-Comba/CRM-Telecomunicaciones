import type { AssistantPlan } from './plan.js'

export const MODEL_ROUTING_POLICY_VERSION = 1 as const

export type ModelLane = 'fast_structured' | 'deep_planner' | 'long_context_summary'

export type ModelLaneConfig = {
  primaryModel: string
  fallbackModel?: string
  maxInputTokens: number
  maxOutputTokens: number
  inputMicrousdPerMillionTokens: number
  outputMicrousdPerMillionTokens: number
}

export type ModelRoutingConfig = Record<ModelLane, ModelLaneConfig>

export type PlannerRoutingSignals = {
  transcriptTurns: number
  transcriptCharacters: number
  contextCharacters: number
  candidateEntityCount: number
  priorStructuredOutputFailures: number
}

export type PresentationRoutingSignals = {
  sourceCharacters: number
  sourceRows: number
}

export type ModelRoute = {
  policyVersion: typeof MODEL_ROUTING_POLICY_VERSION
  stage: 'planner' | 'presentation'
  lane: ModelLane
  model: string
  fallbackModel?: string
  maxInputTokens: number
  maxOutputTokens: number
  reasonCode: string
}

export type ModelCallTelemetry = {
  policyVersion: typeof MODEL_ROUTING_POLICY_VERSION
  requestId: string
  stage: ModelRoute['stage']
  lane: ModelLane
  model: string
  fallbackUsed: boolean
  outcome: 'success' | 'timeout' | 'provider_unavailable' | 'invalid_structured_output' | 'policy_block'
  inputTokens: number
  outputTokens: number
  latencyMs: number
  estimatedCostMicrousd: number
}

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$/

function validNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

function assertSignals(signals: PlannerRoutingSignals): void {
  if (!validNonNegativeInteger(signals.transcriptTurns) || signals.transcriptTurns > 100) throw new Error('invalid_transcript_turn_count')
  if (!validNonNegativeInteger(signals.transcriptCharacters) || signals.transcriptCharacters > 500_000) throw new Error('invalid_transcript_size')
  if (!validNonNegativeInteger(signals.contextCharacters) || signals.contextCharacters > 2_000_000) throw new Error('invalid_context_size')
  if (!validNonNegativeInteger(signals.candidateEntityCount) || signals.candidateEntityCount > 1_000) throw new Error('invalid_candidate_count')
  if (!validNonNegativeInteger(signals.priorStructuredOutputFailures) || signals.priorStructuredOutputFailures > 3) {
    throw new Error('invalid_structured_output_failure_count')
  }
}

function assertConfig(config: ModelRoutingConfig): void {
  for (const lane of ['fast_structured', 'deep_planner', 'long_context_summary'] as const) {
    const candidate = config[lane]
    if (!candidate || !MODEL_ID.test(candidate.primaryModel)) throw new Error('invalid_primary_model')
    if (candidate.fallbackModel !== undefined && !MODEL_ID.test(candidate.fallbackModel)) throw new Error('invalid_fallback_model')
    if (!Number.isInteger(candidate.maxInputTokens) || candidate.maxInputTokens < 1) throw new Error('invalid_model_input_limit')
    if (!Number.isInteger(candidate.maxOutputTokens) || candidate.maxOutputTokens < 1) throw new Error('invalid_model_output_limit')
    if (!validNonNegativeInteger(candidate.inputMicrousdPerMillionTokens)) throw new Error('invalid_model_input_price')
    if (!validNonNegativeInteger(candidate.outputMicrousdPerMillionTokens)) throw new Error('invalid_model_output_price')
  }
}

function route(
  config: ModelRoutingConfig,
  stage: ModelRoute['stage'],
  lane: ModelLane,
  reasonCode: string,
): ModelRoute {
  assertConfig(config)
  const selected = config[lane]
  return {
    policyVersion: MODEL_ROUTING_POLICY_VERSION,
    stage,
    lane,
    model: selected.primaryModel,
    ...(selected.fallbackModel ? { fallbackModel: selected.fallbackModel } : {}),
    maxInputTokens: selected.maxInputTokens,
    maxOutputTokens: selected.maxOutputTokens,
    reasonCode,
  }
}

export function routePlanner(config: ModelRoutingConfig, signals: PlannerRoutingSignals): ModelRoute {
  assertSignals(signals)
  if (signals.priorStructuredOutputFailures > 0) {
    return route(config, 'planner', 'deep_planner', 'structured_output_retry')
  }
  if (signals.candidateEntityCount > 1) {
    return route(config, 'planner', 'deep_planner', 'entity_ambiguity')
  }
  if (signals.transcriptTurns > 4) {
    return route(config, 'planner', 'deep_planner', 'multi_turn_context')
  }
  if (signals.transcriptCharacters + signals.contextCharacters > 12_000) {
    return route(config, 'planner', 'deep_planner', 'large_planning_context')
  }
  return route(config, 'planner', 'fast_structured', 'bounded_simple_request')
}

export function routePresentation(
  config: ModelRoutingConfig,
  plan: AssistantPlan,
  signals: PresentationRoutingSignals,
): ModelRoute {
  if (!validNonNegativeInteger(signals.sourceCharacters) || signals.sourceCharacters > 5_000_000) throw new Error('invalid_source_size')
  if (!validNonNegativeInteger(signals.sourceRows) || signals.sourceRows > 100_000) throw new Error('invalid_source_row_count')
  if (signals.sourceCharacters > 32_000 || signals.sourceRows > 100) {
    return route(config, 'presentation', 'long_context_summary', 'large_grounded_result')
  }
  if (plan.goals.length > 2) {
    return route(config, 'presentation', 'deep_planner', 'multi_goal_synthesis')
  }
  return route(config, 'presentation', 'fast_structured', 'bounded_grounded_result')
}

export function canUseFallback(routeDecision: ModelRoute, outcome: ModelCallTelemetry['outcome'], attempts: number): boolean {
  return Boolean(
    routeDecision.fallbackModel &&
    attempts === 1 &&
    ['timeout', 'provider_unavailable', 'invalid_structured_output'].includes(outcome),
  )
}

export function estimateCostMicrousd(
  config: ModelRoutingConfig,
  lane: ModelLane,
  inputTokens: number,
  outputTokens: number,
): number {
  assertConfig(config)
  if (!validNonNegativeInteger(inputTokens) || !validNonNegativeInteger(outputTokens)) throw new Error('invalid_token_count')
  const selected = config[lane]
  return Math.ceil(
    (inputTokens * selected.inputMicrousdPerMillionTokens + outputTokens * selected.outputMicrousdPerMillionTokens) /
    1_000_000,
  )
}

export function validateModelCallTelemetry(value: ModelCallTelemetry): void {
  if (value.policyVersion !== MODEL_ROUTING_POLICY_VERSION) throw new Error('invalid_policy_version')
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(value.requestId)) throw new Error('invalid_request_id')
  if (!['planner', 'presentation'].includes(value.stage)) throw new Error('invalid_model_stage')
  if (!['fast_structured', 'deep_planner', 'long_context_summary'].includes(value.lane)) throw new Error('invalid_model_lane')
  if (!MODEL_ID.test(value.model)) throw new Error('invalid_model_id')
  if (!['success', 'timeout', 'provider_unavailable', 'invalid_structured_output', 'policy_block'].includes(value.outcome)) {
    throw new Error('invalid_model_outcome')
  }
  if (!validNonNegativeInteger(value.inputTokens) || !validNonNegativeInteger(value.outputTokens)) throw new Error('invalid_token_count')
  if (!Number.isFinite(value.latencyMs) || value.latencyMs < 0) throw new Error('invalid_model_latency')
  if (!validNonNegativeInteger(value.estimatedCostMicrousd)) throw new Error('invalid_model_cost')
}
