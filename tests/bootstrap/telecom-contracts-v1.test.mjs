import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  TELECOM_CONTRACT_VERSION_V1,
  TELECOM_V1_CHANGESET,
  TELECOM_V1_READ_OPERATIONS,
} from '../../src/lib/contracts/telecom-v1.ts'

const source = await readFile('src/lib/contracts/telecom-v1.ts', 'utf8')

test('telecom v1 is additive and publishes a machine-readable compatibility delta', () => {
  assert.equal(TELECOM_CONTRACT_VERSION_V1, 'telecom.v1')
  assert.deepEqual(TELECOM_V1_CHANGESET.removed, [])
  assert.ok(TELECOM_V1_CHANGESET.added.includes('customer_attention'))
  assert.ok(TELECOM_V1_CHANGESET.breaking[0].includes('separate endpoints'))
})

test('read operation catalog includes the live W3 opportunity capability', () => {
  assert.equal(TELECOM_V1_READ_OPERATIONS.length, 14)
  assert.ok(TELECOM_V1_READ_OPERATIONS.includes('opportunity.list'))
  assert.ok(TELECOM_V1_READ_OPERATIONS.includes('activity.list'))
  assert.ok(TELECOM_V1_READ_OPERATIONS.includes('dashboard.get'))
})

test('collections distinguish source, permission, completeness and freshness', () => {
  assert.match(source, /source_state: 'available'/)
  assert.match(source, /kind: 'partial'; has_more: true/)
  assert.match(source, /kind: 'fresh' \| 'stale'; as_of:/)
  assert.match(source, /source_state: 'not_authorized'/)
  assert.match(source, /items: null/)
})

test('base readers cannot return revealed PII', () => {
  const customer = source.match(/export type CustomerCompanyV1 = \{([\s\S]*?)\n\}/)?.[1]
  assert.ok(customer)
  assert.match(customer, /tax_identifier: ProtectedFieldV1/)
  assert.doesNotMatch(customer, /RevealedFieldV1/)
  assert.match(source, /Only a short-lived, reauthorized reveal operation/)
})

test('attention and dashboard use discriminated closed items', () => {
  assert.match(source, /export type CustomerAttentionV1/)
  assert.match(source, /next_task: CollectionEnvelopeV1<TaskItemV1>/)
  assert.match(source, /recent_activity: CollectionEnvelopeV1<ActivityItemV1>/)
  assert.match(source, /export type DashboardItemV1 =/)
  assert.doesNotMatch(source, /status: string/)
})

test('read inputs do not carry caller-selected workspace identifiers', () => {
  const service = source.match(/export interface TelecomReadServiceV1 \{([\s\S]*?)\n\}/)?.[1]
  assert.ok(service)
  assert.doesNotMatch(service, /input:[^\n]*workspace_id/)
  assert.match(source, /Inputs never contain workspace_id/)
})
