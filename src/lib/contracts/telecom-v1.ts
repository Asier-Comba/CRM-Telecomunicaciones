/**
 * Telecom v1 server/read contract. This is additive: telecom.v0 stays frozen.
 * Types describe DTOs and service boundaries, not browser authority or a
 * promise that every backing table is deployed.
 */

export const TELECOM_CONTRACT_VERSION_V1 = 'telecom.v1' as const

export const TELECOM_V1_CHANGESET = {
  added: [
    'collection_envelopes',
    'field_capabilities',
    'customer_attention',
    'dashboard_discriminated_items',
    'server_read_services',
  ],
  removed: [],
  deprecated: [
    'telecom.v0 DashboardItemV0.status:string',
    'telecom.v0 raw customer contact fields',
    'telecom.v0 collections without completeness',
  ],
  breaking: [
    'v1 DTOs require separate endpoints/parsers; do not add v1 fields to closed v0 payloads',
  ],
} as const

export const TELECOM_V1_READ_OPERATIONS = [
  'customer.search',
  'customer.get',
  'customer.summary',
  'contract.list',
  'contract.get',
  'service.list',
  'line.list',
  'renewal.list',
  'permanence.list',
  'task.list',
  'meeting.list',
  'activity.list',
  'opportunity.list',
  'dashboard.get',
] as const

export type TelecomV1ReadOperation = typeof TELECOM_V1_READ_OPERATIONS[number]
export type IsoDateV1 = string
export type IsoDateTimeV1 = string

export type EntityKindV1 =
  | 'user' | 'customer' | 'contact' | 'operator' | 'plan'
  | 'contract' | 'service' | 'line'
  | 'permanence' | 'renewal' | 'opportunity'
  | 'opportunity_stage' | 'task' | 'meeting' | 'activity'
  | 'document' | 'incident'

export type EntityRefV1 = {
  kind: EntityKindV1
  id: string
  display_name: string
}

export type SafeErrorCodeV1 =
  | 'not_found' | 'forbidden' | 'validation' | 'conflict'
  | 'rate_limited' | 'temporary_unavailable' | 'stale'
  | 'access_revoked' | 'internal_safe'

export type SafeErrorV1 = {
  code: SafeErrorCodeV1
  retryable: boolean
  correlation_id?: string
}

export type CollectionEnvelopeV1<T> =
  | {
      source_state: 'available'
      permission: 'authorized'
      items: readonly T[]
      completeness: { kind: 'complete' } | { kind: 'partial'; has_more: true }
      continuation: string | null
      freshness: { kind: 'fresh' | 'stale'; as_of: IsoDateTimeV1 }
      error: null
    }
  | {
      source_state: 'unsupported' | 'unavailable'
      permission: 'unknown'
      items: null
      completeness: null
      continuation: null
      freshness: null
      error: SafeErrorV1 | null
    }
  | {
      source_state: 'not_authorized'
      permission: 'not_authorized'
      items: null
      completeness: null
      continuation: null
      freshness: null
      error: null
    }
  | {
      source_state: 'error'
      permission: 'unknown'
      items: null
      completeness: null
      continuation: null
      freshness: null
      error: SafeErrorV1
    }

export type FieldClassV1 =
  | 'tax_identifier' | 'contact_email' | 'contact_phone'
  | 'contract_reference' | 'line_identifier' | 'document_metadata'

export type CapabilityActionV1 =
  | 'edit' | 'reveal' | 'copy' | 'complete' | 'join' | 'navigate'

export type CapabilityRefV1 = {
  ref: string
  action: CapabilityActionV1
  target: { kind: EntityKindV1; id: string; field_class?: FieldClassV1 }
  expires_at: IsoDateTimeV1
}

/** Base readers never return a revealed value. */
export type ProtectedFieldV1 =
  | { visibility: 'not_available' }
  | { visibility: 'hidden' }
  | {
      visibility: 'masked'
      masked_text: string
      reveal_capability: CapabilityRefV1 | null
    }

/** Only a short-lived, reauthorized reveal operation may return this shape. */
export type RevealedFieldV1<T> = {
  visibility: 'revealed'
  masked_text: string
  revealed_value: T
  copy_capability: CapabilityRefV1 | null
  expires_at: IsoDateTimeV1
}

export type CustomerCompanyV1 = {
  contract_version: typeof TELECOM_CONTRACT_VERSION_V1
  id: string
  account_kind: 'legal_entity' | 'sole_trader'
  legal_name: string
  trade_name: string | null
  tax_identifier: ProtectedFieldV1
  lifecycle: 'lead' | 'prospect' | 'customer' | 'former_customer'
  status: 'active' | 'inactive' | 'archived'
  assigned_user: EntityRefV1 | null
  primary_contact: EntityRefV1 | null
  capabilities: readonly CapabilityRefV1[]
}

type AttentionBaseV1 = {
  id: string
  customer: EntityRefV1
  title: string
  relevant_at: IsoDateTimeV1 | null
  destination: EntityRefV1
  capabilities: readonly CapabilityRefV1[]
}

export type TaskItemV1 = AttentionBaseV1 & {
  kind: 'task'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | null
  assignee: EntityRefV1 | null
  version: number
}

export type MeetingItemV1 = AttentionBaseV1 & {
  kind: 'meeting'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  starts_at: IsoDateTimeV1
  ends_at: IsoDateTimeV1
  all_day: boolean
  timezone: string
  assignee: EntityRefV1 | null
}

export type RenewalItemV1 = AttentionBaseV1 & {
  kind: 'renewal'
  contract: EntityRefV1
  status: 'upcoming' | 'overdue' | 'completed' | 'dismissed' | 'not_applicable'
  opens_on: IsoDateV1 | null
  closes_on: IsoDateV1 | null
}

export type PermanenceItemV1 = AttentionBaseV1 & {
  kind: 'permanence'
  contract: EntityRefV1
  service: EntityRefV1 | null
  status: 'upcoming' | 'active' | 'ended' | 'cancelled'
  starts_on: IsoDateV1
  ends_on: IsoDateV1
  reason_code: string
}

export type OpportunityItemV1 = AttentionBaseV1 & {
  kind: 'opportunity'
  stage: EntityRefV1
  next_follow_up_at: IsoDateTimeV1 | null
  owner: EntityRefV1 | null
}

export type AlertItemV1 = AttentionBaseV1 & {
  kind: 'alert'
  alert_class: 'renewal' | 'permanence' | 'task' | 'meeting' | 'incident'
  urgency: 'low' | 'normal' | 'high' | null
}

export type ActivityItemV1 = {
  id: string
  kind: 'activity'
  customer: EntityRefV1
  activity_kind: 'created' | 'updated' | 'contacted' | 'status_changed' | 'system'
  safe_summary: string
  occurred_at: IsoDateTimeV1
  actor: EntityRefV1 | null
  targets: readonly EntityRefV1[]
  capabilities: readonly CapabilityRefV1[]
}

export type CustomerAttentionV1 = {
  contract_version: typeof TELECOM_CONTRACT_VERSION_V1
  customer_id: string
  generated_at: IsoDateTimeV1
  next_task: CollectionEnvelopeV1<TaskItemV1>
  next_meeting: CollectionEnvelopeV1<MeetingItemV1>
  nearest_renewal: CollectionEnvelopeV1<RenewalItemV1>
  nearest_permanence: CollectionEnvelopeV1<PermanenceItemV1>
  alerts: CollectionEnvelopeV1<AlertItemV1>
  recent_activity: CollectionEnvelopeV1<ActivityItemV1>
}

export type DashboardItemV1 =
  | TaskItemV1 | MeetingItemV1 | RenewalItemV1
  | PermanenceItemV1 | OpportunityItemV1

export type DashboardV1 = {
  contract_version: typeof TELECOM_CONTRACT_VERSION_V1
  generated_at: IsoDateTimeV1
  scope: {
    audience: 'personal' | 'team' | 'workspace'
    timezone: string
    scope_epoch: string
  }
  window: { starts_at: IsoDateTimeV1; ends_at: IsoDateTimeV1 }
  today: CollectionEnvelopeV1<TaskItemV1 | MeetingItemV1>
  tasks: CollectionEnvelopeV1<TaskItemV1>
  meetings: CollectionEnvelopeV1<MeetingItemV1>
  renewals: CollectionEnvelopeV1<RenewalItemV1>
  permanence_alerts: CollectionEnvelopeV1<PermanenceItemV1>
  opportunities: CollectionEnvelopeV1<OpportunityItemV1>
}

export type ServerReadContextV1 = {
  actor_id: string
  workspace_id: string
  principal_kind: 'user' | 'service_principal'
  scope_epoch: string
}

export type ListInputV1 = {
  limit: number
  continuation: string | null
}

/** Inputs never contain workspace_id; context is resolved and authorized first. */
export interface TelecomReadServiceV1 {
  customerSearch(context: ServerReadContextV1, input: ListInputV1 & { query: string }): Promise<CollectionEnvelopeV1<CustomerCompanyV1>>
  customerGet(context: ServerReadContextV1, input: { customer_id: string }): Promise<CustomerCompanyV1>
  customerSummary(context: ServerReadContextV1, input: { customer_id: string }): Promise<CustomerAttentionV1>
  contractList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<EntityRefV1>>
  contractGet(context: ServerReadContextV1, input: { contract_id: string }): Promise<EntityRefV1>
  serviceList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<EntityRefV1>>
  lineList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<EntityRefV1>>
  renewalList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<RenewalItemV1>>
  permanenceList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<PermanenceItemV1>>
  taskList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<TaskItemV1>>
  meetingList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<MeetingItemV1>>
  activityList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<ActivityItemV1>>
  opportunityList(context: ServerReadContextV1, input: ListInputV1 & { customer_id?: string }): Promise<CollectionEnvelopeV1<OpportunityItemV1>>
  dashboardGet(context: ServerReadContextV1, input: { audience: 'personal' | 'team' | 'workspace' }): Promise<DashboardV1>
}
