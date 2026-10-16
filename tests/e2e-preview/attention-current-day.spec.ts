import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const boundaries=[
 {name:'summer-midnight',before:'2026-10-15T21:59:00Z',after:'2026-10-15T22:01:00Z',oldDay:'2026-10-15',day:'2026-10-16',from:'2026-09-16',to:'2026-11-15'},
 {name:'winter-new-year',before:'2026-12-31T22:59:00Z',after:'2026-12-31T23:01:00Z',oldDay:'2026-12-31',day:'2027-01-01',from:'2026-12-02',to:'2027-01-31'},
 {name:'leap-day',before:'2028-02-28T22:59:00Z',after:'2028-02-28T23:01:00Z',oldDay:'2028-02-28',day:'2028-02-29',from:'2028-01-30',to:'2028-03-30'},
]
for(const width of [390,768,1440])for(const boundary of boundaries)for(const mode of ['clear','refresh'] as const)test('attention current day '+boundary.name+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[];let day=boundary.oldDay
 page.on('pageerror',e=>errors.push(e.message))
 await page.clock.setFixedTime(new Date(boundary.before))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(q.operation==='telecom.attention'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.attention.v1',operation:q.operation,as_of:day,fallback_on:day,items:[],next_cursor:null}}});return}
  if(q.operation==='assignee.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const attention=()=>reads.filter(q=>q.operation==='telecom.attention'),from=page.getByLabel('Atención desde',{exact:true}),to=page.getByLabel('Atención hasta',{exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=attention-context');await expect.poll(()=>attention().length).toBe(1)
  await from.fill('2025-01-01');await to.fill('2025-01-31');await expect.poll(()=>attention().at(-1)?.input.window_from).toBe('2025-01-01');await expect.poll(()=>attention().at(-1)?.input.window_to).toBe('2025-01-31');await page.waitForLoadState('networkidle')
  day=boundary.day;await page.clock.setFixedTime(new Date(boundary.after));const before=attention().length
  await page.getByRole('button',{name:mode==='clear'?'Limpiar filtros':'Actualizar atención',exact:true}).click();await expect.poll(()=>attention().length).toBe(before+1)
  expect(attention().at(-1)!.input).toMatchObject({window_from:mode==='clear'?boundary.from:'2025-01-01',window_to:mode==='clear'?boundary.to:'2025-01-31'})
  await expect(from).toHaveValue(mode==='clear'?boundary.from:'2025-01-01');await expect(to).toHaveValue(mode==='clear'?boundary.to:'2025-01-31')
  await expect(page.getByText('No hay seguimientos en esta ventana con los filtros seleccionados.',{exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('attention-day-'+boundary.name+'-'+mode+'-'+width+'.png')})
  expect(reads.every(q=>q.operation==='telecom.attention'||q.operation==='assignee.list')).toBe(true);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({boundary,mode,width,reads,errors},null,2));await page.close();await fixture.close()}
})
