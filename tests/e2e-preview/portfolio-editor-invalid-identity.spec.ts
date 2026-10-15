import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
for(const action of ['activate','label','assignment'] as const)for(const mode of ['invalid_receipt','lost_receipt','denied'] as const)for(const width of [390,768,1440])test('portfolio editor '+action+' '+mode+' exact recovery at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),id='60000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001',assignee='30000000-0000-4000-8000-000000000001',parent='80000000-0000-4000-8000-000000000001'
 const kind=action==='label'?'service':'contract',operation=action==='activate'?'contract.activate':action==='label'?'service.update_label':'contract.update_allowed_metadata',commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const contract={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
 let record:Record<string,unknown>=kind==='contract'?contract:{id,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Nombre sintético anterior',activated_on:null,ended_on:null,status_effective_on:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(['contract.activate','service.update_label','contract.update_allowed_metadata'].includes(q.operation)){
   commands.push(q)
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(commands.length===1)record={...record,version:2,...(action==='activate'?{status:'active'}:action==='label'?{display_name:'Nombre sintético actualizado'}:{assigned_user_id:assignee})}
   if(mode==='lost_receipt'&&commands.length===1){await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id,version:mode==='invalid_receipt'&&commands.length===1?0:2,status:record.status,source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.kind,record:q.input.id===id?record:{...contract,id:parent}}}});return}
  if(q.operation==='assignee.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{user_id:assignee,display_name:'Comercial sintético destino',role:'member'}],next_id:null}}});return}
  if(['customer.list','contract.list','service.list','line.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id+'&portfolio_kind='+kind)
  const drawer=page.getByRole('dialog',{name:kind==='service'?'Servicio: Servicio':'Contrato: Contrato',exact:true});await expect(drawer).toBeVisible()
  if(action==='activate'){await drawer.getByRole('button',{name:'Activar contrato',exact:true}).click();await page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()}
  else if(action==='label'){await drawer.getByLabel('Nombre del activo',{exact:true}).fill('Nombre sintético actualizado');await drawer.getByRole('button',{name:'Guardar nombre',exact:true}).click()}
  else{await expect(drawer.getByRole('combobox',{name:'Responsable autorizado',exact:true})).toBeEnabled();await drawer.getByRole('combobox',{name:'Responsable autorizado',exact:true}).selectOption(assignee);await drawer.getByRole('button',{name:'Guardar responsable del contrato',exact:true}).click()}
  const confirmation=page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true}),scope=action==='activate'?confirmation:drawer
  const errorText=mode==='invalid_receipt'?'No se pudo completar la acción.':mode==='lost_receipt'?'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.':'No tienes permiso para esta acción.'
  await expect(scope.getByRole('alert').filter({hasText:errorText})).toHaveCount(1)
  const close=drawer.getByRole('button',{name:'Cerrar panel',exact:true})
  if(mode==='denied'){
   if(action==='activate'){await expect(confirmation.getByRole('button',{name:'Cancelar',exact:true})).toBeEnabled();await confirmation.getByRole('button',{name:'Cancelar',exact:true}).click()}
   await expect(close).toBeEnabled();await close.click();await expect(drawer).toHaveCount(0);expect(commands).toHaveLength(1);expect(record.version).toBe(1)
  }else{
   await expect(close).toBeDisabled();await close.evaluate((button:HTMLButtonElement)=>button.click());await expect(drawer).toBeVisible()
   if(action==='activate'){const cancel=confirmation.getByRole('button',{name:'Cancelar',exact:true});await expect(cancel).toBeDisabled();await cancel.evaluate((button:HTMLButtonElement)=>button.click());await expect(confirmation).toBeVisible()}
   await page.keyboard.press('Escape');await expect(drawer).toBeVisible()
   if(action==='activate')await expect(drawer.getByLabel('Fecha de firma',{exact:true})).toBeDisabled()
   else if(action==='label')await expect(drawer.getByLabel('Nombre del activo',{exact:true})).toBeDisabled()
   else await expect(drawer.getByRole('combobox',{name:'Responsable autorizado',exact:true})).toBeDisabled()
   const retry=scope.getByRole('button',{name:'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
   await page.screenshot({path:info.outputPath('portfolio-editor-'+action+'-'+mode+'-'+width+'.png')});await retry.click();await expect.poll(()=>commands.length).toBe(2)
   expect(commands[0].operation).toBe(operation);expect(commands[1]).toEqual(commands[0]);expect(commands[0].input.expected_version).toBe(1);await expect(drawer).toHaveCount(0);expect(record.version).toBe(2)
  }
  expect(commands[0].operation).toBe(operation)
  if(action==='label')expect(commands[0].input.display_name).toBe('Nombre sintético actualizado')
  else if(action==='assignment')expect(commands[0].input.assigned_user_id).toBe(assignee)
  else expect(commands[0].input.signed_date).toBe('2026-10-01')
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({action,mode,width,commands,synthetic_record:record,errors},null,2));await page.close();await fixture.close()}
})

for(const mode of ['parent_denied','parent_invalid','parent_lost'] as const)for(const width of [390,768,1440])test('portfolio passive '+mode+' remains closable without write intent at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),id='60000000-0000-4000-8000-000000000001',parent='80000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
 const commands:unknown[]=[],errors:string[]=[];let parentReads=0
 const service={id,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Servicio sintético sin intento de escritura',activated_on:null,ended_on:null,status_effective_on:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands'))commands.push(q)
  if(q.operation==='portfolio.get'){
   if(q.input.kind==='contract'){
    parentReads++
    if(mode==='parent_lost'){await route.abort('failed');return}
    if(mode==='parent_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
    await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:null}}});return
   }
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'service',record:service}}});return
  }
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id+'&portfolio_kind=service')
  const drawer=page.getByRole('dialog',{name:'Servicio: Servicio',exact:true});await expect(drawer).toBeVisible();await expect.poll(()=>parentReads).toBeGreaterThan(0)
  const message=mode==='parent_denied'?'No tienes permiso para esta acción.':mode==='parent_lost'?'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.':'No se pudo completar la acción.'
  await expect.poll(()=>drawer.getByRole('alert').allTextContents()).toContain(message)
  const close=drawer.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeEnabled()
  await drawer.getByLabel('Fecha efectiva',{exact:true}).fill('2026-10-01')
  await expect(drawer.getByRole('button',{name:'Guardar cambio',exact:true})).toBeDisabled()
  await page.screenshot({path:info.outputPath('portfolio-passive-'+mode+'-'+width+'.png')})
  await close.click();await expect(drawer).toHaveCount(0);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,parentReads,commands,errors},null,2));await page.close();await fixture.close()}
})
