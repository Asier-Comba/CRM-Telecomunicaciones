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
for(const operation of ['customer.update','contact.create','customer.archive'] as const)for(const stage of ['retired','current'] as const)for(const width of [390,768,1440])test(`customer command ${operation} ${stage} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,updated=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation===operation){
   commands.push(q);if(stage==='retired'){held=true;await gate}updated=true
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation,command_id:q.input.command_id,id:operation==='contact.create'?id(100):id(1),version:operation==='contact.create'?1:2,status:operation==='customer.archive'?'archived':'active'}}});return
  }
  reads.push(q)
  const n=q.operation==='customer.list'?Number(q.input.after_id.slice(-12))+1:Number((q.input.customer_id??q.input.id??id(1)).slice(-12))
  if(q.operation==='customer.editor'){const e=editor(n);await reply(route,n===1&&updated?{...e,version:2,...(operation==='customer.update'?{legal_name:'Cliente actualizado'}:{}),...(operation==='customer.archive'?{status:'archived'}:{})}:e);return}
  if(q.operation==='contact.list'||q.operation==='assignee.list'){await reply(route,{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.list'){await reply(route,{contract_version:'telecom.collections.v1',operation:q.operation,items:[row(n)],next_id:null});return}
  if(q.operation==='customer360.summary'){await reply(route,summary(n));return}
  if(q.operation==='telecom.attention'){await reply(route,{...attention(n),items:[]});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail')
  await expect(page.getByRole('heading',{name:name(1),exact:true})).toBeVisible()
  if(operation==='customer.update'){
   await page.getByRole('button',{name:'Editar cliente',exact:true}).click()
   await page.getByRole('dialog').getByLabel('Razón social',{exact:true}).fill('Cliente actualizado')
   await page.getByRole('button',{name:'Guardar cliente',exact:true}).click()
  }else if(operation==='contact.create'){
   await page.getByRole('button',{name:'Añadir contacto',exact:true}).click()
   await page.getByLabel('Nombre del contacto',{exact:true}).fill('Contacto actualizado')
   await page.getByRole('button',{name:'Guardar contacto',exact:true}).click()
  }else{
   await page.getByRole('button',{name:'Archivar cliente',exact:true}).click()
   await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click()
  }
  if(stage==='retired'){
   await expect.poll(()=>held).toBe(true)
   const before=reads.filter(q=>q.operation==='customer.editor'&&q.input.id===id(1)).length
   await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).dispatchEvent('click')
   await expect(page.getByRole('heading',{name:name(2),exact:true})).toBeVisible()
   const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation===operation)
   release();await (await response).finished();await page.waitForLoadState('networkidle')
   // customerSaveIntent retains its mandatory confirmed-write verification.
   expect(reads.filter(q=>q.operation==='customer.editor'&&q.input.id===id(1))).toHaveLength(before+(operation==='customer.update'?1:0))
   await expect(page.getByRole('heading',{name:name(2),exact:true})).toBeVisible()
   await expect(page.getByText('Cliente guardado.',{exact:true})).toHaveCount(0)
  }else{
   await expect(page.getByRole('dialog')).toHaveCount(0)
   await expect(page.getByRole('heading',{name:operation==='customer.update'?'Cliente actualizado':name(1),exact:true})).toBeVisible()
   await expect.poll(()=>reads.filter(q=>q.operation==='customer.editor'&&q.input.id===id(1)).length).toBe(operation==='customer.update'?3:2)
   if(operation==='customer.archive')await expect(page.getByRole('button',{name:'Restaurar cliente',exact:true})).toBeVisible()
  }
  expect(commands).toHaveLength(1);expect(errors).toEqual([])
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`customer-command-${operation}-${stage}-${width}.png`)})
 }finally{release();await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
