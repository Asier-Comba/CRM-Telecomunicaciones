import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'
import { observeBillingCurrentInvoiceStep } from '../../scripts/security/supabase-local/billing-current-invoice-step.mjs'

// Actual browser/assertion failures over disposable loopback HTTP. This tests
// diagnostic preservation, not invoice correctness, Auth or database durability.
for (const mode of ['success', 'viewport_refusal', 'version_refusal'] as const) {
  test(`current invoice observation preserves ${mode} without a command retry`, async ({ page }, info) => {
    const width = info.project.name === 'mobile' ? 390 : 768
    const methods: string[] = []
    const server = createServer((request, response) => {
      methods.push(request.method ?? '')
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}section{width:300px;margin:100px auto;height:${mode === 'viewport_refusal' ? 1400 : 200}px;background:#eef}</style><section data-invoice-detail-version="${mode === 'version_refusal' ? '2' : '3'}">Synthetic current invoice</section>`)
    })
    await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw Error('LOOPBACK_FIXTURE_ADDRESS')
      await page.goto(`http://127.0.0.1:${address.port}`)
      const report: { w2_ui_action_step?: string; w2_ui_billing_current_invoice_failure?: { width: number; step: string; kind: string } } = {}
      const detail = page.locator('section')
      await observeBillingCurrentInvoiceStep(report, width, 'viewport_setup', () => page.setViewportSize({ width, height: 960 }))
      expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width, height: 960 })
      await observeBillingCurrentInvoiceStep(report, width, 'scroll', () => detail.scrollIntoViewIfNeeded())
      const step = mode === 'version_refusal' ? 'version_assertion' : 'viewport_assertion'
      let calls = 0, rejected = false
      try {
        await observeBillingCurrentInvoiceStep(report, width, step, async () => {
          calls++
          if (step === 'version_assertion') await expect(detail).toHaveAttribute('data-invoice-detail-version', '3')
          else await expect(detail).toBeInViewport({ ratio: 1 })
        })
      } catch { rejected = true }
      expect(calls).toBe(1)
      if (mode === 'success') {
        expect(rejected).toBe(false)
        expect(report.w2_ui_billing_current_invoice_failure).toBeUndefined()
        const pixels = await observeBillingCurrentInvoiceStep(report, width, 'screenshot', () => page.screenshot({ type: 'png' }))
        expect(pixels.byteLength).toBeGreaterThan(0)
      } else {
        expect(rejected).toBe(true)
        expect(report.w2_ui_billing_current_invoice_failure).toEqual({ width, step, kind: mode === 'version_refusal' ? 'STATE_ASSERTION' : 'VIEWPORT_ASSERTION' })
        expect(report.w2_ui_action_step).toBe(`billing:confirmed_current_invoice:${width}:${step}`)
        expect(Object.keys(report.w2_ui_billing_current_invoice_failure ?? {}).sort()).toEqual(['kind', 'step', 'width'])
      }
      expect(methods.every(method => method === 'GET')).toBe(true)
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()) })
    }
  })
}
