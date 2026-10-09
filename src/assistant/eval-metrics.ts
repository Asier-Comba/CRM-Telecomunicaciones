export type EvalObservation = {
  caseId: string
  capabilityCorrect: boolean
  argumentsCorrect: boolean
  entityCorrect: boolean
  grounded: boolean
  actionSuccess: boolean | null
  hallucinated: boolean
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costMicrousd: number
}

export type EvalSummary = {
  total: number
  capabilityAccuracy: number
  argumentAccuracy: number
  entityAccuracy: number
  groundedRate: number
  actionSuccessRate: number | null
  hallucinationRate: number
  latencyMs: { mean: number; p95: number }
  tokens: { input: number; output: number }
  costMicrousd: number
}

function rate(values: readonly boolean[]): number {
  if (values.length === 0) return 0
  return values.filter(Boolean).length / values.length
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0
  const ordered = [...values].sort((left, right) => left - right)
  return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0
}

export function validateEvalObservation(value: EvalObservation): void {
  if (!/^[a-z0-9][a-z0-9-]{2,99}$/.test(value.caseId)) throw new Error('invalid_eval_case_id')
  if (!finiteNonNegative(value.latencyMs)) throw new Error('invalid_eval_latency')
  if (!Number.isSafeInteger(value.inputTokens) || value.inputTokens < 0) throw new Error('invalid_eval_input_tokens')
  if (!Number.isSafeInteger(value.outputTokens) || value.outputTokens < 0) throw new Error('invalid_eval_output_tokens')
  if (!Number.isSafeInteger(value.costMicrousd) || value.costMicrousd < 0) throw new Error('invalid_eval_cost')
}

export function summarizeEvalRun(observations: readonly EvalObservation[]): EvalSummary {
  if (observations.length === 0) throw new Error('empty_eval_run')
  observations.forEach(validateEvalObservation)
  const actionObservations = observations.flatMap((observation) =>
    observation.actionSuccess === null ? [] : [observation.actionSuccess],
  )
  const latency = observations.map((observation) => observation.latencyMs)

  return {
    total: observations.length,
    capabilityAccuracy: rate(observations.map((observation) => observation.capabilityCorrect)),
    argumentAccuracy: rate(observations.map((observation) => observation.argumentsCorrect)),
    entityAccuracy: rate(observations.map((observation) => observation.entityCorrect)),
    groundedRate: rate(observations.map((observation) => observation.grounded)),
    actionSuccessRate: actionObservations.length === 0 ? null : rate(actionObservations),
    hallucinationRate: rate(observations.map((observation) => observation.hallucinated)),
    latencyMs: {
      mean: latency.reduce((sum, value) => sum + value, 0) / latency.length,
      p95: percentile95(latency),
    },
    tokens: {
      input: observations.reduce((sum, observation) => sum + observation.inputTokens, 0),
      output: observations.reduce((sum, observation) => sum + observation.outputTokens, 0),
    },
    costMicrousd: observations.reduce((sum, observation) => sum + observation.costMicrousd, 0),
  }
}
