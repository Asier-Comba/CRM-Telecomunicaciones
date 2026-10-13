import {expect,test,type Route} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
// Actual exported components, repository and strict parsers. Controlled transport
// does not establish Auth, RLS, SQL or permission acceptance.
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const name=(n:number)=>`Synthetic customer ${['A','B','C','D'][n-1]}`
const summary=(n:number)=>({contract_version:'telecom.reads.v1',operation:'customer360.summary',as_of:'2026-10-11',record:{customer_id:id(n),contacts:1,contracts:n*11,services:1,lines:1,renewals:1,permanences:1,opportunities:1,tasks:1,meetings:1,cases:1,documents:1,billing:1,activity:1,portabilities:1,sims:1}})
const row=(n:number)=>({id:id(n),version:1,display_name:name(n),account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
const editor=(n:number)=>{const {display_name,...rest}=row(n);return {contract_version:'product.v1',...rest,legal_name:display_name,trade_name:null}}
const attention=(n:number)=>{const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());return {contract_version:'telecom.attention.v1',operation:'telecom.attention',as_of:today,fallback_on:today,items:[{kind:'case',id:`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`,customer_id:id(n),owner_user_id:null,sort_on:today,due_on:today,status:'open',reason_code:'case_urgent',priority:'urgent'}],next_cursor:null}}
const reply=(route:Route,data:unknown)=>route.fulfill({json:{ok:true,data}})
for(const kind of ['detail','context','overview'] as const)for(const width of [390,768,1440])test(`customer resource ${kind} clears previous state and delayed responses at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),errors:string[]=[],commands:string[]=[]
 const held:Route[]=[],late:Route[]=[];let holdB=true,delayB=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  const n=operation==='customer.list'?Number(input.after_id.slice(-12))+1:Number((input.customer_id??input.id??id(1)).slice(-12))
  if(n===4){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(n===2&&holdB&&['customer.editor','customer.list','customer360.summary','telecom.attention','contact.list'].includes(operation)){held.push(route);return}
  if(n===2&&delayB&&['customer360.summary','telecom.attention'].includes(operation)){late.push(route);return}
  if(operation==='customer.editor'){await reply(route,editor(n));return}
  if(operation==='customer.list'){await reply(route,{contract_version:'telecom.collections.v1',operation,items:[row(n)],next_id:null});return}
  if(operation==='contact.list'){await reply(route,{contract_version:'telecom.collections.v1',operation,items:[{id:`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`,version:1,customer_id:id(n),display_name:`Synthetic contact ${n}`,job_title:null,status:'active',is_primary:true,has_email:false,has_phone:false}],next_id:null});return}
  if(operation==='customer360.summary'){await reply(route,summary(n));return}
  if(operation==='telecom.attention'){await reply(route,attention(n));return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 const overview=page.getByRole('region',{name:'Resumen real del cliente'})
 const count=(n:number)=>overview.getByText(String(n*11),{exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind='+kind)
  await expect(count(1)).toBeVisible();await overview.locator('summary').click();await expect(overview.getByRole('link',{name:'Abrir contexto',exact:true})).toHaveAttribute('href',/20000000-0000-4000-8000-000000000001/)
  if(kind==='detail'){await expect(page.getByText('Synthetic contact 1',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Añadir contacto',exact:true}).click();await page.getByLabel('Nombre del contacto',{exact:true}).fill('Draft for customer A');await page.getByRole('button',{name:'Seleccionar cliente A',exact:true}).dispatchEvent('click');await expect(page.getByLabel('Nombre del contacto',{exact:true})).toHaveValue('Draft for customer A')}
  // The chooser is outside the product dialog; dispatch only this test harness
  // control to simulate a parent prop change without replacing the component.
  await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).dispatchEvent('click')
  await expect.poll(()=>held.length).toBeGreaterThan(0)
  await expect(page.getByText(name(1),{exact:true})).toHaveCount(0)
  await expect(page.getByText('Synthetic contact 1',{exact:false})).toHaveCount(0)
  await expect(count(1)).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Archivar cliente',exact:true})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Abrir contexto',exact:true})).toHaveCount(0)
  holdB=false
  for(const route of held){const {operation}=route.request().postDataJSON();await reply(route,operation==='customer.editor'?editor(2):operation==='customer.list'?{contract_version:'telecom.collections.v1',operation,items:[row(2)],next_id:null}:operation==='customer360.summary'?summary(2):operation==='telecom.attention'?attention(2):{contract_version:'telecom.collections.v1',operation,items:[],next_id:null})}
  await expect(count(2)).toBeVisible()
  if(kind!=='overview')await expect(page.getByRole('heading',{name:name(2),exact:true})).toBeVisible()
  await expect(overview.locator('details')).not.toHaveAttribute('open','')
  delayB=true;await overview.getByRole('button',{name:'Actualizar resumen',exact:true}).click();await expect.poll(()=>late.length).toBe(2)
  if(kind==='detail'){await page.getByRole('button',{name:'Archivar cliente',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()}
  await page.getByRole('button',{name:'Seleccionar cliente C',exact:true}).dispatchEvent('click');await expect(count(3)).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Nombre del contacto',{exact:true})).toHaveCount(0)
  for(const route of late){const response=page.waitForResponse(r=>r.url()===route.request().url()&&r.request().postData()===route.request().postData());await reply(route,route.request().postDataJSON().operation==='customer360.summary'?summary(2):attention(2));await response}
  await expect(count(3)).toBeVisible();await expect(count(2)).toHaveCount(0)
  await page.screenshot({path:info.outputPath(`customer-current-${kind}-${width}.png`)})
  await page.getByRole('button',{name:'Seleccionar cliente D',exact:true}).click()
  await expect(page.getByRole('alert').first()).toBeVisible();await expect(count(3)).toHaveCount(0)
  await expect(page.getByText(name(3),{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Archivar cliente',exact:true})).toHaveCount(0)
  if(kind!=='detail')await expect(page.getByLabel('Avisos de acceso')).not.toHaveText('0')
  expect(commands).toEqual([]);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
