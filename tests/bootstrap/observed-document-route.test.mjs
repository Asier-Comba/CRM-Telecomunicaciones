import test from 'node:test'
import assert from 'node:assert/strict'
import { observeDocumentMaintenanceRoute } from '../../scripts/security/supabase-local/observed-document-route.mjs'

function fixture() {
  let callback, removed
  return {
    page: {
      async route(pattern, handler) { assert.equal(pattern, '**/api/document/v1/maintenance'); callback = handler },
      async unroute(pattern, handler) { removed = handler; assert.equal(pattern, '**/api/document/v1/maintenance') },
    },
    invoke: route => callback(route),
    assertDisposed: () => assert.equal(removed, callback),
  }
}
const closedFailure = error => error.message === 'DOCUMENT_ROUTE_INTERCEPTION_FAILED' &&
  !Object.hasOwn(error, 'cause') && !String(error.stack).includes('synthetic-private-cookie')

test('a rejected interception settles safely and blocks uncertain retry and later callbacks', async () => {
  const f = fixture(); let fetches = 0, aborts = 0, retries = 0
  const observer = await observeDocumentMaintenanceRoute(f.page, async route => { fetches++; await route.fetch() })
  const route = { fetch: async () => { throw Error('route.fetch ECONNRESET Cookie: synthetic-private-cookie') }, abort: async () => { aborts++ } }
  await assert.doesNotReject(f.invoke(route))
  await assert.rejects(async () => { await observer.assertHealthy(); retries++ }, closedFailure)
  await f.invoke(route)
  assert.equal(fetches, 1); assert.equal(aborts, 2); assert.equal(retries, 0)
  await assert.rejects(observer.dispose(), closedFailure); f.assertDisposed()
})

test('health waits for a pending interception and preserves failure even when abort fails', async () => {
  const f = fixture(); let release, entered
  const gate = new Promise(resolve => { release = resolve })
  const started = new Promise(resolve => { entered = resolve })
  const observer = await observeDocumentMaintenanceRoute(f.page, async () => { entered(); await gate; throw Error('synthetic-private-cookie') })
  const callback = f.invoke({ abort: async () => { throw Error('synthetic-private-cookie') } })
  await started
  let accepted = false
  const health = observer.assertHealthy().then(() => { accepted = true })
  const rejection = assert.rejects(health, closedFailure)
  await Promise.resolve(); assert.equal(accepted, false)
  release(); await callback; await rejection
  await assert.rejects(observer.dispose(), closedFailure); f.assertDisposed()
})

test('non-200 commit assertion is still a failure instead of successful lost response', async () => {
  const f = fixture()
  const observer = await observeDocumentMaintenanceRoute(f.page, async route => {
    const response = await route.fetch()
    if (response.status() !== 200) throw Error('CLEANUP_UI_NOT_COMMITTED')
    await route.abort('failed')
  })
  await f.invoke({ fetch: async () => ({ status: () => 409 }), abort: async () => {} })
  await assert.rejects(observer.assertHealthy(), closedFailure)
  await assert.rejects(observer.dispose(), closedFailure); f.assertDisposed()
})

test('confirmed 200 followed by intentional lost response retains exact retry and disposal', async () => {
  const f = fixture(); let lost = true, aborts = 0, continued = 0
  const bodies = []
  const observer = await observeDocumentMaintenanceRoute(f.page, async route => {
    bodies.push(route.request().postDataJSON())
    if (lost) { lost = false; assert.equal((await route.fetch()).status(), 200); await route.abort('failed') }
    else await route.continue()
  })
  const intent = { operation: 'document.verify_content', input: { request_id: 'synthetic-exact-request' } }
  const route = { request: () => ({ postDataJSON: () => intent }), fetch: async () => ({ status: () => 200 }), abort: async () => { aborts++ }, continue: async () => { continued++ } }
  await f.invoke(route); await observer.assertHealthy()
  await f.invoke(route); await observer.assertHealthy()
  assert.deepEqual(bodies, [intent, intent]); assert.equal(aborts, 1); assert.equal(continued, 1)
  await observer.dispose(); f.assertDisposed()
})
