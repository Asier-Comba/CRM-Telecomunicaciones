import test from 'node:test'
import assert from 'node:assert/strict'
import { parseConversationInputV2, parseConversationResultV2 } from '../../src/assistant/conversation-contract-v2.ts'
import { ConversationServiceV2 } from '../../src/assistant/conversation-service-v2.ts'
const id = '93000000-0000-4000-8000-000000000001', turn = '94000000-0000-4000-8000-000000000001'
const scope = { actorId: 'actor', workspaceId: 'workspace', scopeEpoch: 'epoch_1', role: 'member' }
const record = { id, title: 'Seguimiento', archived: false, version: 1, created_at: '2026-10-06T12:00:00Z', updated_at: '2026-10-06T12:00:00Z' }
test('closed conversation inputs reject authority, secret values, forged IDs and hidden traces', () => {
  for (const input of [{ id, title: 'Seguimiento', workspace_id: 'foreign' }, { id: 'fabricated', title: 'Seguimiento' }, { id, title: `Bearer ${'A'.repeat(30)}` }, { id, title: 'Seguimiento', provider_trace: {} }]) assert.equal(parseConversationInputV2('thread.create', input), null)
  assert.equal(parseConversationInputV2('thread.create', { id, title: 'Seguimiento' })?.id, id)
})
test('conversation lifecycle input requires closed terminal state and explicit revision', () => {
  assert.equal(parseConversationInputV2('thread.archive', { id }), null)
  assert.equal(parseConversationInputV2('thread.rename', { id, expected_version: 1.5, title: 'Nueva' }), null)
  for (const input of [{ id, turn_id: turn, status: 'completed' }, { id, turn_id: turn, status: 'cancelled', answer: 'invented' }, { id, turn_id: turn, status: 'failed', failure_code: 'raw_provider_error' }]) assert.equal(parseConversationInputV2('turn.finish', input), null)
})
test('persisted display output cannot include authority/provider/raw CRM extras', () => {
  const input = { id }
  assert.ok(parseConversationResultV2('thread.get', input, { contract: 'assistant.thread.v2', record }))
  for (const row of [{ ...record, actor_id: 'foreign' }, { ...record, workspace_id: 'foreign' }, { ...record, model_trace: {} }, { ...record, title: `sk-proj-${'x'.repeat(40)}` }]) assert.equal(parseConversationResultV2('thread.get', input, { contract: 'assistant.thread.v2', record: row }), null)
})
test('chronological message page preserves historical marker and rejects broken cursor/order', () => {
  const message = { id, turn_id: turn, sequence: 2, role: 'user', content: '¿Qué tengo hoy?', created_at: record.created_at }
  const page = { contract: 'assistant.messages.v2', items: [message], next_sequence: 2, historical: true }
  assert.ok(parseConversationResultV2('message.page', { id, limit: 1, after_sequence: 1 }, page))
  assert.equal(parseConversationResultV2('message.page', { id, limit: 1 }, { ...page, historical: false }), null)
  assert.equal(parseConversationResultV2('message.page', { id, limit: 1 }, { ...page, next_sequence: 8 }), null)
  assert.equal(parseConversationResultV2('message.page', { id, after_sequence: 2 }, page), null)
})
test('scope revocation after persistence hides the result; body cannot select tenant', async () => {
  let calls = 0, queries = 0
  const service = new ConversationServiceV2({ authority: async () => ++calls === 1 ? scope : { ...scope, scopeEpoch: 'epoch_2' }, invoke: async (workspace) => { queries++; assert.equal(workspace, scope.workspaceId); return { data: { contract: 'assistant.thread.v2', record }, error: null } } })
  assert.deepEqual(await service.execute('thread.get', { id, workspace_id: 'foreign' }), { ok: false, error: 'validation' }); assert.equal(queries, 0)
  assert.deepEqual(await service.execute('thread.get', { id }), { ok: false, error: 'access_changed' })
})
test('repository errors have a safe closed contract and replay is tied to exact turn', async () => {
  const service = new ConversationServiceV2({ authority: async () => scope, invoke: async () => ({ data: null, error: { code: '40001' } }) })
  assert.deepEqual(await service.execute('turn.start', { id, turn_id: turn, text: 'Lee tareas' }), { ok: false, error: 'conflict' })
  assert.equal(parseConversationResultV2('turn.start', { id, turn_id: turn, text: 'Lee tareas' }, { contract: 'assistant.turn.v2', id, status: 'running', replay: true }), null)
})
