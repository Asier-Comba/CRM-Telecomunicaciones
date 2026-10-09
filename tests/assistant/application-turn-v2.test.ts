import test from 'node:test'
import assert from 'node:assert/strict'
import { executeApplicationReadTurnV2, assistantCalendarV2 } from '../../src/assistant/application-turn-v2.ts'
import { ConversationServiceV2 } from '../../src/assistant/conversation-service-v2.ts'
import type { AiProvider, AiTurnResult } from '../../src/assistant/providers/ai-provider.ts'
const id = '93000000-0000-4000-8000-000000000001', turn = '94000000-0000-4000-8000-000000000001'
const authority = { actorId: 'actor', workspaceId: 'workspace', scopeEpoch: 'epoch_1', role: 'member' }
const input = { id, turn_id: turn, text: 'Lista clientes' }
function fixture() {
  const controller = new AbortController(), events: { type: string; data: unknown }[] = [], stored: unknown[] = []
  const provider: AiProvider = { name: 'test', status: 'ready', evidenceMode: 'synthetic', cancel() {}, async *streamTurn() {}, async createTurn(): Promise<AiTurnResult> {
    return { ok: true, model: 'synthetic', value: { version: 2, decision: 'plan', nodes: [{ id: 'clients', capability: 'crm.customer.list', arguments: [], bindings: [] }] }, usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 }, durationMs: 1 }
  } }
  const deps = { authority: async () => authority, offeredHandles: [], resolveReference: async () => null, now: () => new Date('2026-10-06T22:00:00Z'), readers: {
    collection: async () => ({ ok: true, data: { contract_version: 'telecom.collections.v1', operation: 'customer.list', next_id: null,
      items: [{ id, version: 1, display_name: 'Synthetic ACME', account_kind: 'legal_entity', lifecycle: 'customer', status: 'active', source: 'manual', assigned_user_id: null }] } }), report: async () => null,
  } }
  const service = new ConversationServiceV2({ authority: deps.authority, invoke: async (_, op, value) => { stored.push({ op, value }); return { data: { contract: 'assistant.turn.v2', id: turn, status: value.status, replay: false }, error: null } } })
  return { controller, events, stored, provider, deps, service, emit: (type: string, data: unknown) => { events.push({ type, data }) } }
}
test('application final contains only validated facts and stored history excludes raw tool/provider data', async () => {
  const f = fixture(); await executeApplicationReadTurnV2(input, f.deps, f.provider, f.service, f.controller.signal, f.emit)
  assert.deepEqual(f.events.map(e => e.type), ['started', 'final'])
  assert.match(JSON.stringify(f.events), /Synthetic ACME/); assert.doesNotMatch(JSON.stringify(f.stored), /Synthetic ACME|telecom.collections|inputTokens/)
})
test('cancellation while model is in flight publishes no facts and starts no reader', async () => {
  const f = fixture(); let reads = 0
  const original = f.provider.createTurn.bind(f.provider)
  f.provider.createTurn = async (...args) => { f.controller.abort(); return original(...args) }
  f.deps.readers.collection = async () => { reads++; throw new Error('must_not_execute') }
  await executeApplicationReadTurnV2(input, f.deps, f.provider, f.service, f.controller.signal, f.emit)
  assert.equal(reads, 0); assert.deepEqual(f.events.map(e => e.type), ['started', 'cancelled']); assert.doesNotMatch(JSON.stringify(f.events), /Synthetic ACME/)
})
test('late durable turn conflict prevents final factual blocks', async () => {
  const f = fixture()
  const conflict = new ConversationServiceV2({ authority: f.deps.authority, invoke: async () => ({ data: null, error: { code: '40001' } }) })
  await executeApplicationReadTurnV2(input, f.deps, f.provider, conflict, f.controller.signal, f.emit)
  assert.deepEqual(f.events.map(e => e.type), ['started', 'failed']); assert.doesNotMatch(JSON.stringify(f.events), /Synthetic ACME/)
})
test('server calendar respects Europe/Madrid date and DST without model authority', () => {
  assert.deepEqual(assistantCalendarV2(new Date('2026-10-06T22:30:00Z')), { date: '2026-10-07', timezone: 'Europe/Madrid' })
  assert.deepEqual(assistantCalendarV2(new Date('2026-01-06T22:30:00Z')), { date: '2026-01-06', timezone: 'Europe/Madrid' })
  assert.throws(() => assistantCalendarV2(new Date(), 'invalid/timezone'))
})
