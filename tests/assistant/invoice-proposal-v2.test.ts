import assert from 'node:assert/strict'
import test from 'node:test'
import { decimalUnitsV2, prepareInvoiceProposalV2, type InvoiceProposalDependenciesV2 } from '../../src/assistant/invoice-proposal-v2.ts'
import { calculateBillingV1 } from '../../src/lib/server/billing-runtime-v1.ts'
const customerId = '00000000-0000-4000-8000-000000000001'
const scope = { actorId: 'a', workspaceId: 'w', role: 'admin', epoch: 'e' }
const intent = { customerHandle: 'server-customer', currency: 'EUR', issueOn: '2026-10-06', dueOn: null, series: 'F', lines: [{ description: 'Instalación', quantity: '1', unitPrice: '300', discountPercent: '0', taxPercent: '21', withholdingPercent: '0' }] }
function deps(): InvoiceProposalDependenciesV2 { return { offeredHandles: ['server-customer'], scope: async () => scope, resolveCustomer: async () => customerId,
  propose: async input => ({ ok: true, data: { contract_version: 'billing.v1', operation: 'invoice.propose', ...input, totals: calculateBillingV1(input.draft.lines), requires_review: true, saved: false } }) } }
test('exact Spanish decimals reject ambiguous separators, rounding and negative amounts', () => {
  assert.equal(decimalUnitsV2('300', 2, 100000), 30000); assert.equal(decimalUnitsV2('21,25', 2, 10000), 2125)
  assert.equal(decimalUnitsV2('2.125', 3, 100000), 2125)
  for (const value of ['1.001', '-1', '1e3', '1,000.00', '01', 'NaN']) assert.equal(decimalUnitsV2(value, 2, 100000), null)
})
test('300EUR +21% produces authoritative363EUR proposal without save or issue', async () => {
  const result = await prepareInvoiceProposalV2(intent, deps())
  assert.equal(result.status, 'review')
  if (result.status === 'review') { assert.equal(result.proposal.totals.total_minor, 36300); assert.equal(result.saved, false); assert.equal(result.issueRequiresSeparateConfirmation, true); assert.equal('number' in result.proposal, false) }
})
test('two45EUR lines and1200EUR with15% withholding calculate deterministically', async () => {
  for (const [quantity, price, withholding, expected] of [['2','45','0',9000],['1','1200','15',102000]] as const) {
    const result = await prepareInvoiceProposalV2({ ...intent, lines: [{ ...intent.lines[0], quantity, unitPrice: price, taxPercent: '0', withholdingPercent: withholding }] }, deps())
    assert.equal(result.status, 'review'); if (result.status === 'review') assert.equal(result.proposal.totals.total_minor, expected)
  }
})
test('unknown tax/customer/series clarifies without guessing or calling backend', async () => {
  const d = deps(); let calls = 0; d.propose = async () => { calls++; throw Error() }
  const result = await prepareInvoiceProposalV2({ ...intent, series: null, lines: [{ ...intent.lines[0], taxPercent: null }] }, d)
  assert.equal(result.status, 'clarify'); if (result.status === 'clarify') assert.deepEqual(result.missingFields, ['series','lines.0.taxPercent'])
  assert.equal(calls, 0)
})
test('model IDs, invoice number, tenant or forged confirmation are rejected', async () => {
  for (const extra of [{ customer_id: customerId }, { workspaceId: 'foreign' }, { number: 'F2026-1' }, { confirmationId: 'forged' }]) assert.equal((await prepareInvoiceProposalV2({ ...intent, ...extra }, deps())).status, 'invalid_intent')
  assert.equal((await prepareInvoiceProposalV2({ ...intent, customerHandle: 'forged' }, deps())).status, 'invalid_intent')
})
test('viewer/member or revoked/cross-tenant scope cannot propose billing', async () => {
  for (const role of ['viewer','member']) { const d = deps(); d.scope = async () => ({ ...scope, role }); assert.equal((await prepareInvoiceProposalV2(intent,d)).status, 'forbidden') }
  const d = deps(); let live = scope; d.scope = async () => live; d.propose = async () => { live = { ...scope, workspaceId: 'foreign' }; return {} }
  assert.equal((await prepareInvoiceProposalV2(intent,d)).status, 'forbidden')
})
test('backend corrupted total, extra field or saved=true fails closed', async () => {
  for (const patch of [{ totals: { subtotal_minor: 30000, tax_minor: 6300, withholding_minor: 0, total_minor: 1 } }, { private_notes: 'private' }, { saved: true }]) {
    const d = deps(), normal = d.propose
    d.propose = async input => { const response = await normal(input) as { ok: boolean; data: object }; return { ...response, data: { ...response.data, ...patch } } }
    assert.equal((await prepareInvoiceProposalV2(intent,d)).status, 'unavailable')
  }
})
