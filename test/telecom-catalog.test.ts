import assert from 'node:assert/strict'
import test from 'node:test'

import { TELECOM_CAPABILITY_CATALOG, telecomCapability } from '../src/assistant/telecom-catalog.js'

test('telecom catalog has unique closed capability names and server-owned tenant scope', () => {
  const names = TELECOM_CAPABILITY_CATALOG.map((capability) => capability.name)
  assert.equal(new Set(names).size, names.length)
  assert.ok(names.every((name) => /^crm\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(name)))
  assert.ok(TELECOM_CAPABILITY_CATALOG.every((capability) => (
    capability.tenantScope.source === 'server_context' &&
    capability.tenantScope.modelMayChooseWorkspace === false &&
    capability.inputSchema.additionalProperties === false &&
    capability.authorization.resourceAuthorization === 'required'
  )))
})

test('telecom catalog maps only W1 stable read DTOs and leaves writes blocked', () => {
  const reads = TELECOM_CAPABILITY_CATALOG.filter((capability) => capability.accessClass === 'READ')
  const writes = TELECOM_CAPABILITY_CATALOG.filter((capability) => capability.accessClass !== 'READ')

  assert.ok(reads.length >= 10)
  assert.ok(reads.every((capability) => (
    capability.sourceContract === 'telecom.v0' &&
    capability.availability === 'mapped_no_adapter' &&
    capability.idempotency === 'not_applicable' &&
    capability.confirmationPolicy === 'none'
  )))
  assert.ok(writes.length >= 2)
  assert.ok(writes.every((capability) => (
    capability.sourceContract === 'unpublished' &&
    capability.availability === 'blocked_on_w1_write_contract' &&
    capability.idempotency === 'required'
  )))
})

test('catalog exposes commitment, renewal, dashboard and service-line concepts without inventing schemas', () => {
  assert.equal(telecomCapability('crm.commitment.expiring')?.outputSchema.ref, 'telecom.v0#TelecomContractV0[]')
  assert.equal(telecomCapability('crm.renewal.upcoming')?.outputSchema.ref, 'telecom.v0#TelecomContractV0[]')
  assert.equal(telecomCapability('crm.dashboard.get')?.outputSchema.ref, 'telecom.v0#DashboardReadModelV0')
  assert.equal(telecomCapability('crm.service.search')?.outputSchema.ref, 'telecom.v0#ServiceLineV0[]')
  assert.equal(telecomCapability('crm.operator.search'), null)
  assert.equal(telecomCapability('crm.plan.get'), null)
})
