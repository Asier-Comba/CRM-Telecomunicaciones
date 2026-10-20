import {test,expect,type Page} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'

// Existing component fixture; controlled HTTP, not hosted Auth/DB or persistence.
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
async function pendingProposal(page:Page,refuse=false){
 let release=()=>{},held=false,done=false
 const gate=new Promise<void>(resolve=>release=resolve),commands:string[]=[],errors:string[]=[]
 const customer=fixture.invoice.customer_id
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const request=route.request(),body=request.postDataJSON()
  if(new URL(request.url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Bilbao Telecom Demo SL',status:'active'}]}}});return}
  if(body.operation==='invoice.list'){
   const invoice=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,fixture.invoice[key as keyof typeof fixture.invoice]]))
   await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[invoice],next_id:null}}});return
  }
  if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  if(body.operation==='invoice.propose'){
   held=true;await gate
   if(refuse)await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})
   else await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft:body.input.draft,totals:calculateBillingV1(body.input.draft.lines),requires_review:true,saved:false}}})
   done=true;return
  }
  await route.continue()
 })
 await page.goto(fixture.url)
 await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
 await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(customer)
 await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura para Bilbao Telecom Demo SL de 300 euros por soporte')
 await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
 await expect.poll(()=>held).toBe(true)
 return{customer,async complete(){release();await expect.poll(()=>done).toBe(true);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))},assertNoEffects(){expect(commands).toEqual([]);expect(errors).toEqual([])},async close(){release();await page.unrouteAll({behavior:'wait'})}}
}
test('a late proposal cannot reopen a manually closed draft',async({page},info)=>{
 const r=await pendingProposal(page)
 try{
  await page.getByRole('button',{name:'Nuevo borrador local',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
  await r.complete()
  await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
  r.assertNoEffects();await page.screenshot({path:info.outputPath('closed-draft-retained.png')})
 }finally{await r.close()}
})
test('an old proposal error cannot contaminate a new manual draft',async({page},info)=>{
 const r=await pendingProposal(page,true)
 try{
  await page.getByRole('button',{name:'Nuevo borrador local',exact:true}).click()
  await page.getByLabel('Concepto 1',{exact:true}).fill('Cambio manual vigente')
  await r.complete()
  await expect(page.getByRole('alert').filter({hasText:'Esta función no está disponible ahora.'})).toHaveCount(0)
  await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('Cambio manual vigente')
  r.assertNoEffects();await page.getByLabel('Concepto 1',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('manual-draft-retained.png')})
 }finally{await r.close()}
})
test('a late proposal cannot replace the invoice opened afterwards',async({page},info)=>{
 const r=await pendingProposal(page)
 try{
  await page.getByRole('button',{name:'Abrir factura',exact:true}).click()
  const detail=page.locator(`section[data-invoice-detail-id="${r.customer}"]`)
  await expect(detail).toBeVisible()
  await r.complete()
  await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
  await expect(detail).toBeVisible()
  r.assertNoEffects();await detail.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('current-invoice-retained.png')})
 }finally{await r.close()}
})
