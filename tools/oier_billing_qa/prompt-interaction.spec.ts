import {test,expect,type Page} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
import type {BillingDraftV1} from '../../src/lib/contracts/billing-v1'

// Actual IntegratedBilling, PromptBuilder, parser, repository and DTO validators.
// The pre-existing fixture supplies assets/provider. HTTP and SpeechRecognition are
// controlled test boundaries: no Supabase, model, real microphone or persistence.
const customer='10000000-0000-4000-8000-000000000001'
const label='Bilbao Telecom Demo SL'
const simple=`Factura para ${label} de 300 euros por soporte`
type Call={operation:string;input:Record<string,unknown>}
type ProposalMode='valid'|'denied'|'malformed'|'network'
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})

async function mount(page:Page,{speech=true,mode='valid'}:{speech?:boolean;mode?:ProposalMode}={}){
 const calls:Call[]=[],pageErrors:string[]=[]
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.addInitScript(({supported})=>{
  class SpeechStub{
   lang='';continuous=false;interimResults=false
   onresult:((e:{results:{transcript:string}[][]})=>void)|null=null
   onerror:(()=>void)|null=null;onend:(()=>void)|null=null
   constructor(){instances.push(this)}
   start(){Object.assign(document.documentElement.dataset,{speechLang:this.lang,speechContinuous:String(this.continuous),speechInterim:String(this.interimResults)})}
   stop(){document.documentElement.dataset.speechStopped='true';this.onend?.()}
   abort(){document.documentElement.dataset.speechAborted='true'}
  }
  const instances:SpeechStub[]=[]
  Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:supported?SpeechStub:undefined})
  Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:undefined})
  document.addEventListener('oier:speech',event=>{
   const detail=(event as CustomEvent<{kind:string;text?:string}>).detail,s=instances.at(-1)
   if(detail.kind==='result')s?.onresult?.({results:[[{transcript:detail.text??''}]]})
   else if(detail.kind==='error')s?.onerror?.()
   else if(detail.kind==='end')s?.onend?.()
  })
 },{supported:speech})
 await page.route('**/api/**',async route=>{
  const request=route.request(),body=request.postDataJSON() as Call
  calls.push(body)
  if(new URL(request.url()).pathname.includes('/commands')){
   await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return
  }
  if(body.operation==='global.search'){
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label,status:'active'}]}}});return
  }
  if(body.operation==='invoice.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,items:[],next_id:null}}});return
  }
  if(body.operation==='invoice.private_pdf_reference'){
   await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return
  }
  if(body.operation==='invoice.propose'){
   if(mode==='network'){await route.abort('failed');return}
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   const draft=body.input.draft as BillingDraftV1
   await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft,totals:calculateBillingV1(draft.lines),requires_review:true,saved:mode==='malformed'}}});return
  }
  await route.continue()
 })
 await page.goto(fixture.url)
 await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
 await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(customer)
 await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toBeVisible()
 return{calls,pageErrors,proposals:()=>calls.filter(c=>c.operation==='invoice.propose'),assertNoCommands:()=>expect(calls.filter(c=>['invoice.create_draft','invoice.update_draft','invoice.issue','invoice.mark_paid'].includes(c.operation))).toEqual([])}
}
async function speechEvent(page:Page,kind:string,text?:string){await page.evaluate(detail=>document.dispatchEvent(new CustomEvent('oier:speech',{detail})),{kind,text})}
async function generate(page:Page,text:string){await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(text);await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()}

test('empty prompt does not propose or write',async({page})=>{
 const r=await mount(page)
 await expect(page.getByRole('button',{name:'Generar propuesta',exact:true})).toBeDisabled()
 expect(r.proposals()).toEqual([]);r.assertNoCommands();expect(r.pageErrors).toEqual([])
})
test('unsupported speech keeps text fallback usable and opens editable reviewed proposal',async({page},info)=>{
 const r=await mount(page,{speech:false})
 await page.getByRole('button',{name:'Dictar',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'Dictado no disponible'})).toBeVisible()
 await generate(page,simple)
 await expect(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('soporte')
 await expect(page.getByRole('button',{name:'Guardar borrador',exact:true})).toBeDisabled()
 expect(r.proposals()).toHaveLength(1);expect(r.proposals()[0].input.source).toBe('text')
 r.assertNoCommands();expect(r.pageErrors).toEqual([])
 await page.screenshot({path:info.outputPath('editable-proposal.png'),fullPage:true})
})
test('controlled dictation uses Spanish and waits until stopped before proposing',async({page})=>{
 const r=await mount(page)
 await page.getByRole('button',{name:'Dictar',exact:true}).click()
 await expect(page.locator('html')).toHaveAttribute('data-speech-lang','es-ES')
 await expect(page.locator('html')).toHaveAttribute('data-speech-continuous','false')
 await expect(page.locator('html')).toHaveAttribute('data-speech-interim','true')
 await speechEvent(page,'result',simple)
 await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toHaveValue(simple)
 await expect(page.getByRole('button',{name:'Generar propuesta',exact:true})).toBeDisabled()
 expect(r.proposals()).toEqual([])
 await page.getByRole('button',{name:'Detener dictado',exact:true}).click()
 await expect(page.locator('html')).toHaveAttribute('data-speech-stopped','true')
 await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
 await expect(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('soporte')
 expect(r.proposals()[0].input.source).toBe('audio');r.assertNoCommands();expect(r.pageErrors).toEqual([])
})
test('interim transcripts replace one another and editing changes provenance to text',async({page})=>{
 const r=await mount(page),area=page.getByRole('textbox',{name:'Descripción de la factura',exact:true})
 await area.fill('Factura para');await page.getByRole('button',{name:'Dictar',exact:true}).click()
 await speechEvent(page,'result',label);await speechEvent(page,'result',`${label} de 300 euros por soporte`)
 await expect(area).toHaveValue(simple)
 await speechEvent(page,'end');await area.fill(`${simple} nuevo`)
 await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
 await expect(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('soporte nuevo')
 expect(r.proposals()[0].input.source).toBe('text');r.assertNoCommands();expect(r.pageErrors).toEqual([])
})
test('controlled speech error retains text fallback without proposing',async({page})=>{
 const r=await mount(page)
 await page.getByRole('button',{name:'Dictar',exact:true}).click();await speechEvent(page,'error')
 await expect(page.getByRole('status').filter({hasText:'No se pudo completar el dictado'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Dictar',exact:true})).toBeEnabled()
 expect(r.proposals()).toEqual([])
 await generate(page,simple);await expect(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toBeVisible()
 r.assertNoCommands();expect(r.pageErrors).toEqual([])
})

test('manual correction during active dictation survives the next interim result',async({page},info)=>{
 const r=await mount(page),area=page.getByRole('textbox',{name:'Descripción de la factura',exact:true})
 await page.getByRole('button',{name:'Dictar',exact:true}).click()
 await speechEvent(page,'result',simple)
 await expect(area).toHaveValue(simple)
 const correction=`Factura para ${label} de 450 euros por instalación de fibra`
 await area.fill(correction)
 await speechEvent(page,'result',simple+' transcripción posterior')
 await expect(area).toHaveValue(correction)
 await expect(page.locator('html')).toHaveAttribute('data-speech-aborted','true')
 await expect(page.getByRole('button',{name:'Generar propuesta',exact:true})).toBeEnabled()
 expect(r.proposals()).toEqual([]);r.assertNoCommands()
 await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
 await expect(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('instalación de fibra')
 expect(r.proposals()).toHaveLength(1);expect(r.proposals()[0].input.source).toBe('text')
 expect((r.proposals()[0].input.draft as BillingDraftV1).lines[0].unit_price_minor).toBe(45000)
 r.assertNoCommands();expect(r.pageErrors).toEqual([])
 await page.screenshot({path:info.outputPath('manual-correction-reviewed.png'),fullPage:true})
})

test('failed recognition abort preserves manual correction and keeps explicit stop available',async({page})=>{
 const r=await mount(page),area=page.getByRole('textbox',{name:'Descripción de la factura',exact:true})
 await page.getByRole('button',{name:'Dictar',exact:true}).click();await speechEvent(page,'result',simple)
 await page.evaluate(()=>{const w=window as unknown as {SpeechRecognition:{prototype:{abort:()=>void}}};w.SpeechRecognition.prototype.abort=()=>{throw Error('CONTROLLED_ABORT_REFUSAL')}})
 const correction=`${simple} corregido`
 await area.fill(correction);await speechEvent(page,'result','Transcripción posterior descartada')
 await expect(area).toHaveValue(correction)
 await expect(page.getByRole('status').filter({hasText:'No se pudo detener el dictado.'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Generar propuesta',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Detener dictado',exact:true}).click()
 await expect(page.getByRole('button',{name:'Generar propuesta',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
 expect(r.proposals()).toHaveLength(1);expect(r.proposals()[0].input.source).toBe('text')
 r.assertNoCommands();expect(r.pageErrors).toEqual([])
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption('')
  await expect(area).toHaveCount(0)
  expect(r.pageErrors).toEqual([])
})
test('leaving the customer aborts recognition and retires transcript handlers',async({page})=>{
 const r=await mount(page)
 await page.getByRole('button',{name:'Dictar',exact:true}).click()
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption('')
 await expect(page.locator('html')).toHaveAttribute('data-speech-aborted','true')
 await speechEvent(page,'result','Unrelated late transcript')
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(customer)
 await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toHaveValue('')
 expect(r.proposals()).toEqual([]);r.assertNoCommands();expect(r.pageErrors).toEqual([])
})
test('owner phrase preserves complete concept and fifteen-day due date in editable proposal',async({page})=>{
 const r=await mount(page)
 await generate(page,`Factura para ${label} por instalación de fibra de 300 euros más el 21% de IVA y vencimiento en quince días`)
 await expect(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toBeVisible()
 const draft=r.proposals()[0].input.draft as BillingDraftV1,due=new Date(`${draft.issue_on}T00:00:00Z`)
 due.setUTCDate(due.getUTCDate()+15)
 await expect.soft(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('instalación de fibra')
 await expect.soft(page.getByLabel('Vencimiento de factura',{exact:true})).toHaveValue(due.toISOString().slice(0,10))
 expect(draft.lines[0].unit_price_minor).toBe(30000);expect(draft.lines[0].tax_bps).toBe(2100)
 r.assertNoCommands()
})
for(const mode of ['denied','malformed','network'] as const)test(`${mode} proposal failure is explained without opening editor or writing`,async({page},info)=>{
 const r=await mount(page,{mode});await generate(page,simple)
 await expect.poll(()=>r.proposals().length).toBe(1)
 await expect.soft(page.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveCount(0)
 await expect.soft(page.getByRole('alert').filter({hasText:/permiso|autoriz|confirm|conexión|completar|verific|fallo|error/i})).toBeVisible()
 r.assertNoCommands()
 await info.attach('unhandled-errors-observed',{body:JSON.stringify(r.pageErrors),contentType:'application/json'})
 expect.soft(r.pageErrors).toEqual([])
})
