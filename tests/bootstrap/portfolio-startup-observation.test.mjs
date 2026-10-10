import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { observePortfolioStartup } from '../../scripts/security/supabase-local/portfolio-startup-observation.mjs'

const destination = 'http://127.0.0.1:3109/portfolio?kind=contract&id=synthetic'
function fixture() {
  const page = new EventEmitter(), main = { url: () => destination }, foreign = { url: () => destination }, report = {}
  page.mainFrame = () => main
  page.evaluate = async () => ({ same: true, ready: 'complete' })
  const observation = observePortfolioStartup({ page, destination, phase: 'layout:portfolio:1440:exact_reference', report })
  const request = (options = {}) => ({ frame: () => main, method: () => 'GET', resourceType: () => 'script', url: () => 'http://127.0.0.1:3109/_next/static/chunks/synthetic.js?private=synthetic', headers() { assert.fail('headers read') }, postDataJSON() { assert.fail('body read') }, failure() { assert.fail('failure text read') }, ...options })
  return { page, main, foreign, report, observation, request, row: () => report.w2_portfolio_startup_observations[0] }
}

test('current main-document script transport counts only local Next scripts without retaining private material', async () => {
  const f = fixture(), old = f.request(); f.page.emit('request', old)
  f.page.emit('framenavigated', f.main)
  for (const options of [{ frame: () => f.foreign }, { method: () => 'POST' }, { resourceType: () => 'fetch' }, { url: () => 'https://foreign.invalid/_next/static/chunk.js' }, { url: () => 'http://127.0.0.1:3109/api/private.js' }]) f.page.emit('request', f.request(options))
  const own = f.request(); f.page.emit('request', own)
  f.page.emit('response', { request: () => old, status: () => 200 })
  f.page.emit('response', { request: () => own, status: () => 200, json() { assert.fail('response body read') } })
  f.observation.navigationDone(); await f.observation.finish()
  assert.equal(f.row().requests, 1); assert.equal(f.row().responses, 1); assert.equal(f.row().status_counts.ok, 1)
  assert.equal(f.row().document_ready, 'complete'); assert.equal(f.row().navigation_completed, true)
  assert.equal(JSON.stringify(f.report).includes('private'), false); assert.equal(f.page.eventNames().length, 0)
})

test('HTTP refusals, transport failures and pending scripts remain distinguishable', async () => {
  const f = fixture(); f.page.emit('framenavigated', f.main)
  for (const status of [302, 404, 503, 101]) { const r = f.request(); f.page.emit('request', r); f.page.emit('response', { request: () => r, status: () => status }) }
  const refused = f.request(); f.page.emit('request', refused); f.page.emit('requestfailed', refused); f.page.emit('request', f.request())
  await f.observation.finish()
  assert.deepEqual([f.row().requests, f.row().responses, f.row().failures, f.row().pending], [6, 4, 1, 1])
  assert.deepEqual(f.row().status_counts, { ok: 0, redirect: 1, client_error: 1, server_error: 1, other: 1 })
})

test('page errors are closed counters and accessors or raw messages never escape', async () => {
  const f = fixture(); let getters = 0; f.page.emit('pageerror', Error('old document')); f.page.emit('framenavigated', f.main)
  f.page.emit('pageerror', Error('Loading chunk synthetic private material'))
  f.page.emit('pageerror', Object.assign(Error('synthetic private parser body'), { name: 'SyntaxError' }))
  f.page.emit('pageerror', Object.defineProperty({}, 'message', { get() { getters++; throw Error('private accessor') } }))
  await f.observation.finish()
  assert.equal(getters, 0); assert.deepEqual(f.row().page_errors, { chunk_load: 1, syntax: 1, other: 1 })
  assert.equal(JSON.stringify(f.report).includes('private'), false)
})

test('script and error limits are explicit and do not issue another request', async () => {
  const f = fixture(); f.page.emit('framenavigated', f.main)
  for (let i = 0; i < 40; i++) f.page.emit('request', f.request())
  for (let i = 0; i < 12; i++) f.page.emit('pageerror', Error('synthetic'))
  await f.observation.finish()
  assert.equal(f.row().requests, 32); assert.equal(f.row().truncated, true)
  assert.equal(f.row().page_errors.other, 8); assert.equal(f.row().page_errors_truncated, true)
})

test('a changed document cannot contribute successor transport, errors or readiness', async () => {
  const f = fixture(); f.page.emit('framenavigated', f.main); f.page.emit('request', f.request())
  f.page.emit('framenavigated', f.main); f.page.emit('request', f.request()); f.page.emit('pageerror', Error('successor'))
  await f.observation.finish()
  assert.equal(f.row().document_changed, true); assert.equal(f.row().document_ready, 'unavailable')
  assert.equal(f.row().requests, 1); assert.equal(f.row().page_errors.other, 0)
})

test('evaluation refusal is diagnostic only and all listeners are removed once', async () => {
  const f = fixture(); f.page.emit('framenavigated', f.main); f.page.evaluate = async () => { throw Error('synthetic private failure') }
  await f.observation.finish(); await f.observation.finish()
  assert.equal(f.row().document_ready, 'unavailable'); assert.equal(f.report.w2_portfolio_startup_observations.length, 1)
  assert.equal(f.page.eventNames().length, 0)
})

test('invalid diagnostic destinations do not change the original action or attach listeners', async () => {
  for (const destination of ['not-a-url', 'https://foreign.invalid/portfolio', 'http://synthetic@127.0.0.1:3109/portfolio', 'http://127.0.0.1:3109/arbitrary']) {
    const page = new EventEmitter(), report = {}
    const observer = observePortfolioStartup({ page, destination, report }); observer.navigationDone(); await observer.finish()
    assert.equal(page.eventNames().length, 0); assert.deepEqual(report, {})
  }
})
