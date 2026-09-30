import type { CollectionEnvelopeV1, ReadOneResponseV1 } from '../contracts/telecom-v1.ts'
import type { TelecomReadRepositoryV1 } from '../server/telecom-read-service-v1.ts'
import {
  PREVIEW_AS_OF, PREVIEW_SCOPE_EPOCH, customerPreview, previewActivities,
  previewContracts, previewCustomers, previewLines, previewMeetings,
  previewOpportunities, previewPermanences, previewRenewals, previewServices, previewTasks,
} from './data.ts'

const version = { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH } as const
const freshness = { kind: 'fresh', as_of: PREVIEW_AS_OF } as const
export const normalizePreviewText = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-ES').trim().replace(/\s+/g, ' ')

export function previewCollection<T>(items: readonly T[], limit = 50): CollectionEnvelopeV1<T> {
  return { ...version, source_state: 'available', permission: 'authorized',
    items: items.slice(0, limit), completeness: items.length > limit ? { kind: 'partial', has_more: true } : { kind: 'complete' },
    continuation: null, freshness, error: null }
}
function one<T>(data: T | undefined | null): ReadOneResponseV1<T> {
  return data ? { ...version, result: 'found', data, freshness, error: null }
    : { ...version, result: 'not_found', data: null, freshness: null, error: null }
}

type Filter = { customer_id?: string; contract_id?: string; service_id?: string; status?: string; from?: string; to?: string; limit: number }
function filtered<T>(items: readonly T[], input: Filter) {
  return previewCollection(items.filter(item => {
    const row = item as Record<string, unknown>
    const customerId = (row.customer as { id?: string } | null)?.id
      ?? previewServices.find(s => s.id === (row.service as { id?: string } | null)?.id)?.customer.id
    for (const key of ['customer_id', 'contract_id', 'service_id'] as const) {
      const actual = key === 'customer_id' ? customerId : (row[key === 'contract_id' ? 'contract' : 'service'] as { id?: string } | null)?.id
      if (input[key] && actual !== input[key]) return false
    }
    if (input.status && input.status !== row.status) return false
    const date = [row.target_on, row.ends_on, row.due_at, row.starts_at, row.occurred_at, row.next_follow_up_at]
      .find(value => typeof value === 'string') as string | undefined
    if (input.from && (!date || date.slice(0, 10) < input.from)) return false
    if (input.to && (!date || date.slice(0, 10) > input.to)) return false
    return true
  }), input.limit)
}

/** Synthetic persistence only. Never register this repository in production.
 * Authorization and telecom.v1 runtime validation live in W2's service above it.
 */
export const previewRepository: TelecomReadRepositoryV1 = {
  async customerSearch(_context, input) {
    const query = normalizePreviewText(input.query)
    const exact = previewCustomers.filter(c => [c.legal_name, c.trade_name].some(name => name && normalizePreviewText(name) === query))
    const matches = exact.length ? exact : previewCustomers.filter(c => normalizePreviewText(c.legal_name).includes(query) || (c.trade_name && normalizePreviewText(c.trade_name).includes(query)))
    return previewCollection(matches.filter(c => (!input.status || c.status === input.status) && (!input.assigned_user_id || c.assigned_user?.id === input.assigned_user_id)), input.limit)
  },
  async customerGet(_context, input) { return one(previewCustomers.find(c => c.id === input.customer_id)) },
  async customerSummary(_context, input) {
    const data = customerPreview(input.customer_id)
    if (!data) return one(null)
    return one({ ...version, customer: data.customer,
      contracts: previewCollection(data.contracts), services: previewCollection(data.services), lines: previewCollection(data.lines),
      attention: { ...version, customer_id: data.customer.id, generated_at: PREVIEW_AS_OF,
        next_task: previewCollection(data.tasks.slice(0, 1)), next_meeting: previewCollection(data.meetings.slice(0, 1)),
        nearest_renewal: previewCollection(data.renewals.slice(0, 1)), nearest_permanence: previewCollection(data.permanences.slice(0, 1)),
        alerts: previewCollection([]), recent_activity: previewCollection(data.activity) } })
  },
  async contractList(_context, input) { return filtered(previewContracts.filter(c => !input.operator_id || c.operator.id === input.operator_id), input) },
  async contractGet(_context, input) { return one(previewContracts.find(c => c.id === input.contract_id)) },
  async serviceList(_context, input) { return filtered(previewServices.filter(s => !input.operator_id || s.operator.id === input.operator_id), input) },
  async lineList(_context, input) { return filtered(previewLines, input) },
  async taskList(_context, input) { return filtered(previewTasks.filter(t => !input.assignee_id || t.assignee?.id === input.assignee_id), input) },
  async meetingList(_context, input) { return filtered(previewMeetings.filter(m => !input.assignee_id || m.assignee?.id === input.assignee_id), input) },
  async activityList(_context, input) { return filtered(previewActivities, input) },
  async opportunityList(_context, input) { return filtered(previewOpportunities.filter(o => !input.owner_id || o.owner?.id === input.owner_id), input) },
  async renewalList(_context, input) { return filtered(previewRenewals, input) },
  async permanenceList(_context, input) { return filtered(previewPermanences, input) },
  async dashboardGet(_context, input) {
    return one({ ...version, generated_at: PREVIEW_AS_OF,
      scope: { audience: input.audience, timezone: 'Europe/Madrid', scope_epoch: PREVIEW_SCOPE_EPOCH },
      window: { starts_at: '2026-09-29T22:00:00Z', ends_at: '2026-09-30T22:00:00Z' },
      today: previewCollection([...previewTasks.filter(t => t.due_at >= '2026-09-29T22:00:00Z' && t.due_at < '2026-09-30T22:00:00Z'), ...previewMeetings.filter(m => m.starts_at >= '2026-09-29T22:00:00Z' && m.starts_at < '2026-09-30T22:00:00Z')]),
      tasks: previewCollection(previewTasks), meetings: previewCollection(previewMeetings),
      renewals: previewCollection(previewRenewals), permanence_alerts: previewCollection(previewPermanences), opportunities: previewCollection(previewOpportunities) })
  },
}

/** Kind + ID membership; a same-looking ID of another kind grants nothing. */
export function previewReferenceAllowed(reference: { kind: string; id: string }): boolean {
  const collections: Record<string, readonly { id: string }[]> = { customer: previewCustomers, contract: previewContracts,
    service: previewServices, line: previewLines, task: previewTasks, meeting: previewMeetings,
    activity: previewActivities, opportunity: previewOpportunities, renewal: previewRenewals, permanence: previewPermanences }
  if (collections[reference.kind]) return collections[reference.kind].some(row => row.id === reference.id)
  const refs = [...previewCustomers.map(c => c.assigned_user), ...previewContracts.flatMap(c => [c.operator, c.plan, c.assigned_user]),
    ...previewServices.flatMap(s => [s.operator, s.plan]), ...previewOpportunities.flatMap(o => [o.stage, o.owner])]
  return refs.some(ref => ref?.kind === reference.kind && ref.id === reference.id)
}
