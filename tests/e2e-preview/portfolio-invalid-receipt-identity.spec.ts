import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
test('portfolio invalid service receipt retains exact retry identity',async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),parent='60000000-0000-4000-8000-000000000001',created='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 const parentRecord={id:parent,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null}
 const createdRecord={id:created,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Servicio sintético incierto',activated_on:null,ended_on:null,status_effective_on:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='service.create_manual'){
   commands.push(q);effects.add(q.input.command_id)
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id:created,version:commands.length===1?0:1,status:'pending',source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.id===created?'service':'contract',record:q.input.id===created?createdRecord:parentRecord}}});return}
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width:390,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+parent+'&portfolio_kind=contract')
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.locator('article[data-portfolio-id="'+parent+'"]').getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Registrar activo manual',exact:true})
  await dialog.getByLabel('Nombre del nuevo activo',{exact:true}).fill(createdRecord.display_name)
  await dialog.getByRole('button',{name:'Guardar activo manual',exact:true}).click()
  await expect(dialog.getByRole('alert')).toHaveText('No se pudo completar la acción.')
  await dialog.getByRole('button',{name:/^(Guardar activo manual|Reintentar la misma acción)$/}).click()
  await expect(dialog).toHaveCount(0)
  expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(effects.size).toBe(1);expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({commands,synthetic_effect_ids:[...effects],errors},null,2));await page.close();await fixture.close()}
})
