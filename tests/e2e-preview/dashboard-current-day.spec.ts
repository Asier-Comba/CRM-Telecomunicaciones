import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const actor='40000000-0000-4000-8000-000000000001'
const scenarios={
 summer:{before:'2026-10-14T21:59:00Z',after:'2026-10-14T22:01:00Z',old:'2026-10-14',current:'2026-10-15'},
 winter:{before:'2026-11-01T22:59:00Z',after:'2026-11-01T23:01:00Z',old:'2026-11-01',current:'2026-11-02'},
 year:{before:'2026-12-31T22:59:00Z',after:'2026-12-31T23:01:00Z',old:'2026-12-31',current:'2027-01-01'},
 denied:{before:'2026-10-14T21:59:00Z',after:'2026-10-14T22:01:00Z',old:'2026-10-14',current:'2026-10-15'},
 same_day:{before:'2026-10-14T10:00:00Z',after:'2026-10-14T11:00:00Z',old:'2026-10-14',current:'2026-10-14'},
} as const
const shift=(day:string,n:number)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)
for(const scenario of Object.keys(scenarios) as (keyof typeof scenarios)[])for(const audience of ['my','workspace'])for(const width of [390,768,1440])test(`dashboard current day ${scenario} ${audience} at ${width}`,async({page},info)=>{
 const dates=scenarios[scenario],fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],errors:string[]=[]
 let refreshed=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.clock.setFixedTime(new Date(dates.before))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='dashboard.get'){
   await route.fulfill({json:{ok:true,data:{contract_version:'product.dashboard.v2',audience:q.input.audience,period:{kind:q.input.period,start:refreshed?dates.current:dates.old,end_exclusive:shift(refreshed?dates.current:dates.old,1)},snapshot_counts:{customers:0,contracts:0,services:0,lines:0,opportunities:0,tasks:0,meetings:0,renewals:0,permanences:0},period_counts:{customers_created:0,tasks_due:0,meetings_scheduled:0,renewals_due:0,permanences_due:0,opportunities_closed:0},recent_activity:[],financial:{currencies:[]},financial_status:'available'}}});return
  }
  if(q.operation==='calendar.list'){
   if(refreshed&&scenario==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   const days=dates.old===dates.current?[dates.old]:[dates.old,dates.current]
   const items=days.map((day,i)=>({kind:'meeting',id:`60000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,version:1,title:'Reunión sintética '+day,status:'scheduled',customer_id:null,assigned_user_id:actor,at:day+'T10:00:00Z',ends_at:day+'T11:00:00Z',all_day:false,date:null}))
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items,next:null}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=dashboard-current-day')
  if(audience==='workspace')await page.getByRole('combobox',{name:'Ámbito del dashboard',exact:true}).selectOption('workspace')
  const refresh=page.getByRole('button',{name:'Actualizar',exact:true})
  await expect(page.getByText('Reunión sintética '+dates.old,{exact:true})).toBeVisible();await expect(refresh).toBeEnabled()
  const before=reads.filter(q=>q.operation==='calendar.list').length
  await page.clock.setFixedTime(new Date(dates.after));refreshed=true;await refresh.click()
  await expect.poll(()=>reads.filter(q=>q.operation==='calendar.list').length).toBeGreaterThan(before)
  await info.attach('calendar-requests-after-refresh',{body:JSON.stringify(reads.filter(q=>q.operation==='calendar.list')),contentType:'application/json'})
  const latest=reads.filter(q=>q.operation==='calendar.list').at(-1)!.input
  expect(latest).toEqual({range_start:shift(dates.current,-7)+'T00:00:00Z',range_end:shift(dates.current,32)+'T00:00:00Z',limit:100,...(audience==='my'?{assigned_user_id:actor}:{})})
  if(scenario==='denied'){
   await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(page.getByText('Reunión sintética '+dates.old,{exact:true})).toHaveCount(0);await expect(page.getByText('Reunión sintética '+dates.current,{exact:true})).toHaveCount(0)
  }else{
   await expect(page.getByText('Reunión sintética '+dates.current,{exact:true})).toBeVisible()
   if(dates.old!==dates.current)await expect(page.getByText('Reunión sintética '+dates.old,{exact:true})).toHaveCount(0)
   await page.getByRole('heading',{name:'Reuniones de hoy',exact:true}).scrollIntoViewIfNeeded()
  }
  await page.screenshot({path:info.outputPath(`dashboard-current-day-${scenario}-${audience}-${width}.png`)})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
