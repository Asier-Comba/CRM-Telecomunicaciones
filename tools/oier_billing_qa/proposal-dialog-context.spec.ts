import {test,expect} from '@playwright/test'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
const modes=[['issuer','Configurar emisor','Datos fiscales del emisor'],['customer','Datos fiscales del cliente','Datos fiscales del cliente'],['summary','Ver resumen','Resumen de factura'],['payment','Marcar como cobrada','Registrar cobro']] as const
for(const [mode,button,title] of modes)test(`pending proposal cannot replace the ${mode} dialog; fresh intent remains usable`,async({page},info)=>{
 const customer=fixture.invoice.customer_id,commands:string[]=[],errors:string[]=[]
 let release=()=>{},held=false,done=false,proposals=0
 const gate=new Promise<void>(resolve=>release=resolve)
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
   const first=++proposals===1
   if(first){held=true;await gate}
   await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:body.operation,source:body.input.source,draft:body.input.draft,totals:calculateBillingV1(body.input.draft.lines),requires_review:true,saved:false}}})
   if(first)done=true
   return
  }
  // Summary refusal is deliberate: its authorized error dialog must also remain current.
  if(body.operation==='invoice.summary'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.continue()
 })
 try{
  await page.goto(fixture.url)
  await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
  await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
  await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(customer)
  if(mode==='payment'){
   await page.getByRole('button',{name:'Abrir factura',exact:true}).click()
   await expect(page.locator('section[data-invoice-detail-id]')).toBeVisible()
  }
  const text=page.getByRole('textbox',{name:'Descripción de la factura',exact:true})
  await text.fill('Factura para Bilbao Telecom Demo SL de 300 euros por soporte')
  await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  await expect.poll(()=>held).toBe(true)
  await page.getByRole('button',{name:button,exact:true}).click()
  const dialog=page.getByRole('dialog',{name:title,exact:true})
  await expect(dialog).toBeVisible()
  release();await expect.poll(()=>done).toBe(true)
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0)
  await expect(dialog).toBeVisible()
  expect(commands).toEqual([]);expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath(`current-${mode}-dialog.png`)})
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
  await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('soporte')
  expect(proposals).toBe(2);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{release();await page.unrouteAll({behavior:'wait'})}
})
