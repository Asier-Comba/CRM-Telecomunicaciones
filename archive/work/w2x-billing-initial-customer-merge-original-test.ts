import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const status of ['active','archived'] as const)for(const mode of ['searched','selected','initial'] as const)for(const width of [390,768,1440])test('billing initial customer merge '+status+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),a=fixture.invoice.id,b='20000000-0000-4000-8000-000000000007',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'&&q.input.id===a){held=true;await gate;await reply({contract_version:'product.v1',id:a,version:1,account_kind:'legal_entity',legal_name:'Synthetic initial company A',trade_name:null,lifecycle:'customer',status,source:'manual',assigned_user_id:null});return}
  if(q.operation==='global.search'){await reply({contract_version:'product.v1',items:[{kind:'customer',id:b,customer_id:b,label:'Synthetic searched company B',status:'active'}]});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  await route.continue()
 })
 const select=page.getByRole('combobox',{name:'Cliente para facturación',exact:true}),create=page.getByRole('button',{name:'Nuevo borrador local',exact:true}),optionB=select.locator('option[value="'+b+'"]')
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect.poll(()=>held).toBe(true);await expect(select).toHaveValue(a);await expect(create).toBeDisabled()
  if(mode!=='initial'){
   await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Synthetic searched');await page.getByRole('button',{name:'Buscar cliente',exact:true}).click();await expect(optionB).toHaveText('Synthetic searched company B');await expect(select).toBeEnabled()
   if(mode==='selected'){await select.selectOption(b);await expect(create).toBeEnabled();await expect.poll(()=>calls.some(q=>q.operation==='invoice.list'&&q.input.customer_id===b)).toBe(true)}
  }
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='customer.editor');release();await (await response).finished();await page.waitForLoadState('networkidle')
  if(mode!=='initial')await expect(optionB).toHaveText('Synthetic searched company B')
  await expect(select).toHaveValue(mode==='selected'?b:a)
  if(mode==='selected'){await expect(select.locator('option:checked')).toHaveText('Synthetic searched company B');await expect(create).toBeEnabled();await expect(page.getByText('El cliente está archivado. Puedes consultar sus facturas; no preparar nuevos borradores.',{exact:true})).toHaveCount(0)}
  else{await expect(select.locator('option:checked')).toHaveText('Synthetic initial company A');if(status==='archived')await expect(create).toBeDisabled();else await expect(create).toBeEnabled()}
  await select.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('initial-customer-'+status+'-'+mode+'-'+width+'.png')})
  if(mode==='searched'){await select.selectOption(b);await expect(create).toBeEnabled();await expect(select.locator('option:checked')).toHaveText('Synthetic searched company B')}
  expect(calls.filter(q=>q.operation==='customer.editor')).toHaveLength(1);expect(calls.filter(q=>q.operation==='global.search')).toHaveLength(mode==='initial'?0:1);expect(calls.filter(q=>q.operation==='invoice.list').every(q=>[a,b].includes(String(q.input.customer_id)))).toBe(true)
  expect(calls.some(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary'].includes(q.operation))).toBe(false);expect(errors).toEqual([])
 }finally{release();fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({status,mode,width,calls,errors},null,2));await page.close();await fixture.close()}
})
