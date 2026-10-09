import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate as nextTurn } from 'node:timers/promises'
import { resolveProductEntityV2, type ProductEntityResolutionPortV2 } from '../../src/assistant/product-entity-resolution-v2.ts'

const id = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const query = { kind: 'customer', query: 'ACME' }
const row = { kind: 'customer', id, customer_id: id, label: 'ACME', status: 'active' }
const response = (items = [row]) => ({ ok: true, data: { contract_version: 'product.v1', items } })
function deferred<T>() {
 let resolve!: (value: T) => void
 const promise = new Promise<T>(done => { resolve = done })
 return { promise, resolve }
}
function fixture(tag = 'A') {
 const scope = { actorId: 'actor-' + tag, workspaceId: 'workspace-' + tag, scopeEpoch: 'epoch-' + tag, role: 'member' }
 let live: typeof scope | null = { ...scope }
 const calls = { search: 0, authorize: 0, issue: 0 }
 const port: ProductEntityResolutionPortV2 = {
  authority: async () => live, now: () => 1000,
  search: async () => { calls.search++; return response() },
  authorizeCandidate: async (_candidate, authority) => { calls.authorize++; assert.deepEqual(authority, scope); return true },
  issueReference: async (_candidate, authority) => { calls.issue++; assert.deepEqual(authority, scope); return 'ref_' + tag.repeat(31) + calls.issue },
 }
 return { port, calls, scope, revoke: () => { live = null } }
}

test('W4 cancellation during each pending seam suppresses late results and subsequent authority use', async () => {
 for (const seam of ['search', 'authorizeCandidate', 'issueReference'] as const) {
  const f = fixture(), entered = deferred<void>(), pending = deferred<unknown>(), controller = new AbortController()
  if (seam === 'search') f.port.search = async () => { f.calls.search++; entered.resolve(); return pending.promise }
  if (seam === 'authorizeCandidate') f.port.authorizeCandidate = async () => { f.calls.authorize++; entered.resolve(); return await pending.promise as boolean }
  if (seam === 'issueReference') f.port.issueReference = async () => { f.calls.issue++; entered.resolve(); return await pending.promise as string }
  const operation = resolveProductEntityV2(query, f.port, controller.signal)
  await entered.promise; controller.abort()
  assert.deepEqual(await operation, { status: 'unavailable', candidates: [] })
  const stopped = { ...f.calls }
  pending.resolve(seam === 'search' ? response() : seam === 'authorizeCandidate' ? true : 'ref_' + 'A'.repeat(32))
  await nextTurn()
  assert.deepEqual(f.calls, stopped, 'late completion must not advance the pipeline')
  if (seam !== 'issueReference') assert.equal(f.calls.issue, 0)
 }
})

test('W4 revocation after one ancestry read stops later authorization and every issuer call', async () => {
 const f = fixture(); f.port.search = async () => response([row, { ...row, id: other, customer_id: other }])
 f.port.authorizeCandidate = async () => { f.calls.authorize++; f.revoke(); return true }
 assert.deepEqual(await resolveProductEntityV2(query, f.port), { status: 'access_changed', candidates: [] })
 assert.equal(f.calls.authorize, 1); assert.equal(f.calls.issue, 0)
})

test('W4 revocation between issuer calls never exposes a partially issued choice list', async () => {
 const f = fixture(); f.port.search = async () => response([row, { ...row, id: other, customer_id: other }])
 f.port.issueReference = async () => { f.calls.issue++; f.revoke(); return 'ref_' + 'A'.repeat(32) }
 assert.deepEqual(await resolveProductEntityV2(query, f.port), { status: 'access_changed', candidates: [] })
 assert.equal(f.calls.authorize, 2); assert.equal(f.calls.issue, 1)
})

test('W4 interleaved tenants retain separate authority and cancellation state', async () => {
 const a = fixture('A'), b = fixture('B'), enteredA = deferred<void>(), enteredB = deferred<void>(), pendingA = deferred<unknown>(), pendingB = deferred<unknown>()
 a.port.search = async () => { enteredA.resolve(); return pendingA.promise }
 b.port.search = async () => { enteredB.resolve(); return pendingB.promise }
 const resultA = resolveProductEntityV2(query, a.port), resultB = resolveProductEntityV2(query, b.port)
 await Promise.all([enteredA.promise, enteredB.promise]); a.revoke(); pendingB.resolve(response())
 const acceptedB = await resultB
 assert.equal(acceptedB.status, 'needs_selection'); assert.equal(acceptedB.candidates[0]?.reference, 'ref_' + 'B'.repeat(31) + '1')
 pendingA.resolve(response()); assert.deepEqual(await resultA, { status: 'access_changed', candidates: [] })
 assert.equal(a.calls.issue, 0); assert.equal(b.calls.issue, 1)
 assert.equal(JSON.stringify(acceptedB).includes(a.scope.workspaceId), false)
})

test('W4 mutation of repository-owned data during awaited authorization cannot replace the captured identity', async () => {
 const f = fixture(), original = response(), entered = deferred<void>(), pending = deferred<boolean>()
 f.port.search = async () => original
 f.port.authorizeCandidate = async candidate => { assert.equal(candidate.id, id); entered.resolve(); return pending.promise }
 f.port.issueReference = async candidate => { assert.equal(candidate.id, id); return 'ref_' + 'A'.repeat(32) }
 const operation = resolveProductEntityV2(query, f.port)
 await entered.promise; original.data.items[0] = { ...row, id: other, customer_id: other, label: 'ACME changed' }; pending.resolve(true)
 const result = await operation
 assert.equal(result.status, 'needs_selection'); assert.equal(result.candidates[0]?.label, 'ACME')
 assert.equal(JSON.stringify(result).includes(other), false)
})

test('W4 failed late issuer suppresses all earlier handles and raw provider detail', async () => {
 const f = fixture(); f.port.search = async () => response([row, { ...row, id: other, customer_id: other }])
 f.port.issueReference = async () => { if (++f.calls.issue === 2) throw new Error('synthetic-private-provider-detail'); return 'ref_' + 'A'.repeat(32) }
 assert.deepEqual(await resolveProductEntityV2(query, f.port), { status: 'unavailable', candidates: [] })
 assert.equal(f.calls.issue, 2)
})
