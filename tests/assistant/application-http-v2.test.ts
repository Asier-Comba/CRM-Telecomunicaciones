import test from 'node:test'
import assert from 'node:assert/strict'
import { readAssistantEnvelopeV2, assistantLocalAllowedV2 } from '../../src/assistant/application-http-v2.ts'
const origin = 'http://localhost:3000'
const headers = { host: 'localhost:3000', origin, 'content-type': 'application/json' }
const request = (body = '{"operation":"thread.list","input":{}}', extra = {}) => new Request(`${origin}/api/assistant/v2/threads`, { method: 'POST', headers: { ...headers, ...extra }, body })
test('application gate requires all explicit synthetic loopback flags and rejects production', () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', AI_PRODUCT_V2_ENABLED: 'true', PRODUCT_V1_ENABLED: 'true', PRODUCT_LOCAL_INTEGRATION: 'true', PRODUCT_LOCAL_SYNTHETIC: 'true', PRODUCT_V1_ORIGIN: origin, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }
  assert.equal(assistantLocalAllowedV2(env), true)
  assert.equal(assistantLocalAllowedV2({ ...env, NODE_ENV: 'production' }), false)
  assert.equal(assistantLocalAllowedV2({ ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://remote.supabase.co' }), false)
  assert.equal(assistantLocalAllowedV2({ ...env, AI_PRODUCT_V2_ENABLED: '' }), false)
})
test('same-origin cookie application rejects forged workspace/bearer/header hosts', async () => {
  for (const extra of [{ origin: 'https://evil.invalid' }, { host: 'evil.invalid' }, { 'x-workspace-id': 'foreign' }, { authorization: 'Bearer fake' }, { 'sec-fetch-site': 'cross-site' }]) {
    const result = await readAssistantEnvelopeV2(request(undefined, extra), origin)
    assert.ok(result instanceof Response); assert.equal(result.status, 403); assert.equal(result.headers.get('cache-control'), 'no-store')
  }
})
test('unknown envelope fields and oversized raw body are rejected before any service', async () => {
  for (const body of ['{"operation":"thread.list","input":{},"actor":"fake"}', 'x'.repeat(12289)]) assert.ok(await readAssistantEnvelopeV2(request(body), origin) instanceof Response)
  assert.deepEqual(await readAssistantEnvelopeV2(request(), origin), { operation: 'thread.list', input: {} })
})
test('hostile cancellation promise cannot hold an oversized stream request open', async () => {
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(12289)) }, cancel() { return new Promise(() => {}) } })
  const req = new Request(`${origin}/api/assistant/v2/turn`, { method: 'POST', headers, body, duplex: 'half' } as RequestInit)
  const result = await readAssistantEnvelopeV2(req, origin)
  assert.ok(result instanceof Response); assert.equal(result.status, 400)
})
