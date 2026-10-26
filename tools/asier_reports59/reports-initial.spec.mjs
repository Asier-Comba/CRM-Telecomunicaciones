import { expect, test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { startReports59 } from './server.cjs'
import { observeReports59 } from './observe-initial-read.mjs'
import { reportsBrowser } from '../../scripts/security/supabase-local/product-reports-browser.mjs'

const originalCase = 'reports_exact_scope_period_export_and_error_mobile'
const customer = '10000000-0000-4000-8000-000000000001'
const customers = [customer, '10000000-0000-4000-8000-000000000002']
const periods = { month: ['2026-10-01','2026-11-01'], quarter: ['2026-10-01','2027-01-01'], semester: ['2026-07-01','2027-01-01'], year: ['2026-01-01','2027-01-01'], all: [null,null] }
const button = page => page.getByRole('button', { name: 'Exportar resumen CSV', exact: true })
function data(input, count = 11, financial = true) {
  const period = input.period ?? 'month', [start,end] = periods[period]
  return { contract_version: 'product.dashboard.v2', audience: input.audience ?? 'my',
    period: { kind: period, start, end_exclusive: end },
    snapshot_counts: { customers: count, contracts: 0, services: 0, lines: 0, opportunities: 0, tasks: 0, meetings: 0, renewals: 0, permanences: 0 },
    period_counts: { customers_created: 0, tasks_due: 0, meetings_scheduled: 0, renewals_due: 0, permanences_due: 0, opportunities_closed: 0 },
    recent_activity: [], financial: financial ? { currencies: [] } : null, financial_status: financial ? 'available' : 'unavailable' }
}
const reply = (route, input, count = 11, financial = true) => route.fulfill({ json: { ok: true, data: data(input,count,financial) } })
async function consumed(page, state, sequence) {
  await expect.poll(() => state.observer.snapshot().reads[sequence - 1]?.dto).toBe('valid')
  // Observe after delivery and browser rendering, before asserting stale data is absent.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function prepare(page, info, width, handler, options = {}) {
  const fixture = await startReports59(), observer = observeReports59({ page, origin: fixture.origin })
  const reads = [], other = [], commands = [], downloads = []
  page.on('download', event => downloads.push(event))
  await page.setViewportSize({ width, height: 960 })
  await page.route('**/api/**', async route => {
    let body
    try { body = route.request().postDataJSON() } catch { await route.fulfill({ status: 400, json: { ok:false,error:'validation' } }); return }
    const { operation, input } = body
    if (route.request().url().endsWith('/commands')) { commands.push(operation); await route.fulfill({ status:403,json:{ok:false,error:'access_denied'} }); return }
    if (operation === 'dashboard.get') {
      const scope = await page.locator('[data-fixture-company]').evaluate(element => ({ company:element.dataset.fixtureCompany, actor:element.dataset.fixtureActor, role:element.dataset.fixtureRole }))
      const item = { route, input, scope }; reads.push(item)
      await handler(item, reads.length); return
    }
    other.push({ operation, input })
    if (operation === 'global.search') {
      await route.fulfill({ json: {ok:true,data:{contract_version:'product.v1',items:customers.map((id,index)=>({kind:'customer',id,customer_id:id,label:'Cliente sintético '+(index+1),status:'active'}))}} }); return
    }
    if (options.holdOthers) return
    await route.fulfill({ status:403,json:{ok:false,error:'access_denied'} })
  })
  const finish = async () => {
    const snapshot = observer.stop()
    writeFileSync(info.outputPath('initial-read.safe.json'), JSON.stringify({ ...snapshot, business_commands:commands.length, downloads:downloads.length },null,2)+'\n')
    try {
      expect(commands).toEqual([])
      expect(JSON.stringify(snapshot)).not.toContain('private-synthetic-marker')
      expect(snapshot.events.filter(event => event.kind === 'page_error')).toEqual([])
    } finally { await page.close(); await fixture.close() }
  }
  return { ...fixture, observer, reads, other, commands, downloads, finish }
}
async function original(page, state, info) {
  const executed = []
  await reportsBrowser({page,origin:state.origin,screenshotDir:info.outputDir,customerId:customer,report:state.observer.report,
    check: async (name, action) => { if (name === originalCase) { executed.push(name); await action() } },
  })
  expect(executed).toEqual([originalCase]) // The invoice-summary closure is outside this test's scope, not counted PASS.
}

for (const width of [390,768,1440]) {
  test(`original F5 immediate reads preserve all original assertions at ${width}`, async ({page},info) => {
    const state = await prepare(page,info,width,({route,input})=>reply(route,input))
    try { await original(page,state,info); expect(state.downloads).toHaveLength(1) } finally { await state.finish() }
  })
  test(`original F5 first read delayed 1500ms stays within the original budget at ${width}`, async ({page},info) => {
    const state = await prepare(page,info,width,async ({route,input},n)=>{if(n===1)await new Promise(resolve=>setTimeout(resolve,1500));await reply(route,input)})
    try { await original(page,state,info); expect(state.downloads).toHaveLength(1) } finally { await state.finish() }
  })
  test(`RED original F5 pending first read reproduces timeout then loaded screenshot at ${width}`, async ({page},info) => {
    let held
    const state = await prepare(page,info,width,item=>{held=item})
    try {
      try { await original(page,state,info); throw Error('ORIGINAL_FAILURE_REQUIRED') }
      catch (error) {
        expect(state.observer.report.w2_ui_action_step).toBe('reports:initial_read')
        expect(held).toBeDefined()
        expect(state.observer.snapshot().reads[0].status).toBe('pending')
        state.observer.mark('original_assertion_failed_with_read_pending')
        await expect(button(page)).toBeDisabled()
        await page.screenshot({path:info.outputPath('before-release.png'),fullPage:true})
        await reply(held.route,held.input)
        await expect(button(page)).toBeEnabled()
        state.observer.mark('button_enabled_after_original_failure')
        await page.screenshot({path:info.outputPath('after-release.png'),fullPage:true})
        throw error // Retain the original red assertion; no expected-failure/skip/retry.
      }
    } finally { await state.finish() }
  })
  test(`dashboard alone enables export while unrelated readers are pending at ${width}`, async ({page},info) => {
    const state=await prepare(page,info,width,({route,input})=>reply(route,input),{holdOthers:true})
    try { await page.goto(state.origin+'/reports');await expect(button(page)).toBeEnabled();expect(state.other.length).toBeGreaterThan(0);expect(state.reads).toHaveLength(1) } finally { await state.finish() }
  })
  test(`failed initial read stays closed and explicit read retry recovers at ${width}`, async ({page},info) => {
    const state=await prepare(page,info,width,({route,input},n)=>n===1?route.fulfill({status:503,json:{ok:false,error:'unavailable'}}):reply(route,input))
    try {
      await page.goto(state.origin+'/reports');await expect(page.getByRole('alert',{name:'Error al consultar el informe',exact:true})).toBeVisible()
      await expect(button(page)).toBeDisabled();expect(state.downloads).toEqual([])
      await page.getByRole('button',{name:'Reintentar informe',exact:true}).click();await expect(button(page)).toBeEnabled();expect(state.reads).toHaveLength(2)
    } finally { await state.finish() }
  })
  test(`late month response never enables or replaces the selected all-period report at ${width}`, async ({page},info) => {
    let old
    const state=await prepare(page,info,width,(item,n)=>{if(n===1){old=item;return}return reply(item.route,item.input,22)})
    try {
      await page.goto(state.origin+'/reports');await expect.poll(()=>state.reads.length).toBe(1);await expect(button(page)).toBeDisabled()
      await page.getByLabel('Periodo',{exact:true}).selectOption('all');await expect(button(page)).toBeEnabled()
      await expect(page.locator('[data-report-count="customers"]')).toHaveText('22')
      await reply(old.route,old.input,99);await consumed(page,state,1);await expect(page.locator('[data-report-count="customers"]')).toHaveText('22')
      await expect(page.getByLabel('Periodo',{exact:true})).toHaveValue('all');expect(state.reads).toHaveLength(2)
    } finally { await state.finish() }
  })
  const dimension={390:'empresa',768:'actor',1440:'rol'}[width]
  test(`loaded previous ${dimension} snapshot cannot enable export during the new scope read at ${width}`, async ({page},info) => {
    let next
    const state=await prepare(page,info,width,(item,n)=>{if(n===1)return reply(item.route,item.input);next=item})
    try {
      await page.goto(state.origin+'/reports');await expect(button(page)).toBeEnabled()
      await expect(page.locator('[data-report-count="customers"]')).toHaveText('11')
      await page.getByRole('button',{name:'Work59 cambiar '+dimension,exact:true}).click()
      await expect.poll(()=>state.reads.length).toBe(2);await expect(button(page)).toBeDisabled()
      await expect(page.locator('[data-report-count]')).toHaveCount(0);expect(state.downloads).toEqual([])
      await reply(next.route,next.input,22,next.scope.role!=='viewer');await expect(button(page)).toBeEnabled()
      await expect(page.locator('[data-report-count="customers"]')).toHaveText('22')
    } finally { await state.finish() }
  })
  test(`actual ProductProvider discards old ${dimension} data while the new scope is pending at ${width}`, async ({page},info) => {
    const held=[]
    const state=await prepare(page,info,width,item=>{held.push(item)})
    try {
      await page.goto(state.origin+'/reports');await expect.poll(()=>held.length).toBe(1)
      state.observer.mark('scope_switch',{dimension})
      await page.getByRole('button',{name:'Work59 cambiar '+dimension,exact:true}).click();await expect.poll(()=>held.length).toBe(2)
      await reply(held[0].route,held[0].input,99);await consumed(page,state,1);await expect(button(page)).toBeDisabled();await expect(page.locator('[data-report-count]')).toHaveCount(0)
      await reply(held[1].route,held[1].input,22,held[1].scope.role!=='viewer');await expect(button(page)).toBeEnabled()
      await expect(page.locator('[data-report-count="customers"]')).toHaveText('22')
    } finally { await state.finish() }
  })
  test(`customer filter belongs to Telecom report and never rewrites dashboard scope at ${width}`, async ({page},info) => {
    const state=await prepare(page,info,width,({route,input})=>reply(route,input))
    try {
      await page.goto(state.origin+'/reports');await expect(button(page)).toBeEnabled()
      await page.getByLabel('Buscar empresa para informes Telecom',{exact:true}).fill('Cliente')
      await expect(page.getByLabel('Cliente vinculado',{exact:true}).locator('option[value="'+customer+'"]')).toHaveCount(1)
      await page.getByLabel('Cliente vinculado',{exact:true}).selectOption(customer)
      await expect.poll(()=>state.other.some(row=>row.operation==='report.operator_portfolio'&&row.input.customer_id===customer)).toBe(true)
      expect(state.reads).toHaveLength(1);expect(Object.hasOwn(state.reads[0].input,'customer_id')).toBe(false)
      await expect(button(page)).toBeEnabled();await expect(page.locator('[data-report-count="customers"]')).toHaveText('11')
    } finally { await state.finish() }
  })
}

test('fresh export denial never downloads the previously visible snapshot', async ({page},info) => {
  const state=await prepare(page,info,1440,({route,input},n)=>n===1?reply(route,input):route.fulfill({status:403,json:{ok:false,error:'access_denied'}}))
  try {
    await page.goto(state.origin+'/reports');await expect(button(page)).toBeEnabled();await button(page).click()
    await expect(page.getByRole('alert',{name:'Error al exportar el informe',exact:true})).toBeVisible()
    expect(state.reads).toHaveLength(2);expect(state.downloads).toEqual([])
  } finally { await state.finish() }
})
test('malformed initial DTO stays closed and observer never logs its private marker', async ({page},info) => {
  const state=await prepare(page,info,390,({route,input})=>route.fulfill({json:{ok:true,data:{...data(input),private_marker:'private-synthetic-marker'}}}))
  try {
    await page.goto(state.origin+'/reports');await expect(page.getByRole('alert',{name:'Error al consultar el informe',exact:true})).toBeVisible()
    await expect(button(page)).toBeDisabled();await expect(page.locator('[data-report-count]')).toHaveCount(0)
    expect(await page.locator('body').innerText()).not.toContain('private-synthetic-marker')
  } finally { await state.finish() }
})
test('URL period initialization ignores a late default-month response', async ({page},info) => {
  let month
  const state=await prepare(page,info,768,item=>{if(item.input.period==='month'){month=item;return}return reply(item.route,item.input,22)})
  try {
    await page.goto(state.origin+'/reports?period=year');await expect(button(page)).toBeEnabled()
    await expect(page.getByLabel('Periodo',{exact:true})).toHaveValue('year')
    if(month){await reply(month.route,month.input,99);await consumed(page,state,state.reads.indexOf(month)+1)}
    await expect(page.locator('[data-report-count="customers"]')).toHaveText('22')
  } finally { await state.finish() }
})
test('failed bootstrap script has zero dashboard requests and cannot resemble a loaded report', async ({page},info) => {
  const state=await prepare(page,info,1440,({route,input})=>reply(route,input))
  await page.route('**/component.js',route=>route.abort('failed'))
  try {
    await page.goto(state.origin+'/reports');await expect(button(page)).toHaveCount(0);expect(state.reads).toEqual([])
    await expect.poll(()=>state.observer.snapshot().events.some(event=>event.kind==='script_failed')).toBe(true)
  } finally { await state.finish() }
})
