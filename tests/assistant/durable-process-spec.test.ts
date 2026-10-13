import test from 'node:test'
import assert from 'node:assert/strict'
import { DURABLE_DB_CONTRACT_V1 } from '../../src/assistant/durable-db-contract.ts'
import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from '../../src/assistant/durable-contracts.ts'
import { DURABLE_PROCESS_SCENARIOS, DURABLE_ROLLBACK_POINTS, validateRollbackEvidence, validateDurableObservation, validateDatabaseRestartEvidence } from '../../src/assistant/durable-process-spec.ts'

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
test('restart oracle rejects connection-only reconnect, replacement cluster, changed intent and hostile evidence', () => {
  const good = { beforeSystemIdentifier: '9000000000000000001', afterSystemIdentifier: '9000000000000000001', beforePostmasterStartMs: 1700000000000, afterPostmasterStartMs: 1700000005000, originalBindingDigest: 'a'.repeat(64), persistedBindingDigest: 'a'.repeat(64) }
  assert.ok(validateDatabaseRestartEvidence(good))
  for (const delta of [{ afterPostmasterStartMs: good.beforePostmasterStartMs }, { afterSystemIdentifier: '9000000000000000002' }, { persistedBindingDigest: 'b'.repeat(64) }, { afterPostmasterStartMs: NaN }, { originalBindingDigest: 'private' }, { private: true }])
    assert.equal(validateDatabaseRestartEvidence({ ...good, ...delta }), false)
  let calls = 0
  const accessor = { ...good }; Object.defineProperty(accessor, 'beforeSystemIdentifier', { get() { calls++; return good.beforeSystemIdentifier } })
  assert.equal(validateDatabaseRestartEvidence(accessor), false); assert.equal(calls, 0)
  assert.equal(validateDatabaseRestartEvidence({ ...good, [Symbol('hidden')]: true }), false)
  assert.ok(DURABLE_PROCESS_SCENARIOS.some(s => s.id === 'database_restart'))
})

test('all process evidence records reject accessors, hidden/private fields and non-data prototypes without getter evaluation', () => {
  const observation = { operationCount: 1, executionAuthorizations: 1, effectCount: 1, originalAuditIntents: 1, deliveredOriginalEvents: 1, pendingOriginalEvents: 0, unauthorizedRows: 0, forbiddenTransitions: 0, unregisteredDispatches: 0, automaticRedispatches: 0, state: 'completed' }
  const rollback = DURABLE_ROLLBACK_POINTS.map(point => ({ point, consumedConfirmations: 0, operations: 0, commands: 0, outbox: 0, auditIntents: 0, auditDeliveries: 0 }))
  const restart = { beforeSystemIdentifier: '9000000000000000001', afterSystemIdentifier: '9000000000000000001', beforePostmasterStartMs: 1700000000000, afterPostmasterStartMs: 1700000005000, originalBindingDigest: 'a'.repeat(64), persistedBindingDigest: 'a'.repeat(64) }
  const cases: { good: Record<string, unknown>; check: (value: unknown) => boolean }[] = [
    { good: observation, check: value => validateDurableObservation('reserve_race', value) },
    { good: rollback[0]!, check: value => validateRollbackEvidence([value, ...rollback.slice(1)]) },
    { good: restart, check: validateDatabaseRestartEvidence },
  ]
  let getterCalls = 0
  for (const { good, check } of cases) {
    assert.ok(check(good)); assert.ok(check(Object.freeze({ ...good }))); assert.ok(check(JSON.parse(JSON.stringify(good))))
    for (const key of Object.keys(good)) {
      const getter = { ...good }; Object.defineProperty(getter, key, { enumerable: true, get() { getterCalls++; return good[key] } })
      assert.equal(check(getter), false, key + ':accessor')
      const hidden = { ...good }; Object.defineProperty(hidden, key, { value: good[key], enumerable: false })
      assert.equal(check(hidden), false, key + ':hidden')
      const missing = { ...good }; delete missing[key]; assert.equal(check(missing), false, key + ':missing')
    }
    const extra = { ...good }; Object.defineProperty(extra, 'private', { value: 'SYNTHETIC_PRIVATE' }); assert.equal(check(extra), false)
    assert.equal(check({ ...good, [Symbol('private')]: true }), false)
    assert.equal(check(Object.assign(Object.create(null), good)), false)
    assert.equal(check(Object.assign(Object.create({ inherited: true }), good)), false)
    for (const traps of [{ ownKeys() { throw Error('SYNTHETIC_PRIVATE') } }, { getPrototypeOf() { throw Error('SYNTHETIC_PRIVATE') } }, { getOwnPropertyDescriptor() { throw Error('SYNTHETIC_PRIVATE') } }]) assert.equal(check(new Proxy(good, traps)), false)
    const revoked = Proxy.revocable(good, {}); revoked.revoke(); assert.equal(check(revoked.proxy), false)
  }
  assert.equal(getterCalls, 0)
})

test('rollback evidence array itself must be dense enumerable own data; hostile inspection returns false', () => {
  const good = DURABLE_ROLLBACK_POINTS.map(point => ({ point, consumedConfirmations: 0, operations: 0, commands: 0, outbox: 0, auditIntents: 0, auditDeliveries: 0 }))
  assert.ok(validateRollbackEvidence(Object.freeze(good)))
  let calls = 0
  for (const index of good.keys()) {
    const getter = [...good]; Object.defineProperty(getter, index, { enumerable: true, get() { calls++; return good[index] } }); assert.equal(validateRollbackEvidence(getter), false)
    const hidden = [...good]; Object.defineProperty(hidden, index, { value: good[index], enumerable: false }); assert.equal(validateRollbackEvidence(hidden), false)
    const sparse = [...good]; delete sparse[index]; assert.equal(validateRollbackEvidence(sparse), false)
  }
  const extra = [...good]; Object.defineProperty(extra, 'private', { value: true }); assert.equal(validateRollbackEvidence(extra), false)
  assert.equal(validateRollbackEvidence(Object.assign([...good], { [Symbol('private')]: true })), false)
  const inherited = [...good]; Object.setPrototypeOf(inherited, Object.create(Array.prototype)); assert.equal(validateRollbackEvidence(inherited), false)
  for (const traps of [{ ownKeys() { throw Error('SYNTHETIC_PRIVATE') } }, { getPrototypeOf() { throw Error('SYNTHETIC_PRIVATE') } }, { getOwnPropertyDescriptor() { throw Error('SYNTHETIC_PRIVATE') } }]) assert.equal(validateRollbackEvidence(new Proxy(good, traps)), false)
  const revoked = Proxy.revocable([...good], {}); revoked.revoke(); assert.equal(validateRollbackEvidence(revoked.proxy), false)
  assert.equal(calls, 0)
})
