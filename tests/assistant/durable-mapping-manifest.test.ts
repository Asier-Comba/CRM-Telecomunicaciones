import test from 'node:test'
import assert from 'node:assert/strict'
import { DURABLE_MAPPING_MANIFEST as manifest } from '../../src/assistant/durable-mapping-manifest.ts'
import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from '../../src/assistant/durable-contracts.ts'

test('durable mapping pins every current W3 record key and exported state set', () => {
  assert.deepEqual(Object.keys(manifest.confirmation.fields).sort(), ['operationRef', 'binding', 'state', 'version', 'issuedAt', 'expiresAt', 'updatedAt'].sort())
  assert.deepEqual(Object.keys(manifest.operation.fields).sort(), ['operationRef', 'idempotencyKey', 'binding', 'state', 'attempt', 'version', 'leaseExpiresAt', 'createdAt', 'updatedAt', 'effectReceiptRef', 'result', 'failureCode'].sort())
  assert.deepEqual(Object.keys(manifest.outbox.fields).sort(), ['outboxRef', 'operationRef', 'binding', 'command', 'state', 'attempt', 'version', 'leaseExpiresAt', 'receiptRef', 'failureCode', 'createdAt', 'updatedAt'].sort())
  assert.deepEqual(Object.keys(manifest.audit.fields).sort(), ['event', 'requestId', 'actorId', 'workspaceId', 'operationRef', 'requestedOutcome', 'decision', 'reasonCode'].sort())
  assert.deepEqual(manifest.confirmation.states, CONFIRMATION_STATES)
  assert.deepEqual(manifest.operation.states, IDEMPOTENCY_STATES)
  assert.deepEqual(manifest.outbox.states, OUTBOX_STATES)
})
test('semantic mapping does not invent physical W1 columns and blocks raw result persistence', () => {
  const groups = [manifest.confirmation.fields, manifest.operation.fields, manifest.outbox.fields, manifest.audit.fields, manifest.bindingFields, manifest.commandFields]
  assert.ok(groups.every(fields => Object.values(fields).every(field => field.physicalColumn === null)))
  assert.equal(manifest.audit.candidateRelation, null)
  assert.equal(manifest.operation.fields.result.mapping, 'requires_projection')
  assert.match(manifest.operation.fields.result.meaning, /UNMAPPABLE DIRECTLY/)
  assert.equal(manifest.status, 'offline_semantic_mapping_not_adapter')
})
