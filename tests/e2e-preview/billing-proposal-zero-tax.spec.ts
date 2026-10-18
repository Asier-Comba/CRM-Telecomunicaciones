import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
const cases=[{name:'comma',term:'IVA 0,5%',rate:0.5,total:10050},{name:'dot',term:'IVA 0.5%',rate:0.5,total:10050},{name:'zero',term:'IVA 0%',rate:0,total:10000},{name:'no-vat',term:'sin IVA',rate:0,total:10000},{name:'precision',term:'IVA 0,123%'},{name:'suffix',term:'0,5% de IVA',rate:0.5,total:10050}] as const
for(const sample of cases)for(const width of [390,768,1440])test('billing proposal zero-tax '+sample.name+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),customerId=fixture.invoice.id,calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(route.request().url().includes('/commands')){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:customerId,version:1,account_kind:'legal_entity',legal_name:'Synthetic discount customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='invoice.propose'){await reply({contract_version:'billing.v1',operation:q.operation,source:q.input.source,draft:q.input.draft,totals:calculateBillingV1(q.input.draft.lines),requires_review:true,saved:false});return}
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled()
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic discount customer por enlace de 100 euros, '+sample.term);await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),proposals=()=>calls.filter(q=>q.operation==='invoice.propose')
  if('rate' in sample){
   await expect(editor).toBeVisible();await expect(editor.getByRole('spinbutton',{name:'IVA % 1',exact:true})).toHaveValue(String(sample.rate));await expect(editor.getByRole('spinbutton',{name:'Precio 1',exact:true})).toHaveValue('100');await expect(editor.getByRole('spinbutton',{name:'Descuento % 1',exact:true})).toHaveValue('0')
   expect(proposals()).toHaveLength(1);expect(proposals()[0].input.draft).toMatchObject({customer_id:customerId,lines:[{unit_price_minor:10000,quantity_milli:1000,discount_bps:0,tax_bps:sample.rate*100,withholding_bps:0}]})
   await expect(editor.locator('dl dd').last()).toHaveText(new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(sample.total/100));await expect(editor.getByRole('checkbox',{name:/He revisado cliente/})).not.toBeChecked();await expect(editor.getByRole('button',{name:'Guardar borrador local',exact:true})).toBeDisabled()
   await editor.getByRole('button',{name:'Guardar borrador local',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('zero-tax-'+sample.name+'-'+width+'.png')})
  }else{
   await expect(page.getByRole('alert').first()).toBeVisible();await expect(editor).toHaveCount(0);expect(proposals()).toHaveLength(0)
   await page.getByRole('alert').first().scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('zero-tax-'+sample.name+'-'+width+'.png')})
  }
  expect(calls.filter(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary','invoice.propose'].includes(q.operation))).toEqual([]);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({sample,width,calls,errors},null,2));await page.close();await fixture.close()}
})
