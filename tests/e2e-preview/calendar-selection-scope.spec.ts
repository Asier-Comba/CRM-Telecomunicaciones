import {expect,test,type Route} from '@playwright/test'
import {startCalendarSelectionFixture} from './fixtures/calendar-selection-server.cjs'
import {calendarDate} from '../../src/features/product/model'
const renewalId='40000000-0000-4000-8000-000000000001',taskId='50000000-0000-4000-8000-000000000002'
for(const mode of ['late_success','late_refusal','current_refusal'])for(const width of [390,768,1440])test(`calendar selection ${mode} keeps the latest task at ${width}`,async({page},info)=>{
 const fixture=await startCalendarSelectionFixture(),commands:string[]=[],errors:string[]=[],held:Route[]=[]
 // Deliberate UTC-Sunday/Madrid-Monday boundary; selection semantics must not
 // depend on the host's date or the real midnight while the fixture compiles.
 const now='2026-10-11T22:30:00Z'
 await page.clock.setFixedTime(new Date(now))
 const day=calendarDate(now),at=day+'T09:00:00Z'
 const entries=[{kind:'renewal',id:renewalId,version:null,title:'Synthetic renewal A',status:'open',customer_id:null,assigned_user_id:null,at,ends_at:null,all_day:true,date:day},{kind:'task',id:taskId,version:1,title:'Synthetic task B',status:'pending',customer_id:null,assigned_user_id:null,at,ends_at:null,all_day:false,date:null}]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='calendar.list'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:entries,next:null}}});return}
  if(operation==='portfolio.get'){held.push(route);return}
  if(operation==='work.get'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind:'task',record:{id:taskId,version:1,status:'pending',customer_id:null,title:'Synthetic task B',due_at:at,priority:'normal',assigned_user_id:null,opportunity_id:null}}}});return}
  if(['customer.list','assignee.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url);await expect(page.locator(`[data-calendar-id="${renewalId}"]:visible`).first()).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)
  await page.locator(`[data-calendar-id="${renewalId}"]:visible`).first().click();await expect.poll(()=>held.length).toBe(1)
  const response=page.waitForResponse(r=>r.url()===held[0].request().url()&&r.request().postData()===held[0].request().postData())
  if(mode==='current_refusal'){
   await held[0].fulfill({status:503,json:{ok:false,error:'unavailable'}});await (await response).finished();await expect(page.getByRole('alert')).toBeVisible()
  }
  await page.locator(`[data-calendar-id="${taskId}"]:visible`).first().click();await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByLabel('Título',{exact:true})).toHaveValue('Synthetic task B')
  if(mode==='late_success')await held[0].fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'renewal',record:{id:renewalId,version:1,status:'open',source:'manual',contract_id:'60000000-0000-4000-8000-000000000001',target_on:day,opens_on:null,closes_on:null,reason_code:null}}}})
  else if(mode==='late_refusal')await held[0].fulfill({status:503,json:{ok:false,error:'unavailable'}})
  await (await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByRole('heading',{name:'Synthetic renewal A',exact:true})).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByLabel('Título',{exact:true})).toHaveValue('Synthetic task B')
  await page.screenshot({path:info.outputPath(`calendar-current-selection-${mode}-${width}.png`)})
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
