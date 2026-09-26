import {
  W2_PRESENTATION_VERSION,
  type Customer360Presentation,
  type OpaqueId,
  type SafeUiError,
  type SectionState,
  type ServerPreparedPage,
  type SensitiveField,
} from './w2-presentation-v0.ts'
import {
  accept,
  isBoundedString,
  isRecord,
  isSafeOpaqueReference,
  isStrictIsoUtcDateTime,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'

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
  status: 'unsupported',
  reason: 'contract_not_published',
})

const hiddenWhenPresent = <T>(value: T | null): SensitiveField<T> =>
  value === null ? { visibility: 'not_available' } : { visibility: 'hidden' }

const customerKeys = [
  'id',
  'workspace_id',
  'legal_name',
  'display_name',
  'tax_identifier',
  'assigned_user',
  'contacts',
  'lifecycle',
  'status',
] as const
const entityKeys = ['id', 'display_name'] as const
const taxKeys = ['kind', 'value'] as const
const contactKeys = [
  'id',
  'display_name',
  'email',
  'phone',
  'is_primary',
] as const

const parseClosedRecord = (
  value: unknown,
  keys: readonly string[],
  path: string,
): RuntimeParseResult<Record<string, unknown>> => {
  if (!isRecord(value)) return reject('expected_object', path)
  const actual = Object.keys(value)
  const unknown = actual.find((key) => !keys.includes(key))
  if (unknown) return reject('unknown_field', `${path}.${unknown}`)
  const missing = keys.find(
    (key) => !Object.prototype.hasOwnProperty.call(value, key),
  )
  if (missing) return reject('missing_field', `${path}.${missing}`)
  return accept(value)
}

const parseEntityRef = (
  value: unknown,
  path: string,
): RuntimeParseResult<EntityRefV0Input> => {
  const parsed = parseClosedRecord(value, entityKeys, path)
  if (!parsed.ok) return parsed
  if (!isSafeOpaqueReference(parsed.value.id)) {
    return reject('invalid_identifier', `${path}.id`)
  }
  if (
    !isBoundedString(parsed.value.display_name, 1, 200) ||
    !parsed.value.display_name.trim()
  ) {
    return reject('invalid_value', `${path}.display_name`)
  }
  return accept({
    id: parsed.value.id,
    display_name: parsed.value.display_name,
  })
}

const parseTaxIdentifier = (
  value: unknown,
): RuntimeParseResult<TaxIdentifierV0Input> => {
  const parsed = parseClosedRecord(value, taxKeys, '$.tax_identifier')
  if (!parsed.ok) return parsed
  const kind = parsed.value.kind
  if (kind !== 'CIF' && kind !== 'NIF' && kind !== 'VAT' && kind !== 'OTHER') {
    return reject('unknown_enum', '$.tax_identifier.kind')
  }
  if (!isBoundedString(parsed.value.value, 1, 128)) {
    return reject('invalid_value', '$.tax_identifier.value')
  }
  return accept({ kind, value: parsed.value.value })
}

const parseNullableText = (
  value: unknown,
  maximum: number,
  path: string,
): RuntimeParseResult<string | null> => {
  if (value === null) return accept(null)
  return isBoundedString(value, 1, maximum) && value.trim()
    ? accept(value)
    : reject('invalid_value', path)
}

const parseContact = (
  value: unknown,
  index: number,
): RuntimeParseResult<ContactSummaryV0Input> => {
  const path = `$.contacts[${index}]`
  const parsed = parseClosedRecord(value, contactKeys, path)
  if (!parsed.ok) return parsed
  const contact = parsed.value
  if (!isSafeOpaqueReference(contact.id)) {
    return reject('invalid_identifier', `${path}.id`)
  }
  if (
    !isBoundedString(contact.display_name, 1, 200) ||
    !contact.display_name.trim()
  ) {
    return reject('invalid_value', `${path}.display_name`)
  }
  const email = parseNullableText(contact.email, 320, `${path}.email`)
  if (!email.ok) return email
  const phone = parseNullableText(contact.phone, 64, `${path}.phone`)
  if (!phone.ok) return phone
  if (typeof contact.is_primary !== 'boolean') {
    return reject('wrong_type', `${path}.is_primary`)
  }
  return accept({
    id: contact.id,
    display_name: contact.display_name,
    email: email.value,
    phone: phone.value,
    is_primary: contact.is_primary,
  })
}

export const parseCustomerCompanyTelecomV0 = (
  value: unknown,
): RuntimeParseResult<CustomerCompanyV0Input> =>
  safelyParseUnknown(
    value,
    (candidate) => {
      const parsed = parseClosedRecord(candidate, customerKeys, '$')
      if (!parsed.ok) return parsed
      const customer = parsed.value

      if (!isSafeOpaqueReference(customer.id)) {
        return reject('invalid_identifier', '$.id')
      }
      if (!isSafeOpaqueReference(customer.workspace_id)) {
        return reject('invalid_identifier', '$.workspace_id')
      }
      if (
        !isBoundedString(customer.legal_name, 1, 300) ||
        !customer.legal_name.trim()
      ) {
        return reject('invalid_value', '$.legal_name')
      }
      if (
        !isBoundedString(customer.display_name, 1, 200) ||
        !customer.display_name.trim()
      ) {
        return reject('invalid_value', '$.display_name')
      }

      const taxIdentifier =
        customer.tax_identifier === null
          ? accept<TaxIdentifierV0Input | null>(null)
          : parseTaxIdentifier(customer.tax_identifier)
      if (!taxIdentifier.ok) return taxIdentifier
      const assignedUser =
        customer.assigned_user === null
          ? accept<EntityRefV0Input | null>(null)
          : parseEntityRef(customer.assigned_user, '$.assigned_user')
      if (!assignedUser.ok) return assignedUser

      if (!Array.isArray(customer.contacts)) {
        return reject('wrong_type', '$.contacts')
      }
      if (customer.contacts.length > 100) {
        return reject('limit_exceeded', '$.contacts')
      }
      const contacts: ContactSummaryV0Input[] = []
      const contactIds = new Set<string>()
      for (const [index, value] of customer.contacts.entries()) {
        const contact = parseContact(value, index)
        if (!contact.ok) return contact
        if (contactIds.has(contact.value.id)) {
          return reject('invalid_value', `$.contacts[${index}].id`)
        }
        contactIds.add(contact.value.id)
        contacts.push(contact.value)
      }

      const lifecycle = customer.lifecycle
      if (
        lifecycle !== 'lead' &&
        lifecycle !== 'prospect' &&
        lifecycle !== 'customer' &&
        lifecycle !== 'former_customer'
      ) {
        return reject('unknown_enum', '$.lifecycle')
      }
      const status = customer.status
      if (status !== 'active' && status !== 'inactive' && status !== 'archived') {
        return reject('unknown_enum', '$.status')
      }

      return accept({
        id: customer.id,
        workspace_id: customer.workspace_id,
        legal_name: customer.legal_name,
        display_name: customer.display_name,
        tax_identifier: taxIdentifier.value,
        assigned_user: assignedUser.value,
        contacts,
        lifecycle,
        status,
      })
    },
    128 * 1024,
  )

/**
 * Adapts only facts that W1 v0 can support without invention.
 *
 * Sensitive source values are intentionally never copied. A later accepted W1
 * capability projection may replace `hidden` with server-prepared masked or
 * revealed states. Missing values remain distinguishable as `not_available`.
 */
export function adaptCustomerTelecomV0(
  input: unknown,
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

  if (!isStrictIsoUtcDateTime(context.sourceUpdatedAt)) {
    return { ok: false, error: invalidResponse() }
  }

  const parsed = parseCustomerCompanyTelecomV0(input)
  if (!parsed.ok) return { ok: false, error: invalidResponse() }
  const customerInput = parsed.value

  if (
    !context.serverWorkspaceId ||
    customerInput.workspace_id !== context.serverWorkspaceId
  ) {
    return { ok: false, error: forbidden() }
  }

  const primaryContacts = customerInput.contacts.filter(
    (contact) => contact.is_primary,
  )
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
      customerId: customerInput.id as OpaqueId,
      heading: customerInput.display_name,
      legalName: customerInput.legal_name,
      taxIdentifier: hiddenWhenPresent(customerInput.tax_identifier),
      assignedUser:
        customerInput.assigned_user === null
          ? null
          : {
              id: customerInput.assigned_user.id as OpaqueId,
              label: customerInput.assigned_user.display_name,
            },
      lifecycle: customerInput.lifecycle,
      status: customerInput.status,
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
