import { expect } from '@playwright/test'

/** Real authorized integrated UI, with each controlled clock confined to a new
 * page. Date.now and timers keep real time for Auth expiry and request budgets.
 * No draft is saved, no emission occurs, and the caller's clock is intact.
 */
export async function billingCurrentMadridDayBrowser({ page, origin, customerId, report }) {
  const observations = []
  for (const [instant, expected] of [
    ['2026-10-09T22:30:00Z', '2026-10-10'],
    ['2026-06-30T22:30:00Z', '2026-07-01'],
    ['2026-12-31T23:30:00Z', '2027-01-01'],
    ['2028-02-28T23:30:00Z', '2028-02-29'],
    ['2026-10-10T12:30:00Z', '2026-10-10'],
  ]) {
    const current = await page.context().newPage()
    let commands = 0
    current.on('request', request => {
      if (new URL(request.url()).pathname.endsWith('/commands')) commands++
    })
    const button = name => current.getByRole('button', { name, exact: true })
    const field = name => current.getByLabel(name, { exact: true })
    try {
      if (report) report.w2_ui_action_step = 'billing:madrid_day:open'
      await current.addInitScript(civilInstant => {
        const ObservedDate = globalThis.Date
        globalThis.Date = class extends ObservedDate {
          constructor(...args) { super(...(args.length ? args : [civilInstant])) }
        }
      }, instant)
      await current.goto(origin + '/facturacion?customer=' + customerId)
      await expect(button('Nuevo borrador local')).toBeEnabled()
      const customerName = await field('Cliente para facturación').locator('option:checked').innerText()
      await button('Nuevo borrador local').click()
      await expect(field('Fecha de emisión')).toHaveValue(expected)
      await button('Cerrar panel').click()

      if (report) report.w2_ui_action_step = 'billing:madrid_day:proposal'
      await field('Descripción de la factura').fill('Factura a ' + customerName + ' por conectividad 100 euros más IVA, vencimiento en 15 días')
      const proposalResponse = current.waitForResponse(response => {
        try {
          return new URL(response.url()).pathname === '/api/billing/v1/queries' && response.request().postDataJSON().operation === 'invoice.propose'
        } catch { return false }
      })
      void proposalResponse.catch(() => {})
      await button('Generar propuesta').click()
      const response = await proposalResponse, body = await response.json()
      const due = new Date(expected + 'T12:00:00Z'); due.setUTCDate(due.getUTCDate() + 15)
      if (response.status() !== 200 || body.ok !== true || body.data?.requires_review !== true || body.data?.saved !== false || body.data?.draft?.issue_on !== expected || body.data?.draft?.due_on !== due.toISOString().slice(0, 10)) throw Error('BILLING_MADRID_PROPOSAL_MISMATCH')
      await expect(field('Fecha de emisión')).toHaveValue(expected)
      await expect(field('Vencimiento de factura')).toHaveValue(due.toISOString().slice(0, 10))
      await button('Cerrar panel').click()

      if (report) report.w2_ui_action_step = 'billing:madrid_day:customer_create'
      await current.goto(origin + '/facturacion?create=1')
      await field('Buscar empresa para factura').fill(customerName.slice(0, 100))
      await expect(field('Cliente vinculado').locator('option[value="' + customerId + '"]')).toHaveCount(1)
      await field('Cliente vinculado').selectOption(customerId)
      await button('Preparar borrador').click()
      await expect(field('Fecha de emisión')).toHaveValue(expected)
      if (commands !== 0) throw Error('BILLING_MADRID_UNEXPECTED_COMMAND')
      observations.push({ expected_day: expected, draft: 'PASS', proposal: 'PASS', due_date: 'PASS', customer_create: 'PASS', commands: 0 })
    } finally {
      await current.close()
    }
  }
  if (report) report.w2_ui_billing_madrid_date = observations
}
