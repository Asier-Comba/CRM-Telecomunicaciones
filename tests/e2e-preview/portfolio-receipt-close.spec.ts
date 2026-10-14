import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id='60000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const mode of ['confirmed_read_failed','uncertain'] as const)test(`portfolio ${mode} retains recovery context at ${width}`,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),commands:unknown[]=[],errors:string[]=[]
 let reads=0,applied=false,record={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='contract.activate'){
   commands.push(q);record={...record,version:2,status:'active'};applied=true
   if(mode==='uncertain'&&commands.length===1){await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id,version:2,status:'active',source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){
   reads++;if(mode==='confirmed_read_failed'&&applied&&reads===2){await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record}}});return
  }
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id)
  const drawer=page.getByRole('dialog',{name:'Contrato: Contrato',exact:true});await expect(drawer).toBeVisible()
  await drawer.getByRole('button',{name:'Activar contrato',exact:true}).click()
  const confirmation=page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true})
  await confirmation.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(confirmation.getByRole('alert')).toBeVisible()
  await confirmation.getByRole('button',{name:'Cancelar',exact:true}).evaluate((b:HTMLButtonElement)=>b.click())
  await expect(confirmation).toBeVisible();await expect(confirmation.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(confirmation).toBeVisible()
  await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).evaluate((b:HTMLButtonElement)=>b.click());await expect(drawer).toBeVisible();await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
  await expect(confirmation).toContainText(mode==='confirmed_read_failed'?'El cambio está registrado.':'El resultado está pendiente de confirmar.')
  const retry=confirmation.getByRole('button',{name:mode==='confirmed_read_failed'?'Consultar el cambio registrado':'Reintentar la misma acción',exact:true})
  await page.screenshot({path:info.outputPath(`portfolio-${mode}-${width}.png`)})
  await retry.click();await expect(confirmation).toHaveCount(0);await expect(drawer).toHaveCount(0)
  expect(commands).toHaveLength(mode==='confirmed_read_failed'?1:2);if(mode==='uncertain')expect(commands[1]).toEqual(commands[0])
  await expect(page.locator(`article[data-portfolio-id="${id}"]`).getByText('Activo',{exact:true})).toBeVisible()
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.locator(`article[data-portfolio-id="${id}"]`).getByRole('button',{name:'Ver activo',exact:true}).click();await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(drawer).toHaveCount(0)
 }finally{await page.close();await fixture.close()}
})
