import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'
import { observePortfolioStartup } from '../../scripts/security/supabase-local/portfolio-startup-observation.mjs'

// Actual module transport and SSR marker fixture, not Next/React/Auth acceptance.
for (const mode of ['module_ok', 'http_refusal', 'transport_refusal'] as const) {
  test(`portfolio startup observes ${mode} without a retry or private error`, async ({ page }, info) => {
    const methods: string[] = []
    const server = createServer((request, response) => {
      methods.push(request.method ?? '')
      if (request.url === '/_next/static/chunks/synthetic.js') {
        response.writeHead(mode === 'http_refusal' ? 503 : 200, { 'Content-Type': 'text/javascript' })
        response.end("document.querySelector('#gate').dataset.crmAccessStage='user_pending'")
      } else {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="gate" data-crm-access-stage="before_effect">Verificando acceso</div><script type="module" src="/_next/static/chunks/synthetic.js"></script>')
      }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw Error('LOOPBACK_ADDRESS_REQUIRED')
      const destination = `http://127.0.0.1:${address.port}/portfolio`, width = info.project.name === 'mobile' ? 390 : 1440
      if (mode === 'transport_refusal') await page.route('**/_next/static/chunks/synthetic.js', route => route.abort('failed'))
      const report: { w2_portfolio_startup_observations?: Array<{ requests: number; responses: number; failures: number; pending: number; document_ready: string; status_counts: { ok: number; server_error: number } }> } = {}
      const observer = observePortfolioStartup({ page, destination, phase: `layout:portfolio:${width}:exact_reference`, report })
      await page.goto(destination); observer.navigationDone(); await observer.finish()
      await expect(page.locator('#gate')).toHaveAttribute('data-crm-access-stage', mode === 'module_ok' ? 'user_pending' : 'before_effect')
      const row = report.w2_portfolio_startup_observations?.[0]; expect(row).toBeDefined()
      expect(row?.requests).toBe(1); expect(row?.pending).toBe(0); expect(row?.document_ready).toBe('complete')
      if (mode === 'transport_refusal') { expect(row?.responses).toBe(0); expect(row?.failures).toBe(1) }
      else { expect(row?.responses).toBe(1); expect(row?.status_counts[mode === 'module_ok' ? 'ok' : 'server_error']).toBe(1) }
      expect(JSON.stringify(report)).not.toContain('synthetic.js'); expect(methods.every(method => method === 'GET')).toBe(true)
    } finally {
      await page.unroute('**/_next/static/chunks/synthetic.js')
      server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
}
