import assert from 'node:assert/strict'
import test from 'node:test'

import {
  adaptCustomerTelecomV0,
  type CustomerCompanyV0Input,
} from './w2-customer-telecom-v0-adapter.ts'

const timestamp = '2026-09-26T10:00:00Z'
const context = {
  contractVersion: 'telecom.v0' as const,
  serverWorkspaceId: 'workspace-synthetic-1',
  sourceUpdatedAt: timestamp,
}

const customer = (): CustomerCompanyV0Input => ({
  id: 'customer-synthetic-1',
  workspace_id: 'workspace-synthetic-1',
  legal_name: 'Empresa Sintética Uno, S.L.',
  display_name: 'Empresa Sintética Uno',
  tax_identifier: { kind: 'CIF', value: 'SYNTHETIC-NOT-REAL' },
  assigned_user: { id: 'user-synthetic-1', display_name: 'Comercial Uno' },
  contacts: [
    {
      id: 'contact-synthetic-1',
      display_name: 'Contacto Principal',
      email: 'synthetic@example.invalid',
      phone: '+34000000000',
      is_primary: true,
    },
  ],
  lifecycle: 'customer',
  status: 'active',
})

test('adapts identity while keeping all present PII hidden', () => {
  const result = adaptCustomerTelecomV0(customer(), context)

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.page.data.identity.taxIdentifier, {
    visibility: 'hidden',
  })
  assert.equal(result.page.data.primaryContact.status, 'ready')
  if (result.page.data.primaryContact.status !== 'ready') return
  assert.deepEqual(result.page.data.primaryContact.data.email, {
    visibility: 'hidden',
  })
  assert.deepEqual(result.page.data.primaryContact.data.phone, {
    visibility: 'hidden',
  })
  assert.equal(
    JSON.stringify(result.page).includes('SYNTHETIC-NOT-REAL'),
    false,
  )
  assert.equal(
    JSON.stringify(result.page).includes('synthetic@example.invalid'),
    false,
  )
})

test('distinguishes missing sensitive values from unauthorized values', () => {
  const source = customer()
  source.tax_identifier = null
  source.contacts = source.contacts.map((contact, index) =>
    index === 0 ? { ...contact, email: null } : contact,
  )

  const result = adaptCustomerTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok || result.page.data.primaryContact.status !== 'ready') return

  assert.deepEqual(result.page.data.identity.taxIdentifier, {
    visibility: 'not_available',
  })
  assert.deepEqual(result.page.data.primaryContact.data.email, {
    visibility: 'not_available',
  })
})

test('keeps missing attention projections unavailable rather than falsely empty', () => {
  const result = adaptCustomerTelecomV0(customer(), context)
  assert.equal(result.ok, true)
  if (!result.ok) return

  for (const section of [
    result.page.data.nextTask,
    result.page.data.nextMeeting,
    result.page.data.contracts,
    result.page.data.servicesAndLines,
    result.page.data.nearestPermanence,
    result.page.data.nearestRenewal,
    result.page.data.alerts,
    result.page.data.recentActivity,
  ]) {
    assert.equal(section.status, 'error')
    if (section.status === 'error') {
      assert.equal(section.error.code, 'unsupported_contract')
    }
  }
})

test('denies a customer outside the server-resolved workspace', () => {
  const source = customer()
  source.workspace_id = 'workspace-foreign'

  const result = adaptCustomerTelecomV0(source, context)
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'forbidden',
      message: 'No tienes acceso a este cliente.',
      retryable: false,
    },
  })
})

test('rejects ambiguous primary contact data', () => {
  const source = customer()
  source.contacts = [
    ...source.contacts,
    {
      id: 'contact-synthetic-2',
      display_name: 'Otro Contacto',
      email: null,
      phone: null,
      is_primary: true,
    },
  ]

  const result = adaptCustomerTelecomV0(source, context)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'invalid_response')
})

test('represents no primary contact as a successful empty section', () => {
  const source = customer()
  source.contacts = source.contacts.map((contact) => ({
    ...contact,
    is_primary: false,
  }))

  const result = adaptCustomerTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.page.data.primaryContact, {
    status: 'empty',
    updatedAt: timestamp,
  })
})

test('rejects route-bearing customer identifiers and invalid freshness', () => {
  const unsafeCustomer = customer()
  unsafeCustomer.id = '../customer-foreign'
  const unsafeIdResult = adaptCustomerTelecomV0(unsafeCustomer, context)
  assert.equal(unsafeIdResult.ok, false)

  const badFreshnessResult = adaptCustomerTelecomV0(customer(), {
    ...context,
    sourceUpdatedAt: 'today',
  })
  assert.equal(badFreshnessResult.ok, false)
})

test('never throws for malformed, extra, nested-invalid or oversized JSON', () => {
  const missing = customer() as unknown as Record<string, unknown>
  delete missing.legal_name
  const extra = { ...customer(), workspace_selector: 'workspace-foreign' }
  const invalidNested = {
    ...customer(),
    contacts: [{ ...customer().contacts[0], is_primary: 'yes' }],
  }
  const unknownEnum = { ...customer(), lifecycle: 'unknown' }
  const oversized = { ...customer(), display_name: 'x'.repeat(201) }

  for (const candidate of [
    null,
    [],
    {},
    missing,
    extra,
    invalidNested,
    unknownEnum,
    oversized,
  ]) {
    assert.doesNotThrow(() => adaptCustomerTelecomV0(candidate, context))
    assert.equal(adaptCustomerTelecomV0(candidate, context).ok, false)
  }
})

test('rejects impossible source calendar timestamps', () => {
  const result = adaptCustomerTelecomV0(customer(), {
    ...context,
    sourceUpdatedAt: '2026-02-31T10:00:00Z',
  })
  assert.equal(result.ok, false)
})
