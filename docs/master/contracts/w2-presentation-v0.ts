/**
 * W2 candidate presentation contract.
 *
 * This is intentionally transport-neutral. W1 owns the canonical API/schema
 * contracts and the adapter into these view models. W2 owns rendering state,
 * interaction intent and closed navigation. Nothing in this file grants
 * authorization.
 */

export const W2_PRESENTATION_VERSION = 'w2.presentation.v0-candidate' as const

declare const opaqueIdBrand: unique symbol
declare const capabilityBrand: unique symbol
declare const continuationBrand: unique symbol

export type OpaqueId = string & { readonly [opaqueIdBrand]: true }
export type CapabilityRef = string & { readonly [capabilityBrand]: true }
export type ContinuationRef = string & { readonly [continuationBrand]: true }

export type IsoDate = string
export type IsoDateTime = string

export type SafeErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'temporarily_unavailable'
  | 'timeout'
  | 'unsupported_contract'
  | 'invalid_response'

export type SafeUiError = {
  code: SafeErrorCode
  message: string
  retryable: boolean
  correlationId?: string
}

export type CollectionCompleteness =
  | { kind: 'complete' }
  | {
      kind: 'bounded'
      hasMore: boolean
      continuation?: ContinuationRef
    }

export type SectionState<T> =
  | { status: 'loading' }
  | {
      status: 'ready'
      data: T
      updatedAt: IsoDateTime
      completeness: CollectionCompleteness
    }
  | {
      status: 'empty'
      updatedAt: IsoDateTime | null
    }
  | {
      status: 'refreshing'
      data: T
      updatedAt: IsoDateTime
      completeness: CollectionCompleteness
    }
  | {
      status: 'stale'
      data: T
      updatedAt: IsoDateTime
      completeness: CollectionCompleteness
      refreshError: SafeUiError
    }
  | {
      status: 'error'
      error: SafeUiError
    }
  | { status: 'forbidden' }

export type SectionEvent<T> =
  | { type: 'load_started' }
  | {
      type: 'data_received'
      data: T
      updatedAt: IsoDateTime
      completeness: CollectionCompleteness
    }
  | { type: 'empty_received'; updatedAt: IsoDateTime | null }
  | { type: 'load_failed'; error: SafeUiError }
  | { type: 'access_revoked' }

export const initialSectionState = <T>(): SectionState<T> => ({
  status: 'loading',
})

/**
 * Pure UI transition helper. A server denial always discards protected data.
 * A refresh failure may retain previously authorized data only as visibly stale.
 */
export function transitionSection<T>(
  current: SectionState<T>,
  event: SectionEvent<T>,
): SectionState<T> {
  if (event.type === 'access_revoked') {
    return { status: 'forbidden' }
  }

  if (current.status === 'forbidden') {
    return current
  }

  switch (event.type) {
    case 'load_started':
      if (
        current.status === 'ready' ||
        current.status === 'refreshing' ||
        current.status === 'stale'
      ) {
        return {
          status: 'refreshing',
          data: current.data,
          updatedAt: current.updatedAt,
          completeness: current.completeness,
        }
      }

      return { status: 'loading' }

    case 'data_received':
      return {
        status: 'ready',
        data: event.data,
        updatedAt: event.updatedAt,
        completeness: event.completeness,
      }

    case 'empty_received':
      return { status: 'empty', updatedAt: event.updatedAt }

    case 'load_failed':
      if (current.status === 'refreshing') {
        return {
          status: 'stale',
          data: current.data,
          updatedAt: current.updatedAt,
          completeness: current.completeness,
          refreshError: event.error,
        }
      }

      return { status: 'error', error: event.error }
  }
}

export type DashboardQueue =
  | 'tasks'
  | 'meetings'
  | 'renewals'
  | 'permanence_alerts'
  | 'opportunities'

/**
 * Closed internal navigation intents. These are not W3 taxonomy values and
 * must not be serialized into assistant output until W1/W3 publish the shared
 * route/entity registry.
 */
export type AppRouteDescriptor =
  | { kind: 'dashboard'; queue?: DashboardQueue }
  | { kind: 'customer'; customerId: OpaqueId }
  | { kind: 'contract'; contractId: OpaqueId }
  | { kind: 'service_line'; serviceLineId: OpaqueId }
  | { kind: 'task'; taskId: OpaqueId }
  | { kind: 'meeting'; meetingId: OpaqueId }
  | { kind: 'opportunity'; opportunityId: OpaqueId }

const dashboardQueues = new Set<DashboardQueue>([
  'tasks',
  'meetings',
  'renewals',
  'permanence_alerts',
  'opportunities',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean => Object.keys(value).every((key) => allowed.includes(key))

/**
 * Candidate shared route-ID grammar. It deliberately excludes separators,
 * percent-encoding, query/fragment markers, whitespace and control characters.
 * W1 may narrow this further when it publishes the canonical ID grammar.
 */
const SAFE_ROUTE_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,255}$/

const isOpaqueIdValue = (value: unknown): value is OpaqueId =>
  typeof value === 'string' && SAFE_ROUTE_ID.test(value)

export function isAppRouteDescriptor(
  value: unknown,
): value is AppRouteDescriptor {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false
  }

  switch (value.kind) {
    case 'dashboard':
      return (
        hasOnlyKeys(value, ['kind', 'queue']) &&
        (value.queue === undefined ||
          (typeof value.queue === 'string' &&
            dashboardQueues.has(value.queue as DashboardQueue)))
      )
    case 'customer':
      return (
        hasOnlyKeys(value, ['kind', 'customerId']) &&
        isOpaqueIdValue(value.customerId)
      )
    case 'contract':
      return (
        hasOnlyKeys(value, ['kind', 'contractId']) &&
        isOpaqueIdValue(value.contractId)
      )
    case 'service_line':
      return (
        hasOnlyKeys(value, ['kind', 'serviceLineId']) &&
        isOpaqueIdValue(value.serviceLineId)
      )
    case 'task':
      return (
        hasOnlyKeys(value, ['kind', 'taskId']) &&
        isOpaqueIdValue(value.taskId)
      )
    case 'meeting':
      return (
        hasOnlyKeys(value, ['kind', 'meetingId']) &&
        isOpaqueIdValue(value.meetingId)
      )
    case 'opportunity':
      return (
        hasOnlyKeys(value, ['kind', 'opportunityId']) &&
        isOpaqueIdValue(value.opportunityId)
      )
    default:
      return false
  }
}

export type SensitiveField<T> =
  | { visibility: 'hidden' }
  | { visibility: 'masked'; value: T }
  | {
      visibility: 'revealed'
      value: T
      copyCapability?: CapabilityRef
    }

export type PiiFieldClass =
  | 'tax_identifier'
  | 'contact_method'
  | 'contract_identifier'
  | 'line_identifier'
  | 'document_metadata'

export type UiIntent =
  | { type: 'navigate'; destination: AppRouteDescriptor }
  | { type: 'retry'; sectionId: string }
  | {
      type: 'copy_sensitive'
      fieldClass: PiiFieldClass
      capability: CapabilityRef
    }

export type UiAction = {
  id: string
  label: string
  intent: UiIntent
  capability?: CapabilityRef
}

export type EntitySummary = {
  id: OpaqueId
  label: string
}

export type CustomerIdentityPresentation = {
  customerId: OpaqueId
  heading: string
  legalName: string
  taxIdentifier: SensitiveField<{
    kind: 'CIF' | 'NIF' | 'VAT' | 'OTHER'
    value: string
  }>
  assignedUser: EntitySummary | null
  lifecycle: 'lead' | 'prospect' | 'customer' | 'former_customer'
  status: 'active' | 'inactive' | 'archived'
  actions: readonly UiAction[]
}

export type PrimaryContactPresentation = {
  contactId: OpaqueId
  displayName: string
  email: SensitiveField<string>
  phone: SensitiveField<string>
  actions: readonly UiAction[]
}

export type AttentionItemPresentation = {
  id: OpaqueId
  title: string
  supportingText?: string
  relevantAt: IsoDate | IsoDateTime | null
  statusLabel: string
  destination?: AppRouteDescriptor
  actions: readonly UiAction[]
}

export type Customer360Presentation = {
  contractVersion: typeof W2_PRESENTATION_VERSION
  identity: CustomerIdentityPresentation
  primaryContact: SectionState<PrimaryContactPresentation>
  nextTask: SectionState<AttentionItemPresentation>
  nextMeeting: SectionState<AttentionItemPresentation>
  contracts: SectionState<readonly AttentionItemPresentation[]>
  servicesAndLines: SectionState<readonly AttentionItemPresentation[]>
  nearestPermanence: SectionState<AttentionItemPresentation>
  nearestRenewal: SectionState<AttentionItemPresentation>
  alerts: SectionState<readonly AttentionItemPresentation[]>
  recentActivity: SectionState<readonly AttentionItemPresentation[]>
}

export type DashboardItemPresentation = AttentionItemPresentation & {
  customer: EntitySummary | null
}

export type DashboardPresentation = {
  contractVersion: typeof W2_PRESENTATION_VERSION
  generatedAt: IsoDateTime
  scopeLabel: string
  windowLabel: string
  tasks: SectionState<readonly DashboardItemPresentation[]>
  meetings: SectionState<readonly DashboardItemPresentation[]>
  renewals: SectionState<readonly DashboardItemPresentation[]>
  permanenceAlerts: SectionState<readonly DashboardItemPresentation[]>
  opportunities: SectionState<readonly DashboardItemPresentation[]>
}

export type ServerPreparedPage<T> = {
  contractVersion: typeof W2_PRESENTATION_VERSION
  correlationId?: string
  data: T
}
