import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001',contactId='20000000-0000-4000-8000-000000000001'
const customer={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic contact reliability company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const original={id:contactId,version:1,customer_id:id,display_name:'Synthetic original contact',job_title:null,status:'active',is_primary:false,has_email:false,has_phone:false}
for(const failure of ['invalid','denied'] as const)for(const width of [390,768,1440])for(const action of ['create','update','archive'] as const)test(`contact ${action} ${failure} receipt recovery at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture();let saved=false,mutations=0
 const commands:{operation:string;input:{command_id:string;display_name?:string}}[]=[],applied=new Set<string>(),privateReads:string[]=[]
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='customer.editor'){await route.fulfill({json:{ok:true,data:customer}});return}
  if(q.operation==='contact.list'){
   const items=action==='create'?(saved?[{...original,display_name:'Synthetic confirmed contact'}]:[]):[{...original,...(saved?{version:2,display_name:action==='update'?'Synthetic confirmed contact':original.display_name,status:action==='archive'?'archived':'active'}:{})}]
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items,next_id:null}}});return
  }
  if(q.operation===`contact.${action}`){
   commands.push(q);if(failure==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);mutations++;saved=true}
   // Controlled backend effect followed by a lost response, then idempotent receipt.
   if(commands.length===1){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:'70000000-0000-4000-8000-000000000009',id:contactId,version:action==='create'?1:2,status:action==='archive'?'archived':'active'}}}:{json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:q.input.command_id,id:contactId,version:action==='create'?1:2,status:action==='archive'?'archived':'active'},extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:q.input.command_id,id:contactId,version:action==='create'?1:2,status:action==='archive'?'archived':'active'}}});return
  }
  if(q.operation==='contact.editors'||q.operation==='sensitive.reveal')privateReads.push(q.operation)
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail')
  await expect(page.getByRole('heading',{name:customer.legal_name,exact:true})).toBeVisible()
  if(action==='create')await page.getByRole('button',{name:'Añadir contacto',exact:true}).click()
  else await page.getByRole('button',{name:'Editar contacto',exact:true}).click()
  const drawer=page.getByRole('dialog',{name:action==='create'?'Añadir contacto':'Editar contacto',exact:true})
  if(action!=='archive'){
   await drawer.getByLabel('Nombre del contacto',{exact:true}).fill('Synthetic confirmed contact')
   await drawer.getByRole('button',{name:'Guardar contacto',exact:true}).click()
  }else{
   await drawer.getByRole('button',{name:'Archivar contacto',exact:true}).click()
   await page.getByRole('button',{name:'Confirmar',exact:true}).click()
  }
  if(failure==='denied'){const active=action==='archive'?page.getByRole('dialog',{name:'Archivar contacto',exact:true}):drawer;await expect(active.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');if(action==='archive'){await expect(active.getByRole('button',{name:'Cancelar',exact:true})).toBeEnabled();await active.getByRole('button',{name:'Cancelar',exact:true}).click()}await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeEnabled();await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(drawer).toHaveCount(0);expect(commands).toHaveLength(1);expect(mutations).toBe(0);expect(privateReads).toEqual([]);return}
  await expect(page.getByRole('alert').filter({hasText:'No se pudo completar la acción.'})).toBeVisible()
  if(action==='archive'){
   await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
   await expect(page.getByRole('dialog',{name:'Archivar contacto',exact:true})).toBeVisible()
  }else{await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled();await expect(drawer).toBeVisible()}
  await page.keyboard.press('Escape');await expect(drawer).toBeVisible()
  await page.screenshot({path:info.outputPath(`contact-${action}-invalid-${width}.png`)})
  if(action==='archive')await page.getByRole('dialog',{name:'Archivar contacto',exact:true}).getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
  else{
   await expect(drawer.getByLabel('Nombre del contacto',{exact:true})).toBeDisabled()
   await drawer.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
  }
  await expect(drawer).toHaveCount(0)
  await expect(page.getByText(action==='archive'?original.display_name:'Synthetic confirmed contact',{exact:true})).toBeVisible()
  expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(mutations).toBe(1);expect(privateReads).toEqual([])
  if(action==='create'){
   await page.getByRole('button',{name:'Añadir contacto',exact:true}).click();await page.keyboard.press('Escape')
   await expect(page.getByRole('dialog',{name:'Añadir contacto',exact:true})).toHaveCount(0)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`contact-${action}-confirmed-${width}.png`)})
 }finally{try{if(!page.isClosed()){await page.unrouteAll({behavior:'wait'});await page.close()}}finally{await fixture.close()}}
})
