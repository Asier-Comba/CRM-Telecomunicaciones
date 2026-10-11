import {test,expect} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

for(const width of [390,768,1440])for(const denied of [false,true]){
 test(`billing new initial invoice context ${denied?'denied':'ready'} at ${width}`,async({page})=>{
  const fixture=await startBillingFocusFixture(),a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000003'
  let release!:()=>void,held=false,reads=0,commands=0
  const wait=new Promise<void>(resolve=>release=resolve)
  await page.route('**/api/billing/v1**',async route=>{
   const body=route.request().postDataJSON()
   if(route.request().url().includes('/commands'))commands++
   if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
   if(body.operation!=='invoice.get'){await route.continue();return}
   const id=body.input.id
   if(id===b){reads++;held=true;await wait}
   if(id===b&&denied)await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
   else await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:'invoice.get',invoice:{...fixture.invoice,id,number:{series:'A',year:2026,sequence:id===a?8:10}}}}})
  })
  try{
   await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/#context')
   await expect(page.locator(`section[data-invoice-detail-id="${a}"]`)).toBeVisible()
   await page.getByRole('button',{name:'Fixture seleccionar otra factura',exact:true}).click()
   await expect.poll(()=>held).toBe(true)
   await expect(page.locator('section[data-invoice-detail-id]')).toHaveCount(0)
   await expect(page.getByRole('button',{name:'Marcar como cobrada',exact:true})).toHaveCount(0)
   await page.getByRole('button',{name:'Fixture seleccionar otra factura',exact:true}).click()
   expect(reads).toBe(1)
   release()
   if(denied){await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('section[data-invoice-detail-id]')).toHaveCount(0)}
   else{await expect(page.locator(`section[data-invoice-detail-id="${b}"]`)).toHaveAttribute('data-invoice-detail-version','3');await expect(page.getByRole('alert')).toHaveCount(0)}
   expect(commands).toBe(0)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  }finally{release();await page.unrouteAll({behavior:'wait'});await fixture.close()}
 })
}
