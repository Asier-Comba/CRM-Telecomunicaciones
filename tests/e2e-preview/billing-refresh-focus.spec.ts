import { expect, test } from '@playwright/test'
import { startBillingFocusFixture } from './fixtures/billing-focus-server.cjs'

// Real IntegratedBilling/React/repository/parser/CSS with controlled loopback
// responses, not a Supabase/Auth/security acceptance substitute.
for (const width of [1440,768,390]) {
 test(`current invoice stays visible when a delayed 50-row billing list arrives at ${width}`, async ({page}, info) => {
  const fixture=await startBillingFocusFixture(), errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  try {
   await page.setViewportSize({width,height:960})
   await page.goto(fixture.url)
   const detail=page.locator('section[data-invoice-detail-id="10000000-0000-4000-8000-000000000001"]')
   await expect(detail).toHaveAttribute('data-invoice-detail-version','3')
   await expect(page.getByText('Cargando facturas…',{exact:true})).toBeVisible()
   await expect(page.getByText('Consultando la copia privada de esta factura…',{exact:true})).toBeVisible()
   await expect.poll(()=>fixture.requests.filter(request=>request.operation==='invoice.list').length).toBe(1)
   await expect.poll(()=>fixture.requests.filter(request=>request.operation==='invoice.private_pdf_reference').length).toBe(1)
   await detail.scrollIntoViewIfNeeded()
   await expect(detail).toBeInViewport({ratio:1})
   const before=await detail.boundingBox();expect(before).not.toBeNull()
   fixture.releaseList()
   fixture.releasePdf()
   await expect(page.locator('tr[data-invoice-id]')).toHaveCount(50)
   await expect(page.getByText('Copia privada pendiente de conservar. La factura mantiene su número.',{exact:true})).toBeVisible()
   await expect(detail).toBeInViewport({ratio:1})
   const after=await detail.boundingBox();expect(after).not.toBeNull()
   expect(Math.abs(after!.y-before!.y)).toBeLessThanOrEqual(1)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   expect(errors).toEqual([])
   expect(fixture.requests.filter(request=>request.url?.includes('/commands'))).toEqual([])
   const screenshot=info.outputPath(`billing-refresh-focus-${width}.png`)
   await page.screenshot({path:screenshot,fullPage:false})
   await info.attach(`billing-refresh-focus-${width}`,{path:screenshot,contentType:'image/png'})
  } finally {await fixture.close()}
 })
}
