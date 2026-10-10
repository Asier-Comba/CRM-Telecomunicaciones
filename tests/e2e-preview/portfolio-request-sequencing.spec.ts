import { createServer } from 'node:http'
import type { EventEmitter } from 'node:events'
import { expect, test } from '@playwright/test'
import { currentPortfolioReference } from '../../scripts/security/supabase-local/product-portfolio-reference-read.mjs'

const id = '00000000-0000-4000-8000-000000000001'
const record = { id, version: 1, status: 'active', source: 'manual', customer_id: '00000000-0000-4000-8000-000000000002', operator_id: '00000000-0000-4000-8000-000000000003', plan_version_id: null, start_date: '2026-10-09', signed_date: null, end_date: null, assigned_user_id: null }
const envelope = { ok: true, data: { contract_version: 'portfolio.v1', kind: 'contract', record } }
const input = JSON.stringify({ operation: 'portfolio.get', input: { kind: 'contract', id } })

// Real browser/HTTP sequencing only; no Next/React/Auth/PostgreSQL acceptance.
for (const mode of ['delayed_navigation', 'before_load', 'foreign_frame', 'wrong_id', 'http_refusal', 'dto_refusal'] as const) {
  test(`portfolio request sequencing ${mode} keeps one current-document read and the original request budget`, async ({ page }) => {
    const counts = { documents: 0, current_queries: 0, foreign_queries: 0 }
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const delay = (action: () => void, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); action() }, ms); timers.add(timer) }
    const fetchCurrent = `fetch('/api/portfolio/v1/queries',{method:'POST',headers:{'Content-Type':'application/json'},body:${JSON.stringify(mode === 'wrong_id' ? input.replace(id, record.customer_id) : input)}})`
    const server = createServer((request, response) => {
      if (request.url?.startsWith('/portfolio?')) {
        counts.documents++
        const child = mode === 'foreign_frame' ? '<iframe src="/synthetic-child"></iframe>' : ''
        const script = mode === 'before_load' ? `${fetchCurrent};` : `setTimeout(()=>${fetchCurrent},${mode === 'foreign_frame' ? 600 : 300});`
        const html = `<meta name="viewport" content="width=device-width,initial-scale=1">${child}<script>${script}</script>${mode === 'before_load' ? '<script src="/hold-load.js"></script>' : ''}`
        const send = () => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html) }
        if (mode === 'delayed_navigation') delay(send, 1400); else send()
      } else if (request.url === '/hold-load.js') {
        delay(() => { response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end('// synthetic load boundary') }, 400)
      } else if (request.url === '/synthetic-child') {
        response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(`<script>fetch('/api/portfolio/v1/queries',{method:'POST',headers:{'Content-Type':'application/json','x-synthetic-frame':'child'},body:${JSON.stringify(input)}})</script>`)
      } else if (request.url === '/api/portfolio/v1/queries') {
        const child = request.headers['x-synthetic-frame'] === 'child'
        if (child) counts.foreign_queries++; else counts.current_queries++
        response.writeHead(child ? 403 : mode === 'http_refusal' ? 503 : 200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(mode === 'dto_refusal' ? { ...envelope, data: { ...envelope.data, record: { ...record, id: record.customer_id } } } : envelope))
      } else { response.writeHead(404); response.end() }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw Error('LOOPBACK_ADDRESS_REQUIRED')
      const origin = `http://127.0.0.1:${address.port}`
      page.setDefaultTimeout(1000); page.setDefaultNavigationTimeout(5000)
      const operation = currentPortfolioReference({ page, origin, kind: 'contract', id, report: {}, authOrigin: undefined })
      if (mode === 'wrong_id') await expect(operation).rejects.toThrow(/Timeout/)
      else if (mode === 'http_refusal') await expect(operation).rejects.toThrow('PORTFOLIO_REFERENCE_HTTP_REFUSED')
      else if (mode === 'dto_refusal') await expect(operation).rejects.toThrow('PORTFOLIO_REFERENCE_CURRENT_DTO_INVALID')
      else await expect(operation).resolves.toEqual(envelope.data)
      expect(counts).toEqual({ documents: 1, current_queries: 1, foreign_queries: mode === 'foreign_frame' ? 1 : 0 })
      // Playwright's runtime emitter has this API; the Page interface omits it.
      const eventCounts = page as unknown as Pick<EventEmitter, 'listenerCount'>
      expect(eventCounts.listenerCount('request')).toBe(0); expect(eventCounts.listenerCount('framenavigated')).toBe(0)
    } finally {
      for (const timer of timers) clearTimeout(timer)
      server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
}
