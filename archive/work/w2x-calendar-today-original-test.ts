import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCalendarSelectionFixture} from './fixtures/calendar-selection-server.cjs'
const boundaries=[{name:'summer',before:'2026-10-15T21:59:00Z',after:'2026-10-15T22:01:00Z',first:'2026-10-15',next:'2026-10-16'},{name:'winter',before:'2026-12-31T22:59:00Z',after:'2026-12-31T23:01:00Z',first:'2026-12-31',next:'2027-01-01'},{name:'leap',before:'2028-02-28T22:59:00Z',after:'2028-02-28T23:01:00Z',first:'2028-02-28',next:'2028-02-29'}]
const offset=(day:string,n:number)=>{const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString()}
for(const width of [390,768,1440])for(const boundary of boundaries)for(const mode of ['current','midnight','refresh'] as const)test('calendar today '+boundary.name+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCalendarSelectionFixture(),calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{const q=route.request().postDataJSON();calls.push(q);if(q.operation==='calendar.list'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[],next:null}}});return}await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})})
 const queries=()=>calls.filter(q=>q.operation==='calendar.list'),expected=mode==='refresh'?offset(boundary.first,-7).slice(0,10):mode==='current'?boundary.first:boundary.next
 try{
  await page.clock.setFixedTime(new Date(boundary.before));await page.setViewportSize({width,height:960});await page.goto(fixture.url);await expect.poll(()=>queries().at(-1)?.input.range_start).toBe(offset(boundary.first,-31));await expect(page.getByRole('button',{name:'Actualizar agenda',exact:true})).toBeEnabled()
  await page.getByRole('combobox',{name:'Estado de agenda',exact:true}).selectOption('pending');await expect.poll(()=>queries().at(-1)?.input.status).toBe('pending');await expect(page.getByRole('button',{name:'Actualizar agenda',exact:true})).toBeEnabled()
  await page.getByRole('button',{name:'Periodo anterior',exact:true}).click();await expect.poll(()=>queries().at(-1)?.input.range_start).toBe(offset(boundary.first,-38));await expect(page.getByRole('button',{name:'Actualizar agenda',exact:true})).toBeEnabled()
  if(mode!=='current')await page.clock.setFixedTime(new Date(boundary.after))
  const before=queries().length;await page.getByRole('button',{name:mode==='refresh'?'Actualizar agenda':'Hoy',exact:true}).click();await expect.poll(()=>queries().length).toBeGreaterThan(before);await expect.poll(()=>queries().at(-1)?.input.range_start).toBe(offset(expected,-31));expect(queries().at(-1)?.input).toMatchObject({range_end:offset(expected,62),status:'pending',limit:100})
  await page.getByRole('button',{name:'Día',exact:true}).click();await expect(page.locator('[data-calendar-day]')).toHaveCount(1);await expect(page.locator('[data-calendar-day]')).toHaveAttribute('data-calendar-day',expected);if(mode!=='refresh')await expect(page.locator('[data-calendar-day]')).toHaveAttribute('aria-current','date')
  await page.getByRole('button',{name:'Hoy',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('calendar-today-'+boundary.name+'-'+mode+'-'+width+'.png')});expect(calls.every(q=>q.operation==='calendar.list')).toBe(true);expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,boundary,calls,errors},null,2));await page.close();await fixture.close()}
})
