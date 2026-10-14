import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const stage of ['retired','retired_denied','current','current_denied'] as const)for(const width of [390,768,1440])test(`authorized PDF ${stage} at ${width}`,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),downloads:string[]=[],errors:string[]=[],requests:{operation:string;input:Record<string,unknown>}[]=[]
 const retired=stage.startsWith('retired'),denied=stage.endsWith('denied')
 let held=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()))
 await page.route('**/api/billing/v1**',async route=>{
  const q=route.request().postDataJSON();requests.push(q)
  if(q.operation==='invoice.get'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,invoice:{...fixture.invoice,id:q.input.id}}}});return}
  if(q.operation==='invoice.private_pdf_reference'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.artifact.v1',operation:q.operation,id:'10000000-0000-4000-8000-000000000101',invoice_id:q.input.id,document_id:'10000000-0000-4000-8000-000000000201',version:1,renderer_version:'billing.snapshot.pdf.v1',verification_required:true,document_status:'active'}}});return}
  if(q.operation==='invoice.pdf'){
   if(retired){held=true;await gate}
   await route.fulfill(denied?{status:403,json:{ok:false,error:'access_denied'}}:{contentType:'application/pdf',body:Buffer.from('%PDF-1.4\n% Synthetic fixture, no customer data\n%%EOF')});return
  }
  if(q.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/#context')
  await page.getByRole('button',{name:'Descargar PDF autorizado',exact:true}).click()
  if(retired){
   await expect.poll(()=>held).toBe(true)
   await page.getByRole('button',{name:'Fixture seleccionar otra factura',exact:true}).click()
   await expect(page.locator('[data-invoice-detail-id]')).toHaveAttribute('data-invoice-detail-id','10000000-0000-4000-8000-000000000003')
   await expect(page.getByRole('button',{name:'Descargar PDF autorizado',exact:true})).toBeEnabled()
   const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='invoice.pdf')
   release();await (await response).finished();await page.waitForLoadState('networkidle')
   expect(downloads).toEqual([])
   await expect(page.getByRole('alert')).toHaveCount(0)
  }else if(denied){
   await expect(page.getByRole('alert')).toBeVisible();expect(downloads).toEqual([])
  }else{
   await expect.poll(()=>downloads.length).toBe(1);expect(downloads).toEqual(['Factura_local_autorizada.pdf'])
  }
  expect(requests.filter(q=>q.operation==='invoice.pdf')).toHaveLength(1)
  expect(requests.filter(q=>q.operation==='invoice.persist_private_pdf')).toHaveLength(0)
  expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.getByRole('region',{name:'Factura seleccionada'}).scrollIntoViewIfNeeded()
  await page.screenshot({path:info.outputPath(`authorized-pdf-${stage}-${width}.png`)})
 }finally{release();await page.unrouteAll({behavior:'wait'});await writeFile(info.outputPath('observations.json'),JSON.stringify({stage,width,downloads,errors,requests},null,2));await page.close();await fixture.close()}
})
