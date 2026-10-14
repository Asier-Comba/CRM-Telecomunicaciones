import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
const original={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic customer reliability company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
for(const width of [390,768,1440])for(const action of ['create','update'] as const)for(const failure of ['invalid_receipt','denied'] as const)test(`customer ${action} retains ${failure} intent at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture();let mutations=0
 const commands:{operation:string;input:{command_id:string;legal_name:string;lifecycle:string}}[]=[],applied=new Set<string>()
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation===`customer.${action}`){
   commands.push(q);if(failure==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);mutations++}
   if(commands.length===1){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:'70000000-0000-4000-8000-000000000009',id,version:action==='create'?1:2,status:'active'}}}:{json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:q.input.command_id,id,version:action==='create'?1:2,status:'active'},extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:q.input.command_id,id,version:action==='create'?1:2,status:'active'}}});return
  }
  if(q.operation==='customer.editor'){
      const customer=commands.length?{...original,version:action==='create'?1:2,legal_name:commands[0].input.legal_name,lifecycle:commands[0].input.lifecycle}:original
   await route.fulfill({json:{ok:true,data:customer}});return
  }
  if(q.operation==='contact.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind='+(action==='create'?'new-customer':'detail'))
  if(action==='update'){await expect(page.getByRole('heading',{name:original.legal_name,exact:true})).toBeVisible();await page.getByRole('button',{name:'Editar cliente',exact:true}).click()}
  const drawer=page.getByRole('dialog',{name:action==='create'?'Nuevo cliente':'Editar cliente',exact:true})
  await drawer.getByLabel('Razón social',{exact:true}).fill('Synthetic confirmed customer');await drawer.getByRole('button',{name:'Guardar cliente',exact:true}).click()
  await expect(drawer.getByRole('alert',{name:'Resultado del guardado',exact:true})).toBeVisible()
  if(failure==='denied'){await expect(drawer.getByRole('alert',{name:'Resultado del guardado',exact:true})).toContainText('No tienes permiso para esta acción.');await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeEnabled();await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(drawer).toHaveCount(0);expect(commands).toHaveLength(1);expect(mutations).toBe(0);return}
  await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(drawer).toBeVisible();await expect(drawer.getByLabel('Razón social',{exact:true})).toBeDisabled()
  await page.screenshot({path:info.outputPath(`customer-${action}-${failure}-${width}.png`)})
  await drawer.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
  await expect(drawer).toHaveCount(0)
  if(action==='create')await expect(page.getByText('Cliente sintético confirmado',{exact:true})).toBeVisible()
  else await expect(page.getByRole('heading',{name:'Synthetic confirmed customer',exact:true})).toBeVisible()
  expect(commands).toHaveLength(2);if(commands.length===2)expect(commands[1]).toEqual(commands[0]);expect(mutations).toBe(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(action==='create'){await page.getByRole('button',{name:'Nuevo cliente sintético',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)}
 }finally{try{if(!page.isClosed()){await page.unrouteAll({behavior:'wait'});await page.close()}}finally{await fixture.close()}}
})
