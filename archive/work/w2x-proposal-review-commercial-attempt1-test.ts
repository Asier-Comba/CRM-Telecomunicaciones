import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'

for(const width of [390,768,1440])for(const mode of ['editable-save','review-reset','no-save'] as const)test('billing proposal commercial review '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),customerId=fixture.invoice.id,createdId='10000000-0000-4000-8000-000000000009',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let created:Record<string,unknown>|undefined
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:customerId,version:1,account_kind:'legal_entity',legal_name:'Synthetic workflow customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='invoice.propose'){await reply({contract_version:'billing.v1',operation:q.operation,source:q.input.source,draft:q.input.draft,totals:calculateBillingV1(q.input.draft.lines),requires_review:true,saved:false});return}
  if(q.operation==='invoice.create_draft'){
   created=q.input
   await reply({contract_version:'billing.v1',command_id:q.input.command_id,operation:q.operation,id:createdId,version:1,status:'draft',number:null});return
  }
  if(q.operation==='invoice.get'&&q.input.id===createdId&&created){
   const {command_id:discarded,...draft}=created;void discarded
   await reply({contract_version:'billing.v1',operation:q.operation,invoice:{...fixture.invoice,...draft,id:createdId,version:1,status:'draft',number:null,issuer:null,customer_fiscal:null,issued_at:null,paid_at:null,overdue:false,fx:null,totals:calculateBillingV1(draft.lines as Parameters<typeof calculateBillingV1>[0])}});return
  }
  await route.continue()
 })
 const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),review=editor.getByRole('checkbox',{name:/He revisado cliente/}),save=editor.getByRole('button',{name:'Guardar borrador local',exact:true}),commands=()=>calls.filter(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.get','invoice.financial_summary','invoice.propose'].includes(q.operation))
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled()
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic workflow customer por enlace de 100 euros + IVA 21%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  await expect(editor).toBeVisible();await expect(editor.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue(/enlace/);await expect(review).not.toBeChecked();await expect(save).toBeDisabled();expect(commands()).toEqual([])
  if(mode==='review-reset'){
   await review.check();await expect(save).toBeEnabled();await editor.getByRole('textbox',{name:'Notas de factura',exact:true}).fill('Cambio posterior a la revisión')
   await expect(review).not.toBeChecked();await expect(save).toBeDisabled();expect(commands()).toEqual([])
  }else if(mode==='editable-save'){
   await editor.getByRole('textbox',{name:'Concepto 1',exact:true}).fill('Enlace editado');await editor.getByRole('spinbutton',{name:'Cantidad 1',exact:true}).fill('2');await editor.getByRole('spinbutton',{name:'Precio 1',exact:true}).fill('200')
   await expect(editor.locator('[data-invoice-line-total="1"]')).toContainText('484');await expect(review).not.toBeChecked();await expect(save).toBeDisabled();expect(commands()).toEqual([])
   await review.check();await expect(save).toBeEnabled()
  }
  await save.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('review-actions-'+mode+'-'+width+'.png')})
  if(mode==='editable-save'){
   await save.click();await expect(page.getByRole('heading',{name:'Borrador guardado',exact:true})).toBeVisible();await expect(editor).toHaveCount(0)
   await expect(page.getByText(/Total confirmado por el servidor:.*484/)).toBeVisible()
   expect(commands()).toHaveLength(1);expect(commands()[0].operation).toBe('invoice.create_draft');expect(created).toMatchObject({customer_id:customerId,lines:[{description:'Enlace editado',quantity_milli:2000,unit_price_minor:20000,tax_bps:2100}]})
   expect(calls.filter(q=>q.operation==='invoice.get'&&q.input.id===createdId)).toHaveLength(1)
  }else expect(commands()).toEqual([])
  expect(calls.filter(q=>q.operation==='invoice.propose')).toHaveLength(1);expect(calls.some(q=>q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors,created},null,2));await page.close();await fixture.close()}
})
