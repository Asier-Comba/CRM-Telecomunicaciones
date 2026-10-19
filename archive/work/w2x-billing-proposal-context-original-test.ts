import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
for(const width of [390,768,1440])for(const mode of ['clear','manual','latest','error-retired','current','denied'] as const)test('billing proposal current context '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),id=fixture.invoice.id,reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let proposals=0,held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic proposal customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='invoice.propose'){
   if(++proposals===1){held=true;await gate}
   if(mode==='error-retired'||mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await reply({contract_version:'billing.v1',operation:q.operation,source:q.input.source,draft:q.input.draft,totals:calculateBillingV1(q.input.draft.lines),requires_review:true,saved:false});return
  }
  await route.continue()
 })
 const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),proposed=page.getByText('Propuesta validada: requiere revisión. No se ha guardado ninguna factura.',{exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled()
  const text=page.getByRole('textbox',{name:'Descripción de la factura',exact:true});await text.fill('Factura a Synthetic proposal customer por antiguo enlace de 100 euros + IVA 21%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click();await expect.poll(()=>held).toBe(true)
  if(mode==='clear'||mode==='error-retired')await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption('')
  if(mode==='manual'){await page.getByRole('button',{name:'Nuevo borrador local',exact:true}).click();await expect(editor).toBeVisible();await expect(editor.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('')}
  if(mode==='latest'){await text.fill('Factura a Synthetic proposal customer por nuevo enlace de 200 euros + IVA 21%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click();await expect.poll(()=>proposals).toBe(2);await expect(editor.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue(/nuevo enlace/)}
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='invoice.propose'&&r.request().postDataJSON()?.input.draft.lines[0].unit_price_minor===10000)
  release();await (await response).finished();await page.waitForLoadState('networkidle')
  if(mode==='clear'||mode==='error-retired'){await expect(editor).toHaveCount(0);await expect(proposed).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByRole('combobox',{name:'Cliente para facturación',exact:true})).toHaveValue('')}
  else if(mode==='manual'){await expect(editor).toBeVisible();await expect(editor.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue('');await expect(proposed).toHaveCount(0)}
  else if(mode==='latest'){await expect(editor.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue(/nuevo enlace/);await expect(proposed).toBeVisible()}
  else if(mode==='denied'){await expect(editor).toHaveCount(0);await expect(page.getByRole('alert').first()).toHaveText('No tienes permiso para esta acción.');await expect(proposed).toHaveCount(0)}
  else{await expect(editor).toBeVisible();await expect(editor.getByRole('textbox',{name:'Concepto 1',exact:true})).toHaveValue(/antiguo enlace/);await expect(editor.getByRole('combobox',{name:'Cliente de factura',exact:true})).toHaveValue(id);await expect(proposed).toBeVisible()}
  await page.screenshot({path:info.outputPath('billing-proposal-'+mode+'-'+width+'.png')});expect(reads.some(q=>q.operation==='invoice.create_draft'||q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,errors,proposals},null,2));await page.close();await fixture.close()}
})
