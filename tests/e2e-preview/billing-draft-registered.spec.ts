import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'

for(const action of ['create','update'] as const)for(const mode of ['malformed','wrong-customer','unavailable'] as const)for(const width of [390,768,1440])test('billing registered draft '+action+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),customerId=action==='create'?fixture.invoice.id:fixture.invoice.customer_id,operation=action==='create'?'invoice.create_draft':'invoice.update_draft',id=action==='create'?'10000000-0000-4000-8000-000000000009':fixture.invoice.id,commands:{operation:string;input:Record<string,unknown>}[]=[],timeline:string[]=[],errors:string[]=[]
 let invoice={...fixture.invoice,status:'draft',number:null,issued_at:null,paid_at:null,overdue:false},registered=false,postReads=0
 if(mode==='wrong-customer')expect(customerId).not.toBe('20000000-0000-4000-8000-000000000007')
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(route.request().url().includes('/commands')){
   commands.push(q);timeline.push('command');expect(q.operation).toBe(operation)
   const {command_id:discarded,expected_version:discardedVersion,...fields}=q.input;void discarded;void discardedVersion
   invoice={...invoice,...fields,id,customer_id:customerId,version:action==='create'?1:fixture.invoice.version+1,totals:calculateBillingV1(q.input.lines)};registered=true
   await route.fulfill({json:{ok:true,receipt:{contract_version:'billing.v1',operation,command_id:q.input.command_id,id,version:invoice.version,status:'draft',number:null}}});return
  }
  if(q.operation==='invoice.get'){
   if(registered){expect(q.input.id).toBe(id);timeline.push('read');if(++postReads===1){
    if(mode==='malformed'){await route.fulfill({status:200,contentType:'application/json',body:'{'});return}
    if(mode==='unavailable'){await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
    await reply({contract_version:'billing.v1',operation:q.operation,invoice:{...invoice,customer_id:'20000000-0000-4000-8000-000000000007'}});return
   }}
   await reply({contract_version:'billing.v1',operation:q.operation,invoice});return
  }
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:q.input.id,version:1,account_kind:'legal_entity',legal_name:'Synthetic registered customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='invoice.propose'){await reply({contract_version:'billing.v1',operation:q.operation,source:q.input.source,draft:q.input.draft,totals:calculateBillingV1(q.input.draft.lines),requires_review:true,saved:false});return}
  await route.continue()
 })
 const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),concept=editor.getByRole('textbox',{name:'Concepto 1',exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(action==='create'?'/facturacion?customer_scope=1':''))
  if(action==='create'){await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled();await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic registered customer por enlace de 100 euros + IVA 21%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()}
  else await page.getByRole('button',{name:'Editar borrador',exact:true}).click()
  await concept.fill('Borrador confirmado');await editor.getByRole('checkbox',{name:/He revisado cliente/}).check();await editor.getByRole('button',{name:'Guardar borrador local',exact:true}).click()
  await expect(editor.getByText('El cambio está registrado. Consulta la factura para confirmar sus datos actuales.',{exact:true})).toBeVisible();await expect(editor.getByRole('alert')).toBeVisible();await expect(concept).toBeDisabled();await expect(editor.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled();await expect(editor.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Actualizar facturas',exact:true})).toBeDisabled()
  expect(commands).toHaveLength(1);expect(postReads).toBe(1);await page.keyboard.press('Escape');await expect(editor).toBeVisible()
  const read=editor.getByRole('button',{name:'Consultar factura registrada',exact:true});await read.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('registered-'+action+'-'+mode+'-'+width+'.png')});await read.click()
  await expect(editor).toHaveCount(0);await expect(page.locator('section[data-invoice-detail-id]')).toHaveAttribute('data-invoice-detail-id',id);await expect(page.locator('section[data-invoice-detail-id]')).toHaveAttribute('data-invoice-detail-version',String(invoice.version));await expect(page.getByRole('heading',{name:'Borrador guardado',exact:true})).toBeVisible();expect(commands).toHaveLength(1);expect(postReads).toBe(2);expect(timeline).toEqual(['command','read','read']);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({action,mode,width,commands,timeline,errors,postReads,registered},null,2));await page.close();await fixture.close()}
})
