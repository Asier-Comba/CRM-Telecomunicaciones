import assert from 'node:assert/strict'
import test from 'node:test'
import { productCapabilityV2, productPlannerCatalogV2 } from '../../src/assistant/product-capabilities-v2.ts'
import { parseProductReadPlanV2 } from '../../src/assistant/product-read-plan-v2.ts'
import { executeProductReadPlanV2, type ProductReadDependenciesV2 } from '../../src/assistant/product-read-executor-v2.ts'
import { composeProductResponseV2 } from '../../src/assistant/product-response-v2.ts'
import { runProductReadTurnV2 } from '../../src/assistant/product-read-turn-v2.ts'
import type { AiProvider, AiTurnInput } from '../../src/assistant/providers/ai-provider.ts'

const capability = 'crm.billing.monthly_series'
const input = { currency: 'EUR', from_month: '2026-01-01', to_month: '2026-02-01' }
const args = (value: Record<string, string | number> = input) => Object.entries(value).map(([field, value]) => ({ field, value }))
const node = { id: 'billing', capability, arguments: args(), bindings: [] }
const plan = { version: 2, decision: 'plan', nodes: [node] }
const authority = { actorId: 'actor-a', workspaceId: 'workspace-a', scopeEpoch: 'epoch-a', role: 'owner' }
const zero = { issued_minor: '0', paid_minor: '0', outstanding_minor: '0', overdue_minor: '0' }
const huge = { issued_minor: '9007199254740993123', paid_minor: '123', outstanding_minor: '9007199254740993000', overdue_minor: '9007199254740993000' }
const data = { contract_version: 'billing.analytics.v1', operation: 'billing.monthly_series', basis: 'issue_month_cohort_current_status',
  as_of: '2026-10-11', ...input, items: [{ month: input.from_month, ...huge }, { month: input.to_month, ...zero }] }
function fixture(result: unknown = { ok: true, data }) {
  let live: typeof authority | null = authority, calls = 0, bindings = 0
  const deps: ProductReadDependenciesV2 = { authority: async () => live, now: () => new Date('2026-10-11T18:00:00Z'),
    offeredHandles: ['customer-ref'], resolveReference: async () => { bindings++; return '00000000-0000-4000-8000-000000000001' },
    readers: { collection: async () => { calls++; return {} }, report: async () => { calls++; return {} },
      billingAnalytics: async (operation, received) => { calls++; assert.equal(operation, 'billing.monthly_series'); assert.equal((received as typeof input).currency, 'EUR'); return result } } }
  return { deps, setAuthority: (value: typeof authority | null) => { live = value }, calls: () => calls, bindings: () => bindings }
}

test('billing capability restricts role, dense range and current-status cohort without registering payments or top customers', () => {
  assert.deepEqual(productCapabilityV2(capability)!.roles, ['owner', 'admin'])
  for (const role of ['member', 'viewer', 'unknown']) assert.equal(productPlannerCatalogV2(role).some(c => c.name === capability), false)
  for (const role of ['owner', 'admin']) assert.equal(productPlannerCatalogV2(role).some(c => c.name === capability), true)
  assert.equal(productCapabilityV2('crm.billing.top_customers'), null)
  assert.equal(productCapabilityV2('crm.invoice.mark_paid'), null)
})

test('missing currency, cash semantics, excessive or reversed months and model-chosen customer IDs reject before execution', () => {
  for (const value of [{ from_month: input.from_month, to_month: input.to_month }, { ...input, currency: 'ALL' },
    { ...input, from_month: '2026-01-02' }, { ...input, from_month: '2026-02-30' }, { ...input, to_month: '2028-01-01' },
    { ...input, to_month: '2025-12-01' }, { ...input, basis: 'cash_payments' }, { ...input, limit: 1 },
    { ...input, customer_id: '00000000-0000-4000-8000-000000000001' }])
    assert.equal(parseProductReadPlanV2({ ...plan, nodes: [{ ...node, arguments: args(value) }] }, []), null)
})

test('member/viewer forbidden mixed plans stop before any reader or reference resolution', async () => {
  for (const role of ['member', 'viewer']) {
    const f = fixture(); f.setAuthority({ ...authority, role })
    const mixed = { ...plan, nodes: [{ id: 'clients', capability: 'crm.customer.list', arguments: [], bindings: [] },
      { ...node, bindings: [{ field: 'customer_id', handle: 'customer-ref', nodeId: null }] }] }
    assert.deepEqual(await executeProductReadPlanV2(mixed, f.deps), { status: 'abstain', evidence: [] })
    assert.equal(f.calls(), 0); assert.equal(f.bindings(), 0)
  }
})

test('owner/admin validated cohort yields exact money, currency-labelled columns and source as_of without claiming cash receipts', async () => {
  for (const role of ['owner', 'admin']) {
    const f = fixture(); f.setAuthority({ ...authority, role })
    const result = await executeProductReadPlanV2(plan, f.deps), response = composeProductResponseV2(result, 'request-a')
    assert.equal(response.grounded, true); assert.equal(f.calls(), 1)
    assert.equal(response.blocks[0].rows[0].issued_minor, '90071992547409931,23')
    assert.equal(response.blocks[0].rows[0].paid_minor, '1,23')
    assert.equal(response.blocks[0].rows[1].issued_minor, '0,00')
    assert.equal(response.blocks[0].columns.find(c => c.field === 'paid_minor')?.label, 'Marcado como pagado (EUR)')
    assert.match(response.blocks[0].title, /mes de emisión · estado actual/)
    assert.equal(response.sources[0].asOf, data.as_of); assert.equal(response.sources[0].partial, false)
  }
})

test('non-dense months, wrong currency/basis, failed equations, fiscal extras and unavailable readers never become zero facts', async () => {
  for (const result of [{ ok: false, error: 'access_denied' }, { ok: true, data: { ...data, items: [] } },
    { ok: true, data: { ...data, currency: 'USD' } }, { ok: true, data: { ...data, basis: 'cash_payments' } },
    { ok: true, data: { ...data, items: data.items.slice(1) } }, { ok: true, data: { ...data, items: [...data.items].reverse() } },
    { ok: true, data: { ...data, items: [{ ...data.items[0], issued_minor: '9007199254740993124' }, data.items[1]] } },
    { ok: true, data: { ...data, items: [{ ...data.items[0], tax_id: 'private' }, data.items[1]] } }]) {
    const result_ = await executeProductReadPlanV2(plan, fixture(result).deps)
    assert.deepEqual(result_, { status: 'unavailable', evidence: [] })
    assert.deepEqual(composeProductResponseV2(result_, 'request-a').blocks, [])
  }
  const f = fixture(); delete f.deps.readers.billingAnalytics
  assert.equal((await executeProductReadPlanV2(plan, f.deps)).status, 'unavailable'); assert.equal(f.calls(), 0)
})

test('membership/actor/workspace/epoch revocation during billing read discards every financial fact', async () => {
  for (const changed of [null, { ...authority, role: 'member' }, { ...authority, actorId: 'other' },
    { ...authority, workspaceId: 'other' }, { ...authority, scopeEpoch: 'revoked' }]) {
    const f = fixture(); f.deps.readers.billingAnalytics = async () => { f.setAuthority(changed); return { ok: true, data } }
    assert.deepEqual(await executeProductReadPlanV2(plan, f.deps), { status: 'access_changed', evidence: [] })
  }
})

test('customer reference is reauthorized and bound by server; foreign references never query billing', async () => {
  const bound = { ...plan, nodes: [{ ...node, bindings: [{ field: 'customer_id', handle: 'customer-ref', nodeId: null }] }] }
  const f = fixture(); let received: unknown
  f.deps.readers.billingAnalytics = async (_, value) => { received = value; return { ok: true, data } }
  assert.equal((await executeProductReadPlanV2(bound, f.deps)).status, 'completed')
  assert.equal((received as { customer_id: string }).customer_id, '00000000-0000-4000-8000-000000000001')
  const denied = fixture(); denied.deps.resolveReference = async () => null
  assert.equal((await executeProductReadPlanV2(bound, denied.deps)).status, 'access_changed'); assert.equal(denied.calls(), 0)
})

test('semantic provider receives role-filtered capabilities; hallucinated billing plan cannot elevate member authority', async () => {
  const f = fixture(); f.setAuthority({ ...authority, role: 'member' })
  let seen: AiTurnInput | null = null
  const provider: AiProvider = { name: 'synthetic.billing-test', status: 'ready', evidenceMode: 'synthetic', cancel() {},
    streamTurn: async function* () {}, createTurn: async input => { seen = input; return { ok: true, value: plan,
      model: 'synthetic', usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, durationMs: 0 } } }
  const result = await runProductReadTurnV2('Facturación mensual EUR', 'request-a', provider, f.deps, { date: '2026-10-11', timezone: 'Europe/Madrid' })
  assert.equal(result.status, 'abstain'); assert.equal(result.telemetry.liveModelEvidence, false); assert.equal(f.calls(), 0)
  assert.ok(seen); assert.equal((JSON.parse((seen as AiTurnInput).context).capabilities as { name: string }[]).some(c => c.name === capability), false)
})
