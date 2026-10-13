import assert from 'node:assert/strict'
import test from 'node:test'
import { productCapabilityV2 } from '../../src/assistant/product-capabilities-v2.ts'
import { parseProductReadPlanV2 } from '../../src/assistant/product-read-plan-v2.ts'
import { executeProductReadPlanV2, type ProductReadDependenciesV2 } from '../../src/assistant/product-read-executor-v2.ts'
import { composeProductResponseV2 } from '../../src/assistant/product-response-v2.ts'
const customer = 'd4000000-0000-4000-8000-000000000001'
const authority = { actorId: 'actor-a', workspaceId: 'workspace-a', scopeEpoch: 'epoch-a', role: 'owner' }
const row = { id: 'f6000000-0000-4000-8000-000000000001', version: 1, customer_id: customer,
  operator_id: 'e5000000-0000-4000-8000-000000000001', kind: 'physical', display_label: 'Tarjeta comercial', status: 'prepared', source: 'manual',
  masked_iccid: '••••123', masked_eid: null, assigned_line_id: null, activated_at: null, replaced_at: null, deactivated_at: null, cancelled_at: null,
  created_at: '2026-10-12T00:00:00Z', updated_at: '2026-10-12T00:00:00Z' }
const page = { contract_version: 'sim.v1', operation: 'sim.list', items: [row], next_id: null }
const node = { id: 'sims', capability: 'crm.sim.list', arguments: [{ field: 'limit', value: 1 }], bindings: [] }
const plan = { version: 2, decision: 'plan', nodes: [node] }
function fixture(result: unknown = { ok: true, data: page }) {
  let live: typeof authority | null = authority, calls = 0
  const deps: ProductReadDependenciesV2 = { authority: async () => live, offeredHandles: ['customer_ref'],
    resolveReference: async () => customer, now: () => new Date('2026-10-12T01:00:00Z'),
    readers: { collection: async () => { throw Error('collection_not_requested') }, report: async () => { throw Error('report_not_requested') },
      simInventory: async (operation) => { assert.equal(operation, 'sim.list'); calls++; return result } } }
  return { deps, calls: () => calls, setAuthority: (value: typeof authority | null) => { live = value } }
}

test('SIM inventory registers one minimized read, no protected reveal or activation', () => {
  const cap = productCapabilityV2('crm.sim.list')!
  assert.deepEqual(cap.roles, ['owner', 'admin', 'member', 'viewer'])
  assert.equal(cap.family, 'sim_inventory'); assert.equal(cap.enabled.prod, false)
  for (const name of ['crm.sim.get', 'crm.sim.history', 'crm.sim.activate', 'crm.sim.replace', 'crm.identifier.reveal']) assert.equal(productCapabilityV2(name), null)
  for (const fields of [[{ field: 'customer_id', value: customer }], [{ field: 'after_id', value: row.id }],
    [{ field: 'kind', value: 'virtual' }], [{ field: 'limit', value: 101 }], [{ field: 'pin', value: '1234' }]])
    assert.equal(parseProductReadPlanV2({ ...plan, nodes: [{ ...node, arguments: fields }] }, []), null)
})

test('every allowed role receives validated masked minimal fields and registered-state Spanish labels', async () => {
  for (const role of ['owner', 'admin', 'member', 'viewer']) {
    const f = fixture(); f.setAuthority({ ...authority, role })
    const result = await executeProductReadPlanV2(plan, f.deps); assert.equal(result.status, 'completed')
    if (result.status !== 'completed') throw Error('expected_completed')
    const fields = Object.keys((result.evidence[0].data.items as object[])[0]).sort()
    assert.deepEqual(fields, ['id', 'display_label', 'kind', 'status', 'source', 'masked_iccid', 'masked_eid'].sort())
    const response = composeProductResponseV2(result, 'request-a')
    assert.equal(response.blocks[0].title, 'SIM/eSIM registradas'); assert.equal(response.blocks[0].rows[0].status, 'Preparada')
    assert.equal(response.blocks[0].rows[0].kind, 'Física'); assert.equal(response.blocks[0].rows[0].masked_iccid, '••••123')
    assert.equal(response.blocks[0].rows[0].masked_eid, null); assert.equal(response.sources[0].asOf, null)
    assert.equal(JSON.stringify(response).includes(customer), false); assert.equal(JSON.stringify(response).includes(row.id), false)
  }
})

test('raw identifiers, fiscal extras, invalid timestamps/state/cursor and corrupt pages fail closed, never become empty facts', async () => {
  for (const data of [{ ...page, items: [{ ...row, masked_iccid: '8912345678901234567' }] },
    { ...page, items: [{ ...row, masked_eid: '12345678901234567890123456789012' }] },
    { ...page, items: [{ ...row, pin: '1234' }] }, { ...page, items: [{ ...row, status: 'active' }] },
    { ...page, items: [{ ...row, updated_at: '2026-10-11T00:00:00Z' }] }, { ...page, next_id: customer },
    { ...page, items: [row, row] }, { ...page, operation: 'sim.get' }]) {
    const result = await executeProductReadPlanV2(plan, fixture({ ok: true, data }).deps)
    assert.deepEqual(result, { status: 'unavailable', evidence: [] }); assert.deepEqual(composeProductResponseV2(result, 'request-a').blocks, [])
  }
  const absent = fixture(); delete absent.deps.readers.simInventory
  assert.equal((await executeProductReadPlanV2(plan, absent.deps)).status, 'unavailable'); assert.equal(absent.calls(), 0)
})

test('page cursor stays partial and a genuine validated empty collection stays distinct from denied reads', async () => {
  const partial = await executeProductReadPlanV2(plan, fixture({ ok: true, data: { ...page, next_id: row.id } }).deps)
  assert.equal(composeProductResponseV2(partial, 'request-a').sources[0].partial, true)
  const empty = await executeProductReadPlanV2(plan, fixture({ ok: true, data: { ...page, items: [] } }).deps)
  assert.equal(empty.status, 'completed'); assert.deepEqual(composeProductResponseV2(empty, 'request-a').blocks[0].rows, [])
  assert.equal((await executeProductReadPlanV2(plan, fixture({ ok: false, error: 'access_denied' }).deps)).status, 'unavailable')
})

test('foreign client reference never queries SIM and filtered wrong-customer rows cannot become evidence', async () => {
  const bound = { ...plan, nodes: [{ ...node, bindings: [{ field: 'customer_id', handle: 'customer_ref', nodeId: null }] }] }
  const foreign = fixture(); foreign.deps.resolveReference = async () => null
  assert.equal((await executeProductReadPlanV2(bound, foreign.deps)).status, 'access_changed'); assert.equal(foreign.calls(), 0)
  const corrupt = fixture({ ok: true, data: { ...page, items: [{ ...row, customer_id: 'd4000000-0000-4000-8000-000000000002' }] } })
  assert.equal((await executeProductReadPlanV2(bound, corrupt.deps)).status, 'unavailable')
})

test('authority changes during SIM read discard all facts and unknown role starts no reader', async () => {
  for (const changed of [null, { ...authority, workspaceId: 'other' }, { ...authority, actorId: 'other' },
    { ...authority, role: 'viewer' }, { ...authority, scopeEpoch: 'revoked' }]) {
    const f = fixture(); f.deps.readers.simInventory = async () => { f.setAuthority(changed); return { ok: true, data: page } }
    assert.deepEqual(await executeProductReadPlanV2(plan, f.deps), { status: 'access_changed', evidence: [] })
  }
  const unknown = fixture(); unknown.setAuthority({ ...authority, role: 'unknown' })
  assert.equal((await executeProductReadPlanV2(plan, unknown.deps)).status, 'access_changed'); assert.equal(unknown.calls(), 0)
})
