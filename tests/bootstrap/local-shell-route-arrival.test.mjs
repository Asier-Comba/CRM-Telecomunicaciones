import test from 'node:test'
import assert from 'node:assert/strict'
import { synchronizeLocalShellRoute } from '../../scripts/security/supabase-local/local-shell-route-arrival.mjs'

test('route observation is armed before one original click and preserves the existing navigation budget', async () => {
  const order = []; let predicate, arrive
  const page = {
    waitForURL(...args) { assert.equal(args.length, 1); predicate = args[0]; order.push('wait'); return new Promise(resolve => { arrive = resolve }) },
    setDefaultTimeout() { assert.fail('must not change timeout') },
    setDefaultNavigationTimeout() { assert.fail('must not change navigation timeout') },
  }
  await synchronizeLocalShellRoute({ page, origin: 'http://127.0.0.1:3109', path: '/reports', click: () => { order.push('click'); arrive() } })
  assert.deepEqual(order, ['wait', 'click'])
  assert.equal(predicate(new URL('http://127.0.0.1:3109/reports')), true)
  assert.equal(predicate(new URL('http://localhost:3109/reports')), false)
  assert.equal(predicate(new URL('http://127.0.0.1:3109/documents')), false)
  assert.equal(predicate(new URL('https://example.invalid/reports')), false)
})

test('a refused click remains the same exception with no second action', async () => {
  const failure = Error('synthetic click refusal'); let calls = 0
  await assert.rejects(synchronizeLocalShellRoute({ page: { waitForURL: () => Promise.resolve() }, origin: 'http://127.0.0.1:3109', path: '/reports', click: () => { calls++; throw failure } }), error => error === failure)
  assert.equal(calls, 1)
})

test('a refused arrival remains the same exception with one click', async () => {
  const failure = Error('synthetic route refusal'); let calls = 0
  await assert.rejects(synchronizeLocalShellRoute({ page: { waitForURL: () => Promise.reject(failure) }, origin: 'http://127.0.0.1:3109', path: '/reports', click: () => { calls++ } }), error => error === failure)
  assert.equal(calls, 1)
})

test('unknown paths, remote origins and credential URLs fail closed before any observation or click', async () => {
  for (const [origin, path] of [['http://127.0.0.1:3109', '/arbitrary'], ['https://example.invalid', '/reports'], ['http://synthetic@127.0.0.1:3109', '/reports'], ['http://127.0.0.1:3109/', '/reports']]) {
    let calls = 0
    await assert.rejects(synchronizeLocalShellRoute({ page: { waitForURL() { calls++; assert.fail('invalid context observed') } }, origin, path, click: () => { calls++ } }), { message: 'SHELL_NAVIGATION_CONTEXT_INVALID' })
    assert.equal(calls, 0)
  }
})

test('all twelve existing shell paths remain supported without dispatching an extra request', async () => {
  for (const path of ['/clients', '/portfolio', '/opportunities', '/calendar', '/inbox', '/automations', '/assistant', '/facturacion', '/documents', '/reports', '/settings', '/dashboard']) {
    let calls = 0
    await synchronizeLocalShellRoute({ page: { waitForURL(predicate) { assert.equal(predicate(new URL('http://localhost:3109' + path)), true); return Promise.resolve() } }, origin: 'http://localhost:3109', path, click: () => { calls++ } })
    assert.equal(calls, 1)
  }
})
