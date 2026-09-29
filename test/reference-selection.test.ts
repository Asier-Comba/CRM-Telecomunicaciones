import test from 'node:test'
import assert from 'node:assert/strict'
import { ConversationSelections } from '../src/assistant/reference-selection.js'
import { SessionReferenceStore } from '../src/assistant/session-references.js'
const scope = { actorId: 'actor_a', workspaceId: 'workspace_a', sessionId: 'session_a', scopeEpoch: 'epoch_a' }
function fixture() {
  const refs = new SessionReferenceStore(); const selections = new ConversationSelections(refs)
  const handles = [1, 2, 3].map(n => refs.issueEntity(scope, { kind: 'customer', id: `customer_synthetic_${n}`, sourceTurn: 2, sourceOperation: 'crm.customer.search' }, 100)!)
  const frameRef = selections.remember(scope, 'customer', 2, handles, 100)!
  const context = { scope, turn: 3, now: 101, currentScope: () => scope, authorize: async () => true }
  return { refs, selections, handles, frameRef, context }
}
test('structured pronoun/ordinal/all resolution follows server candidate order without name ranking', async () => {
  const f = fixture()
  const second = await f.selections.select({ frameRef: f.frameRef, selection: 2 }, f.context)
  assert.equal(second.status, 'resolved')
  if (second.status === 'resolved') assert.equal(second.entities[0]?.id, 'customer_synthetic_2')
  const all = await f.selections.select({ frameRef: f.frameRef, selection: 'all' }, f.context)
  if (all.status !== 'resolved') assert.fail('expected all')
  assert.equal(all.entities.length, 3)
  for (const selection of [0, -1, 4, 1.5, 'el segundo', 'ACME']) assert.equal((await f.selections.select({ frameRef: f.frameRef, selection }, f.context)).status, 'invalid_reference')
})
test('frame, actor, workspace, session, epoch, kind, provenance and expiry attacks fail', async () => {
  const f = fixture(); const input = { frameRef: f.frameRef, selection: 1 }
  for (const key of Object.keys(scope)) assert.equal((await f.selections.select(input, { ...f.context, scope: { ...scope, [key]: 'other' } })).status, 'invalid_reference')
  assert.equal((await f.selections.select(input, { ...f.context, now: 300_100 })).status, 'invalid_reference')
  assert.equal((await f.selections.select(input, { ...f.context, turn: 1 })).status, 'invalid_reference')
  assert.equal(f.selections.remember(scope, 'contract', 2, f.handles, 100), null)
  assert.equal(f.selections.remember(scope, 'customer', 3, f.handles, 100), null)
  assert.equal((await f.selections.select({ ...input, workspaceId: 'other' }, f.context)).status, 'invalid_reference')
})
test('entity deletion and permission change invalidate references without returning partial authority', async () => {
  const f = fixture(); let calls = 0
  const result = await f.selections.select({ frameRef: f.frameRef, selection: 'all' }, { ...f.context, authorize: async () => ++calls !== 2 })
  assert.deepEqual(result, { status: 'access_changed' })
  assert.equal(f.refs.resolveEntity(f.handles[1], scope, 'customer', 3, 101), null)
  f.selections.invalidate(scope)
  assert.equal((await f.selections.select({ frameRef: f.frameRef, selection: 1 }, f.context)).status, 'invalid_reference')
})
test('scope change during awaited authorization cannot resurrect prior-turn access', async () => {
  const f = fixture(); let current = scope
  const result = await f.selections.select({ frameRef: f.frameRef, selection: 1 }, {
    ...f.context, currentScope: () => current,
    authorize: async () => { current = { ...scope, scopeEpoch: 'role_downgraded' }; return true },
  })
  assert.deepEqual(result, { status: 'access_changed' })
})
test('revocation or expiry during awaited authorization cannot resurrect a candidate frame', async () => {
  for (const mode of ['session', 'entity', 'expiry']) {
    const f = fixture(); let clock = 101
    const result = await f.selections.select({ frameRef: f.frameRef, selection: 1 }, {
      ...f.context, clock: () => clock,
      authorize: async () => {
        if (mode === 'session') f.selections.invalidate(scope)
        if (mode === 'entity') f.refs.revokeEntity(scope, 'customer', 'customer_synthetic_1')
        if (mode === 'expiry') clock = 300_100
        return true
      },
    })
    assert.deepEqual(result, { status: 'access_changed' }, mode)
  }
})

test('ordinal frames reject mixed operation provenance and duplicate logical identities', () => {
  const f = fixture()
  const duplicate = f.refs.issueEntity(scope, { kind: 'customer', id: 'customer_synthetic_1', sourceTurn: 2, sourceOperation: 'crm.customer.search' }, 100)!
  const summary = f.refs.issueEntity(scope, { kind: 'customer', id: 'customer_synthetic_4', sourceTurn: 2, sourceOperation: 'crm.customer.summary' }, 100)!
  assert.equal(f.selections.remember(scope, 'customer', 2, [f.handles[0]!, duplicate], 100), null)
  assert.equal(f.selections.remember(scope, 'customer', 2, [f.handles[0]!, summary], 100), null)
})
