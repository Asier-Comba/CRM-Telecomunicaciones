import test from 'node:test'
import assert from 'node:assert/strict'
import { validateClaimFenceEvidence, validateImmutableAuditEvidence } from '../../src/assistant/durable-process-spec.ts'

const fence = () => ({ priorFence: 1, currentFence: 2, changedRows: 0, rejected: ['expired_owner', 'stale_version', 'wrong_worker', 'wrong_workspace', 'wrong_operation', 'old_fence', 'future_fence'] })
const audit = () => ({ originalDigest: 'a'.repeat(64), persistedDigest: 'a'.repeat(64), changedContentRejected: true })

test('fence evidence preserves ordinary, frozen and serialized native measurement shapes', () => {
  const good = fence()
  for (const value of [good, Object.freeze({ ...good, rejected: Object.freeze([...good.rejected]) }), JSON.parse(JSON.stringify(good))]) assert.equal(validateClaimFenceEvidence(value), true)
  assert.equal(validateClaimFenceEvidence({ ...good, priorFence: Number.MAX_SAFE_INTEGER - 1, currentFence: Number.MAX_SAFE_INTEGER }), true)
})

test('immutable audit evidence preserves original digest and affirmative collision rejection', () => {
  const good = audit()
  for (const value of [good, Object.freeze({ ...good }), JSON.parse(JSON.stringify(good))]) assert.equal(validateImmutableAuditEvidence(value), true)
  for (const delta of [{ persistedDigest: 'b'.repeat(64) }, { changedContentRejected: false }, { changedContentRejected: 1 }, { originalDigest: 'A'.repeat(64) }, { originalDigest: 'a'.repeat(63) }, { originalDigest: {} }, { private: true }]) assert.equal(validateImmutableAuditEvidence({ ...good, ...delta }), false)
})

test('fence evidence rejects invalid generations, changed rows and incomplete or reordered attack ledgers', () => {
  const good = fence()
  for (const delta of [{ priorFence: 0 }, { priorFence: -1 }, { priorFence: 1.5 }, { currentFence: 1 }, { currentFence: NaN }, { currentFence: Infinity }, { currentFence: Number.MAX_SAFE_INTEGER + 1 }, { currentFence: '2' }, { changedRows: 1 }, { changedRows: '0' }, { rejected: good.rejected.slice(1) }, { rejected: [...good.rejected].reverse() }, { rejected: [...good.rejected, 'extra'] }, { rejected: [...good.rejected.slice(0, -1), 'old_fence'] }, { private: true }]) assert.equal(validateClaimFenceEvidence({ ...good, ...delta }), false)
})

test('both boundary evidence records reject accessors, hidden fields and exotic records without evaluating getters', () => {
  const cases: { good: Record<string, unknown>; check: (value: unknown) => boolean }[] = [
    { good: fence(), check: validateClaimFenceEvidence }, { good: audit(), check: validateImmutableAuditEvidence },
  ]
  let calls = 0
  for (const { good, check } of cases) {
    for (const key of Object.keys(good)) {
      const getter = { ...good }; Object.defineProperty(getter, key, { enumerable: true, get() { calls++; return good[key] } }); assert.equal(check(getter), false)
      const hidden = { ...good }; Object.defineProperty(hidden, key, { enumerable: false, value: good[key] }); assert.equal(check(hidden), false)
      const missing = { ...good }; delete missing[key]; assert.equal(check(missing), false)
    }
    const hiddenExtra = { ...good }; Object.defineProperty(hiddenExtra, 'private', { value: 'SYNTHETIC_PRIVATE' }); assert.equal(check(hiddenExtra), false)
    assert.equal(check({ ...good, [Symbol('private')]: true }), false)
    assert.equal(check(Object.assign(Object.create(null), good)), false)
    assert.equal(check(Object.assign(Object.create({ inherited: true }), good)), false)
    for (const value of [null, undefined, [], 1, 'evidence']) assert.equal(check(value), false)
  }
  assert.equal(calls, 0)
})

test('hostile descriptor and prototype inspection fail closed without exposing private errors', () => {
  for (const [good, check] of [[fence(), validateClaimFenceEvidence], [audit(), validateImmutableAuditEvidence]] as const) {
    for (const traps of [{ ownKeys() { throw Error('SYNTHETIC_PRIVATE') } }, { getPrototypeOf() { throw Error('SYNTHETIC_PRIVATE') } }, { getOwnPropertyDescriptor() { throw Error('SYNTHETIC_PRIVATE') } }]) assert.equal(check(new Proxy(good, traps)), false)
    const revoked = Proxy.revocable(good, {}); revoked.revoke(); assert.equal(check(revoked.proxy), false)
  }
})

test('fence rejection array requires seven dense own data entries without accessors or hidden extras', () => {
  const good = fence(); let calls = 0
  for (const index of good.rejected.keys()) {
    const getter = [...good.rejected]; Object.defineProperty(getter, index, { enumerable: true, get() { calls++; return good.rejected[index] } }); assert.equal(validateClaimFenceEvidence({ ...good, rejected: getter }), false)
    const hidden = [...good.rejected]; Object.defineProperty(hidden, index, { enumerable: false, value: good.rejected[index] }); assert.equal(validateClaimFenceEvidence({ ...good, rejected: hidden }), false)
    const sparse = [...good.rejected]; delete sparse[index]; assert.equal(validateClaimFenceEvidence({ ...good, rejected: sparse }), false)
  }
  const extra = [...good.rejected]; Object.defineProperty(extra, 'private', { value: 'SYNTHETIC_PRIVATE' }); assert.equal(validateClaimFenceEvidence({ ...good, rejected: extra }), false)
  assert.equal(validateClaimFenceEvidence({ ...good, rejected: Object.assign([...good.rejected], { [Symbol('private')]: true }) }), false)
  const inherited = [...good.rejected]; Object.setPrototypeOf(inherited, Object.create(Array.prototype)); assert.equal(validateClaimFenceEvidence({ ...good, rejected: inherited }), false)
  for (const traps of [{ ownKeys() { throw Error('SYNTHETIC_PRIVATE') } }, { getPrototypeOf() { throw Error('SYNTHETIC_PRIVATE') } }, { getOwnPropertyDescriptor() { throw Error('SYNTHETIC_PRIVATE') } }]) assert.equal(validateClaimFenceEvidence({ ...good, rejected: new Proxy(good.rejected, traps) }), false)
  const revoked = Proxy.revocable(good.rejected, {}); revoked.revoke(); assert.equal(validateClaimFenceEvidence({ ...good, rejected: revoked.proxy }), false)
  assert.equal(calls, 0)
})
