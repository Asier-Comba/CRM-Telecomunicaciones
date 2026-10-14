import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

// Real IntegratedBilling and parsers, inert HTTP data. Not Auth/DB evidence.
test('financial totals from the previous refresh disappear until the current response arrives',async({page},info)=>{
 const fixture=await startBillingFocusFixture()
 let release!:()=>void,waiting=false,reads=0
 const held=new Promise<void>(resolve=>release=resolve)
 await page.route('**/api/billing/v1/queries',async route=>{
  if(route.request().postDataJSON().operation!=='invoice.financial_summary')return route.continue()
  const current=++reads,result=await route.fetch(),body=await result.json()
  body.data.currencies=[{currency:'EUR',issued_minor:10000,paid_minor:6000,outstanding_minor:4000,overdue_minor:0,issued_count:2,paid_count:1,outstanding_count:1,overdue_count:0}]
  if(current>1){waiting=true;await held;body.data.currencies[0].issued_minor+=3025;body.data.currencies[0].outstanding_minor+=3025}
  await route.fulfill({json:body})
 })
 try{
  await page.setViewportSize({width:390,height:960});await page.goto(fixture.url)
  await expect.poll(()=>fixture.requests.filter(q=>q.operation==='invoice.list').length).toBe(1)
  fixture.releaseList()
  const totals=page.getByRole('region',{name:'Importes financieros EUR',exact:true})
  await expect(totals).toBeVisible()
  const original=await totals.getByRole('listitem').first().innerText()
  await page.getByRole('button',{name:'Actualizar facturas',exact:true}).click()
  await expect.poll(()=>waiting).toBe(true)
  await expect.poll(()=>fixture.requests.filter(q=>q.operation==='invoice.list').length).toBe(2)
  fixture.releaseList()
  await expect(totals).toHaveCount(0)
  await expect(page.getByText('Consultando resumen financiero actualizado…',{exact:true})).toBeVisible()
  await page.screenshot({path:info.outputPath('financial-current-refresh-pending-390.png')})
  release();await expect(totals).toBeVisible()
  await expect(totals.getByRole('listitem').first()).not.toHaveText(original)
  await expect(page.getByText('Consultando resumen financiero actualizado…',{exact:true})).toHaveCount(0)
 }finally{release();fixture.releaseList();fixture.releasePdf();await page.unrouteAll({behavior:'wait'});await fixture.close()}
})
