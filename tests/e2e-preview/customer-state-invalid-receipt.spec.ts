import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
for(const failure of ['invalid','denied'] as const)for(const width of [390,768,1440])for(const action of ['archive','restore'] as const)test(`customer ${action} ${failure} receipt confirmation at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture();let mutations=0
 let customer={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic customer state company',trade_name:null,lifecycle:'customer',status:action==='archive'?'active':'archived',source:'manual',assigned_user_id:null}
 const commands:{operation:string;input:{command_id:string}}[]=[],applied=new Set<string>()
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='customer.editor'){await route.fulfill({json:{ok:true,data:customer}});return}
  if(q.operation==='contact.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation===`customer.${action}`){
   commands.push(q);if(failure==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);mutations++;customer={...customer,version:2,status:action==='archive'?'archived':'active'}}
   if(commands.length===1){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:'70000000-0000-4000-8000-000000000009',id,version:2,status:customer.status}}}:{json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:q.input.command_id,id,version:2,status:customer.status},extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:q.input.command_id,id,version:2,status:customer.status}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail');await expect(page.getByRole('heading',{name:customer.legal_name,exact:true})).toBeVisible()
  const label=action==='archive'?'Archivar cliente':'Restaurar cliente';await page.getByRole('button',{name:label,exact:true}).click()
  const dialog=page.getByRole('dialog',{name:label,exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
  if(failure==='denied'){await expect(dialog.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(1);expect(mutations).toBe(0);return}
  await expect(dialog.getByRole('alert')).toContainText('No se pudo completar la acción.')
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).evaluate((button:HTMLButtonElement)=>button.click())
  await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await page.screenshot({path:info.outputPath(`customer-state-${action}-invalid-${width}.png`)})
  await dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button',{name:action==='archive'?'Restaurar cliente':'Archivar cliente',exact:true})).toBeVisible()
  expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(mutations).toBe(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.getByRole('button',{name:action==='archive'?'Restaurar cliente':'Archivar cliente',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
 }finally{try{if(!page.isClosed()){await page.unrouteAll({behavior:'wait'});await page.close()}}finally{await fixture.close()}}
})
