import type { AiFailureCode, AiProvider, AiTurnInput, AiTurnResult } from './ai-provider.ts'
import { snapshotProductJsonV1 } from '../../lib/server/product-query-runtime-v1.ts'
import { containsHighConfidenceSecret } from '../schema.ts'

const codes: readonly AiFailureCode[] = ['not_configured', 'invalid_input', 'cancelled', 'timeout', 'rate_limited', 'unavailable', 'invalid_output', 'refused']
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const exact = (v: Record<string, unknown>, fields: string) => Object.keys(v).sort().join(',') === fields
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 10_000_000
const fail = (code: AiFailureCode): AiTurnResult => ({ ok: false, code, retryable: code === 'timeout' || code === 'unavailable' })

/** A provider is an interchangeable transport, never a trusted plan or metric.
 * Snapshot without invoking accessors; closed envelopes prevent private extras
 * and fabricated usage from entering telemetry. The plan gets its own parser. */
export function parseProviderTurnResultV2(raw: unknown, maxOutputTokens: number): AiTurnResult {
  try {
    const v = snapshotProductJsonV1(raw)
    if (!object(v) || containsHighConfidenceSecret(v)) return fail('invalid_output')
    if (v.ok === false && exact(v, 'code,ok,retryable') && codes.includes(v.code as AiFailureCode) && typeof v.retryable === 'boolean') return v as AiTurnResult
    if (v.ok !== true || !exact(v, 'durationMs,model,ok,usage,value') || !object(v.usage)
      || !exact(v.usage, 'inputTokens,outputTokens,totalTokens') || !count(v.usage.inputTokens) || !count(v.usage.outputTokens) || !count(v.usage.totalTokens)
      || v.usage.totalTokens !== v.usage.inputTokens + v.usage.outputTokens || v.usage.outputTokens > maxOutputTokens
      || typeof v.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(v.model)
      || typeof v.durationMs !== 'number' || !Number.isFinite(v.durationMs) || v.durationMs < 0 || v.durationMs > 60000) return fail('invalid_output')
    return v as AiTurnResult
  } catch { return fail('invalid_output') }
}

/** Independent deadline even when a transport ignores AbortSignal. Only this
 * invocation is aborted; provider.cancel() would cancel other concurrent turns.
 * No retry, no side effect and no raw transport exception escapes this seam. */
export async function boundedProviderTurnV2(provider: AiProvider, input: AiTurnInput, signal?: AbortSignal, timeoutMs = 60000): Promise<AiTurnResult> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) return fail('invalid_input')
  if (signal?.aborted) return fail('cancelled')
  if (provider.status === 'not_configured') return fail('not_configured')
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined, abort: (() => void) | undefined
  let cause: 'timeout' | 'cancelled' | null = null
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { cause = 'timeout'; controller.abort(); reject(new Error('provider_deadline')) }, timeoutMs)
    abort = () => { cause = 'cancelled'; controller.abort(); reject(new Error('provider_cancelled')) }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
  try {
    const raw = await Promise.race([Promise.resolve().then(() => cause ? fail(cause) : provider.createTurn(input, controller.signal)), deadline])
    if (cause) return fail(cause)
    return parseProviderTurnResultV2(raw, input.maxOutputTokens)
  } catch { return fail(cause ?? 'unavailable') }
  finally { clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort); controller.abort() }
}
