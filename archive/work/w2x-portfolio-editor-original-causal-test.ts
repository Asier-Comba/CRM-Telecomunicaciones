import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
for(const action of ['activate','label','assignment'] as const)test('portfolio editor invalid '+action+' retains exact retry identity',async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),id='60000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001',assignee='30000000-0000-4000-8000-000000000001',parent='80000000-0000-4000-8000-000000000001'
 const kind=action==='label'?'service':'contract',operation=action==='activate'?'contract.activate':action==='label'?'service.update_label':'contract.update_allowed_metadata',commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const contract={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
 let record:Record<string,unknown>=kind==='contract'?contract:{id,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Nombre sintético anterior',activated_on:null,ended_on:null,status_effective_on:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(['contract.activate','service.update_label','contract.update_allowed_metadata'].includes(q.operation)){
   commands.push(q)
   if(commands.length===1)record={...record,version:2,...(action==='activate'?{status:'active'}:action==='label'?{display_name:'Nombre sintético actualizado'}:{assigned_user_id:assignee})}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id,version:commands.length===1?0:2,status:record.status,source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.kind,record:q.input.id===id?record:{...contract,id:parent}}}});return}
  if(q.operation==='assignee.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{user_id:assignee,display_name:'Comercial sintético destino',role:'member'}],next_id:null}}});return}
  if(['customer.list','contract.list','service.list','line.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width:390,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id+'&portfolio_kind='+kind)
  const drawer=page.getByRole('dialog',{name:kind==='service'?'Servicio: Servicio':'Contrato: Contrato',exact:true});await expect(drawer).toBeVisible()
  if(action==='activate'){await drawer.getByRole('button',{name:'Activar contrato',exact:true}).click();await page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()}
  else if(action==='label'){await drawer.getByLabel('Nombre del activo',{exact:true}).fill('Nombre sintético actualizado');await drawer.getByRole('button',{name:'Guardar nombre',exact:true}).click()}
  else{await expect(drawer.getByRole('combobox',{name:'Responsable autorizado',exact:true})).toBeEnabled();await drawer.getByRole('combobox',{name:'Responsable autorizado',exact:true}).selectOption(assignee);await drawer.getByRole('button',{name:'Guardar responsable del contrato',exact:true}).click()}
  const confirmation=page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true}),scope=action==='activate'?confirmation:drawer
  await expect(scope.getByRole('alert').filter({hasText:'No se pudo completar la acción.'})).toHaveCount(1)
  const retry=action==='activate'?confirmation.getByRole('button',{name:/^(Confirmar|Reintentar la misma acción)$/}):drawer.locator('button:enabled').filter({hasText:action==='label'?/^(Guardar nombre|Reintentar la misma acción)$/:/^(Guardar responsable del contrato|Reintentar la misma acción)$/})
  await retry.click();await expect.poll(()=>commands.length).toBe(2)
  expect(commands[0].operation).toBe(operation);expect(commands[1]).toEqual(commands[0]);await expect(drawer).toHaveCount(0);expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({action,commands,errors},null,2));await page.close();await fixture.close()}
})
