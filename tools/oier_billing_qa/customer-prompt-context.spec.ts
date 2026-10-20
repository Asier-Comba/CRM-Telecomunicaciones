import {test,expect,type Page} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000003'
const clients=[{id:a,name:'Bilbao Telecom Demo SL'},{id:b,name:'Bilbao Redes Demo SL'}]
const prompt=(i:number)=>`Factura para ${clients[i].name} de 300 euros por soporte`
async function mount(page:Page){
 const commands:string[]=[],errors:string[]=[],proposals:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{
  class SpeechStub{
   lang='';continuous=false;interimResults=false
   onresult:((e:{results:{transcript:string}[][]})=>void)|null=null;onerror:(()=>void)|null=null;onend:(()=>void)|null=null
   constructor(){instances.push(this)}
   start(){}
   stop(){this.onend?.()}
   abort(){document.documentElement.dataset.oldSpeechAborted='true'}
  }
  const instances:SpeechStub[]=[]
  Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:SpeechStub})
  document.addEventListener('oier:old-speech',()=>instances[0]?.onresult?.({results:[[{transcript:'Palabras del cliente anterior'}]]}))
 })
 await page.route('**/api/**',async route=>{
  const request=route.request(),body=request.postDataJSON()
  if(new URL(request.url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:clients.map(c=>({kind:'customer',id:c.id,customer_id:c.id,label:c.name,status:'active'}))}}});return}
  if(body.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[],next_id:null}}});return}
  if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  if(body.operation==='invoice.propose'){proposals.push(body.input.draft.customer_id);await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft:body.input.draft,totals:calculateBillingV1(body.input.draft.lines),requires_review:true,saved:false}}});return}
  await route.continue()
 })
 await page.goto(fixture.url)
 await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
 await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(a)
 await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(prompt(0))
 return{proposals,assertNoEffects(){expect(commands).toEqual([]);expect(errors).toEqual([])},async close(){await page.unrouteAll({behavior:'wait'})}}
}
test('changing customer clears the previous written invoice intent',async({page},info)=>{
 const r=await mount(page)
 try{
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(b)
  await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toHaveValue('')
  await expect(page.getByRole('button',{name:'Generar propuesta',exact:true})).toBeDisabled()
  expect(r.proposals).toEqual([]);r.assertNoEffects();await page.screenshot({path:info.outputPath('new-customer-empty-intent.png')})
 }finally{await r.close()}
})
test('changing customer aborts dictation and retires the old transcript handler',async({page},info)=>{
 const r=await mount(page)
 try{
  await page.getByRole('button',{name:'Dictar',exact:true}).click()
  await expect(page.getByRole('button',{name:'Detener dictado',exact:true})).toBeVisible()
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(b)
  await expect(page.locator('html')).toHaveAttribute('data-old-speech-aborted','true')
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('oier:old-speech')))
  await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toHaveValue('')
  await expect(page.getByRole('button',{name:'Dictar',exact:true})).toBeVisible()
  expect(r.proposals).toEqual([]);r.assertNoEffects();await page.screenshot({path:info.outputPath('old-dictation-retired.png')})
 }finally{await r.close()}
})
test('a fresh written intent for the new customer still opens its own proposal',async({page},info)=>{
 const r=await mount(page)
 try{
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(b)
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(prompt(1))
  await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(b)
  await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  expect(r.proposals).toEqual([b]);r.assertNoEffects();await page.screenshot({path:info.outputPath('new-customer-proposal.png')})
 }finally{await r.close()}
})
