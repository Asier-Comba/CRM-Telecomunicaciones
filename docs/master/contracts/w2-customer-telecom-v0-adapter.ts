import {
  W2_PRESENTATION_VERSION,
  isAppRouteDescriptor,
  type Customer360Presentation,
  type OpaqueId,
  type SafeUiError,
  type SectionState,
  type ServerPreparedPage,
  type SensitiveField,
} from './w2-presentation-v0.ts'

type EntityRefV0Input = {
  id: string
  display_name: string
}

type TaxIdentifierV0Input = {
  kind: 'CIF' | 'NIF' | 'VAT' | 'OTHER'
  value: string
}

type ContactSummaryV0Input = {
  id: string
  display_name: string
  email: string | null
  phone: string | null
  is_primary: boolean
}

/** Structural match for W1 `CustomerCompanyV0` at the rejected 75c2103 base. */
export type CustomerCompanyV0Input = {
  id: string
  workspace_id: string
  legal_name: string
  display_name: string
  tax_identifier: TaxIdentifierV0Input | null
  assigned_user: EntityRefV0Input | null
  contacts: readonly ContactSummaryV0Input[]
  lifecycle: 'lead' | 'prospect' | 'customer' | 'former_customer'
  status: 'active' | 'inactive' | 'archived'
}

export type CustomerV0AdapterContext = {
  contractVersion: 'telecom.v0'
  /** Must come from W1's server-side tenant resolver, never browser state. */
  serverWorkspaceId: string
  sourceUpdatedAt: string
}

export type CustomerV0AdapterResult =
  | { ok: true; page: ServerPreparedPage<Customer360Presentation> }
  | { ok: false; error: SafeUiError }

const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,255}$/

const isSafeReference = (value: string): boolean => SAFE_REFERENCE.test(value)

const isUtcDateTime = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value))

const invalidResponse = (): SafeUiError => ({
  code: 'invalid_response',
  message: 'No se ha podido interpretar la ficha del cliente.',
  retryable: false,
})

const forbidden = (): SafeUiError => ({
  code: 'forbidden',
  message: 'No tienes acceso a este cliente.',
  retryable: false,
})

const unsupportedSection = <T>(): SectionState<T> => ({
  status: 'error',
  error: {
    code: 'unsupported_contract',
    message: 'Esta sección todavía no está disponible.',
    retryable: false,
  },
})

const hiddenWhenPresent = <T>(value: T | null): SensitiveField<T> =>
  value === null ? { visibility: 'not_available' } : { visibility: 'hidden' }

/**
 * Adapts only facts that W1 v0 can support without invention.
 *
 * Sensitive source values are intentionally never copied. A later accepted W1
 * capability projection may replace `hidden` with server-prepared masked or
 * revealed states. Missing values remain distinguishable as `not_available`.
 */
export function adaptCustomerTelecomV0(
  input: CustomerCompanyV0Input,
  context: CustomerV0AdapterContext,
): CustomerV0AdapterResult {
  if (context.contractVersion !== 'telecom.v0') {
    return {
      ok: false,
      error: {
        code: 'unsupported_contract',
        message: 'Esta versión de la ficha todavía no es compatible.',
        retryable: false,
      },
    }
  }

  if (
    !context.serverWorkspaceId ||
    input.workspace_id !== context.serverWorkspaceId
  ) {
    return { ok: false, error: forbidden() }
  }

  if (
    !isUtcDateTime(context.sourceUpdatedAt) ||
    !input.legal_name.trim() ||
    !input.display_name.trim() ||
    !isAppRouteDescriptor({
      kind: 'customer',
      customerId: input.id as OpaqueId,
    }) ||
    (input.assigned_user !== null &&
      (!isSafeReference(input.assigned_user.id) ||
        !input.assigned_user.display_name.trim())) ||
    input.contacts.some(
      (contact) =>
        !isSafeReference(contact.id) || !contact.display_name.trim(),
    )
  ) {
    return { ok: false, error: invalidResponse() }
  }

  const primaryContacts = input.contacts.filter((contact) => contact.is_primary)
  if (primaryContacts.length > 1) {
    return { ok: false, error: invalidResponse() }
  }

  const primaryContact = primaryContacts[0]
  const primaryContactState: Customer360Presentation['primaryContact'] =
    primaryContact === undefined
      ? { status: 'empty', updatedAt: context.sourceUpdatedAt }
      : {
          status: 'ready',
          data: {
            contactId: primaryContact.id as OpaqueId,
            displayName: primaryContact.display_name,
            email: hiddenWhenPresent(primaryContact.email),
            phone: hiddenWhenPresent(primaryContact.phone),
            actions: [],
          },
          updatedAt: context.sourceUpdatedAt,
          completeness: { kind: 'complete' },
        }

  const customer: Customer360Presentation = {
    contractVersion: W2_PRESENTATION_VERSION,
    identity: {
      customerId: input.id as OpaqueId,
      heading: input.display_name,
      legalName: input.legal_name,
      taxIdentifier: hiddenWhenPresent(input.tax_identifier),
      assignedUser:
        input.assigned_user === null
          ? null
          : {
              id: input.assigned_user.id as OpaqueId,
              label: input.assigned_user.display_name,
            },
      lifecycle: input.lifecycle,
      status: input.status,
      actions: [],
    },
    primaryContact: primaryContactState,
    // CustomerCompanyV0 does not provide attention, contract/service
    // completeness or recency projections. Error is more truthful than empty.
    nextTask: unsupportedSection(),
    nextMeeting: unsupportedSection(),
    contracts: unsupportedSection(),
    servicesAndLines: unsupportedSection(),
    nearestPermanence: unsupportedSection(),
    nearestRenewal: unsupportedSection(),
    alerts: unsupportedSection(),
    recentActivity: unsupportedSection(),
  }

  return {
    ok: true,
    page: {
      contractVersion: W2_PRESENTATION_VERSION,
      data: customer,
    },
  }
}
