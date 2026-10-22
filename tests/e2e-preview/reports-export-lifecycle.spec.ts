import { expect, test, type Page, type Route } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { startProductScopeFixture } from './fixtures/product-scope-server.cjs'

function dashboard(input: {audience: string; period: string}, count = 11) {
  return { contract_version: 'product.dashboard.v2', audience: input.audience,
    period: { kind: input.period, start: input.period === 'all' ? null : '2026-10-01', end_exclusive: input.period === 'all' ? null : '2026-11-01' },
    snapshot_counts: Object.fromEntries(['customers','contracts','services','lines','opportunities','tasks','meetings','renewals','permanences'].map(k => [k,count])),
    period_counts: Object.fromEntries(['customers_created','tasks_due','meetings_scheduled','renewals_due','permanences_due','opportunities_closed'].map(k => [k,count])),
    recent_activity: [], financial: { currencies: [] }, financial_status: 'available' }
}
async function setup(page: Page) {
  const fixture = await startProductScopeFixture(), held: Route[] = [], requests: string[] = [], errors: string[] = []
  let hold = false
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    const original = HTMLAnchorElement.prototype.click
    Object.assign(window, { reportExportClicks: [] as string[] })
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) (window as unknown as { reportExportClicks: string[] }).reportExportClicks.push(this.download)
      original.call(this)
    }
  })
  await page.route('**/api/**', async route => {
    const {operation,input} = route.request().postDataJSON(); requests.push(operation)
    if (operation === 'dashboard.get') {
      if (hold) { held.push(route); hold = false; return }
      return route.fulfill({json:{ok:true,data:dashboard(input)}})
    }
    return route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
  })
  await page.goto(fixture.url + '/#reports')
  await expect(page.getByRole('button',{name:'Exportar resumen CSV',exact:true})).toBeEnabled()
  return {fixture,held,requests,errors,holdNext:()=>{hold=true},async close(){for(const route of held.splice(0))await route.abort().catch(()=>{});await page.unrouteAll({behavior:'wait'});await fixture.close()}}
}
const clicks = (page: Page) => page.evaluate(() => (window as unknown as {reportExportClicks:string[]}).reportExportClicks)
async function release(page: Page, route: Route, denied = false) {
  const finished = page.waitForResponse(r => r.request() === route.request())
  await route.fulfill(denied ? {status:403,json:{ok:false,error:'access_denied'}} : {json:{ok:true,data:dashboard(route.request().postDataJSON().input,99)}})
  await (await finished).finished()
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}
for (const width of [390,768,1440]) {
  test(`report export keeps its selected period until the fresh CSV completes at ${width}`, async ({page},info) => {
    await page.setViewportSize({width,height:960})
    const s=await setup(page)
    try {
      s.holdNext(); await page.getByRole('button',{name:'Exportar resumen CSV',exact:true}).click()
      await expect.poll(()=>s.held.length).toBe(1)
      await expect(page.getByRole('combobox',{name:'Periodo',exact:true})).toBeDisabled()
      await expect(page.getByRole('combobox',{name:'Ámbito del informe',exact:true})).toBeDisabled()
      await info.attach(`report-export-period-${width}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'})
      const download=page.waitForEvent('download')
      await release(page,s.held.shift()!)
      const file=await download
      expect(file.suggestedFilename()).toBe('informe-telecom-my-month.csv')
      const csv=await readFile((await file.path())!,'utf8')
      expect(csv).toContain('"Instantánea";"Clientes";"99"')
      expect(csv).toContain('"Personal";"month";"2026-10-01";"2026-11-01"')
      await expect(page.getByRole('combobox',{name:'Periodo',exact:true})).toBeEnabled()
      await expect(page.locator('[data-report-count="customers"]')).toHaveText('99')
      await page.getByRole('combobox',{name:'Periodo',exact:true}).selectOption('all')
      await expect(page.getByRole('button',{name:'Exportar resumen CSV',exact:true})).toBeEnabled()
      expect(await clicks(page)).toEqual(['informe-telecom-my-month.csv'])
      expect(s.requests.filter(op=>op==='dashboard.get')).toHaveLength(3)
      expect(s.requests.some(op=>/create|update|command/.test(op))).toBe(false); expect(s.errors).toEqual([])
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    } finally {await s.close()}
  })
  for (const target of ['empresa','usuario','rol']) test(`report export ignores the previous ${target} response after scope change at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:960});const s=await setup(page)
    try {
      s.holdNext();await page.getByRole('button',{name:'Exportar resumen CSV',exact:true}).click()
      await expect.poll(()=>s.held.length).toBe(1)
      await page.getByRole('button',{name:`Cambiar ${target}`,exact:true}).click()
      await expect(page.getByRole('button',{name:'Exportar resumen CSV',exact:true})).toBeEnabled()
      await release(page,s.held.shift()!)
      expect(await clicks(page)).toEqual([])
      await expect(page.locator('[data-report-count="customers"]')).toHaveText('11')
      expect(s.errors).toEqual([])
    } finally {await s.close()}
  })
}
test('report export denied read downloads nothing and explicitly retries the same selected report',async({page})=>{
  const s=await setup(page)
  try {
    s.holdNext();await page.getByRole('button',{name:'Exportar resumen CSV',exact:true}).click();await expect.poll(()=>s.held.length).toBe(1)
    await release(page,s.held.shift()!,true)
    await expect(page.getByRole('alert',{name:'Error al exportar el informe'})).toBeVisible()
    expect(await clicks(page)).toEqual([])
    await expect(page.getByRole('combobox',{name:'Periodo',exact:true})).toBeEnabled()
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar resumen CSV',exact:true}).click();await downloaded
    await expect(page.getByRole('alert',{name:'Error al exportar el informe'})).toHaveCount(0)
    expect(await clicks(page)).toEqual(['informe-telecom-my-month.csv']);expect(s.errors).toEqual([])
  }finally{await s.close()}
})
