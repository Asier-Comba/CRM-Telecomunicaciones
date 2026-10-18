import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'

for(const action of ['create','update'] as const)for(const mode of ['invalid','denied','current'] as const)for(const width of [390,768,1440])test('billing draft receipt '+action+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),customerId=action==='create'?fixture.invoice.id:fixture.invoice.customer_id,operation=action==='create'?'invoice.create_draft':'invoice.update_draft',id=action==='create'?'10000000-0000-4000-8000-000000000009':fixture.invoice.id,commands:{operation:string;input:Record<string,unknown>}[]=[],reads:string[]=[],errors:string[]=[]
 let invoice={...fixture.invoice,status:'draft',number:null,issued_at:null,paid_at:null,overdue:false},accepted=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q.operation);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(route.request().url().includes('/commands')){
   commands.push(q);expect(q.operation).toBe(operation)
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   const receipt={contract_version:'billing.v1',operation,command_id:q.input.command_id,id,version:action==='create'?1:fixture.invoice.version+1,status:'draft',number:null}
   if(mode==='invalid'&&commands.length===1){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{...receipt,command_id:'70000000-0000-4000-8000-000000000009'}}}:{json:{ok:true,receipt,extra:'invalid-envelope'}});return}
   const {command_id:discarded,expected_version:discardedVersion,...fields}=q.input;void discarded;void discardedVersion
   invoice={...invoice,...fields,id,customer_id:customerId,version:receipt.version,totals:calculateBillingV1(q.input.lines)};accepted=true
   await route.fulfill({json:{ok:true,receipt}});return
  }
  if(q.operation==='invoice.get'){await reply({contract_version:'billing.v1',operation:q.operation,invoice});return}
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:q.input.id,version:1,account_kind:'legal_entity',legal_name:'Synthetic draft customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='invoice.propose'){await reply({contract_version:'billing.v1',operation:q.operation,source:q.input.source,draft:q.input.draft,totals:calculateBillingV1(q.input.draft.lines),requires_review:true,saved:false});return}
  await route.continue()
 })
 const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),concept=editor.getByRole('textbox',{name:'Concepto 1',exact:true}),save=editor.getByRole('button',{name:'Guardar borrador local',exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(action==='create'?'/facturacion?customer_scope=1':''))
  if(action==='create'){
   await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled();await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic draft customer por enlace de 100 euros + IVA 21%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  }else{await page.getByRole('button',{name:'Editar borrador',exact:true}).click()}
  await expect(editor).toBeVisible();await concept.fill('Enlace revisado');await editor.getByRole('spinbutton',{name:'Cantidad 1',exact:true}).fill('2');await editor.getByRole('spinbutton',{name:'Precio 1',exact:true}).fill('200');await editor.getByRole('checkbox',{name:/He revisado cliente/}).check();await save.click()
  if(mode==='invalid'){
   await expect(editor.getByRole('alert')).toHaveText('No se pudo completar la acción.');await expect(concept).toBeDisabled();await expect(save).toBeDisabled();expect(commands).toHaveLength(1);expect(accepted).toBe(false)
   const gets=reads.filter(x=>x==='invoice.get').length
   await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(editor).toBeVisible();await page.keyboard.press('Escape');await expect(editor).toBeVisible();await expect(page.getByRole('button',{name:'Actualizar facturas',exact:true})).toBeDisabled();expect(reads.filter(x=>x==='invoice.get')).toHaveLength(gets)
   await editor.getByRole('button',{name:'Reintentar la misma acción',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('draft-receipt-'+action+'-invalid-'+width+'.png')})
   await editor.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
  }else if(mode==='denied'){
   await expect(editor.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(concept).toBeEnabled();await expect(concept).toHaveValue('Enlace revisado');await expect(editor.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toHaveCount(0);expect(commands).toHaveLength(1);expect(accepted).toBe(false)
   await concept.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('draft-receipt-'+action+'-denied-'+width+'.png')});await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(editor).toHaveCount(0);return
  }
  await expect(editor).toHaveCount(0);await expect(page.getByRole('heading',{name:'Borrador guardado',exact:true})).toBeVisible();await expect(page.getByText(/Total confirmado por el servidor:.*484/)).toBeVisible();expect(accepted).toBe(true)
  expect(commands).toHaveLength(mode==='invalid'?2:1);if(mode==='invalid')expect(commands[1]).toEqual(commands[0]);expect(commands[0].input).toMatchObject({lines:[{description:'Enlace revisado',quantity_milli:2000,unit_price_minor:20000,tax_bps:2100}]});if(action==='update')expect(commands[0].input).toMatchObject({id:fixture.invoice.id,expected_version:fixture.invoice.version});else expect(commands[0].input.customer_id).toBe(customerId)
  expect(commands.some(q=>q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({action,mode,width,commands,reads,errors,accepted},null,2));await page.close();await fixture.close()}
})
