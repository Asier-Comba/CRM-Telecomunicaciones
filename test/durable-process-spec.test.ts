import test from 'node:test'
import assert from 'node:assert/strict'
import { DURABLE_DB_CONTRACT_V1 } from '../src/assistant/durable-db-contract.js'
import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from '../src/assistant/durable-contracts.js'
import { DURABLE_PROCESS_SCENARIOS, DURABLE_ROLLBACK_POINTS, validateRollbackEvidence, validateDurableObservation } from '../src/assistant/durable-process-spec.js'

test('DB handoff consumes exact live states and preserves the full idempotency uniqueness boundary', () => {
  assert.deepEqual(DURABLE_DB_CONTRACT_V1.states, { confirmation: CONFIRMATION_STATES, operation: IDEMPOTENCY_STATES, outbox: OUTBOX_STATES })
  assert.deepEqual(DURABLE_DB_CONTRACT_V1.uniqueness.reservation, ['workspaceId', 'capability', 'idempotencyKey'])
  assert.equal(DURABLE_DB_CONTRACT_V1.effectsEnabled, false)
})

test('portable process oracle rejects duplicate effects, missing audit and foreign lookup evidence', () => {
  const good = { operationCount: 1, executionAuthorizations: 1, effectCount: 1, originalAuditIntents: 1, deliveredOriginalEvents: 1, pendingOriginalEvents: 0, unauthorizedRows: 0, forbiddenTransitions: 0, unregisteredDispatches: 0, automaticRedispatches: 0, state: 'completed' }
  assert.equal(validateDurableObservation('reserve_race', good), true)
  // W4 P2: compile-time scenario unions are not runtime admission controls.
  assert.equal(validateDurableObservation('invented_scenario' as 'reserve_race', good), false)
  for (const bad of [{ effectCount: 2 }, { originalAuditIntents: 0 }, { deliveredOriginalEvents: 2 }, { unauthorizedRows: 1 }, { automaticRedispatches: 1 }, { executionAuthorizations: NaN }, { state: 'executing' }, { private: true }]) assert.equal(validateDurableObservation('reserve_race', { ...good, ...bad }), false)
  assert.equal(validateDurableObservation('cross_workspace_lookup', good), false)
  assert.equal(validateDurableObservation('cross_workspace_lookup', { ...good, executionAuthorizations: 0, effectCount: 0, originalAuditIntents: 0, deliveredOriginalEvents: 0, state: 'reconciliation_required' }), true)
  assert.equal(new Set(DURABLE_PROCESS_SCENARIOS.map(s => s.id)).size, DURABLE_PROCESS_SCENARIOS.length)
  assert.equal(DURABLE_PROCESS_SCENARIOS.filter(s => s.workers === 20).length, 4)
  assert.equal(validateDurableObservation('kill_before_effect', good), false)
  assert.equal(validateDurableObservation('kill_before_effect', { ...good, executionAuthorizations: 2 }), true)
})

test('each confirm/reserve/enqueue rollback cutpoint requires zero partial commits', () => {
  const evidence = DURABLE_ROLLBACK_POINTS.map(point => ({ point, consumedConfirmations: 0, operations: 0, commands: 0, outbox: 0, auditIntents: 0, auditDeliveries: 0 }))
  assert.ok(validateRollbackEvidence(evidence))
  for (const index of evidence.keys()) for (const field of ['consumedConfirmations', 'operations', 'commands', 'outbox', 'auditIntents', 'auditDeliveries']) {
    const bad = structuredClone(evidence)
    Object.assign(bad[index]!, { [field]: 1 })
    assert.equal(validateRollbackEvidence(bad), false, `${index}:${field}`)
  }
  assert.equal(validateRollbackEvidence(evidence.slice(1)), false)
  assert.equal(validateRollbackEvidence([...evidence].reverse()), false)
  assert.equal(validateRollbackEvidence([{ ...evidence[0], private: 'raw' }, ...evidence.slice(1)]), false)
})
