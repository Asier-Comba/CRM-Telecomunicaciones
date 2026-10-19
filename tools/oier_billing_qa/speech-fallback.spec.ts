import {test,expect} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'

// Capability fault injection into the real prompt component; no real microphone.
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['constructor','start','error_without_words','end_without_words'] as const)test(`written fallback survives speech ${mode} and retains text provenance`,async({page},info)=>{
 const customer=fixture.invoice.customer_id,commands:string[]=[],errors:string[]=[],sources:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(({mode})=>{
  class SpeechFault{
   lang='';continuous=false;interimResults=false
   onresult:null|(()=>void)=null;onerror:null|(()=>void)=null;onend:null|(()=>void)=null
   constructor(){if(mode==='constructor')throw new Error('Controlled speech constructor failure')}
   start(){if(mode==='start')throw new Error('Controlled speech start failure');queueMicrotask(()=>mode==='error_without_words'?this.onerror?.():this.onend?.())}
   stop(){this.onend?.()}
   abort(){}
  }
  Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:SpeechFault})
  Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:undefined})
 },{mode})
 await page.route('**/api/**',async route=>{
  const request=route.request(),body=request.postDataJSON()
  if(new URL(request.url()).pathname.includes('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Bilbao Telecom Demo SL',status:'active'}]}}});return}
  if(body.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[],next_id:null}}});return}
  if(body.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  if(body.operation==='invoice.propose'){sources.push(body.input.source);await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft:body.input.draft,totals:calculateBillingV1(body.input.draft.lines),requires_review:true,saved:false}}});return}
  await route.continue()
 })
 try{
  await page.goto(fixture.url)
  await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
  await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(customer)
  const text='Factura para Bilbao Telecom Demo SL de 300 euros por soporte'
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(text)
  await page.getByRole('button',{name:'Dictar',exact:true}).click()
  if(mode==='constructor'||mode==='start')await expect(page.getByRole('status').filter({hasText:'No se pudo iniciar el dictado.'})).toBeVisible()
  if(mode==='error_without_words')await expect(page.getByRole('status').filter({hasText:'No se pudo completar el dictado.'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Dictar',exact:true})).toBeVisible()
  await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toHaveValue(text)
  await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  expect(sources).toEqual(['text']);expect(commands).toEqual([]);expect(errors).toEqual([])
  await page.getByLabel('Concepto 1',{exact:true}).scrollIntoViewIfNeeded()
  await page.screenshot({path:info.outputPath(`speech-${mode}-fallback.png`)})
 }finally{await page.unrouteAll({behavior:'wait'})}
})
