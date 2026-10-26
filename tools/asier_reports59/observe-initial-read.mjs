import { parseDashboardInputV2, parseDashboardV2 } from '../../src/lib/server/product-dashboard-runtime-v2.ts'

// Passive lab/CI-only observer. Never mutates requests, performs a retry, changes
// timing budgets or records bodies, identities, URLs, headers or error messages.
export function observeReports59({ page, origin, report: reportTarget = {} }) {
  const url = new URL(origin)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw Error('DISPOSABLE_LOOPBACK_REQUIRED')
  const started = performance.now(), events = [], reads = new Map()
  let stopped = false, truncated = false, uiActive = false, documentEpoch = 0
  const event = (kind, fields = {}) => {
    if (stopped) return
    if (events.length >= 96) { truncated = true; return }
    events.push({ kind, ms: Math.round(performance.now() - started), ...fields })
  }
  const request = req => {
    if (req.frame() !== page.mainFrame()) return
    const destination = new URL(req.url())
    if (destination.origin !== origin) return
    if (req.resourceType() === 'script') { event('script_request'); return }
    if (req.method() !== 'POST' || destination.pathname !== '/api/product/v1/queries') return
    let body
    try { body = req.postDataJSON() } catch { return }
    if (body?.operation !== 'dashboard.get') return
    const input = parseDashboardInputV2(body.input)
    if (!input || reads.size >= 12) { truncated = true; return }
    const row = { sequence: reads.size + 1, period: input.period ?? 'month', audience: input.audience ?? 'my', status: 'pending', dto: 'not_observed' }
    reads.set(req, { row, input }); event('dashboard_request', { ...row })
  }
  const response = async res => {
    const req = res.request(), destination = new URL(req.url())
    if (req.frame() !== page.mainFrame() || destination.origin !== origin || stopped) return
    if (req.resourceType() === 'script') { event('script_response', { status: res.status() }); return }
    const found = reads.get(req)
    if (!found) return
    found.row.status = res.status(); event('dashboard_headers', { sequence: found.row.sequence, status: res.status() })
    if (res.status() !== 200) return
    found.row.dto = 'body_pending'
    try {
      const envelope = await res.json()
      if (stopped) return
      found.row.dto = envelope?.ok === true && !!parseDashboardV2(found.input, envelope.data) ? 'valid' : 'invalid'
    } catch { if (!stopped) found.row.dto = 'unavailable' }
    event('dashboard_body', { sequence: found.row.sequence, dto: found.row.dto })
  }
  const failed = req => {
    if (req.frame() !== page.mainFrame()) return
    const found = reads.get(req)
    if (found) { found.row.status = 'network_failed'; event('dashboard_failed', { sequence: found.row.sequence }) }
    else if (req.resourceType() === 'script' && new URL(req.url()).origin === origin) event('script_failed')
  }
  const pageerror = error => event('page_error', { category: ['TypeError', 'ReferenceError', 'SyntaxError'].includes(error.name) ? error.name : 'OTHER' })
  const handlers = { request, response, requestfailed: failed, pageerror }
  for (const [name, handler] of Object.entries(handlers)) page.on(name, handler)
  const report = new Proxy(/** @type {Record<string, unknown>} */ (reportTarget), { set(target, key, value) {
    if (key === 'w2_ui_action_step' && /^reports:[a-z_]{1,60}$/.test(value)) event('original_phase', { phase: value })
    target[key] = value; return true
  } })
  const mark = (kind, fields = {}) => {
    if (kind === 'scope_switch' && ['empresa', 'actor', 'rol'].includes(fields.dimension)) event(kind, { dimension: fields.dimension })
    else if (['original_assertion_failed_with_read_pending', 'button_enabled_after_original_failure'].includes(kind)) event(kind)
  }
  const navigated = frame => { if (frame === page.mainFrame()) event('document', { epoch: ++documentEpoch }) }
  const installUi = async () => {
    if (!uiActive) return
    try { await page.evaluate(expectedOrigin => {
      if (location.origin !== expectedOrigin || globalThis.__crmReportsUi61) return
      let previous = '', scheduled = false
      const emit = () => {
        const button = [...document.querySelectorAll('button')].find(element => ['Exportar resumen CSV', 'Comprobando permisos…'].includes(element.textContent.trim()))
        const period = document.querySelector('select[aria-label="Periodo"]')?.value
        const audience = document.querySelector('select[aria-label="Ámbito del informe"]')?.value
        const view = document.querySelector('[data-report-count]') ? 'loaded' : document.querySelector('[aria-label="Error al consultar el informe"]') ? 'error' : button ? 'loading' : 'absent'
        const state = { button: !button ? 'absent' : button.disabled ? 'disabled' : 'enabled', view, period, audience }
        const encoded = JSON.stringify(state)
        if (previous !== encoded) { previous = encoded; void globalThis.__crmReportsState61(state) }
      }
      const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; emit() }) } }
      const observer = new MutationObserver(schedule)
      observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-busy'] })
      document.addEventListener('change', schedule, true)
      globalThis.__crmReportsUi61 = { stop() { observer.disconnect(); document.removeEventListener('change', schedule, true) } }
      emit()
    }, origin) } catch { event('ui_observation_unavailable') }
  }
  return { report, mark, async attachUi() {
    await page.exposeBinding('__crmReportsState61', ({ frame }, state) => {
      if (!uiActive || frame !== page.mainFrame() || !state || typeof state !== 'object') return
      if (!['absent', 'disabled', 'enabled'].includes(state.button) || !['absent', 'loading', 'loaded', 'error'].includes(state.view)) return
      event('ui_state', { epoch: documentEpoch, button: state.button, view: state.view,
        period: ['month', 'quarter', 'semester', 'year', 'all'].includes(state.period) ? state.period : 'absent',
        audience: ['my', 'workspace'].includes(state.audience) ? state.audience : 'absent' })
    })
    uiActive = true; page.on('framenavigated', navigated); page.on('domcontentloaded', installUi); await installUi()
  }, async detachUi() {
    uiActive = false; page.off('framenavigated', navigated); page.off('domcontentloaded', installUi)
    try { await page.evaluate(() => globalThis.__crmReportsUi61?.stop()) } catch { /* Detached document is already gone. */ }
  }, snapshot() { return { scope: 'PASSIVE_CONTROLLED_REPORT_INITIAL_READ_NOT_AUTH_OR_CAUSE_PROOF', truncated, reads: [...reads.values()].map(({ row }) => ({ ...row })), events: [...events] } }, stop() {
    const snapshot = this.snapshot(); stopped = true
    for (const [name, handler] of Object.entries(handlers)) page.off(name, handler)
    return snapshot
  } }
}
