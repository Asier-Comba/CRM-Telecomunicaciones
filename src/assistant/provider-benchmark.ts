/** Provider-agnostic, offline-safe runner. Credentials/network are adapter-owned.
 * Reference/mock results are always labelled and never pooled into LLM accuracy.
 */
export type BenchmarkInput = { id: string; prompt: string; context: Readonly<Record<string, unknown>> }
export type ProviderObservation = { output: unknown; inputTokens: number; outputTokens: number; fallbackUsed?: boolean }
export type BenchmarkCandidate = {
  id: string
  mode: 'reference' | 'mock' | 'llm'
  inputMicrousdPerMillion: number
  outputMicrousdPerMillion: number
  generate(input: BenchmarkInput, signal: AbortSignal): Promise<ProviderObservation>
}
export type GoldenJudgment = { capability: boolean; arguments: boolean; policy: boolean; grounding: boolean }
export type BenchmarkRecord = {
  caseId: string; candidateId: string; mode: BenchmarkCandidate['mode']
  status: 'scored' | 'timeout' | 'provider_failure' | 'invalid_observation' | 'judge_failure'
  latencyMs: number; inputTokens: number | null; outputTokens: number | null
  costMicrousd: number | null; judgment: GoldenJudgment | null
  fallbackUsed: boolean | null
}
const identifier = (v: string): boolean => /^[a-zA-Z0-9_-]{1,80}$/.test(v)
const validCount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 10_000_000

export async function runBenchmark(
  candidate: BenchmarkCandidate,
  cases: readonly BenchmarkInput[],
  judge: (caseId: string, output: unknown) => GoldenJudgment,
  timeoutMs = 5000,
): Promise<BenchmarkRecord[]> {
  if (!identifier(candidate.id) || !['reference', 'mock', 'llm'].includes(candidate.mode) ||
    !validCount(candidate.inputMicrousdPerMillion) || !validCount(candidate.outputMicrousdPerMillion) ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000 || cases.length > 1000 ||
    new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('invalid_benchmark_config')
  if (cases.some(c => !identifier(c.id) || typeof c.prompt !== 'string' || c.prompt.length > 4000)) throw new Error('invalid_benchmark_case')
  const records: BenchmarkRecord[] = []
  for (const input of cases) {
    const start = performance.now()
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const record: BenchmarkRecord = { caseId: input.id, candidateId: candidate.id, mode: candidate.mode, status: 'provider_failure', latencyMs: 0, inputTokens: null, outputTokens: null, costMicrousd: null, judgment: null, fallbackUsed: null }
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => candidate.generate(structuredClone(input), controller.signal)),
        new Promise<null>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null) }, timeoutMs) }),
      ])
      if (result === null) record.status = 'timeout'
      else if (!result || !validCount(result.inputTokens) || !validCount(result.outputTokens) ||
        (result.fallbackUsed !== undefined && typeof result.fallbackUsed !== 'boolean') ||
        Object.keys(result).some(k => !['output', 'inputTokens', 'outputTokens', 'fallbackUsed'].includes(k))) record.status = 'invalid_observation'
      else {
        record.inputTokens = result.inputTokens
        record.outputTokens = result.outputTokens
        record.fallbackUsed = result.fallbackUsed ?? false
        const costNumerator = result.inputTokens * candidate.inputMicrousdPerMillion
          + result.outputTokens * candidate.outputMicrousdPerMillion
        if (!Number.isSafeInteger(costNumerator)) throw new Error('unsafe_cost')
        record.costMicrousd = Math.ceil(costNumerator / 1_000_000)
        try {
          const judgment = judge(input.id, result.output)
          const keys = ['capability', 'arguments', 'policy', 'grounding']
          if (!judgment || Object.keys(judgment).length !== 4 || !keys.every(k => typeof judgment[k as keyof GoldenJudgment] === 'boolean')) throw new Error('invalid_judgment')
          record.judgment = { ...judgment }
          record.status = 'scored'
        } catch { record.status = 'judge_failure' }
      }
    } catch { record.status = 'provider_failure' }
    finally { if (timer !== undefined) clearTimeout(timer); record.latencyMs = Math.max(0, performance.now() - start) }
    // Never return candidate output, prompt, context, provider error or credentials.
    records.push(record)
  }
  return records
}

export function aggregateBenchmark(records: readonly BenchmarkRecord[]): {
  mode: BenchmarkCandidate['mode']; cases: number; scored: number; fullPassRate: number
  meanLatencyMs: number; costMicrousd: number; usageComplete: boolean
  fallbackRate: number; fallbackReportingComplete: boolean
} | null {
  if (!records.length || new Set(records.map(r => r.mode)).size !== 1 || new Set(records.map(r => r.candidateId)).size !== 1) return null
  const scored = records.filter(r => r.status === 'scored')
  return {
    mode: records[0]!.mode, cases: records.length, scored: scored.length,
    fullPassRate: scored.filter(r => r.judgment && Object.values(r.judgment).every(Boolean)).length / records.length,
    meanLatencyMs: records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length,
    costMicrousd: records.reduce((sum, r) => sum + (r.costMicrousd ?? 0), 0),
    usageComplete: records.every(r => r.costMicrousd !== null),
    fallbackRate: records.filter(r => r.fallbackUsed === true).length / records.length,
    fallbackReportingComplete: records.every(r => r.fallbackUsed !== null),
  }
}
