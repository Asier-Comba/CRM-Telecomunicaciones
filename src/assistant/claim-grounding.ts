import type { CollectionEvidence, GroundingEntityKind } from './grounding.js'
import { isCalendarDate } from './telecom-input-validation.js'
import { isSafeEvidenceText } from './context-budget.js'

export type ClaimEvidence = { evidenceId: string; operation: string; entityKind: GroundingEntityKind; collection: CollectionEvidence }
type ClaimBase = { evidenceId: string; operation: string; entityKind: GroundingEntityKind; as_of?: string }
export type StructuredClaim = ClaimBase & (
  | { kind: 'field'; entityId: string; field: string; value: string | boolean | null }
  | { kind: 'total'; value: number }
  | { kind: 'empty' }
  | { kind: 'calendar_days'; entityId: string; field: string; calendarDate: string; value: number }
)
export type ClaimVerification = { ok: true } | { ok: false; code: string }
const operationKinds: Readonly<Record<string, readonly GroundingEntityKind[]>> = {
  'crm.customer.search': ['customer'], 'crm.customer.get': ['customer'],
  'crm.customer.summary': ['customer', 'contract', 'service', 'line', 'task', 'meeting', 'renewal', 'permanence', 'activity'],
  'crm.contract.list': ['contract'], 'crm.contract.get': ['contract'],
  'crm.service.list': ['service'], 'crm.line.list': ['line'], 'crm.renewal.list': ['renewal'],
  'crm.permanence.list': ['permanence'], 'crm.task.list': ['task'], 'crm.meeting.list': ['meeting'],
  'crm.activity.list': ['activity'], 'crm.opportunity.list': ['opportunity'],
  'crm.dashboard.get': ['task', 'meeting', 'renewal', 'permanence', 'opportunity'],
}
const DATE_FIELDS = new Set(['start_date', 'signed_date', 'end_date', 'activated_on', 'ended_on', 'target_on', 'opens_on', 'closes_on', 'starts_on', 'ends_on'])
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const own = (value: object, key: string): boolean => Object.hasOwn(value, key)

function plainClaim(value: unknown): Record<string, unknown> | null {
  try {
    if (!record(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (Reflect.ownKeys(value).length > 12 || Object.getOwnPropertySymbols(value).length
      || Object.values(descriptors).some(field => !('value' in field) || !field.enumerable)) return null
    return Object.fromEntries(Object.entries(descriptors).map(([key, field]) => [key, field.value]))
  } catch { return null }
}

/** Signed Gregorian day difference, independent of timezones and DST. Datetime
 * fields must first be resolved in server timezone context; no UTC guessing. */
export function calendarDayDifference(from: string, to: string): number | null {
  if (!isCalendarDate(from) || !isCalendarDate(to)) return null
  const day = (value: string): number => {
    const [year, month, date] = value.split('-').map(Number) as [number, number, number]
    const instant = new Date(0)
    instant.setUTCFullYear(year, month - 1, date); instant.setUTCHours(0, 0, 0, 0)
    return instant.getTime() / 86400000
  }
  return day(to) - day(from)
}

/** Verifies closed structured assertions, not arbitrary prose. Sources must
 * come from authorized server readers, never from the claimant/model. */
export function verifyStructuredClaim(rawClaim: unknown, sources: readonly ClaimEvidence[], context: { calendarDate?: string } = {}): ClaimVerification {
  const fail = (code: string): ClaimVerification => ({ ok: false, code })
  const claim = plainClaim(rawClaim)
  if (!claim) return fail('invalid_claim')
  const specific = claim.kind === 'field' ? ['entityId', 'field', 'value'] : claim.kind === 'total' ? ['value']
    : claim.kind === 'empty' ? [] : claim.kind === 'calendar_days' ? ['entityId', 'field', 'calendarDate', 'value'] : null
  if (!specific || Object.keys(claim).some(key => !['kind', 'evidenceId', 'operation', 'entityKind', 'as_of', ...specific].includes(key))) return fail('invalid_claim')
  if (!isSafeEvidenceText(claim.evidenceId, 160) || !isSafeEvidenceText(claim.operation, 80) || !isSafeEvidenceText(claim.entityKind, 40)) return fail('invalid_claim')
  const matches = sources.filter(source => source.evidenceId === claim.evidenceId)
  if (matches.length !== 1) return fail('unknown_evidence')
  const source = matches[0]!
  if (source.operation !== claim.operation || source.entityKind !== claim.entityKind
    || !own(operationKinds, source.operation) || !operationKinds[source.operation]!.includes(source.entityKind)) return fail('evidence_scope_mismatch')
  const evidence = source.collection
  if (evidence.availability !== 'available') return fail('evidence_unavailable')
  if (evidence.freshness !== 'fresh' && evidence.freshness !== 'stale') return fail('unknown_freshness')
  if (!evidence.as_of || !Number.isFinite(Date.parse(evidence.as_of))) return fail('unknown_freshness')
  if (evidence.freshness === 'stale' && claim.as_of !== evidence.as_of) return fail('stale_requires_qualifier')
  if (claim.as_of !== undefined && claim.as_of !== evidence.as_of) return fail('invalid_qualifier')
  if (evidence.projected_count !== evidence.rows.length || evidence.rows.some(row => row.kind !== source.entityKind)
    || new Set(evidence.rows.map(row => row.id)).size !== evidence.rows.length) return fail('invalid_evidence')
  if (claim.kind === 'empty' || claim.kind === 'total') {
    if (evidence.completeness !== 'complete' || evidence.truncated) return fail('incomplete_evidence')
    if (claim.kind === 'empty') return evidence.rows.length === 0 ? { ok: true } : fail('claim_mismatch')
    return Number.isSafeInteger(claim.value) && claim.value === evidence.rows.length ? { ok: true } : fail('claim_mismatch')
  }
  if (!isSafeEvidenceText(claim.entityId, 160) || !isSafeEvidenceText(claim.field, 80)) return fail('invalid_claim')
  const row = evidence.rows.find(candidate => candidate.id === claim.entityId)
  if (!row || !own(row.fields, claim.field)) return fail('missing_field_evidence')
  const value = row.fields[claim.field]
  if (typeof value === 'string' && !isSafeEvidenceText(value)) return fail('unsafe_evidence_text')
  if (claim.kind === 'field') return own(claim, 'value') && claim.value === value ? { ok: true } : fail('claim_mismatch')
  if (!DATE_FIELDS.has(claim.field) || typeof value !== 'string' || typeof claim.calendarDate !== 'string'
    || claim.calendarDate !== context.calendarDate || !Number.isSafeInteger(claim.value)) return fail('invalid_calendar_context')
  const days = calendarDayDifference(claim.calendarDate, value)
  return days !== null && days === claim.value ? { ok: true } : fail('claim_mismatch')
}
