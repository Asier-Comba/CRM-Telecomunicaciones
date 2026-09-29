import type { CollectionEvidence } from './grounding.js'
import type { ReadEvidence } from './telecom-service-adapter.js'
import { isCalendarDate } from './telecom-input-validation.js'

export type EvidenceCitation = { operation: string; section: string; entityIds: string[]; field: string }
export type CountClaim = { value: number | null; certainty: 'exact' | 'at_least' | 'unknown'; citations: EvidenceCitation[] }
const usable = (section: CollectionEvidence | undefined): section is CollectionEvidence =>
  section?.availability === 'available' && section.freshness === 'fresh'
const complete = (section: CollectionEvidence): boolean => section.completeness === 'complete' && !section.truncated
const cite = (read: ReadEvidence, section: string, field: string, ids: string[]): EvidenceCitation => ({ operation: read.operation, section, entityIds: ids, field })

/** Server-side deterministic composition of freshly validated adapter evidence.
 * No prompt parsing; business text is never interpreted as an instruction.
 * Call within the request scope fence, not on saved conversational evidence.
 */
export function countSection(read: ReadEvidence, section: string): CountClaim {
  const source = read.sections[section]
  if (read.state !== 'available' || !usable(source)) return { value: null, certainty: 'unknown', citations: [] }
  return { value: source.rows.length, certainty: complete(source) ? 'exact' : 'at_least',
    citations: [cite(read, section, 'projected_count', source.rows.map(row => row.id))] }
}

export function earliestRenewal(read: ReadEvidence): {
  date: string | null; renewalIds: string[]; contractIds: string[]; certainty: 'exact' | 'among_returned' | 'unknown'; citations: EvidenceCitation[]
} {
  const source = read.sections.nearest_renewal ?? read.sections.items
  const section = read.sections.nearest_renewal ? 'nearest_renewal' : 'items'
  const unknown = { date: null, renewalIds: [], contractIds: [], certainty: 'unknown' as const, citations: [] }
  if (read.state !== 'available' || !usable(source)) return unknown
  const candidates = source.rows.filter(r => r.kind === 'renewal' && ['upcoming', 'overdue'].includes(String(r.fields.status)))
  const dates = candidates.map(r => r.fields.target_on).filter((x): x is string => typeof x === 'string')
  if (!dates.length || dates.length !== candidates.length) return unknown
  const date = dates.sort()[0]!
  const ids = candidates.filter(r => r.fields.target_on === date).map(r => r.id)
  const contractIds = [...new Set(ids.map(id => read.relations[`renewal:${id}`]?.contractId).filter((id): id is string => typeof id === 'string'))]
  return { date, renewalIds: ids, contractIds, certainty: complete(source) ? 'exact' : 'among_returned', citations: [cite(read, section, 'target_on', ids)] }
}

/** Bounded join over customer summaries supplied by authorized reads. Positive
 * matches can be shown on partial evidence; incomplete negatives remain unknown.
 * This reports evaluated customers, never claims a workspace-wide exhaustive list.
 */
export function renewalsWithPendingTasks(reads: readonly ReadEvidence[], from: string, to: string): {
  matches: Array<{ customerId: string; citations: EvidenceCitation[] }>; unknown: number; exhaustive: false
} {
  const result: ReturnType<typeof renewalsWithPendingTasks> = { matches: [], unknown: 0, exhaustive: false }
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) return { ...result, unknown: reads.length }
  for (const read of reads.slice(0, 50)) {
    const customers = read.sections.customer, tasks = read.sections.next_task, renewals = read.sections.nearest_renewal
    if (read.state !== 'available' || !usable(customers) || customers.rows.length !== 1 || !usable(tasks) || !usable(renewals)) { result.unknown++; continue }
    const pending = tasks.rows.filter(r => r.kind === 'task' && ['pending', 'in_progress'].includes(String(r.fields.status)))
    const soon = renewals.rows.filter(r => r.kind === 'renewal' && ['upcoming', 'overdue'].includes(String(r.fields.status)) && typeof r.fields.target_on === 'string' && r.fields.target_on >= from && r.fields.target_on <= to)
    if (pending.length && soon.length) result.matches.push({ customerId: customers.rows[0]!.id,
      citations: [cite(read, 'next_task', 'status', pending.map(r => r.id)), cite(read, 'nearest_renewal', 'target_on', soon.map(r => r.id))] })
    else if (!complete(tasks) || !complete(renewals)) result.unknown++
  }
  result.unknown += Math.max(0, reads.length - 50)
  return result
}
