/** Deterministic routing signals. No prompt text, provider names or model authority. */
export type RoutingSignalsV2 = {
  ambiguity: number
  planNodes: number
  resultRows: number
  resultBytes: number
  summarySections: number
  risk: 'READ' | 'SAFE_WRITE' | 'SENSITIVE_WRITE' | 'IRREVERSIBLE'
}
export type RouteV2 = { version: 2; lane: 'FAST' | 'REASONING' | 'LONG_GROUNDED'; executionAllowed: boolean; reason: 'simple_read' | 'ambiguity' | 'multi_step' | 'large_summary' | 'write_blocked' }
export function routeModelV2(value: unknown): RouteV2 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const fields = Object.getOwnPropertyDescriptors(value)
  const keys = ['ambiguity', 'planNodes', 'resultRows', 'resultBytes', 'summarySections', 'risk']
  if (Reflect.ownKeys(value).length !== keys.length || keys.some(k => !fields[k] || !('value' in fields[k]!))) return null
  const bounds: Record<string, number> = { ambiguity: 1000, planNodes: 8, resultRows: 100_000, resultBytes: 5_000_000, summarySections: 30 }
  for (const [key, max] of Object.entries(bounds)) {
    const number: unknown = fields[key]!.value
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 0 || number > max) return null
  }
  const risk: unknown = fields.risk!.value
  if (typeof risk !== 'string' || !['READ', 'SAFE_WRITE', 'SENSITIVE_WRITE', 'IRREVERSIBLE'].includes(risk)) return null
  // Stronger inference is never permission to execute a write.
  if (risk !== 'READ') return { version: 2, lane: 'REASONING', executionAllowed: false, reason: 'write_blocked' }
  if (fields.ambiguity!.value > 1) return { version: 2, lane: 'REASONING', executionAllowed: true, reason: 'ambiguity' }
  if (fields.summarySections!.value > 0 && (fields.resultRows!.value > 100 || fields.resultBytes!.value > 32_000 || fields.summarySections!.value > 5)) {
    return { version: 2, lane: 'LONG_GROUNDED', executionAllowed: true, reason: 'large_summary' }
  }
  if (fields.planNodes!.value > 2) return { version: 2, lane: 'REASONING', executionAllowed: true, reason: 'multi_step' }
  return { version: 2, lane: 'FAST', executionAllowed: true, reason: 'simple_read' }
}
