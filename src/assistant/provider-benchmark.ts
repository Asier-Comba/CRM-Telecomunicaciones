/** Provider-agnostic, offline-safe runner. Credentials/network are adapter-owned.
 * Reference/mock results are always labelled and never pooled into LLM accuracy.
 */
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
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
function benchmarkCases(raw:readonly BenchmarkInput[]):readonly BenchmarkInput[]{
  try{
    if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype)throw Error()
    const fields=Object.getOwnPropertyDescriptors<object>(raw),length=fields.length.value
    if(length>1000||Reflect.ownKeys(fields).length!==length+1)throw Error()
    const result:BenchmarkInput[]=[],ids=new Set<string>();let bytes=0
    for(let i=0;i<length;i++){
      const field=fields[i]
      if(!field?.enumerable||!('value' in field))throw Error()
      const value=snapshotProductJsonV1(field.value)
      if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='context,id,prompt')throw Error()
      const row=value as Record<string,unknown>
      if(typeof row.id!=='string'||!identifier(row.id)||ids.has(row.id)||typeof row.prompt!=='string'||row.prompt.length>4000
        ||!row.context||typeof row.context!=='object'||Array.isArray(row.context))throw Error()
      bytes+=Buffer.byteLength(JSON.stringify(value));if(bytes>33_554_432)throw Error()
      ids.add(row.id);result.push(value as BenchmarkInput)
    }
    return Object.freeze(result)
  }catch{throw Error('invalid_benchmark_case')}
}
function observation(value:unknown):ProviderObservation|null{
  try{
    if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return null
    const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields)
    if(keys.some(k=>typeof k!=='string'||!['output','inputTokens','outputTokens','fallbackUsed'].includes(k))
      ||!['output','inputTokens','outputTokens'].every(k=>fields[k]?.enumerable&&'value' in fields[k]!)
      ||Object.values(fields).some(d=>!d.enumerable||!('value' in d)))return null
    const result=Object.fromEntries(keys.map(key=>[key,fields[key as string].value])) as ProviderObservation
    if(!validCount(result.inputTokens)||!validCount(result.outputTokens)||(result.fallbackUsed!==undefined&&typeof result.fallbackUsed!=='boolean'))return null
    return Object.freeze(result)
  }catch{return null}
}

export async function runBenchmark(
  candidate: BenchmarkCandidate,
  cases: readonly BenchmarkInput[],
  judge: (caseId: string, output: unknown) => GoldenJudgment,
  timeoutMs = 5000,
): Promise<BenchmarkRecord[]> {
  // Configuration is server-owned, but adapters may retain a mutable reference.
  // Admit one observation policy/transport for this whole run before any await.
  const admitted = Object.freeze({ id: candidate.id, mode: candidate.mode,
    inputMicrousdPerMillion: candidate.inputMicrousdPerMillion, outputMicrousdPerMillion: candidate.outputMicrousdPerMillion })
  const transport = candidate.generate
  if (!identifier(admitted.id) || !['reference', 'mock', 'llm'].includes(admitted.mode) ||
    !validCount(admitted.inputMicrousdPerMillion) || !validCount(admitted.outputMicrousdPerMillion) || typeof transport !== 'function' ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new Error('invalid_benchmark_config')
  const selected=benchmarkCases(cases)
  const records: BenchmarkRecord[] = []
  for (const input of selected) {
    const start = performance.now()
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const record: BenchmarkRecord = { caseId: input.id, candidateId: admitted.id, mode: admitted.mode, status: 'provider_failure', latencyMs: 0, inputTokens: null, outputTokens: null, costMicrousd: null, judgment: null, fallbackUsed: null }
    try {
      const response = await Promise.race([
        Promise.resolve().then(() => transport.call(candidate, structuredClone(input), controller.signal)),
        new Promise<null>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null) }, timeoutMs) }),
      ])
      const result=response===null?null:observation(response)
      if (response === null) record.status = 'timeout'
      else if (!result) record.status = 'invalid_observation'
      else {
        record.inputTokens = result.inputTokens
        record.outputTokens = result.outputTokens
        record.fallbackUsed = result.fallbackUsed ?? false
        const costNumerator = result.inputTokens * admitted.inputMicrousdPerMillion
          + result.outputTokens * admitted.outputMicrousdPerMillion
        if (!Number.isSafeInteger(costNumerator)) throw new Error('unsafe_cost')
        record.costMicrousd = Math.ceil(costNumerator / 1_000_000)
        try {
          const judgment = judge(input.id, result.output)
          const keys = ['capability', 'arguments', 'policy', 'grounding']
          if (!judgment || Object.getPrototypeOf(judgment)!==Object.prototype) throw new Error('invalid_judgment')
          const fields=Object.getOwnPropertyDescriptors(judgment)
          if(Reflect.ownKeys(fields).length!==4||!keys.every(k=>fields[k]?.enumerable&&'value' in fields[k]&&typeof fields[k].value==='boolean')) throw new Error('invalid_judgment')
          // Record the admitted data once; accessor or Proxy reads must not
          // upgrade a failed quality judgment after its shape was validated.
          record.judgment = Object.freeze(Object.fromEntries(keys.map(k=>[k,fields[k].value]))) as GoldenJudgment
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
  meanLatencyMs: number; costMicrousd: number | null; observedCostMicrousd: number; usageComplete: boolean
  fallbackRate: number; fallbackReportingComplete: boolean
} | null {
  if (!records.length || new Set(records.map(r => r.mode)).size !== 1 || new Set(records.map(r => r.candidateId)).size !== 1) return null
  let observedCostMicrousd = 0
  for (const record of records) {
    if (record.costMicrousd === null) continue
    if (!Number.isSafeInteger(record.costMicrousd) || record.costMicrousd < 0) return null
    observedCostMicrousd += record.costMicrousd
    if (!Number.isSafeInteger(observedCostMicrousd)) return null
  }
  const usageComplete = records.every(r => r.costMicrousd !== null)
  const scored = records.filter(r => r.status === 'scored')
  return {
    mode: records[0]!.mode, cases: records.length, scored: scored.length,
    fullPassRate: scored.filter(r => r.judgment && Object.values(r.judgment).every(Boolean)).length / records.length,
    meanLatencyMs: records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length,
    // A transport failure may still have incurred usage: unknown is not free.
    // The observed subtotal remains useful but is never an estimated total.
    costMicrousd: usageComplete ? observedCostMicrousd : null, observedCostMicrousd, usageComplete,
    fallbackRate: records.filter(r => r.fallbackUsed === true).length / records.length,
    fallbackReportingComplete: records.every(r => r.fallbackUsed !== null),
  }
}
