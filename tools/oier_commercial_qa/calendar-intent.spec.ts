import {expect,test} from '@playwright/test'
import {startCalendarSelectionFixture} from '../../tests/e2e-preview/fixtures/calendar-selection-server.cjs'
const id='50000000-0000-4000-8000-000000000002',day='2026-10-12',at=day+'T09:00:00Z'
let fixture:Awaited<ReturnType<typeof startCalendarSelectionFixture>>
test.beforeAll(async()=>{fixture=await startCalendarSelectionFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['transport','malformed','wrong_receipt','denied','success'] as const)test(`calendar preserves the reviewed intent after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:{command_id:string}}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.clock.setFixedTime(new Date('2026-10-11T22:30:00Z'))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push({operation,input})
   if(commands.length===1){
    if(mode==='transport'){await route.abort('failed');return}
    if(mode==='malformed'){await route.fulfill({status:200,contentType:'application/json',body:'{'});return}
    if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   }
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':input.command_id,id,version:2,status:'pending'}}});return
  }
  if(operation==='calendar.list'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'task',id,version:1,title:'Synthetic reviewed task',status:'pending',customer_id:null,assigned_user_id:null,at,ends_at:null,all_day:false,date:null}],next:null}}});return}
  if(operation==='work.get'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind:'task',record:{id,version:1,status:'pending',customer_id:null,title:'Synthetic reviewed task',due_at:at,priority:'normal',assigned_user_id:null,opportunity_id:null}}}});return}
  if(['customer.list','assignee.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.goto(fixture.url)
  await page.locator(`[data-calendar-id="${id}"]:visible`).first().click()
  const drawer=page.getByRole('dialog',{name:'Detalle de agenda',exact:true}),title=drawer.getByLabel('Título',{exact:true})
  await expect(title).toHaveValue('Synthetic reviewed task')
  await title.fill('Reviewed task title')
  await drawer.getByRole('button',{name:'Guardar agenda',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(mode==='denied'){
   await expect(drawer.getByRole('alert')).toBeVisible();await expect(title).toBeEnabled()
   await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(drawer).toHaveCount(0)
  }else if(mode!=='success'){
   await expect(drawer.getByRole('alert')).toBeVisible()
   await info.attach('unknown-observation',{body:JSON.stringify({mode,commands}),contentType:'application/json'})
   await expect(title).toBeDisabled()
   await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(drawer).toBeVisible()
   await page.keyboard.press('Escape');await expect(drawer).toBeVisible()
   await drawer.getByRole('alert').scrollIntoViewIfNeeded()
   await page.screenshot({path:info.outputPath(`calendar-${mode}-unknown.png`)})
   await drawer.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
   await expect(drawer).toHaveCount(0);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0])
  }else await expect(drawer).toHaveCount(0)
  expect(commands.every(c=>c.operation==='task.update')).toBe(true);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.unrouteAll({behavior:'wait'})}
})
