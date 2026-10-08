import assert from 'node:assert/strict'
import test from 'node:test'
import { IntegrationBoundary, type IntegrationCommit, type IntegrationBoundaryDependencies } from '../../src/assistant/integration-boundary.ts'

const now = 1790503200900
const request = { registeredIntegrationRef: 'integration_000000001', registeredAction: 'messaging.send', commandRef: 'command_000000000001' }
const principal = { actorId: 'principal_000000001', workspaceId: 'workspace_000000001', authentication: 'service_principal', principalVersion: 1, expiresAtMs: now + 10000, revoked: false, capabilityScopes: ['integration.messaging.send'] }
const action = { registeredIntegrationRef: request.registeredIntegrationRef, registeredAction: request.registeredAction, requiredCapability: 'integration.messaging.send', enabled: true }
const command = { ...request, actorId: principal.actorId, workspaceId: principal.workspaceId, state: 'confirmed', argumentsDigest: 'a'.repeat(64), confirmationRef: 'confirmation_0000001', confirmationExpiresAtMs: now + 5000 }
function fixture(overrides: Partial<IntegrationBoundaryDependencies> = {}) {
  const commits: IntegrationCommit[] = []
  const receipt = { status: 'queued', commandRef: command.commandRef, actorId: principal.actorId, workspaceId: principal.workspaceId, operationRef: 'operation_0000000001', outboxRef: 'outbox_000000000001', auditRef: 'audit_0000000000001' }
  const dependencies: IntegrationBoundaryDependencies = { resolvePrincipal: async () => principal, resolveRegisteredAction: async () => action, resolvePreparedCommand: async () => command, nowMs: () => now, outbox: { commitConfirmedCommand: async (commit) => { commits.push(commit); return receipt } }, ...overrides }
  return { boundary: new IntegrationBoundary(dependencies), commits }
}
test('registered confirmed command emits only pending operation reference and immutable atomic commit', async () => {
  const { boundary, commits } = fixture()
  assert.deepEqual(await boundary.enqueue(request), { ok: true, state: 'pending', operationRef: 'operation_0000000001' })
  assert.equal(commits.length, 1)
  assert.equal(Object.isFrozen(commits[0]), true)
  assert.equal(Object.isFrozen(commits[0]!.principal.capabilityScopes), true)
  assert.equal(commits[0]!.command.argumentsDigest, command.argumentsDigest)
})
test('closed integration request excludes arbitrary HTTP, bodies, tenant selectors, secrets and getters', async () => {
  const { boundary, commits } = fixture()
  for (const key of ['url', 'body', 'workspaceId', 'workspace_id', 'tenant', 'headers', 'apiKey', 'globalKey', 'confirmationRef', 'dispatcher']) {
    assert.deepEqual(await boundary.enqueue({ ...request, [key]: { nested: 'injected' } }), { ok: false, code: 'INVALID_INPUT' })
  }
  for (const value of ['https://example.com/send', 'Bearer opaque-secret-value', '', '__proto__']) assert.equal((await boundary.enqueue({ ...request, registeredAction: value })).ok, false)
  const getter = Object.defineProperty({ ...request }, 'commandRef', { enumerable: true, get() { throw new Error('do not execute') } })
  assert.deepEqual(await boundary.enqueue(getter), { ok: false, code: 'INVALID_INPUT' })
  assert.equal(commits.length, 0)
})
test('principal revocation, millisecond expiry, wrong authentication and missing capability deny before outbox', async () => {
  for (const replacement of [{ ...principal, revoked: true }, { ...principal, expiresAtMs: now }, { ...principal, expiresAtMs: now - 900 }, { ...principal, expiresAtMs: NaN }, { ...principal, authentication: 'user_session' }, { ...principal, capabilityScopes: ['*'] }, { ...principal, capabilityScopes: [] }, { ...principal, globalKey: 'forbidden' }]) {
    const { boundary, commits } = fixture({ resolvePrincipal: async () => replacement })
    assert.deepEqual(await boundary.enqueue(request), { ok: false, code: 'FORBIDDEN' })
    assert.equal(commits.length, 0)
  }
})
test('server action allowlist and command actor/workspace binding reject substitution', async () => {
  for (const field of ['actorId', 'workspaceId', 'commandRef', 'registeredIntegrationRef', 'registeredAction']) {
    const { boundary, commits } = fixture({ resolvePreparedCommand: async () => ({ ...command, [field]: 'forged_0000000000001' }) })
    assert.deepEqual(await boundary.enqueue(request), { ok: false, code: 'FORBIDDEN' })
    assert.equal(commits.length, 0)
  }
  for (const replacement of [null, { ...action, enabled: false }, { ...action, registeredAction: 'other.action' }, { ...action, url: 'https://example.com' }]) {
    const { boundary, commits } = fixture({ resolveRegisteredAction: async () => replacement })
    assert.deepEqual(await boundary.enqueue(request), { ok: false, code: 'FORBIDDEN' })
    assert.equal(commits.length, 0)
  }
})
test('draft/preview/expired confirmation cannot enqueue and time is rechecked after resolution', async () => {
  for (const [state, code] of [['draft', 'PREVIEW_REQUIRED'], ['previewed', 'CONFIRMATION_REQUIRED']] as const) {
    const { boundary, commits } = fixture({ resolvePreparedCommand: async () => ({ ...command, state }) })
    assert.deepEqual(await boundary.enqueue(request), { ok: false, code })
    assert.equal(commits.length, 0)
  }
  const expired = fixture({ resolvePreparedCommand: async () => ({ ...command, confirmationExpiresAtMs: now }) })
  assert.deepEqual(await expired.boundary.enqueue(request), { ok: false, code: 'CONFIRMATION_REQUIRED' })
  let clockCalls = 0
  const lapse = fixture({ nowMs: () => ++clockCalls === 1 ? now : now + 10000 })
  assert.deepEqual(await lapse.boundary.enqueue(request), { ok: false, code: 'FORBIDDEN' })
  assert.equal(lapse.commits.length, 0)
})
test('store failures and forged/foreign receipts never expose raw provider error or promise delivery', async () => {
  const foreign = { status: 'queued', commandRef: command.commandRef, actorId: principal.actorId, workspaceId: 'workspace_foreign_001', operationRef: 'operation_0000000001', outboxRef: 'outbox_000000000001', auditRef: 'audit_0000000000001' }
  for (const result of [foreign, { status: 'queued', operationRef: 'operation_0000000001' }, { error: 'provider private payload' }, null]) {
    const { boundary } = fixture({ outbox: { commitConfirmedCommand: async () => result } })
    assert.deepEqual(await boundary.enqueue(request), { ok: false, code: 'UNAVAILABLE' })
  }
  const { boundary } = fixture({ outbox: { commitConfirmedCommand: async () => { throw new Error('private provider error') } } })
  assert.deepEqual(await boundary.enqueue(request), { ok: false, code: 'UNAVAILABLE' })
})

test('scope accessors and coercible command states cannot supply authority', async () => {
  let getterCalls = 0
  const capabilityScopes = ['integration.messaging.send']
  Object.defineProperty(capabilityScopes, '0', { enumerable: true, get() { getterCalls++; return 'integration.messaging.send' } })
  const malicious = fixture({ resolvePrincipal: async () => ({ ...principal, capabilityScopes }) })
  assert.deepEqual(await malicious.boundary.enqueue(request), { ok: false, code: 'FORBIDDEN' })
  assert.equal(getterCalls, 0)
  const coercible = fixture({ resolvePreparedCommand: async () => ({ ...command, state: { toString() { throw new Error('must not coerce') } } }) })
  assert.deepEqual(await coercible.boundary.enqueue(request), { ok: false, code: 'FORBIDDEN' })
})
