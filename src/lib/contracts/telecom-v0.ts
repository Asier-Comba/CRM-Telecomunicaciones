/**
 * Stable presentation/API contracts for the first Telecom slices.
 *
 * These types do not imply that the backing SQL schema already exists. W1 owns
 * the later mapping from normalized tables to these read models.
 */

export const TELECOM_CONTRACT_VERSION = 'telecom.v0' as const

export const TELECOM_CONTRACTS_V0 = {
  version: TELECOM_CONTRACT_VERSION,
  stability: 'STABLE',
  entities: {
    customer: [
      'id',
      'workspace_id',
      'legal_name',
      'display_name',
      'tax_identifier',
      'assigned_user',
      'contacts',
      'lifecycle',
      'status',
    ],
    contract: [
      'id',
      'workspace_id',
      'customer_id',
      'operator',
      'service_ids',
      'line_ids',
      'start_date',
      'commitment_end_date',
      'end_date',
      'renewal_window',
      'assignee',
      'lifecycle',
    ],
    service_line: [
      'id',
      'workspace_id',
      'kind',
      'customer_id',
      'contract_id',
      'operator',
      'plan_tariff',
      'status',
    ],
    dashboard: [
      'tasks',
      'meetings',
      'renewals',
      'permanence_alerts',
      'opportunities',
      'generated_at',
    ],
  },
} as const

export type ContractVersionV0 = typeof TELECOM_CONTRACT_VERSION
export type IsoDate = string
export type IsoDateTime = string

export type EntityRefV0 = {
  id: string
  display_name: string
}

export type TaxIdentifierV0 = {
  kind: 'CIF' | 'NIF' | 'VAT' | 'OTHER'
  value: string
}

export type ContactSummaryV0 = {
  id: string
  display_name: string
  email: string | null
  phone: string | null
  is_primary: boolean
}

export type CustomerCompanyV0 = {
  id: string
  workspace_id: string
  legal_name: string
  display_name: string
  tax_identifier: TaxIdentifierV0 | null
  assigned_user: EntityRefV0 | null
  contacts: ContactSummaryV0[]
  lifecycle: 'lead' | 'prospect' | 'customer' | 'former_customer'
  status: 'active' | 'inactive' | 'archived'
}

export type RenewalWindowV0 = {
  opens_on: IsoDate | null
  closes_on: IsoDate | null
  status: 'not_open' | 'open' | 'overdue' | 'completed' | 'not_applicable'
}

export type TelecomContractV0 = {
  id: string
  workspace_id: string
  customer_id: string
  operator: EntityRefV0
  service_ids: string[]
  line_ids: string[]
  start_date: IsoDate
  commitment_end_date: IsoDate | null
  end_date: IsoDate | null
  renewal_window: RenewalWindowV0
  assignee: EntityRefV0 | null
  lifecycle: 'draft' | 'active' | 'renewal_due' | 'ended' | 'cancelled'
}

export type ServiceLineV0 = {
  id: string
  workspace_id: string
  kind: 'service' | 'line'
  customer_id: string
  contract_id: string
  operator: EntityRefV0
  plan_tariff: EntityRefV0 | null
  status: 'pending' | 'active' | 'suspended' | 'cancelled'
}

export type DashboardItemV0 = {
  id: string
  customer_id: string | null
  title: string
  due_at: IsoDateTime | null
  status: string
}

export type DashboardSectionV0<T> =
  | {
      state: 'ready'
      items: [T, ...T[]]
      source_updated_at: IsoDateTime
      error: null
    }
  | {
      state: 'empty'
      items: []
      source_updated_at: IsoDateTime | null
      error: null
    }
  | {
      state: 'error'
      items: []
      source_updated_at: IsoDateTime | null
      error: { code: string; message: string; retryable: boolean }
    }

export type DashboardReadModelV0 = {
  contract_version: ContractVersionV0
  workspace_id: string
  generated_at: IsoDateTime
  tasks: DashboardSectionV0<DashboardItemV0>
  meetings: DashboardSectionV0<DashboardItemV0>
  renewals: DashboardSectionV0<DashboardItemV0>
  permanence_alerts: DashboardSectionV0<DashboardItemV0>
  opportunities: DashboardSectionV0<DashboardItemV0>
}
