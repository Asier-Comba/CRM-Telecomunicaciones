import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

for(const mode of ['long','clear','denied'] as const)for(const width of [390,768,1440])test('billing selected label '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),id=fixture.invoice.id,name='Synthetic Empresa Telecom '+('X'.repeat(80)),calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q)
  if(q.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='customer.editor'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:name,trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}}});return
  }
  await route.continue()
 })
 const label=page.locator('[data-billing-selected-customer]'),select=page.getByRole('combobox',{name:'Cliente para facturación',exact:true}),create=page.getByRole('button',{name:'Nuevo borrador local',exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1')
  if(mode==='denied'){await expect(page.getByRole('alert').first()).toHaveText('No tienes permiso para esta acción.');await expect(select.locator('option:checked')).toHaveText('Cliente sin verificar');await expect(create).toBeDisabled();await expect(label).toHaveCount(0)}
  else{
   await expect(create).toBeEnabled();await expect(select.locator('option:checked')).toHaveText(name);await expect(label).toHaveText('Cliente seleccionado: '+name);await expect(label).toBeVisible()
   expect(await label.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   if(mode==='clear'){await select.selectOption('');await expect(label).toHaveCount(0);await expect(create).toBeDisabled();await expect(page.getByRole('textbox',{name:'Descripción de la factura',exact:true})).toHaveCount(0)}
  }
  const lists=calls.filter(q=>q.operation==='invoice.list');await expect.poll(()=>lists.length||calls.filter(q=>q.operation==='invoice.list').length).toBeGreaterThan(0)
  await expect.poll(()=>calls.filter(q=>q.operation==='invoice.list').length).toBe(mode==='clear'?2:1);expect(calls.filter(q=>q.operation==='invoice.list').every((q,index)=>mode==='clear'&&index===1?q.input.customer_id===undefined:q.input.customer_id===id)).toBe(true)
  expect(calls.filter(q=>q.operation==='customer.editor')).toHaveLength(1);expect(calls.some(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary'].includes(q.operation))).toBe(false);expect(errors).toEqual([])
  await (mode==='long'?label:select).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('selected-label-'+mode+'-'+width+'.png')})
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors,name},null,2));await page.close();await fixture.close()}
})
