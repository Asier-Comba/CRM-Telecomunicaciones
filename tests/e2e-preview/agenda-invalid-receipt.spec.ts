import {expect,test} from '@playwright/test'
import {startCalendarSelectionFixture} from './fixtures/calendar-selection-server.cjs'
const id='50000000-0000-4000-8000-000000000002',customer='10000000-0000-4000-8000-000000000001',day='2026-10-14'
for(const failure of ['invalid','denied'] as const)for(const width of [390,768,1440])for(const kind of ['task','meeting'] as const)for(const action of ['create','update','complete'] as const)test(`agenda ${kind}.${action} ${failure} receipt recovery at ${width}`,async({page},info)=>{
 const fixture=await startCalendarSelectionFixture(),commands:unknown[]=[],errors:string[]=[];let applied=false
 const operation=`${kind}.${action}`,title=`Synthetic ${kind} ${action}`
 let version=1,status=kind==='task'?'pending':'scheduled',currentTitle='Synthetic original activity'
 page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(day+'T08:00:00Z'))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push(q);expect(q.operation).toBe(operation)
   if(failure==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied){applied=true;version=action==='create'?1:2;status=action==='complete'?'completed':status;currentTitle=action==='complete'?currentTitle:title}
   if(commands.length===1){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{contract_version:'product.v1',command_id:'70000000-0000-4000-8000-000000000009',operation,id,version,status}}}:{json:{ok:true,receipt:{contract_version:'product.v1',command_id:q.input.command_id,operation,id,version,status},extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',command_id:q.input.command_id,operation,id,version,status}}});return
  }
  if(q.operation==='calendar.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:applied?[{kind,id,version,title:currentTitle,status,customer_id:customer,assigned_user_id:null,at:day+'T10:00:00Z',ends_at:kind==='meeting'?day+'T11:00:00Z':null,all_day:false,date:null}]:[],next:null}}});return
  }
  if(q.operation==='work.get'){
   const common={id,version,status,customer_id:customer,title:currentTitle,assigned_user_id:null,opportunity_id:null}
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind,record:{...common,...(kind==='task'?{due_at:day+'T10:00:00Z',priority:'normal'}:{starts_at:day+'T10:00:00Z',ends_at:day+'T11:00:00Z',timezone:'Europe/Madrid',all_day:false,channel:'phone'})}}}});return
  }
  if(['assignee.list','customer.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+`/?kind=${kind}&edit=${action!=='create'}`)
  const dialog=page.getByRole('dialog',{name:action==='create'?'Nueva tarea o reunión':'Detalle de agenda',exact:true});await expect(dialog).toBeVisible()
  if(action==='complete')await dialog.getByRole('button',{name:'Completar',exact:true}).click()
  else{
   await expect(dialog.getByLabel('Título',{exact:true})).toBeEditable();await dialog.getByLabel('Título',{exact:true}).fill(title)
   await dialog.getByLabel(kind==='task'?'Vencimiento':'Inicio',{exact:true}).fill(day+'T12:00')
   if(kind==='meeting')await dialog.getByLabel('Fin',{exact:true}).fill(day+'T13:00')
   await dialog.getByRole('button',{name:action==='update'&&kind==='meeting'?'Reprogramar reunión':'Guardar agenda',exact:true}).click()
  }
  if(failure==='denied'){await expect(dialog.getByRole('alert')).toContainText('No tienes permiso para esta acción.');await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(1);expect(applied).toBe(false);return}
  await expect(dialog.getByRole('alert')).toContainText('No se pudo completar la acción.')
  const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true});await close.evaluate((b:HTMLButtonElement)=>b.click());await expect(dialog).toBeVisible();await expect(close).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Título',{exact:true})).toBeDisabled()
  const retry=dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`agenda-invalid-${operation}-${width}.png`)});await retry.click()
  await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(applied).toBe(true)
  await expect(page.locator(`[data-calendar-id="${id}"]:visible`).first()).toContainText(currentTitle)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
