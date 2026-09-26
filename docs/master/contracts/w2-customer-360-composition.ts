import type {
  ContractSummaryPresentation,
  CustomerIdentityPresentation,
  LineSummaryPresentation,
  OpaqueId,
  PrimaryContactPresentation,
  ServiceSummaryPresentation,
} from './w2-customer-360-composition.types.ts'
import {
  hasUsableCollectionData,
  normalizeCollectionSource,
  type CollectionSection,
} from './w2-collection-envelope.ts'

export const CUSTOMER_360_SECTION_ORDER = [
  'attention',
  'contacts',
  'contracts',
  'services',
  'lines',
  'permanence',
  'renewals',
  'opportunities',
  'tasks',
  'meetings',
  'incidents',
  'documents',
  'activity',
] as const

export type Customer360SectionId = (typeof CUSTOMER_360_SECTION_ORDER)[number]

type UnsupportedSection = Extract<
  CollectionSection<never>,
  { state: 'unsupported' }
>

const unsupported = (): UnsupportedSection =>
  normalizeCollectionSource<never>({
    sourceStatus: 'unsupported',
    reason: 'contract_not_published',
  }) as UnsupportedSection

export type CustomerAttentionComposition = {
  nextTask: UnsupportedSection
  nextMeeting: UnsupportedSection
  nearestRenewal: UnsupportedSection
  nearestPermanence: UnsupportedSection
  alerts: UnsupportedSection
  recentActivity: UnsupportedSection
}

/**
 * Only W1-published projection shapes may replace these exact unsupported
 * branches. `never` prevents accidental renderable placeholder data.
 */
export type Customer360Sections = {
  attention: CustomerAttentionComposition
  contacts: CollectionSection<PrimaryContactPresentation>
  contracts: CollectionSection<ContractSummaryPresentation>
  services: CollectionSection<ServiceSummaryPresentation>
  lines: CollectionSection<LineSummaryPresentation>
  permanence: UnsupportedSection
  renewals: UnsupportedSection
  opportunities: UnsupportedSection
  tasks: UnsupportedSection
  meetings: UnsupportedSection
  activity: UnsupportedSection
  documents: UnsupportedSection
  incidents: UnsupportedSection
}

export type Customer360ReadyComposition = {
  state: 'ready'
  customerRef: OpaqueId
  identity: CustomerIdentityPresentation
  sections: Customer360Sections
}

export type Customer360Composition =
  | Customer360ReadyComposition
  | {
      state: 'not_authorized'
      customerRef: null
      identity: null
      sections: null
    }

export type Customer360KnownInputs = {
  identity: CustomerIdentityPresentation
  primaryContact: CollectionSection<PrimaryContactPresentation>
  contracts: CollectionSection<ContractSummaryPresentation>
  services: CollectionSection<ServiceSummaryPresentation>
  lines: CollectionSection<LineSummaryPresentation>
}

const unsupportedAttention = (): CustomerAttentionComposition => ({
  nextTask: unsupported(),
  nextMeeting: unsupported(),
  nearestRenewal: unsupported(),
  nearestPermanence: unsupported(),
  alerts: unsupported(),
  recentActivity: unsupported(),
})

export function composeCustomer360(
  input: Customer360KnownInputs,
): Customer360ReadyComposition {
  return {
    state: 'ready',
    customerRef: input.identity.customerId,
    identity: input.identity,
    sections: {
      attention: unsupportedAttention(),
      contacts: input.primaryContact,
      contracts: input.contracts,
      services: input.services,
      lines: input.lines,
      permanence: unsupported(),
      renewals: unsupported(),
      opportunities: unsupported(),
      tasks: unsupported(),
      meetings: unsupported(),
      activity: unsupported(),
      documents: unsupported(),
      incidents: unsupported(),
    },
  }
}

/** A route-level denial carries no protected descendant state. */
export const denyCustomer360 = (): Customer360Composition => ({
  state: 'not_authorized',
  customerRef: null,
  identity: null,
  sections: null,
})

export type Customer360CompletenessSummary = {
  supportedSectionCount: number
  usableSectionCount: number
  incompleteSectionIds: readonly Customer360SectionId[]
  canClaimAccountComplete: boolean
}

/**
 * A convenience selector for UX disclosure, never an authorization decision.
 * Attention is incomplete until W1 publishes its dedicated projection.
 */
export function summarizeCustomer360Completeness(
  composition: Customer360Composition,
): Customer360CompletenessSummary {
  if (composition.state === 'not_authorized') {
    return {
      supportedSectionCount: 0,
      usableSectionCount: 0,
      incompleteSectionIds: [...CUSTOMER_360_SECTION_ORDER],
      canClaimAccountComplete: false,
    }
  }

  const supportedSections = [
    ['contacts', composition.sections.contacts],
    ['contracts', composition.sections.contracts],
    ['services', composition.sections.services],
    ['lines', composition.sections.lines],
  ] as const
  const incompleteSectionIds: Customer360SectionId[] = ['attention']
  let usableSectionCount = 0

  for (const [id, section] of supportedSections) {
    if (hasUsableCollectionData(section) || section.state === 'empty') {
      usableSectionCount += 1
    }
    if (
      section.state !== 'ready' &&
      section.state !== 'empty'
    ) {
      incompleteSectionIds.push(id)
    }
  }

  for (const id of CUSTOMER_360_SECTION_ORDER) {
    if (
      id !== 'attention' &&
      id !== 'contacts' &&
      id !== 'contracts' &&
      id !== 'services' &&
      id !== 'lines'
    ) {
      incompleteSectionIds.push(id)
    }
  }

  return {
    supportedSectionCount: supportedSections.length,
    usableSectionCount,
    incompleteSectionIds,
    canClaimAccountComplete: incompleteSectionIds.length === 0,
  }
}
