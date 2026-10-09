import test from 'node:test'
import assert from 'node:assert/strict'
import { SessionReferenceStore, type ReferenceScope } from '../../src/assistant/session-references.ts'

const scope: ReferenceScope = { actorId: 'actor-a', workspaceId: 'workspace-a', sessionId: 'session-a', scopeEpoch: 'epoch-1' }
const entity = { kind: 'customer' as const, id: 'customer_opaque_123', sourceTurn: 2, sourceOperation: 'crm.customer.search' }
const filters = { limit: 20, continuation: null, customer_id: entity.id }

test('entity handles bind every server scope dimension and entity kind', () => {
  const store = new SessionReferenceStore()
  const handle = store.issueEntity(scope, entity, 100)!
  assert.match(handle, /^ref_[A-Za-z0-9_-]{32}$/)
  assert.deepEqual(store.resolveEntity(handle, scope, 'customer', 3, 101), entity)
  for (const key of Object.keys(scope)) assert.equal(store.resolveEntity(handle, { ...scope, [key]: 'other' }, 'customer', 3, 101), null)
  assert.equal(store.resolveEntity(handle, scope, 'contact', 3, 101), null)
  assert.equal(store.resolveEntity(entity.id, scope, 'customer', 3, 101), null)
  assert.equal(store.resolveEntity('ref_' + 'x'.repeat(32), scope, 'customer', 3, 101), null)
})

test('references expire at exact boundary, reject future provenance and invalid clock', () => {
  const store = new SessionReferenceStore(5, 100)
  const handle = store.issueEntity(scope, entity, 100)!
  assert.equal(store.resolveEntity(handle, scope, 'customer', 1, 101), null)
  assert.equal(store.resolveEntity(handle, scope, 'customer', 3, NaN), null)
  assert.ok(store.resolveEntity(handle, scope, 'customer', 3, 199))
  assert.equal(store.resolveEntity(handle, scope, 'customer', 3, 200), null)
  assert.equal(store.issueEntity(scope, entity, Infinity), null)
})

test('caller mutations cannot rewrite reference identity or scope', () => {
  const store = new SessionReferenceStore()
  const inputScope = { ...scope }; const inputEntity = { ...entity }
  const handle = store.issueEntity(inputScope, inputEntity, 100)!
  inputScope.workspaceId = 'attacker'; inputEntity.id = 'forged_id_1234567'
  const result = store.resolveEntity(handle, scope, 'customer', 3, 101)!
  result.id = 'mutated_again_1234'
  assert.deepEqual(store.resolveEntity(handle, scope, 'customer', 3, 102), entity)
  store.revokeSession({ ...scope, scopeEpoch: 'epoch-2' })
  assert.equal(store.resolveEntity(handle, scope, 'customer', 3, 103), null)
})

test('continuations bind exact operation and normalized filters including page size', () => {
  const store = new SessionReferenceStore()
  const cursor = 'server_cursor_123456789'
  const handle = store.issueContinuation(scope, 'crm.task.list', filters, cursor, 'fresh', 100)!
  assert.equal(store.resolveContinuation(handle, scope, 'crm.task.list', { customer_id: entity.id, continuation: null, limit: 20 }, 101), cursor)
  for (const changed of [{ ...filters, limit: 21 }, { ...filters, customer_id: 'customer_opaque_456' }, { ...filters, continuation: cursor }, { ...filters, workspace_id: 'other' }]) {
    assert.equal(store.resolveContinuation(handle, scope, 'crm.task.list', changed, 101), null)
  }
  assert.equal(store.resolveContinuation(handle, scope, 'crm.meeting.list', filters, 101), null)
  assert.equal(store.resolveContinuation(handle, { ...scope, scopeEpoch: 'changed' }, 'crm.task.list', filters, 101), null)
  assert.equal(store.resolveEntity(handle, scope, 'customer', 3, 101), null)
})

test('stale pages, arbitrary cursors, unbounded capacity and unknown operations fail closed', () => {
  const store = new SessionReferenceStore(1, 100)
  assert.equal(store.issueContinuation(scope, 'crm.task.list', filters, 'server_cursor_123456789', 'stale', 100), null)
  assert.equal(store.issueContinuation(scope, 'crm.task.list', filters, 'short', 'fresh', 100), null)
  assert.equal(store.issueContinuation(scope, 'crm.sql.run', filters, 'server_cursor_123456789', 'fresh', 100), null)
  assert.equal(store.issueContinuation(scope, 'crm.customer.get', { customer_id: entity.id }, 'server_cursor_123456789', 'fresh', 100), null)
  assert.ok(store.issueEntity(scope, entity, 100))
  assert.equal(store.issueEntity(scope, entity, 101), null)
  assert.ok(store.issueEntity(scope, entity, 200))
  assert.throws(() => new SessionReferenceStore(0), /invalid_reference_policy/)
  assert.throws(() => new SessionReferenceStore(1, 900_001), /invalid_reference_policy/)
})

test('reference provenance binds registered read operation to actual resource kind', () => {
  const refs = new SessionReferenceStore()
  for (const sourceOperation of ['crm.sql.execute', 'constructor', 'crm.contract.get', 'crm.dashboard.get', '']) {
    assert.equal(refs.issueEntity(scope, { ...entity, sourceOperation }, 100), null)
  }
})

test('in-flight guards are bounded, scope-isolated, invalidated and explicitly released', () => {
  const refs = new SessionReferenceStore()
  const guards = Array.from({ length: 128 }, () => refs.beginRead(scope)!)
  assert.ok(guards.every(g => g.current()))
  assert.equal(refs.beginRead(scope), null)
  refs.revokeSession({ ...scope, actorId: 'other_actor' })
  assert.ok(guards.every(g => g.current()))
  refs.revokeEntity(scope, 'customer', entity.id)
  assert.ok(guards.every(g => !g.current()))
  guards.forEach(g => g.release())
  const next = refs.beginRead(scope)!
  assert.ok(next.current()) // fresh operation must freshly authorize, never cache auth
  refs.revokeSession({ ...scope, scopeEpoch: 'new_epoch' })
  assert.equal(next.current(), false)
  next.release()
})
