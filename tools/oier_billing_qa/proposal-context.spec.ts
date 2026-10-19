import {test,expect,type Page} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
import type {BillingProposalInputV1} from '../../src/lib/contracts/billing-v1'

// Read-only controlled HTTP against the existing real component fixture.
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000003'
const clients=[{id:a,name:'Bilbao Telecom Demo SL'},{id:b,name:'Bilbao Redes Demo SL'}]
const prompt=(index:number)=>`Factura para ${clients[index].name} de 300 euros por soporte`
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
async function scenario(page:Page,oldError=false){
 let release=()=>{},held=false,done=false
 const gate=new Promise<void>(resolve=>release=resolve),commands:string[]=[],proposals:BillingProposalInputV1[]=[]
 const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message))
 await page.route('**/api/**',async route=>{
  const body=route.request().postDataJSON()
  if(new URL(route.request().url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:clients.map(c=>({kind:'customer',id:c.id,customer_id:c.id,label:c.name,status:'active'}))}}});return}
  if(body.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[],next_id:null}}});return}
  if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  if(body.operation==='invoice.propose'){
   const input=body.input as BillingProposalInputV1;proposals.push(input)
   const first=proposals.length===1
   if(first){held=true;await gate}
   if(first&&oldError)await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})
   else await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:input.source,draft:input.draft,totals:calculateBillingV1(input.draft.lines),requires_review:true,saved:false}}})
   if(first)done=true
   return
  }
  await route.continue()
 })
 await page.goto(fixture.url)
 await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
 await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(a)
 await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toBeVisible()
 async function generate(text:string){await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(text);await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()}
 async function completeOld(){release();await expect.poll(()=>done).toBe(true);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))}
 return {generate,release,completeOld,commands,proposals,pageErrors,waitHeld:()=>expect.poll(()=>held).toBe(true),async close(){release();await page.unrouteAll({behavior:'wait'})}}
}
test('held proposal still opens when customer context is unchanged',async({page},info)=>{
 const r=await scenario(page)
 try{
  await r.generate(prompt(0));await r.waitHeld()
  await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveCount(0)
  await r.completeOld()
  await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(a)
  await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
  await info.attach('observed-proposals',{body:JSON.stringify(r.proposals),contentType:'application/json'})
 }finally{await r.close()}
})
for(const target of [b,''])test(`old proposal is retired after customer ${target?'switch':'removal'}`,async({page},info)=>{
 const r=await scenario(page)
 try{
  await r.generate(prompt(0));await r.waitHeld()
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(target)
  await expect(page.getByRole('combobox',{name:'Cliente para facturación',exact:true})).toHaveValue(target)
  await r.completeOld()
  await info.attach('context-and-proposals',{body:JSON.stringify({selected:target,proposals:r.proposals,editorCustomer:await page.getByLabel('Cliente de factura',{exact:true}).inputValue().catch(()=>null)}),contentType:'application/json'})
  await expect.soft(page.getByLabel('Cliente de factura',{exact:true})).toHaveCount(0)
  expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
 }finally{await r.close()}
})
test('failure from old customer does not contaminate a newer accepted proposal',async({page},info)=>{
 const r=await scenario(page,true)
 try{
  await r.generate(prompt(0));await r.waitHeld()
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(b)
  await r.generate(prompt(1))
  await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(b)
  await expect(page.getByRole('alert').filter({hasText:'Esta función no está disponible ahora.'})).toHaveCount(0)
  await r.completeOld()
  await expect.soft(page.getByRole('alert').filter({hasText:'Esta función no está disponible ahora.'})).toHaveCount(0)
  await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(b)
  expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
  await info.attach('observed-proposals',{body:JSON.stringify(r.proposals),contentType:'application/json'})
 }finally{await r.close()}
})
test('original comma concept opens an editable support proposal',async({page},info)=>{
 const r=await scenario(page)
 try{
  await r.generate(`Factura para ${clients[0].name} de 300 euros por soporte, vencimiento en 15 días`)
  r.release()
  await expect.soft(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  await info.attach('observed-proposals',{body:JSON.stringify(r.proposals),contentType:'application/json'})
  expect(r.commands).toEqual([]);expect(r.pageErrors).toEqual([])
 }finally{await r.close()}
})
