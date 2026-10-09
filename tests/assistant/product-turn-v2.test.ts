import assert from 'node:assert/strict'
import test from 'node:test'
import type { AiProvider, AiTurnInput } from '../../src/assistant/providers/ai-provider.ts'
import { runProductReadTurnV2 } from '../../src/assistant/product-read-turn-v2.ts'
import { composeProductResponseV2 } from '../../src/assistant/product-response-v2.ts'
import { executeProductReadPlanV2, type ProductReadDependenciesV2 } from '../../src/assistant/product-read-executor-v2.ts'
const plan = { version: 2, decision: 'plan', nodes: [{ id: 'contacts', capability: 'crm.contact.list', arguments: [], bindings: [] }] }
const authority = { actorId: 'private-actor', workspaceId: 'private-workspace', role: 'member', scopeEpoch: 'private-epoch' }
const data = { contract_version: 'telecom.collections.v1', operation: 'contact.list', items: [], next_id: null }
const deps = (): ProductReadDependenciesV2 => ({ authority: async () => authority, now: () => new Date('2026-10-06T20:00:00Z'), offeredHandles: [], resolveReference: async () => null,
  readers: { collection: async () => ({ ok: true, data }), report: async () => ({ ok: false, error: 'unavailable' }) } })
function provider(value: unknown): AiProvider { return { name: 'synthetic.scripted', status: 'ready', evidenceMode: 'synthetic',
  createTurn: async () => ({ ok: true, value, model: 'synthetic', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, durationMs: 1 }),
  streamTurn: async function* () {}, cancel() {} } }
test('one semantic provider plan executes authorized current capability; no raw CRM text is fed back', async () => {
  const p = provider(plan); let calls = 0
  p.createTurn = async (input: AiTurnInput) => { calls++; assert.equal(input.context.includes('private-workspace'), false); assert.equal(input.context.includes('private-actor'), false)
    return { ok: true, value: plan, model: 'synthetic', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, durationMs: 1 } }
  const result = await runProductReadTurnV2('Enséñame contactos', 'request-a', p, deps(), { date: '2026-10-06', timezone: 'Europe/Madrid' })
  assert.equal(result.status, 'completed'); assert.equal(calls, 1); assert.equal(result.telemetry.liveModelEvidence, false)
})
test('hallucinated capability yields invalid_plan and zero server calls', async () => {
  const d = deps(); let calls = 0; d.readers.collection = async () => { calls++; return {} }
  const result = await runProductReadTurnV2('haz SQL', 'request-a', provider({ ...plan, nodes: [{ ...plan.nodes[0], capability: 'sql.arbitrary' }] }), d, { date: '2026-10-06', timezone: 'Europe/Madrid' })
  assert.equal(result.status, 'invalid_plan'); assert.equal(calls, 0)
})
test('revocation while semantic provider is pending prevents all CRM reads', async () => {
  const d = deps(); let live: typeof authority | null = authority, calls = 0; d.authority = async () => live
  d.readers.collection = async () => { calls++; return {} }
  const p = provider(plan), normal = p.createTurn; p.createTurn = async input => { live = null; return normal(input) }
  assert.equal((await runProductReadTurnV2('contactos', 'request-a', p, d, { date: '2026-10-06', timezone: 'Europe/Madrid' })).status, 'access_changed'); assert.equal(calls, 0)
})
test('structured UI requires runtime-issued evidence, human labels and partiality; unknown never becomes none', async () => {
  const d = deps(), id = '00000000-0000-4000-8000-000000000001'
  d.readers.collection = async () => ({ ok: true, data: { ...data, items: [{ id, version: 1, customer_id: id, display_name: 'ACME', job_title: null, status: 'active', is_primary: true, has_email: true, has_phone: false }], next_id: id } })
  const execution = await executeProductReadPlanV2({ ...plan, nodes: [{ ...plan.nodes[0], arguments: [{ field: 'limit', value: 1 }] }] }, d)
  const response = composeProductResponseV2(execution, 'request-a')
  assert.equal(response.sources[0]?.label, 'Contactos'); assert.equal(response.blocks[0]?.partial, true); assert.equal(JSON.stringify(response.blocks).includes(id), false)
  assert.equal(response.blocks[0]?.columns.some(c => c.label === 'Nombre'), true)
  const forged = composeProductResponseV2({ status: 'completed', evidence: [] }, 'request-a')
  assert.equal(forged.grounded, false)
  const unavailable = composeProductResponseV2({ status: 'unavailable', evidence: [] }, 'request-a'); assert.equal(unavailable.grounded, false); assert.deepEqual(unavailable.blocks, [])
})
