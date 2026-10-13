import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

// Actual IntegratedBilling/repository/parsers; controlled HTTP responses only.
// No Auth, SQL, business mutation or private PDF persistence claim.
for(const width of [390,768,1440])for(const mode of ['late_success','late_refusal','initial_success','current_refusal'] as const){
 test(`billing current selection ${mode} at ${width}`,async({page},info)=>{
  const fixture=await startBillingFocusFixture(),errors:string[]=[],commands:string[]=[]
  const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
  const slow=mode==='initial_success'?id(1):id(2),current=id(3)
  let release!:()=>void,settled!:()=>void
  const hold=new Promise<void>(resolve=>release=resolve),done=new Promise<void>(resolve=>settled=resolve)
  let waiting=false
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/billing/v1**',async route=>{
   const request=route.request(),body=request.postDataJSON()
   if(request.url().includes('/commands'))commands.push(body.operation)
   if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
   if(body.operation!=='invoice.get'){await route.continue();return}
   const selected=body.input.id,held=selected===(mode==='current_refusal'?current:slow)
   if(held){waiting=true;await hold}
   if(held&&(mode==='late_refusal'||mode==='current_refusal'))await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
   else await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:'invoice.get',invoice:{...fixture.invoice,id:selected,number:{series:'A',year:2026,sequence:Number(selected.slice(-12))+7}}}}})
   if(held)settled()
  })
  try{
   await page.setViewportSize({width,height:960});await page.goto(fixture.url)
   await expect.poll(()=>fixture.requests.filter(request=>request.operation==='invoice.list').length).toBe(1)
   fixture.releaseList()
   await expect(page.locator('tr[data-invoice-id]')).toHaveCount(50)
   const open=(selected:string)=>page.locator(`tr[data-invoice-id="${selected}"]`).getByRole('button',{name:'Abrir factura',exact:true}).click()
   if(mode!=='initial_success'){
    await expect(page.locator(`section[data-invoice-detail-id="${id(1)}"]`)).toBeVisible()
    if(mode==='current_refusal')await open(id(2));else await open(slow)
   }
   if(mode==='current_refusal')await expect(page.locator(`section[data-invoice-detail-id="${id(2)}"]`)).toBeVisible()
   else await expect.poll(()=>waiting).toBe(true)
   await open(current)
   if(mode==='current_refusal'){
    await expect.poll(()=>waiting).toBe(true)
    await expect(page.locator('section[data-invoice-detail-id]')).toHaveCount(0)
    await expect(page.getByText('Consultando factura seleccionada…',{exact:true})).toBeVisible()
    release();await done;await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('section[data-invoice-detail-id]')).toHaveCount(0)
   }else{
    await expect(page.locator(`section[data-invoice-detail-id="${current}"]`)).toHaveAttribute('data-invoice-detail-version','3')
    release();await done
    await expect.poll(()=>page.locator('section[data-invoice-detail-id]').getAttribute('data-invoice-detail-id')).toBe(current)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.locator(`section[data-invoice-detail-id="${current}"]`).scrollIntoViewIfNeeded()
   }
   expect(commands).toEqual([]);expect(errors).toEqual([])
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   await page.screenshot({path:info.outputPath(`billing-current-selection-${mode}-${width}.png`),fullPage:false})
  }finally{release();await page.unrouteAll({behavior:'wait'});await fixture.close()}
 })
}
