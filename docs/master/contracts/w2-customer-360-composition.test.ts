import assert from 'node:assert/strict'
import test from 'node:test'

import {
  composeCustomer360,
  denyCustomer360,
  summarizeCustomer360Completeness,
} from './w2-customer-360-composition.ts'
import {
  normalizeCollectionSource,
  type CollectionSection,
} from './w2-collection-envelope.ts'
import type {
  CustomerIdentityPresentation,
  OpaqueId,
  PrimaryContactPresentation,
} from './w2-presentation-v0.ts'
import type {
  ContractSummaryPresentation,
  LineSummaryPresentation,
  ServiceSummaryPresentation,
} from './w2-telecom-portfolio-v0.ts'

const asOf = '2026-09-26T12:00:00Z'
const empty = <T>(): CollectionSection<T> =>
  normalizeCollectionSource({
    sourceStatus: 'available',
    items: [],
    completeness: { kind: 'complete' },
    freshness: { kind: 'fresh', asOf },
  })

const identity: CustomerIdentityPresentation = {
  customerId: 'customer_a' as OpaqueId,
  heading: 'Empresa de ejemplo',
  legalName: 'Empresa de ejemplo, S.L.',
  taxIdentifier: { visibility: 'hidden' },
  assignedUser: null,
  lifecycle: 'customer',
  status: 'active',
  actions: [],
}

const baseInput = {
  identity,
  primaryContact: empty<PrimaryContactPresentation>(),
  contracts: empty<ContractSummaryPresentation>(),
  services: empty<ServiceSummaryPresentation>(),
  lines: empty<LineSummaryPresentation>(),
}

test('composition exposes all 14 required sections without guessed projections', () => {
  const model = composeCustomer360(baseInput)

  assert.equal(model.state, 'ready')
  assert.deepEqual(Object.keys(model.sections).sort(), [
    'activity',
    'attention',
    'contacts',
    'contracts',
    'documents',
    'incidents',
    'lines',
    'meetings',
    'opportunities',
    'permanence',
    'renewals',
    'services',
    'tasks',
  ])
  assert.deepEqual(
    Object.values(model.sections.attention).map((section) => section.state),
    Array(6).fill('unsupported'),
  )
  assert.equal(model.sections.permanence.state, 'unsupported')
  assert.equal(model.sections.renewals.state, 'unsupported')
})

test('one failed section does not hide identity or sibling sections', () => {
  const model = composeCustomer360({
    ...baseInput,
    contracts: normalizeCollectionSource({
      sourceStatus: 'error',
      error: {
        code: 'temporary_unavailable',
        title: 'Servicio temporalmente no disponible',
        detail: 'Puedes volver a intentarlo dentro de unos instantes.',
        retryable: true,
        announcement: 'polite',
      },
    }),
  })

  assert.equal(model.identity.heading, 'Empresa de ejemplo')
  assert.equal(model.sections.contracts.state, 'error')
  assert.equal(model.sections.services.state, 'empty')
  assert.equal(model.sections.lines.state, 'empty')
})

test('route denial removes identity and every protected descendant', () => {
  const denied = denyCustomer360()

  assert.deepEqual(denied, {
    state: 'not_authorized',
    customerRef: null,
    identity: null,
    sections: null,
  })
})

test('completeness never claims a full account while projections are unpublished', () => {
  const summary = summarizeCustomer360Completeness(
    composeCustomer360(baseInput),
  )

  assert.equal(summary.supportedSectionCount, 4)
  assert.equal(summary.usableSectionCount, 4)
  assert.equal(summary.canClaimAccountComplete, false)
  assert.ok(summary.incompleteSectionIds.includes('attention'))
  assert.ok(summary.incompleteSectionIds.includes('opportunities'))
  assert.ok(summary.incompleteSectionIds.includes('activity'))
})

test('partial portfolio sections remain explicitly incomplete', () => {
  const partialContracts = normalizeCollectionSource<ContractSummaryPresentation>({
    sourceStatus: 'available',
    items: [],
    completeness: { kind: 'partial', continuation: null },
    freshness: { kind: 'fresh', asOf },
  })
  const summary = summarizeCustomer360Completeness(
    composeCustomer360({ ...baseInput, contracts: partialContracts }),
  )

  assert.ok(summary.incompleteSectionIds.includes('contracts'))
  assert.equal(summary.canClaimAccountComplete, false)
})
