import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
const modes=['reference','current'] as const,widths=[390]
for(const mode of modes)for(const width of widths)test('service parent read '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:unknown[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const service=(n:number)=>({id:id(4,n),version:1,status:'active',source:'manual',customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'})
 const contract=(n:number)=>({id:id(6,n),version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q)
  const n=Number(String(input.customer_id??input.service_id??input.id??id(1,1)).slice(-12))
  if(route.request().url().endsWith('/commands')){commands.push(q);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='portfolio.get'){
   if(input.kind==='service'&&n===1&&!held){held=true;await gate}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='service'?service(n):contract(n)}}});return
  }
  if(operation==='customer.list'){const wanted=Number(String(input.after_id).slice(-12))+1;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:id(1,wanted),version:1,display_name:'Synthetic customer '+wanted,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(['assignee.list','contact.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  if(operation==='service.installation_get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.service_commercial.v1',operation,service_id:id(4,n),service_version:1,service_kind:'fiber',source:'manual',plan_version_id:null,activated_on:'2026-10-01',ended_on:null,installation:{version:1,site_label:'Site '+n,location_id:null,installation_contact_id:null,activation_target_on:'2026-10-01',source:'manual'}}}});return}
  if(operation==='service.addon_list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.service_commercial.v1',operation,service_id:id(4,n),as_of:'2026-10-15',items:[],next_id:null}}});return}
  if(operation==='service_location.list'){await route.fulfill({json:{ok:true,data:{contract_version:'service_location.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=service&reset_scope=1');await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){const label=mode==='reference'?'Seleccionar referencia B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético';await page.getByRole('button',{name:label,exact:true}).dispatchEvent('click');if(mode==='reference')await expect(page.getByRole('heading',{name:'Synthetic service 2',exact:true})).toBeVisible()}
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='portfolio.get'&&r.request().postDataJSON()?.input.kind==='service'&&r.request().postDataJSON()?.input.id===id(4,1));release();await (await response).finished();await page.waitForLoadState('networkidle')
  if(mode==='current')await expect(page.getByRole('heading',{name:'Synthetic service 1',exact:true})).toBeVisible()
  const contracts=reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract'&&q.input.id===id(6,1))
  const customers=reads.filter(q=>q.operation==='customer.list'&&q.input.after_id===id(1,0))
  if(mode==='current'){expect(contracts).toHaveLength(1);expect(customers.length).toBeGreaterThan(0);for(const q of customers)expect(q.input.limit).toBe(1)}
  else{expect(contracts).toHaveLength(0);expect(customers).toHaveLength(0)}
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('service-parent-'+mode+'-'+width+'.png')})
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
