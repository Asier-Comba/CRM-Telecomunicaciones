import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const parent='60000000-0000-4000-8000-000000000001',created='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const kind of ['service','line','renewal'] as const)for(const mode of ['confirmed_read_failed','uncertain'] as const)test(`portfolio create ${kind} ${mode} keeps receipt context at ${width}`,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),commands:unknown[]=[],errors:string[]=[],applied=new Set<string>();let mutations=0,failedRead=false
 const parentKind=kind==='line'?'service':'contract',operation=kind==='renewal'?'contract.record_renewal':kind+'.create_manual'
 const base={version:1,source:'manual'}
 const parentRecord=parentKind==='contract'?{...base,id:parent,status:'draft',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null}:{...base,id:parent,status:'pending',customer_id:customer,contract_id:'80000000-0000-4000-8000-000000000001',operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Synthetic parent service',activated_on:null,ended_on:null,status_effective_on:null}
 const createdRecord=kind==='service'?{...base,id:created,status:'pending',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Synthetic new asset',activated_on:null,ended_on:null,status_effective_on:null}:kind==='line'?{...base,id:created,status:'pending',service_id:parent,display_name:'Synthetic new asset',activated_on:null,ended_on:null,status_effective_on:null}:{...base,id:created,status:'open',contract_id:parent,target_on:'2026-11-01',opens_on:null,closes_on:null,reason_code:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation===operation){commands.push(q);if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);mutations++}if(mode==='uncertain'&&commands.length===1){await route.abort('failed');return}await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:q.input.command_id,id:created,version:1,status:kind==='renewal'?'open':'pending',source:'manual'}}});return}
  if(q.operation==='portfolio.get'){
   if(q.input.id===created&&mode==='confirmed_read_failed'&&!failedRead){failedRead=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.id===created?kind:parentKind,record:q.input.id===created?createdRecord:parentRecord}}});return
  }
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+`/?kind=portfolio&portfolio_reference=${parent}&portfolio_kind=${parentKind}`)
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.locator(`article[data-portfolio-id="${parent}"]`).getByRole('button',{name:kind==='line'?'Añadir línea':'Añadir servicio o plazo',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Registrar activo manual',exact:true})
  if(kind==='renewal'){await dialog.getByLabel('Tipo de registro',{exact:true}).selectOption('renewal');await dialog.getByLabel('Fecha de vencimiento',{exact:true}).fill('2026-11-01')}
  else await dialog.getByLabel('Nombre del nuevo activo',{exact:true}).fill('Synthetic new asset')
  await dialog.getByRole('button',{name:'Guardar activo manual',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText(mode==='confirmed_read_failed'?'El alta está registrada.':'No se pudo confirmar el resultado.')
  const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true});await close.evaluate((b:HTMLButtonElement)=>b.click());await expect(dialog).toBeVisible();await expect(close).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Tipo de registro',{exact:true})).toBeDisabled()
  const retry=dialog.getByRole('button',{name:mode==='confirmed_read_failed'?'Consultar el alta registrada':'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`portfolio-create-${kind}-${mode}-${width}.png`)});await retry.click()
  await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(mode==='confirmed_read_failed'?1:2);if(mode==='uncertain')expect(commands[1]).toEqual(commands[0]);expect(mutations).toBe(1)
  await expect(page.locator(`article[data-portfolio-id="${created}"]`)).toBeVisible();expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
