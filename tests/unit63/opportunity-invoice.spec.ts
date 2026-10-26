import {expect,test} from '@playwright/test'
import {startPipelineCurrentFixture} from '../e2e-preview/fixtures/pipeline-current-server.cjs'
import {ids,opportunitySession} from './fixtures/opportunity-invoice-data'
const customer='10000000-0000-4000-8000-000000000001',stage='20000000-0000-4000-8000-000000000001',id='30000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])test(`authorized opportunity offers explicit invoice preparation without writing at ${width}`,async({page})=>{
 const fixture=await startPipelineCurrentFixture(),commands:string[]=[]
 await page.route('**/api/**',async route=>{
  const {operation}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  let data:unknown
  if(operation==='opportunity.stages')data={contract_version:'product.v1',items:[{id:stage,code:'new',display_name:'Nueva',position:0,outcome:null,status:'active'}],next_id:null}
  else if(operation==='global.search')data={contract_version:'product.v1',items:[{kind:'opportunity',id,customer_id:customer,label:'Synthetic63 opportunity',status:'open'}]}
  else if(operation==='work.get')data={contract_version:'product.v1',kind:'opportunity',record:{id,version:1,title:'Synthetic63 opportunity',status:'open',customer_id:customer,stage_id:stage,owner_user_id:null,amount_minor:120000,currency:'EUR',next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}}
  else if(operation==='assignee.list')data={contract_version:'telecom.collections.v1',operation,items:[],next_id:null}
  else {await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url);await page.getByLabel('Consultar pipeline local',{exact:true}).fill('Synthetic63');await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click();await page.locator(`[data-opportunity-id="${id}"]`).click();await expect(page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true})).toBeVisible()
  const action=page.getByRole('link',{name:'Preparar factura desde esta oportunidad',exact:true});await expect(action).toBeVisible();await expect(action).toHaveAttribute('href','/facturacion?opportunity='+id);expect(commands).toEqual([])
 }finally{await page.close();await fixture.close()}
})
for(const width of [390,768,1440]){
 test(`guided invoice requires review, reloads and returns to its verified opportunity at ${width}`,async({page})=>{
  const s=await opportunitySession(page,width)
  try{
   await s.ready();await expect(page.getByRole('button',{name:'Preparar borrador de esta oportunidad',exact:true})).toBeDisabled();expect(s.commands).toEqual([])
   await s.prepare();expect(s.commands).toEqual([])
   await expect(page.getByLabel('Cliente de factura',{exact:true})).toHaveValue(ids.customer);await expect(page.getByLabel('Cliente de factura',{exact:true})).toBeDisabled()
   await expect(page.getByLabel('Concepto 1',{exact:true})).toHaveValue('');await expect(page.getByLabel('Precio 1',{exact:true})).toHaveValue('0');await expect(page.getByRole('button',{name:'Guardar borrador',exact:true})).toBeDisabled()
   await s.fill();await s.save();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator(`[data-invoice-detail-id="${ids.invoice}"]`)).toContainText('363,00')
   await expect(page).toHaveURL(/\/facturacion\?invoice=/);expect(s.commands).toHaveLength(1);expect(s.commands[0]).toMatchObject({operation:'invoice.create_draft',input:{customer_id:ids.customer,contract_id:ids.contract,service_id:ids.service,opportunity_id:ids.opportunity,lines:[{description:'Synthetic63 connectivity',unit_price_minor:30000,tax_bps:2100}]}})
   await page.reload();await expect(page.locator(`[data-invoice-detail-id="${ids.invoice}"]`)).toContainText('363,00');await page.getByRole('link',{name:'Volver a la oportunidad',exact:true}).click()
   await expect(page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Consultar factura relacionada',exact:true})).toHaveAttribute('href','/facturacion?invoice='+ids.invoice)
   expect(s.commands.map(c=>c.operation)).toEqual(['invoice.create_draft']);expect(s.reads.filter(r=>r.operation==='work.get').length).toBeGreaterThanOrEqual(4)
   await page.screenshot({path:test.info().outputPath('opportunity-invoice-return.png'),fullPage:true})
  }finally{await s.finish()}
 })
 for(const role of ['member','viewer'])test(`${role} cannot prepare or read financial data from an opportunity at ${width}`,async({page})=>{
  const s=await opportunitySession(page,width,'normal',role)
  try{await expect(page.getByText('Facturación disponible para administradores del espacio.',{exact:true})).toBeVisible();await expect(s.panel()).toHaveCount(0);expect(s.reads).toEqual([]);await page.goto(new URL('/opportunities?open='+ids.opportunity+'&role='+role,s.url).href);await expect(page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Preparar factura desde esta oportunidad',exact:true})).toHaveCount(0);expect(s.reads.some(r=>r.operation.startsWith('invoice.')||r.operation==='configuration.get')).toBe(false);expect(s.commands).toEqual([])}finally{await s.finish()}
 })
}
test('admin can prepare using the same existing editor without creating an invoice',async({page})=>{const s=await opportunitySession(page,1440,'normal','admin');try{await s.prepare();await s.fill();expect(s.commands).toEqual([])}finally{await s.finish()}})
for(const mode of ['denied','bad_service'])test(`${mode} authorized context cannot seed a draft`,async({page})=>{
 const s=await opportunitySession(page,1440,mode)
 try{await expect(s.panel().getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'Preparar borrador de esta oportunidad',exact:true})).toHaveCount(0);expect(s.commands).toEqual([])}finally{await s.finish()}
})
test('missing fiscal data uses the existing editor and requires confirmation of its new version',async({page})=>{
 const s=await opportunitySession(page,390,'missing_fiscal')
 try{
  await expect(s.panel().getByText('Synthetic63 Company',{exact:true})).toBeVisible();await expect(page.getByLabel('Confirmo los datos fiscales de esta operación',{exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Preparar borrador de esta oportunidad',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Revisar datos fiscales del cliente',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Datos fiscales del cliente',exact:true});await expect(dialog).toBeVisible()
  for(const [label,value]of [['Razón social fiscal','Synthetic63 Fiscal Company'],['Identificación fiscal','SYNTHETIC63'],['Dirección fiscal','Synthetic Street 63'],['Código postal','48001'],['Ciudad','Bilbao'],['Provincia','Bizkaia']])await dialog.getByLabel(label,{exact:true}).fill(value)
  await dialog.getByRole('button',{name:'Guardar datos fiscales',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByLabel('Confirmo los datos fiscales de esta operación',{exact:true})).not.toBeChecked();await s.prepare();expect(s.commands.map(c=>c.operation)).toEqual(['customer_fiscal.set'])
 }finally{await s.finish()}
})
for(const phase of ['prepare','save'])for(const change of ['opportunity','fiscal'])test(`${change} changed before ${phase} requires new review without an invoice command`,async({page})=>{
 const s=await opportunitySession(page,1440)
 try{
  await s.ready();if(phase==='save'){await s.prepare();await s.fill()}else await page.getByLabel('Confirmo los datos fiscales de esta operación',{exact:true}).check()
  if(change==='fiscal')s.changeFiscal();else s.change()
  if(phase==='save')await s.save();else await page.getByRole('button',{name:'Preparar borrador de esta oportunidad',exact:true}).click()
  await expect(s.panel().getByRole('alert')).toContainText('han cambiado');await expect(page.getByRole('dialog')).toHaveCount(0);expect(s.commands).toEqual([])
  await page.getByRole('button',{name:'Volver a consultar la oportunidad',exact:true}).click();await s.ready();await expect(page.getByLabel('Confirmo los datos fiscales de esta operación',{exact:true})).not.toBeChecked();await expect(page.getByRole('button',{name:'Preparar borrador de esta oportunidad',exact:true})).toBeDisabled()
 }finally{await s.finish()}
})
for(const scope of ['actor','workspace','viewer'])test(`late opportunity read cannot restore the previous ${scope} scope`,async({page})=>{
 const s=await opportunitySession(page,390,'late')
 try{await expect.poll(()=>s.held.length).toBe(1);s.deny();await page.evaluate(value=>window.__opportunityScope?.(value),scope);if(scope==='viewer')await expect(page.getByText('Facturación disponible para administradores del espacio.',{exact:true})).toBeVisible();else await expect(s.panel().getByRole('alert')).toBeVisible();await s.release();await expect(page.getByText('Synthetic63 Company',{exact:true})).toHaveCount(0);if(scope==='viewer')await expect(s.panel()).toHaveCount(0);expect(s.commands).toEqual([])}finally{await s.finish()}
})
for(const mode of ['uncertain','readback'])test(`${mode} recovery uses the same command or reads the registered invoice without another write`,async({page})=>{
 const s=await opportunitySession(page,768,mode)
 try{
  await s.prepare();await s.fill();await s.save()
  if(mode==='uncertain'){await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeVisible();expect(s.commands).toHaveLength(1);await page.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();expect(s.commands).toHaveLength(2);expect(s.commands[1]).toEqual(s.commands[0])}
  else{await expect(page.getByRole('button',{name:'Consultar factura registrada',exact:true})).toBeVisible();expect(s.commands).toHaveLength(1);await page.getByRole('button',{name:'Consultar factura registrada',exact:true}).click();expect(s.commands).toHaveLength(1)}
  await expect(page.locator(`[data-invoice-detail-id="${ids.invoice}"]`)).toContainText('363,00');await expect(page).toHaveURL(/\/facturacion\?invoice=/);await page.reload();await expect(page.locator(`[data-invoice-detail-id="${ids.invoice}"]`)).toBeVisible();expect(s.commands.every(c=>c.operation==='invoice.create_draft')).toBe(true)
 }finally{await s.finish()}
})
for(const kind of ['customer','opportunity'])test(`return link rejects an invoice with another ${kind}`,async({page})=>{
 const s=await opportunitySession(page,1440)
 try{s.mismatch(kind);await page.goto(new URL('/opportunities?open='+ids.opportunity+'&invoice='+ids.invoice,s.url).href);await expect(page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByRole('alert').filter({hasText:'El registro ya no está disponible.'})).toBeVisible();await expect(page.getByRole('link',{name:'Consultar factura relacionada',exact:true})).toHaveCount(0);expect(s.commands).toEqual([])}finally{await s.finish()}
})
test('mismatched saved relations stay unconfirmed and retry only reads',async({page})=>{
 const s=await opportunitySession(page,1440)
 try{await s.prepare();await s.fill();s.mismatch('opportunity');await s.save();await expect(page.getByRole('button',{name:'Consultar factura registrada',exact:true})).toBeVisible();await expect(page).toHaveURL(/opportunity=/);await page.getByRole('button',{name:'Consultar factura registrada',exact:true}).click();await expect(page.locator(`[data-invoice-detail-id="${ids.invoice}"]`)).toHaveCount(0);expect(s.commands).toHaveLength(1)}finally{await s.finish()}
})
for(const scope of ['actor','workspace','viewer'])test(`late registered invoice must not navigate after ${scope} changes`,async({page})=>{
 const s=await opportunitySession(page,390,'late_readback')
 try{
  await s.prepare();await s.fill();await s.save();await expect.poll(()=>s.heldInvoices.length).toBe(1);s.deny();await page.evaluate(value=>window.__opportunityScope?.(value),scope)
  if(scope==='viewer')await expect(page.getByText('Facturación disponible para administradores del espacio.',{exact:true})).toBeVisible();else await expect(s.panel().getByRole('alert')).toBeVisible()
  const response=page.waitForResponse(r=>{try{return r.request().postDataJSON().operation==='invoice.get'}catch{return false}});await s.releaseInvoices();await (await response).finished();await page.evaluate(()=>new Promise<void>(accept=>requestAnimationFrame(()=>requestAnimationFrame(()=>accept()))))
  await expect(page).toHaveURL(s.url);await expect(page.locator(`[data-invoice-detail-id="${ids.invoice}"]`)).toHaveCount(0);expect(s.commands).toHaveLength(1)
 }finally{await s.finish()}
})
