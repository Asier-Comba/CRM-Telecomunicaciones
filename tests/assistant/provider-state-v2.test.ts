import test from 'node:test'
import assert from 'node:assert/strict'
import { providerStateV2 } from '../../src/assistant/providers/provider-state-v2.ts'
import { runProductReadTurnV2 } from '../../src/assistant/product-read-turn-v2.ts'
import type { AiProvider, AiFailureCode } from '../../src/assistant/providers/ai-provider.ts'

test('closed provider states distinguish configuration, transport faults and caller/policy outcomes', () => {
  assert.equal(providerStateV2({ status: 'not_configured' }), 'not_configured')
  assert.equal(providerStateV2({ status: 'ready' }), 'configured')
  for (const code of ['invalid_input', 'cancelled', 'refused'] as const)
    assert.equal(providerStateV2({ status: 'ready' }, { ok: false, code, retryable: false }), 'configured')
  for (const code of ['invalid_output', 'rate_limited'] as const)
    assert.equal(providerStateV2({ status: 'ready' }, { ok: false, code, retryable: false }), 'degraded')
  for (const code of ['timeout', 'unavailable'] as const)
    assert.equal(providerStateV2({ status: 'ready' }, { ok: false, code, retryable: true }), 'unavailable')
})
test('actual read turn exposes safe per-turn state and never substitutes it for CRM authority or live evidence', async () => {
  for (const code of ['not_configured', 'invalid_output', 'unavailable'] as AiFailureCode[]) {
    let calls = 0
    const provider: AiProvider = { name: 'synthetic', status: 'ready', evidenceMode: 'synthetic',
      createTurn: async () => ({ ok: false, code, retryable: false }), async *streamTurn() {}, cancel() {} }
    const result = await runProductReadTurnV2('Lista clientes', 'synthetic-request', provider, {
      authority: async () => ({ actorId: 'actor', workspaceId: 'workspace', scopeEpoch: 'epoch', role: 'member' }),
      readers: { collection: async () => { calls++; return {} }, report: async () => { calls++; return {} } },
      offeredHandles: [], resolveReference: async () => null, now: () => new Date(),
    }, { date: '2026-10-07', timezone: 'Europe/Madrid' })
    assert.equal(result.telemetry.providerState, code === 'not_configured' ? 'not_configured' : code === 'invalid_output' ? 'degraded' : 'unavailable')
    assert.equal(result.telemetry.liveModelEvidence, false); assert.equal(calls, 0)
    assert.equal(result.execution, null)
    assert.deepEqual(Object.keys(result.telemetry).sort(), ['durationMs', 'inputTokens', 'liveModelEvidence', 'outputTokens', 'provider', 'providerState'])
  }
})
