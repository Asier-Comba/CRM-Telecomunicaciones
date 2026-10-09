import { parseBillingQueryV1, parseBillingReadV1 } from '../lib/server/billing-query-runtime-v1.ts'
import { calculateBillingV1 } from '../lib/server/billing-runtime-v1.ts'
import { snapshotProductJsonV1 } from '../lib/server/product-query-runtime-v1.ts'
import { containsHighConfidenceSecret } from './schema.ts'
import type { BillingDraftV1, BillingReadDataV1 } from '../lib/contracts/billing-v1'
export type InvoiceIntentV2 = { customerHandle: string | null; currency: 'EUR' | 'USD' | 'GBP' | null; issueOn: string | null; dueOn: string | null;
  series: string | null; lines: { description: string; quantity: string | null; unitPrice: string | null; discountPercent: string | null; taxPercent: string | null; withholdingPercent: string | null }[] }
export type InvoiceProposalV2 =
  | { status: 'clarify'; missingFields: string[]; saved: false }
  | { status: 'unavailable' | 'forbidden' | 'invalid_intent'; saved: false }
  | { status: 'review'; proposal: Extract<BillingReadDataV1, { operation: 'invoice.propose' }>; saved: false; requiresReview: true; issueRequiresSeparateConfirmation: true }
export type InvoiceProposalDependenciesV2 = {
  /** Fresh current-cookie identity/membership; never sourced from intent. */
  scope(): Promise<{ actorId: string; workspaceId: string; role: string; epoch: string } | null>
  resolveCustomer(handle: string): Promise<string | null>
  propose(input: { source: 'text'; draft: BillingDraftV1 }): Promise<unknown>
  offeredHandles: readonly string[]
}
/** Exact decimal parser. No float arithmetic, silent rounding or inferred tax. */
export function decimalUnitsV2(value: unknown, scale: number, max: number): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,9})([.,][0-9]{1,3})?$/.test(value) || ![2, 3].includes(scale)) return null
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  if (fraction.length > scale) return null
  const units = BigInt(whole) * BigInt(10 ** scale) + BigInt(fraction.padEnd(scale, '0') || '0')
  return units <= BigInt(max) ? Number(units) : null
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const exact = (v: Record<string, unknown>, fields: string[]) => Object.keys(v).sort().join(',') === fields.sort().join(',')
const same = (a: Awaited<ReturnType<InvoiceProposalDependenciesV2['scope']>>, b: NonNullable<typeof a>) => a?.actorId === b.actorId && a?.workspaceId === b.workspaceId && a?.role === b.role && a?.epoch === b.epoch
/** This flow is nonmutating. Backend normalized totals are authoritative; no
 * invoice number/allocation, issuer/fiscal PII or issue command enters LLM. */
export async function prepareInvoiceProposalV2(raw: unknown, deps: InvoiceProposalDependenciesV2): Promise<InvoiceProposalV2> {
  const invalid: InvoiceProposalV2 = { status: 'invalid_intent', saved: false }
  try {
    const intent = snapshotProductJsonV1(raw)
    if (!object(intent) || !exact(intent, ['customerHandle', 'currency', 'issueOn', 'dueOn', 'series', 'lines']) || !Array.isArray(intent.lines) || intent.lines.length > 100 || containsHighConfidenceSecret(intent)) return invalid
    for (const key of ['customerHandle', 'currency', 'issueOn', 'dueOn', 'series']) if (intent[key] !== null && typeof intent[key] !== 'string') return invalid
    const missingFields: string[] = []
    for (const key of ['customerHandle', 'currency', 'issueOn', 'series']) if (intent[key] === null) missingFields.push(key)
    if (intent.lines.length === 0) missingFields.push('lines')
    const lines = []
    for (const [index, line] of intent.lines.entries()) {
      if (!object(line) || !exact(line, ['description', 'quantity', 'unitPrice', 'discountPercent', 'taxPercent', 'withholdingPercent']) || typeof line.description !== 'string' || !line.description.trim() || line.description.length > 240) return invalid
      for (const key of ['quantity', 'unitPrice', 'discountPercent', 'taxPercent', 'withholdingPercent']) {
        if (line[key] === null) missingFields.push(`lines.${index}.${key}`)
        else if (typeof line[key] !== 'string') return invalid
      }
      if (Object.values(line).includes(null)) continue
      const quantity = decimalUnitsV2(line.quantity, 3, 100000000), price = decimalUnitsV2(line.unitPrice, 2, 1000000000000)
      const discount = decimalUnitsV2(line.discountPercent, 2, 10000), tax = decimalUnitsV2(line.taxPercent, 2, 10000), withholding = decimalUnitsV2(line.withholdingPercent, 2, 10000)
      if (quantity === null || quantity === 0 || price === null || discount === null || tax === null || withholding === null) return invalid
      lines.push({ description: line.description, quantity_milli: quantity, unit_price_minor: price, discount_bps: discount, tax_bps: tax, withholding_bps: withholding })
    }
    if (missingFields.length) return { status: 'clarify', missingFields, saved: false }
    if (typeof intent.customerHandle !== 'string' || !deps.offeredHandles.includes(intent.customerHandle)) return invalid
    const scope = await deps.scope(); if (!scope || !['owner', 'admin'].includes(scope.role)) return { status: 'forbidden', saved: false }
    const customerId = await deps.resolveCustomer(intent.customerHandle)
    if (!customerId || !same(await deps.scope(), scope)) return { status: 'forbidden', saved: false }
    const draft = { customer_id: customerId, currency: intent.currency, issue_on: intent.issueOn, due_on: intent.dueOn, series: intent.series, lines }
    const parsed = parseBillingQueryV1('invoice.propose', { source: 'text', draft }); if (!parsed) return invalid
    const totals = calculateBillingV1(lines); if (!totals) return invalid
    if (!same(await deps.scope(), scope)) return { status: 'forbidden', saved: false }
    const rawResponse = await deps.propose(parsed as { source: 'text'; draft: BillingDraftV1 })
    if (!same(await deps.scope(), scope)) return { status: 'forbidden', saved: false }
    const result = snapshotProductJsonV1(rawResponse)
    if (!object(result) || !exact(result, ['ok', 'data']) || result.ok !== true) return { status: 'unavailable', saved: false }
    const proposal = parseBillingReadV1('invoice.propose', parsed, result.data)
    if (!proposal || proposal.operation !== 'invoice.propose' || JSON.stringify(proposal.totals) !== JSON.stringify(totals)) return { status: 'unavailable', saved: false }
    return { status: 'review', proposal, saved: false, requiresReview: true, issueRequiresSeparateConfirmation: true }
  } catch { return { status: 'unavailable', saved: false } }
}
