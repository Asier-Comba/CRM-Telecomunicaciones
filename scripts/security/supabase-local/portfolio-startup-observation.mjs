/** Observe only the current document's local Next script transport. Counts do
 * not establish hydration, session authority or a startup failure's cause.
 * No URL, body, header, error text, identity or retry leaves this observer.
 */
export function observePortfolioStartup({ page, destination, phase, report }) {
  let origin
  try {
    const url = new URL(destination)
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password && url.pathname === '/portfolio') origin = url.origin
  } catch { /* Invalid diagnostic context never changes the original action. */ }
  if (!origin) return { navigationDone() {}, async finish() {} }
  const main = page.mainFrame(), scripts = new Map()
  let observed = false, changed = false, navigated = false, truncated = false, errorsTruncated = false, errorCount = 0, finished = false
  const errors = { chunk_load: 0, syntax: 0, other: 0 }
  const navigation = frame => {
    if (frame !== main) return
    if (observed) changed = true
    else if (frame.url() === destination) observed = true
  }
  const started = request => {
    try {
      if (!observed || changed || request.frame() !== main || request.method() !== 'GET' || request.resourceType() !== 'script') return
      const url = new URL(request.url())
      if (url.origin !== origin || !url.pathname.startsWith('/_next/static/') || !url.pathname.endsWith('.js')) return
      if (scripts.size >= 32) { truncated = true; return }
      scripts.set(request, { status: null, failed: false })
    } catch { /* Detached/service-worker requests cannot supply this evidence. */ }
  }
  const responded = response => {
    const value = scripts.get(response.request()); if (!value) return
    const status = response.status()
    value.status = status >= 200 && status < 300 ? 'ok' : status >= 300 && status < 400 ? 'redirect' : status >= 400 && status < 500 ? 'client_error' : status >= 500 && status < 600 ? 'server_error' : 'other'
  }
  const failed = request => { const value = scripts.get(request); if (value) value.failed = true }
  const errored = error => {
    if (!observed || changed) return
    if (errorCount >= 8) { errorsTruncated = true; return }
    let message = '', name = ''
    try {
      const fields = Object.getOwnPropertyDescriptors(error)
      if (fields.message && Object.hasOwn(fields.message, 'value') && typeof fields.message.value === 'string') message = fields.message.value
      if (fields.name && Object.hasOwn(fields.name, 'value') && typeof fields.name.value === 'string') name = fields.name.value
    } catch { /* Exotic failures remain unclassified. */ }
    errors[name === 'ChunkLoadError' || message.includes('Loading chunk') || message.includes('ChunkLoadError') ? 'chunk_load' : name === 'SyntaxError' ? 'syntax' : 'other']++
    errorCount++
  }
  const handlers = { framenavigated: navigation, request: started, response: responded, requestfailed: failed, pageerror: errored }
  for (const [event, handler] of Object.entries(handlers)) page.on(event, handler)
  return {
    navigationDone() { navigated = true },
    async finish() {
      if (finished) return; finished = true
      for (const [event, handler] of Object.entries(handlers)) page.off(event, handler)
      if (!report) return
      let ready = 'unavailable'
      if (observed && !changed) {
        try {
          const value = await page.evaluate(expected => ({ same: location.href === expected, ready: document.readyState }), destination)
          if (value?.same === false) changed = true
          if (value?.same === true && ['loading', 'interactive', 'complete'].includes(value.ready)) ready = value.ready
        } catch { /* No browser or error details in the snapshot. */ }
      }
      const values = [...scripts.values()]
      const status_counts = Object.fromEntries(['ok', 'redirect', 'client_error', 'server_error', 'other'].map(status => [status, values.filter(value => value.status === status).length]))
      report.w2_portfolio_startup_observations ??= []
      if (report.w2_portfolio_startup_observations.length < 6) report.w2_portfolio_startup_observations.push({
        scope: 'CURRENT_MAIN_DOCUMENT_NEXT_SCRIPT_HEADERS_NOT_HYDRATION_OR_AUTHORIZATION',
        width: Number(phase?.match(/^layout:portfolio:(1440|768|390):exact_reference$/)?.[1]) || null,
        document_observed: observed, document_changed: changed, navigation_completed: navigated, document_ready: ready,
        requests: values.length, responses: values.filter(value => value.status !== null).length,
        failures: values.filter(value => value.failed).length, pending: values.filter(value => value.status === null && !value.failed).length,
        status_counts, truncated, page_errors: errors, page_errors_truncated: errorsTruncated,
      })
    },
  }
}
