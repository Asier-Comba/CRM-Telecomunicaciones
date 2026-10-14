import {expect,test} from '@playwright/test'
import {startCalendarSelectionFixture} from './fixtures/calendar-selection-server.cjs'
const id='50000000-0000-4000-8000-000000000002',customer='10000000-0000-4000-8000-000000000001',day='2026-10-14'
for(const initial of ['completed','cancelled'] as const)for(const mode of ['transport','invalid','denied'] as const)for(const width of [390,768,1440])test(`agenda reopen ${initial} ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCalendarSelectionFixture(),commands:{operation:string;input:{command_id:string;expected_version:number}}[]=[],applied=new Set<string>(),errors:string[]=[]
 let status:string=initial,version=1,effects=0
 page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(day+'T08:00:00Z'))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push(q);expect(q.operation).toBe('task.reopen')
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);effects++;status='pending';version=2}
   const receipt={contract_version:'product.v1',command_id:q.input.command_id,operation:q.operation,id,version,status}
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='invalid'){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{...receipt,command_id:'70000000-0000-4000-8000-000000000009'}}}:{json:{ok:true,receipt,extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt}});return
  }
  if(q.operation==='work.get'){
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind:'task',record:{id,version,status,customer_id:customer,title:'Synthetic closed task',assigned_user_id:null,opportunity_id:null,due_at:day+'T10:00:00Z',priority:'normal'}}}});return
  }
  if(q.operation==='calendar.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'task',id,version,title:'Synthetic closed task',status,customer_id:customer,assigned_user_id:null,at:day+'T10:00:00Z',ends_at:null,all_day:false,date:null}],next:null}}});return
  }
  if(['assignee.list','customer.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=task&edit=true')
  const dialog=page.getByRole('dialog',{name:'Detalle de agenda',exact:true})
  await expect(dialog.getByRole('button',{name:'Guardar agenda',exact:true})).toBeDisabled()
  await dialog.getByRole('button',{name:'Reabrir tarea',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible()
  if(mode==='denied'){
   await expect(dialog.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(dialog.getByRole('button',{name:'Guardar agenda',exact:true})).toBeDisabled()
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
   expect(commands).toHaveLength(1);expect(effects).toBe(0);expect(errors).toEqual([]);return
  }
  const retry=dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true})
  await expect(retry).toBeEnabled();await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
  await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled();await expect(dialog.getByLabel('Título',{exact:true})).toBeDisabled()
  await expect(dialog.getByRole('button',{name:'Reabrir tarea',exact:true})).toHaveCount(0)
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await page.screenshot({path:info.outputPath(`agenda-reopen-${initial}-${mode}-${width}.png`)})
  await retry.click();await expect(dialog).toHaveCount(0)
  expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(commands[0].input.expected_version).toBe(1);expect(effects).toBe(1)
  await page.locator(`[data-calendar-id="${id}"]:visible`).first().click()
  await expect(dialog.getByRole('button',{name:'Iniciar tarea',exact:true})).toBeEnabled()
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
