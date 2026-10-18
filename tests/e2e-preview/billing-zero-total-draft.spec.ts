import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'

for(const action of ['create','update'] as const)for(const mode of ['unreviewed','reviewed','review-reset'] as const)for(const width of [390,768,1440])test('billing zero-total draft '+action+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),customerId=action==='create'?fixture.invoice.id:fixture.invoice.customer_id,operation=action==='create'?'invoice.create_draft':'invoice.update_draft',id=action==='create'?'10000000-0000-4000-8000-000000000009':fixture.invoice.id,commands:{operation:string;input:Record<string,unknown>}[]=[],reads:string[]=[],errors:string[]=[]
 let invoice={...fixture.invoice,status:'draft',number:null,issued_at:null,paid_at:null,overdue:false},accepted=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q.operation);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(route.request().url().includes('/commands')){
   commands.push(q);expect(q.operation).toBe(operation)
   const receipt={contract_version:'billing.v1',operation,command_id:q.input.command_id,id,version:action==='create'?1:fixture.invoice.version+1,status:'draft',number:null}
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
 const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),review=editor.getByRole('checkbox',{name:/He revisado cliente/}),save=editor.getByRole('button',{name:'Guardar borrador local',exact:true}),zero={subtotal_minor:0,tax_minor:0,withholding_minor:0,total_minor:0},formatted=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(0)
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(action==='create'?'/facturacion?customer_scope=1':''))
  if(action==='create'){
   await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled();await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic draft customer por enlace de 100 euros + IVA 21%, descuento 100%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
   await expect(editor.getByRole('spinbutton',{name:'Descuento % 1',exact:true})).toHaveValue('100')
  }else await page.getByRole('button',{name:'Editar borrador',exact:true}).click()
  await expect(editor).toBeVisible();await editor.getByRole('textbox',{name:'Concepto 1',exact:true}).fill('Enlace bonificado');await editor.getByRole('spinbutton',{name:'Cantidad 1',exact:true}).fill('1');await editor.getByRole('spinbutton',{name:'Precio 1',exact:true}).fill('100');await editor.getByRole('spinbutton',{name:'Descuento % 1',exact:true}).fill('100');await editor.getByRole('spinbutton',{name:'IVA % 1',exact:true}).fill('21');await editor.getByRole('spinbutton',{name:'IRPF % 1',exact:true}).fill('0')
  await expect(editor.locator('dl dd').last()).toHaveText(formatted);await expect(review).not.toBeChecked();await expect(save).toBeDisabled();expect(commands).toHaveLength(0)
  if(mode!=='unreviewed'){
   await review.check();await expect(save).toBeEnabled()
   if(mode==='review-reset'){await editor.getByRole('textbox',{name:'Notas de factura',exact:true}).fill('Revisión reiniciada con total cero');await expect(review).not.toBeChecked();await expect(save).toBeDisabled();expect(commands).toHaveLength(0)}
  }else{await save.evaluate((b:HTMLButtonElement)=>b.click());expect(commands).toHaveLength(0)}
  await save.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('zero-total-'+action+'-'+mode+'-'+width+'.png')})
  if(mode==='unreviewed'){await expect(editor).toBeVisible();expect(accepted).toBe(false);expect(commands).toHaveLength(0);expect(reads.filter(x=>x==='invoice.propose')).toHaveLength(action==='create'?1:0);expect(reads.filter(x=>x==='invoice.get')).toHaveLength(action==='create'?0:1);expect(errors).toEqual([]);return}
  if(mode==='review-reset'){await review.check();await expect(save).toBeEnabled()}
  await save.click();await expect(editor).toHaveCount(0);await expect(page.getByRole('heading',{name:'Borrador guardado',exact:true})).toBeVisible();await expect(page.getByText('Total confirmado por el servidor: '+formatted,{exact:true})).toBeVisible();expect(invoice.totals).toEqual(zero);expect(accepted).toBe(true)
  expect(commands).toHaveLength(1);expect(commands[0].operation).toBe(operation);expect(commands[0].input).toMatchObject({lines:[{description:'Enlace bonificado',quantity_milli:1000,unit_price_minor:10000,discount_bps:10000,tax_bps:2100,withholding_bps:0}]});if(action==='update')expect(commands[0].input).toMatchObject({id:fixture.invoice.id,expected_version:fixture.invoice.version});else expect(commands[0].input.customer_id).toBe(customerId)
  expect(reads.filter(x=>x==='invoice.propose')).toHaveLength(action==='create'?1:0);expect(reads.filter(x=>x==='invoice.get')).toHaveLength(action==='create'?1:2);expect(commands.some(q=>q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({action,mode,width,commands,reads,errors,accepted,totals:invoice.totals},null,2));await page.close();await fixture.close()}
})
