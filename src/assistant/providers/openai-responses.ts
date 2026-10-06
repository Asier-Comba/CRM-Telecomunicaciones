import { containsHighConfidenceSecret } from '../schema.ts'
import type { AiProvider, AiTurnInput, AiTurnResult, AiStreamEvent, AiUsage } from './ai-provider.ts'

const ENDPOINT = 'https://api.openai.com/v1/responses'
const MAX_BODY = 256 * 1024
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 10_000_000
const fail = (code: Extract<AiTurnResult, { ok: false }>['code'], retryable = false): AiTurnResult => ({ ok: false, code, retryable })

function usage(value: unknown): AiUsage | null {
  if (!object(value) || !integer(value.input_tokens) || !integer(value.output_tokens) || !integer(value.total_tokens)
    || value.total_tokens !== value.input_tokens + value.output_tokens) return null
  return { inputTokens: value.input_tokens, outputTokens: value.output_tokens, totalTokens: value.total_tokens }
}
function parseResponse(value: unknown, model: string, started: number): AiTurnResult {
  if (!object(value) || value.status !== 'completed' || value.model !== model || !Array.isArray(value.output) || value.output.length > 20) return fail('invalid_output')
  const measured = usage(value.usage)
  if (!measured) return fail('invalid_output')
  let text = ''
  for (const output of value.output) {
    if (!object(output)) return fail('invalid_output')
    if (output.type === 'reasoning') continue // Never persist/return hidden reasoning.
    if (output.type !== 'message' || output.role !== 'assistant' || !Array.isArray(output.content)) return fail('invalid_output')
    for (const part of output.content) {
      if (!object(part)) return fail('invalid_output')
      if (part.type === 'refusal') return fail('refused')
      if (part.type !== 'output_text' || typeof part.text !== 'string') return fail('invalid_output')
      text += part.text
    }
  }
  if (!text || Buffer.byteLength(text) > MAX_BODY) return fail('invalid_output')
  try { return { ok: true, value: JSON.parse(text), usage: measured, model, durationMs: Math.max(0, Date.now() - started) } }
  catch { return fail('invalid_output') }
}
function validInput(input: AiTurnInput): boolean {
  try {
    return object(input) && Object.keys(input).sort().join(',') === 'context,instructions,maxOutputTokens,schema,schemaName,userText'
      && typeof input.instructions === 'string' && input.instructions.length > 0 && input.instructions.length <= 12000
      && typeof input.userText === 'string' && input.userText.length > 0 && Buffer.byteLength(input.userText) <= 8000
      && typeof input.context === 'string' && Buffer.byteLength(input.context) <= 32000
      && !containsHighConfidenceSecret(input.userText) && !containsHighConfidenceSecret(input.context)
      && /^[a-z][a-z0-9_]{0,63}$/.test(input.schemaName) && object(input.schema) && input.schema.type === 'object'
      && input.schema.additionalProperties === false && Buffer.byteLength(JSON.stringify(input.schema)) <= 32000
      && integer(input.maxOutputTokens) && input.maxOutputTokens >= 256 && input.maxOutputTokens <= 8192
  } catch { return false }
}

/** Instantiate only from a server-only factory. Fixed endpoint/no tools/no URLs
 * supplied by model. Transport injection is for tests and trusted host wiring. */
export class OpenAiResponsesProvider implements AiProvider {
  readonly name = 'openai.responses'
  readonly status: 'ready' | 'not_configured'
  readonly evidenceMode: 'live' | 'synthetic' | 'not_configured'
  readonly #controllers = new Set<AbortController>()
  readonly #config: { apiKey?: string; model: string; projectId?: string; timeoutMs: number }
  readonly #fetch: typeof fetch
  constructor(config: { apiKey?: string; model?: string; projectId?: string; timeoutMs?: number }, transport: typeof fetch = fetch) {
    if (typeof window !== 'undefined') throw new Error('server_only_provider')
    const model = config.model ?? 'gpt-6.1-sol', timeoutMs = config.timeoutMs ?? 20000
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(model) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000
      || (config.projectId !== undefined && !/^proj_[a-zA-Z0-9_-]{1,100}$/.test(config.projectId))) throw new Error('invalid_provider_configuration')
    this.#config = { ...config, model, timeoutMs }; this.#fetch = transport
    this.status = config.apiKey?.trim() ? 'ready' : 'not_configured'
    this.evidenceMode = this.status === 'not_configured' ? 'not_configured' : transport === fetch ? 'live' : 'synthetic'
  }
  cancel(): void { for (const controller of this.#controllers) controller.abort() }
  async createTurn(input: AiTurnInput, signal?: AbortSignal): Promise<AiTurnResult> {
    let result: AiTurnResult = fail('unavailable', true)
    for await (const event of this.#request(input, signal, false)) if (event.type === 'final') result = event.result
    return result
  }
  streamTurn(input: AiTurnInput, signal?: AbortSignal): AsyncIterable<AiStreamEvent> { return this.#request(input, signal, true) }
  async *#request(input: AiTurnInput, signal: AbortSignal | undefined, stream: boolean): AsyncGenerator<AiStreamEvent> {
    if (this.status !== 'ready') { yield { type: 'final', result: fail('not_configured') }; return }
    if (!validInput(input)) { yield { type: 'final', result: fail('invalid_input') }; return }
    const controller = new AbortController(); this.#controllers.add(controller)
    const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) controller.abort()
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, this.#config.timeoutMs)
    const started = Date.now()
    try {
      if (controller.signal.aborted) { yield { type: 'final', result: fail('cancelled') }; return }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${this.#config.apiKey}` }
      if (this.#config.projectId) headers['OpenAI-Project'] = this.#config.projectId
      const response = await this.#fetch(ENDPOINT, { method: 'POST', headers, signal: controller.signal, redirect: 'error',
        body: JSON.stringify({ model: this.#config.model, store: false, stream, reasoning: { effort: 'high' },
          instructions: input.instructions, input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ userText: input.userText, context: input.context }) }] }],
          max_output_tokens: input.maxOutputTokens, text: { format: { type: 'json_schema', name: input.schemaName, strict: true, schema: input.schema } } }) })
      if (!response.ok || !response.body) { await response.body?.cancel(); yield { type: 'final', result: fail(response.status === 429 ? 'rate_limited' : 'unavailable', response.status === 429 || response.status >= 500) }; return }
      yield { type: 'started' }
      const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8', { fatal: true })
      let buffer = '', bytes = 0, completed: unknown = null
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > MAX_BODY) { await reader.cancel(); yield { type: 'final', result: fail('invalid_output') }; return }
          buffer += decoder.decode(chunk.value, { stream: true })
          if (!stream) continue
          buffer = buffer.replace(/\r\n/g, '\n')
          let split: number
          while ((split = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, split); buffer = buffer.slice(split + 2)
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            if (!data || data === '[DONE]') continue
            const event: unknown = JSON.parse(data)
            if (!object(event)) throw new Error('invalid_event')
            if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') yield { type: 'plan_delta', text: event.delta }
            if (event.type === 'response.completed') completed = event.response
            if (event.type === 'error' || event.type === 'response.failed' || event.type === 'response.incomplete') throw new Error('failed_event')
          }
        }
        buffer += decoder.decode()
        if (stream && buffer.trim()) throw new Error('truncated_event')
        const raw: unknown = stream ? completed : JSON.parse(buffer)
        yield { type: 'final', result: controller.signal.aborted ? fail(timedOut ? 'timeout' : 'cancelled') : parseResponse(raw, this.#config.model, started) }
      } finally { reader.releaseLock() }
    } catch { yield { type: 'final', result: fail(controller.signal.aborted ? timedOut ? 'timeout' : 'cancelled' : 'unavailable', !controller.signal.aborted) } }
    finally { controller.abort(); clearTimeout(timer); signal?.removeEventListener('abort', abort); this.#controllers.delete(controller) }
  }
}
