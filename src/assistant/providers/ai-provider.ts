/** Provider-neutral server seam. Input contains minimized data, never authority. */
export type AiUsage = { inputTokens: number; outputTokens: number; totalTokens: number }
export type AiTurnInput = {
  instructions: string
  userText: string
  context: string
  schemaName: string
  schema: Record<string, unknown>
  maxOutputTokens: number
}
export type AiFailureCode = 'not_configured' | 'invalid_input' | 'cancelled' | 'timeout' | 'rate_limited' | 'unavailable' | 'invalid_output' | 'refused'
export type AiTurnResult =
  | { ok: true; value: unknown; usage: AiUsage; model: string; durationMs: number }
  | { ok: false; code: AiFailureCode; retryable: boolean }
export type AiStreamEvent =
  | { type: 'started' }
  /** Unvalidated provider text. Internal only; never actionable UI blocks. */
  | { type: 'plan_delta'; text: string }
  | { type: 'final'; result: AiTurnResult }
export interface AiProvider {
  readonly name: string
  readonly status: 'ready' | 'not_configured'
  readonly evidenceMode: 'live' | 'synthetic' | 'not_configured'
  createTurn(input: AiTurnInput, signal?: AbortSignal): Promise<AiTurnResult>
  streamTurn(input: AiTurnInput, signal?: AbortSignal): AsyncIterable<AiStreamEvent>
  cancel(): void
}
