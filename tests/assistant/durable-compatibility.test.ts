import test from 'node:test'
import assert from 'node:assert/strict'
import { W1_DURABLE_COMPATIBILITY as mapping } from '../../src/assistant/durable-compatibility.ts'
import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from '../../src/assistant/durable-contracts.ts'

test('W1 candidate mapping preserves exact W3 states and tenant-scoped identities', () => {
  assert.deepEqual(CONFIRMATION_STATES, ['issued', 'consumed', 'cancelled', 'expired'])
  assert.deepEqual(IDEMPOTENCY_STATES, ['reserved', 'executing', 'effect_applied', 'completed',
    'failed_retryable', 'failed_terminal', 'reconciliation_required'])
  assert.deepEqual(OUTBOX_STATES, ['pending', 'dispatching', 'delivered', 'failed_retryable',
    'failed_terminal', 'reconciliation_required'])
  assert.deepEqual(mapping.uniqueIdentities, [
    ['workspace_id', 'operation_ref'], ['workspace_id', 'capability', 'idempotency_key'],
  ])
  assert.deepEqual(mapping.immutableBinding, ['workspaceId', 'actorId', 'capability', 'argumentsDigest'])
})

test('W1 compatibility snapshot explicitly fails closed on production readiness', () => {
  assert.equal(mapping.productionReady, false)
  assert.equal(mapping.status, 'offline_candidate_only')
  assert.match(mapping.source.commit, /^[a-f0-9]{40}$/)
  assert.equal(mapping.contractGaps.length, 4)
  assert.ok(mapping.requiredEvidence.includes('atomic_operation_and_outbox_transaction'))
  assert.ok(mapping.requiredEvidence.includes('real_jwt_tenant_membership_and_service_principal_attacks'))
})
