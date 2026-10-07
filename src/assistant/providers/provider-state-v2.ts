import type { AiProvider, AiTurnResult } from './ai-provider.ts'

export type AiProviderStateV2 = 'not_configured' | 'configured' | 'degraded' | 'unavailable'
/** Per-turn configuration/transport observation, never a global health claim.
 * No network probe, secret, provider payload or inference of live quality.
 * Caller cancellation/refusal/input errors do not mark transport unhealthy. */
export function providerStateV2(provider: Pick<AiProvider, 'status'>, result?: AiTurnResult): AiProviderStateV2 {
  if (provider.status === 'not_configured' || result?.ok === false && result.code === 'not_configured') return 'not_configured'
  if (!result || result.ok) return 'configured'
  if (result.code === 'invalid_output' || result.code === 'rate_limited') return 'degraded'
  if (result.code === 'timeout' || result.code === 'unavailable') return 'unavailable'
  return 'configured'
}
