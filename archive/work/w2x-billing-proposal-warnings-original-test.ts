import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
const cases=[{name:'included',text:'por enlace de 121 euros IVA incluido',price:'100',warning:'IVA incluido: la base se ha calculado como 100 (revísala).'},{name:'missing',text:'por enlace sin importe indicado',price:'0',warning:'La propuesta no detectó: importe. Revisa este campo.'},{name:'current',text:'por enlace de 100 euros + IVA 21%',price:'100',warning:null}] as const
for(const sample of cases)for(const lifetime of ['current','new-draft'] as const)for(const width of [390,768,1440])test('billing proposal warnings '+sample.name+' '+lifetime+' at '+width,async({page},info)=>{
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
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic discount customer '+sample.text);await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),warning=sample.warning?editor.getByText(sample.warning,{exact:true}):null
  await expect(editor).toBeVisible();await expect(editor.getByRole('spinbutton',{name:'Precio 1',exact:true})).toHaveValue(sample.price)
  expect(calls.filter(q=>q.operation==='invoice.propose')).toHaveLength(1)
  if(warning)await expect(warning).toBeVisible();else await expect(editor.getByText(/IVA incluido:|La propuesta no detectó:/)).toHaveCount(0)
  await expect(editor.getByRole('checkbox',{name:/He revisado cliente/})).not.toBeChecked();await expect(editor.getByRole('button',{name:'Guardar borrador local',exact:true})).toBeDisabled()
  if(lifetime==='new-draft'){
   await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(editor).toHaveCount(0);await page.getByRole('button',{name:'Nuevo borrador local',exact:true}).click();await expect(editor).toBeVisible();await expect(editor.getByText(/IVA incluido:|La propuesta no detectó:/)).toHaveCount(0);await expect(editor.getByRole('spinbutton',{name:'Precio 1',exact:true})).toHaveValue('0');expect(calls.filter(q=>q.operation==='invoice.propose')).toHaveLength(1)
  }
  await editor.getByRole('button',{name:'Cerrar panel',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('warnings-'+sample.name+'-'+lifetime+'-'+width+'.png')})
  expect(calls.filter(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary','invoice.propose'].includes(q.operation))).toEqual([]);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({sample,lifetime,width,calls,errors},null,2));await page.close();await fixture.close()}
})
