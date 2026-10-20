import {test,expect} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000003'
const clients=[{id:a,name:'Bilbao Telecom Demo SL'},{id:b,name:'Bilbao Redes Demo SL'}]
for(const mode of ['different_name','ambiguous_name','selected_name','corrected_selection'] as const)test(`invoice identity ${mode} never silently substitutes the selected customer`,async({page},info)=>{
 const proposals:string[]=[],commands:string[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const request=route.request(),body=request.postDataJSON()
  if(new URL(request.url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:clients.map(c=>({kind:'customer',id:c.id,customer_id:c.id,label:c.name,status:'active'}))}}});return}
  if(body.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[],next_id:null}}});return}
  if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  if(body.operation==='invoice.propose'){proposals.push(body.input.draft.customer_id);await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft:body.input.draft,totals:calculateBillingV1(body.input.draft.lines),requires_review:true,saved:false}}});return}
  await route.continue()
 })
 try{
  await page.goto(fixture.url)
  await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
  await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
  const selection=page.getByRole('combobox',{name:'Cliente para facturación',exact:true})
  await selection.selectOption(b)
  if(mode==='corrected_selection')await selection.selectOption(a)
  const name=mode==='ambiguous_name'?'Bilbao':clients[mode==='selected_name'?1:0].name
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(`Factura para ${name} de 300 euros por soporte`)
  await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  const warning=page.getByRole('alert').filter({hasText:'El cliente del texto no coincide de forma inequívoca con el seleccionado.'})
  if(mode==='different_name'||mode==='ambiguous_name'){
   await expect.poll(async()=>await warning.count()>0||await page.getByLabel('Cliente de factura',{exact:true}).count()>0).toBe(true)
   const editor=await page.getByLabel('Cliente de factura',{exact:true}).evaluateAll(elements=>elements.map(e=>(e as HTMLSelectElement).value))
   await info.attach('identity-observation',{body:JSON.stringify({named:name,selected:await selection.inputValue(),proposals,editor}),contentType:'application/json'})
   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveCount(0)
   await expect(warning).toBeVisible();expect(proposals).toEqual([])
  }else{
   const expected=mode==='selected_name'?b:a
   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(expected)
   await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
   expect(proposals).toEqual([expected]);await expect(warning).toHaveCount(0)
  }
  expect(commands).toEqual([]);expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath(`identity-${mode}.png`)})
 }finally{await page.unrouteAll({behavior:'wait'})}
})
