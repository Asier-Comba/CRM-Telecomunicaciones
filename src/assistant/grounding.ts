import { containsHighConfidenceSecret } from './schema.js'

/** Minimal model-facing projection of W1 telecom.v1, not an auth or DTO parser.
 * Invoke only after the server reader has authorized and validated its DTO.
 * Epoch is supplied by server context, never by a plan or browser request.
 * No capability refs, continuation tokens, revealed values or scope IDs leave here.
 */
export const GROUNDING_VERSION = 'assistant.grounding.v1' as const
const FIELDS = {
  customer: ['legal_name', 'trade_name', 'lifecycle', 'status'],
  contract: ['status', 'start_date', 'signed_date', 'end_date', 'cancelled_at'],
  service: ['display_name', 'service_kind', 'status', 'activated_on', 'ended_on'],
  line: ['status', 'activated_on', 'ended_on'],
  task: ['title', 'status', 'priority', 'due_at'],
  meeting: ['title', 'status', 'starts_at', 'ends_at', 'all_day', 'timezone', 'channel'],
  renewal: ['title', 'status', 'target_on', 'opens_on', 'closes_on'],
  permanence: ['title', 'status', 'starts_on', 'ends_on', 'reason_code'],
  opportunity: ['title', 'status', 'next_follow_up_at', 'follow_up_state'],
  activity: ['activity_kind', 'safe_summary', 'occurred_at'],
} as const
export type GroundingEntityKind = keyof typeof FIELDS
export type ProtectedEvidence = { visibility: 'masked'; masked_text: string } | { visibility: 'hidden' | 'not_available' }
export type GroundedRow = {
  id: string
  kind: GroundingEntityKind
  fields: Record<string, string | boolean | null>
  protected_fields: Record<string, ProtectedEvidence>
}
export type CollectionEvidence = {
  contract_version: typeof GROUNDING_VERSION
  trust: 'untrusted_crm_data'
  availability: 'available' | 'unsupported' | 'unavailable' | 'not_authorized' | 'error' | 'invalid'
  freshness: 'fresh' | 'stale' | 'unknown'
  as_of: string | null
  completeness: 'complete' | 'partial' | 'unknown'
  can_assert_empty: boolean
  /** Exact count only of projected records, never a total account count. */
  projected_count: number
  truncated: boolean
  rows: GroundedRow[]
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const safeText = (v: unknown, max = 240): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !containsHighConfidenceSecret(v)
const keysAre = (v: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(v).every(k => keys.includes(k))

/** Explicitly rejects reveal payloads; masked text is already redacted by W1. */
export function projectProtectedField(value: unknown): ProtectedEvidence | null {
  if (!record(value) || !['tax_identifier', 'contact_email', 'contact_phone', 'contract_reference', 'line_identifier', 'document_metadata'].includes(String(value.field_class))) return null
  if (value.visibility === 'hidden' || value.visibility === 'not_available') {
    return keysAre(value, ['field_class', 'visibility']) ? { visibility: value.visibility } : null
  }
  if (value.visibility !== 'masked' || !keysAre(value, ['field_class', 'visibility', 'masked_text', 'reveal_capability']) || !safeText(value.masked_text)) return null
  return { visibility: 'masked', masked_text: value.masked_text }
}

function projectRow(value: unknown, kind: GroundingEntityKind, epoch: string): GroundedRow | null {
  if (!record(value) || !safeText(value.id, 160)) return null
  if (value.scope_epoch !== undefined && value.scope_epoch !== epoch) return null
  if (value.contract_version !== undefined && value.contract_version !== 'telecom.v1') return null
  if (value.kind !== undefined && value.kind !== kind) return null
  const fields: GroundedRow['fields'] = {}
  for (const key of FIELDS[kind]) {
    const field = value[key]
    if (field === undefined) continue
    if (field === null || typeof field === 'boolean') fields[key] = field
    else if (safeText(field)) fields[key] = field
    else return null
  }
  const protected_fields: GroundedRow['protected_fields'] = {}
  const key = kind === 'customer' ? 'tax_identifier' : kind === 'contract' ? 'external_reference' : kind === 'line' ? 'identifier' : null
  if (key && value[key] !== undefined) {
    const protectedField = projectProtectedField(value[key])
    if (!protectedField) return null
    protected_fields[key] = protectedField
  }
  return { id: value.id, kind, fields, protected_fields }
}

export function projectCollectionEvidence(value: unknown, kind: GroundingEntityKind, expectedScopeEpoch: string, limit = 20): CollectionEvidence {
  const base: CollectionEvidence = {
    contract_version: GROUNDING_VERSION, trust: 'untrusted_crm_data', availability: 'invalid',
    freshness: 'unknown', as_of: null, completeness: 'unknown', can_assert_empty: false,
    projected_count: 0, truncated: false, rows: [],
  }
  if (!safeText(expectedScopeEpoch, 160) || !Number.isInteger(limit) || limit < 1 || limit > 50 || !Object.hasOwn(FIELDS, kind)) return base
  if (!record(value) || value.contract_version !== 'telecom.v1' || value.scope_epoch !== expectedScopeEpoch) return base
  if (value.source_state !== 'available') {
    if (!['unsupported', 'unavailable', 'not_authorized', 'error'].includes(String(value.source_state))) return base
    if (value.items !== null || value.completeness !== null || value.freshness !== null || value.continuation !== null) return base
    if (value.permission !== (value.source_state === 'not_authorized' ? 'not_authorized' : 'unknown')) return base
    if (value.source_state === 'unsupported' && value.reason !== 'contract_not_published') return base
    return { ...base, availability: value.source_state as CollectionEvidence['availability'] }
  }
  if (value.permission !== 'authorized' || !Array.isArray(value.items) || !record(value.completeness) || !record(value.freshness) || value.error !== null) return base
  const completeness = value.completeness.kind
  const freshness = value.freshness.kind
  if (completeness !== 'complete' && completeness !== 'partial') return base
  if (completeness === 'partial' && value.completeness.has_more !== true) return base
  if (freshness !== 'fresh' && freshness !== 'stale') return base
  if (typeof value.freshness.as_of !== 'string' || !Number.isFinite(Date.parse(value.freshness.as_of))) return base
  if ((freshness === 'stale' || completeness === 'complete') && value.continuation !== null) return base
  if (value.continuation !== null && typeof value.continuation !== 'string') return base
  const rows: GroundedRow[] = []
  for (const item of value.items.slice(0, limit)) {
    const row = projectRow(item, kind, expectedScopeEpoch)
    if (!row) return base
    rows.push(row)
  }
  const truncated = value.items.length > limit
  return {
    ...base, availability: 'available', freshness, as_of: value.freshness.as_of,
    completeness: truncated ? 'partial' : completeness,
    can_assert_empty: freshness === 'fresh' && completeness === 'complete' && value.items.length === 0,
    rows, projected_count: rows.length, truncated,
  }
}
