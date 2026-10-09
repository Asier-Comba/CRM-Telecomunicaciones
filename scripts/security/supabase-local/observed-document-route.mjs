const pattern = '**/api/document/v1/maintenance'

/**
 * Observe the test interception separately from the UI's lost-response state.
 * SDK failures can contain private request headers: never retain the original error.
 * @param {import('@playwright/test').Page} page
 * @param {(route: import('@playwright/test').Route) => Promise<unknown>} handler
 */
export async function observeDocumentMaintenanceRoute(page, handler) {
  const pending = new Set()
  let failure
  const wrapped = route => {
    const task = Promise.resolve().then(async () => {
      try {
        if (failure) {
          await route.abort('failed')
          return
        }
        await handler(route)
      } catch {
        failure ??= new Error('DOCUMENT_ROUTE_INTERCEPTION_FAILED')
        try { await route.abort('failed') } catch { /* The failure remains observable. */ }
      }
    })
    const tracked = task.then(() => { pending.delete(tracked) })
    pending.add(tracked)
    return tracked
  }
  async function assertHealthy() {
    while (pending.size) await Promise.all([...pending])
    if (failure) throw failure
  }
  await page.route(pattern, wrapped)
  return {
    assertHealthy,
    async dispose() {
      try { await page.unroute(pattern, wrapped) } finally { await assertHealthy() }
    },
  }
}
