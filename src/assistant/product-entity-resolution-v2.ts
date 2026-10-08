import type { GlobalSearchInputV1 } from '../lib/contracts/product-dashboard-v2.ts'
import { parseGlobalSearchInputV1, parseGlobalSearchV1 } from '../lib/server/product-dashboard-runtime-v2.ts'
import { snapshotProductJsonV1 } from '../lib/server/product-query-runtime-v1.ts'
import type { ReadAuthorityV2 } from './product-read-executor-v2.ts'
import { boundedAwaitV2 } from './bounded-await-v2.ts'
import { isSafeEvidenceText } from './context-budget.ts'
import { containsHighConfidenceSecret } from './schema.ts'

export const PRODUCT_RESOLUTION_KINDS_V2 = Object.freeze(['customer', 'contract', 'service', 'line', 'opportunity'] as const)
export type ProductResolutionKindV2 = typeof PRODUCT_RESOLUTION_KINDS_V2[number]
export type ProductResolutionCandidateV2 = Readonly<{ kind: ProductResolutionKindV2; reference: string; label: string }>
export type ProductResolutionV2 =
  | Readonly<{ status: 'needs_selection' | 'no_match_in_bounded_search'; source: 'global.search'; trust: 'untrusted_crm_data'; partial: true;
      asOf: null; selectionRequired: true; candidates: readonly ProductResolutionCandidateV2[] }>
  | Readonly<{ status: 'invalid_input' | 'access_changed' | 'unavailable'; candidates: readonly [] }>
export type ProductEntityResolutionPortV2 = {
  /** Registered current-cookie server service only; no planner-selected URL/RPC. */
  search(input: GlobalSearchInputV1): Promise<unknown>
  authority(): Promise<ReadAuthorityV2 | null>
  /** Fresh point-read authorization must check kind, ID and customer ancestry. */
  authorizeCandidate(candidate: Readonly<{ kind: ProductResolutionKindV2; id: string; customerId: string }>, authority: ReadAuthorityV2): Promise<boolean>
  /** Server-issued scope/epoch-bound reference; never a model/browser ID. */
  issueReference(candidate: Readonly<{ kind: ProductResolutionKindV2; id: string; customerId: string }>, authority: ReadAuthorityV2, expiresAt: number): Promise<string | null>
  now(): number
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const same = (a: ReadAuthorityV2 | null, b: ReadAuthorityV2) => a !== null &&
  a.actorId === b.actorId && a.workspaceId === b.workspaceId && a.scopeEpoch === b.scopeEpoch && a.role === b.role

/** Inert integration seam, not an executable planner capability or persisted
 * selection. Existing W2 search is bounded and has no completeness/freshness
 * attestation: even one exact label MUST require selection. Zero matches never
 * prove nonexistence. Language interpretation stays in the semantic planner;
 * this function consumes only an extracted closed query/kind. */
export async function resolveProductEntityV2(raw: unknown, port: ProductEntityResolutionPortV2, signal?: AbortSignal): Promise<ProductResolutionV2> {
  const stop = (status: 'invalid_input' | 'access_changed' | 'unavailable'): ProductResolutionV2 => Object.freeze({ status, candidates: Object.freeze([] as const) })
  let input: unknown
  try { input = snapshotProductJsonV1(raw) } catch { return stop('invalid_input') }
  try {
    if (!object(input) || Object.keys(input).sort().join(',') !== 'kind,query' ||
      !PRODUCT_RESOLUTION_KINDS_V2.includes(input.kind as ProductResolutionKindV2) || containsHighConfidenceSecret(input)) return stop('invalid_input')
    const query = parseGlobalSearchInputV1({ query: input.query, limit: 35 })
    if (!query) return stop('invalid_input')
    const initial = await boundedAwaitV2(() => port.authority(), signal)
    if (!initial || !['owner', 'admin', 'member', 'viewer'].includes(initial.role)) return stop('access_changed')
    if ([initial.actorId, initial.workspaceId, initial.scopeEpoch].some(v => typeof v !== 'string' || !v.trim() || v.length > 160)) return stop('access_changed')
    const authority = Object.freeze({ actorId: initial.actorId, workspaceId: initial.workspaceId, scopeEpoch: initial.scopeEpoch, role: initial.role })
    const started = port.now()
    if (!Number.isSafeInteger(started) || started < 0 || !Number.isSafeInteger(started + 300_000)) return stop('unavailable')
    const expiresAt = started + 300_000
    const current = async () => {
      const live = await boundedAwaitV2(() => port.authority(), signal)
      const now = port.now()
      return !signal?.aborted && same(live, authority) && Number.isSafeInteger(now) && now >= started && now < expiresAt
    }
    if (!await current()) return stop('access_changed')
    const response = snapshotProductJsonV1(await boundedAwaitV2(() => port.search(query), signal))
    if (!await current()) return stop('access_changed')
    if (!object(response) || Object.keys(response).sort().join(',') !== 'data,ok' || response.ok !== true) return stop('unavailable')
    const data = parseGlobalSearchV1(query, response.data)
    if (!data) return stop('unavailable')
    // Contacts/invoices and all unrelated kinds never enter AI choices/context.
    const rows = data.items.filter(row => row.kind === input.kind)
    if (rows.some(row => !isSafeEvidenceText(row.label))) return stop('unavailable')
    const authorizedRows = rows.map(row => Object.freeze({ kind: row.kind as ProductResolutionKindV2, id: row.id, customerId: row.customer_id }))
    for (const candidate of authorizedRows) {
      if (!await current()) return stop('access_changed')
      const allowed = await boundedAwaitV2(() => port.authorizeCandidate(candidate, authority), signal)
      if (!await current() || allowed !== true) return stop('access_changed')
    }
    const candidates: ProductResolutionCandidateV2[] = []
    for (const [index, candidate] of authorizedRows.entries()) {
      if (!await current()) return stop('access_changed')
      const reference = await boundedAwaitV2(() => port.issueReference(candidate, authority, expiresAt), signal)
      if (!await current()) return stop('access_changed')
      if (typeof reference !== 'string' || !/^ref_[A-Za-z0-9_-]{32}$/.test(reference) || candidates.some(c => c.reference === reference)) return stop('unavailable')
      candidates.push(Object.freeze({ kind: candidate.kind, reference, label: rows[index]!.label }))
    }
    if (!await current()) return stop('access_changed')
    return Object.freeze({ status: candidates.length ? 'needs_selection' : 'no_match_in_bounded_search',
      source: 'global.search', trust: 'untrusted_crm_data', partial: true, asOf: null, selectionRequired: true, candidates: Object.freeze(candidates) })
  } catch { return stop('unavailable') }
}
