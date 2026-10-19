import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const mode of ['other','empty','same','change','archived'] as const)for(const width of [390,768,1440])test('billing search selection '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),a=fixture.invoice.id,b='20000000-0000-4000-8000-000000000007',c='30000000-0000-4000-8000-000000000008',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let searches=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:a,version:1,account_kind:'legal_entity',legal_name:'Synthetic selected company A',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='global.search'){
   searches++;const item=(id:string,label:string,status='active')=>({kind:'customer',id,customer_id:id,label,status}),first=item(a,'Synthetic selected company A'),second=item(b,'Synthetic search company B'),third=item(c,'Synthetic search company C')
   const items=mode==='other'?[searches===1?second:third]:mode==='empty'?[]:mode==='change'?[first,second]:mode==='archived'?[item(a,'Synthetic selected company A','archived')]:[first]
   await reply({contract_version:'product.v1',items});return
  }
  await route.continue()
 })
 const select=page.getByRole('combobox',{name:'Cliente para facturación',exact:true}),create=page.getByRole('button',{name:'Nuevo borrador local',exact:true}),prompt=page.getByRole('textbox',{name:'Descripción de la factura',exact:true}),search=page.getByRole('button',{name:'Buscar cliente',exact:true})
 async function find(query:string){await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill(query);const before=searches;await search.click();await expect.poll(()=>searches).toBe(before+1);await expect(search).toBeEnabled()}
 async function currentA(){await expect(select).toHaveValue(a);await expect(select.locator('option:checked')).toHaveText('Synthetic selected company A');await expect(create).toBeEnabled();await expect(prompt).toHaveValue('Propuesta en curso para A')}
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(create).toBeEnabled();await prompt.fill('Propuesta en curso para A');await find('First search')
  if(mode==='archived'){
   await expect(select).toHaveValue(a);await expect(create).toBeDisabled();await expect(prompt).toHaveCount(0);await expect(page.getByText('El cliente está archivado. Puedes consultar sus facturas; no preparar nuevos borradores.',{exact:true})).toBeVisible()
  }else{
   await currentA();await expect(select.locator('option[value="'+a+'"]')).toHaveCount(1)
   if(mode==='other'){await expect(select.locator('option[value="'+b+'"]')).toHaveText('Synthetic search company B');await find('Second search');await currentA();await expect(select.locator('option[value="'+b+'"]')).toHaveCount(0);await expect(select.locator('option[value="'+c+'"]')).toHaveText('Synthetic search company C')}
   if(mode==='change'){await select.selectOption(b);await expect(select.locator('option:checked')).toHaveText('Synthetic search company B');await expect(create).toBeEnabled();await expect(prompt).toHaveValue('');await expect.poll(()=>calls.some(q=>q.operation==='invoice.list'&&q.input.customer_id===b)).toBe(true)}
  }
  await select.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('search-selection-'+mode+'-'+width+'.png')})
  expect(searches).toBe(mode==='other'?2:1);expect(calls.filter(q=>q.operation==='customer.editor')).toHaveLength(1);expect(calls.filter(q=>q.operation==='invoice.list').every(q=>[a,b].includes(String(q.input.customer_id)))).toBe(true)
  expect(calls.some(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary'].includes(q.operation))).toBe(false);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors,searches},null,2));await page.close();await fixture.close()}
})
