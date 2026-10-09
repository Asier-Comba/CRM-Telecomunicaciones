import assert from 'node:assert/strict'
import test from 'node:test'
import { OpenAiResponsesProvider } from '../../src/assistant/providers/openai-responses.ts'
import type { AiTurnInput } from '../../src/assistant/providers/ai-provider.ts'
const input: AiTurnInput = { instructions: 'Closed semantic plan only; no authority.', userText: 'Busca ACME', context: '{}',
  schemaName: 'plan', schema: { type: 'object', properties: { decision: { type: 'string', enum: ['clarify'] } }, required: ['decision'], additionalProperties: false }, maxOutputTokens: 1024 }
const body = { status: 'completed', model: 'gpt-6.1-sol', usage: { input_tokens: 12, output_tokens: 7, total_tokens: 19 },
  output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '{"decision":"clarify"}' }] }] }
const provider = (transport: typeof fetch) => new OpenAiResponsesProvider({ apiKey: 'synthetic-test-value' }, transport)
test('unconfigured provider never uses transport or claims live execution', async () => {
  let called = false
  const result = await new OpenAiResponsesProvider({}, async () => { called = true; throw Error() }).createTurn(input)
  assert.deepEqual(result, { ok: false, code: 'not_configured', retryable: false }); assert.equal(called, false)
})
test('Responses uses fixed endpoint, strict schema, server model, no retention or tools', async () => {
  const p = provider(async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options?.redirect, 'error')
    const payload = JSON.parse(String(options?.body))
    assert.equal(payload.model, 'gpt-6.1-sol'); assert.equal(payload.store, false); assert.equal(payload.tools, undefined)
    assert.equal(payload.text.format.strict, true); assert.equal(payload.text.format.type, 'json_schema')
    return Response.json(body)
  })
  const result = await p.createTurn(input)
  assert.equal(result.ok, true)
  if (result.ok) { assert.deepEqual(result.value, { decision: 'clarify' }); assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 7, totalTokens: 19 }) }
})
test('wrong status/model/usage, function calls and malformed JSON cannot become a plan', async () => {
  for (const value of [{ ...body, status: 'incomplete' }, { ...body, model: 'forged-model' }, { ...body, usage: { input_tokens: -1, output_tokens: 7, total_tokens: 6 } },
    { ...body, output: [{ type: 'function_call', name: 'delete.everything', arguments: '{}' }] },
    { ...body, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'not JSON' }] }] }]) {
    assert.deepEqual(await provider(async () => Response.json(value)).createTurn(input), { ok: false, code: 'invalid_output', retryable: false })
  }
})
test('refusal and error bodies never leak provider data', async () => {
  const refused = { ...body, output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'private text' }] }] }
  assert.deepEqual(await provider(async () => Response.json(refused)).createTurn(input), { ok: false, code: 'refused', retryable: false })
  for (const status of [401, 429, 503]) {
    const result = await provider(async () => new Response('private provider body', { status })).createTurn(input)
    assert.equal(JSON.stringify(result).includes('private'), false); assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.retryable, status !== 401)
  }
})
test('stream handles split UTF-8 and returns structured final only after completion', async () => {
  const text = `event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'á' })}\n\nevent: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: body })}\n\n`
  const bytes = new TextEncoder().encode(text)
  const events = []
  for await (const event of provider(async () => new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close() } }))).streamTurn(input)) events.push(event)
  assert.equal(events[0]?.type, 'started'); assert.deepEqual(events[1], { type: 'plan_delta', text: 'á' })
  assert.equal(events.at(-1)?.type, 'final')
  const final = events.at(-1); if (final?.type === 'final') assert.equal(final.result.ok, true)
})
test('oversize and truncated stream fail closed; no final UI can be inferred from deltas', async () => {
  const large = await provider(async () => new Response('x'.repeat(300000))).createTurn(input)
  assert.equal(large.ok, false)
  const events = []
  for await (const event of provider(async () => new Response('data: {"type":"response.output_text.delta","delta":"ok"}\n\n')).streamTurn(input)) events.push(event)
  const last = events.at(-1); assert.equal(last?.type, 'final'); if (last?.type === 'final') assert.equal(last.result.ok, false)
})
test('pre-abort and timeout are distinct; explicit cancel aborts active turn', async () => {
  const aborted = new AbortController(); aborted.abort()
  assert.deepEqual(await provider(async () => { throw Error('must not run') }).createTurn(input, aborted.signal), { ok: false, code: 'cancelled', retryable: false })
  const transport: typeof fetch = (_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(Error('private'))))
  assert.deepEqual(await new OpenAiResponsesProvider({ apiKey: 'synthetic-test-value', timeoutMs: 5 }, transport).createTurn(input), { ok: false, code: 'timeout', retryable: false })
  const p = provider(transport), pending = p.createTurn(input); p.cancel()
  assert.deepEqual(await pending, { ok: false, code: 'cancelled', retryable: false })
})
test('forged request field and oversized context never reach provider', async () => {
  let called = false
  const p = provider(async () => { called = true; throw Error() })
  for (const value of [{ ...input, workspace: 'foreign' }, { ...input, context: 'x'.repeat(33000) }]) assert.equal((await p.createTurn(value)).ok, false)
  assert.equal(called, false)
})
test('synthetic transport cannot be reported as live evidence; secret input is not forwarded', async () => {
  let called = false
  const p = provider(async () => { called = true; return Response.json(body) })
  assert.equal(p.evidenceMode, 'synthetic')
  assert.deepEqual(await p.createTurn({ ...input, userText: 'Authorization: Bearer syntheticcredentialvalue123456' }), { ok: false, code: 'invalid_input', retryable: false })
  assert.equal(called, false)
})
