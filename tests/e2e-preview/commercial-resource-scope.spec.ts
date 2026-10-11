import {expect,test,type Route} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
// Real components/repository/closed DTOs, synthetic transport; no Auth/SQL/RLS.
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const day=(n:number)=>`2026-10-${String(n).padStart(2,'0')}`
const mask=(n:number)=>`••••${100+n}`
const title=(kind:string,n:number)=>kind==='portability'?`Portabilidad · ${mask(n)}`:`Synthetic service ${n}`
const contract=(n:number)=>({id:id(6,n),version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null})
const service=(kind:string,n:number)=>({id:id(4,n),version:1,status:'active',source:'manual',customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,service_kind:kind==='portability'?'mobile':'fiber',display_name:title('service',n),activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'})
const line=(n:number)=>({id:id(5,n),version:1,service_id:id(4,n),customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,display_name:`Synthetic line ${n}`,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:mask(n),sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
const portability=(n:number)=>({id:id(4,n),version:1,customer_id:id(1,n),contract_id:id(6,n),service_id:id(4,n),line_id:id(5,n),number_identifier_id:id(7,n),masked_display:mask(n),direction:'inbound',donor_operator_id:id(3,1),target_operator_id:id(2,1),requested_on:day(n),submitted_on:null,scheduled_on:null,started_on:null,completed_on:null,closed_on:null,status:'draft',reason_code:null,owner_user_id:null,source:'manual',created_at:'2026-10-11T12:00:00Z',updated_at:'2026-10-11T12:00:00Z'})
const installation=(n:number)=>({contract_version:'telecom.service_commercial.v1',operation:'service.installation_get',service_id:id(4,n),service_version:1,service_kind:'fiber',source:'manual',plan_version_id:null,activated_on:'2026-10-01',ended_on:null,installation:{version:1,site_label:`Site ${n}`,location_id:null,installation_contact_id:null,activation_target_on:day(n),source:'manual'}})
const reply=(route:Route,data:unknown)=>route.fulfill({json:{ok:true,data}})
for(const kind of ['portability','service'])for(const width of [390,768,1440])test(`commercial ${kind} retires old reference and proposal at ${width}`,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),commands:string[]=[],errors:string[]=[],held:Route[]=[],late:Route[]=[]
 let holdB=true,delayA=false
 const initial=(operation:string,input:{kind?:string})=>kind==='portability'?operation==='portability.get':operation==='portfolio.get'&&input.kind==='service'
 const primaryReply=(route:Route,n:number)=>reply(route,kind==='portability'?{contract_version:'portability.v1',operation:'portability.get',record:portability(n)}:{contract_version:'portfolio.v1',kind:'service',record:service(kind,n)})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  const n=Number((input.customer_id??input.service_id??input.id??id(1,1)).slice(-12))
  if(initial(operation,input)){
   if(n===4){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(n===2&&holdB){held.push(route);return}
   if(n===1&&delayA){late.push(route);return}
   await primaryReply(route,n);return
  }
  if(operation==='portfolio.get'){await reply(route,{contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='contract'?contract(n):service(kind,n)});return}
  if(operation==='customer.list'){const desired=Number(input.after_id.slice(-12))+1;await reply(route,{contract_version:'telecom.collections.v1',operation,items:[{id:id(1,desired),version:1,display_name:`Synthetic customer ${desired}`,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(operation==='line.list'){await reply(route,{contract_version:'telecom.collections.v1',operation,items:input.limit===1?[line(n)]:[],next_id:null});return}
  if(operation==='operator.get'){const prefix=Number(input.id[0]);await reply(route,{contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:`synthetic_${prefix}`,display_name:`Synthetic operator ${prefix}`,status:'active',source:'manual'}});return}
  if(operation==='operator.list'){const operators=[2,3].map(prefix=>({id:id(prefix,1),version:1,code:`synthetic_${prefix}`,display_name:`Synthetic operator ${prefix}`,status:'active',source:'manual'}));await reply(route,{contract_version:'telecom.collections.v1',operation,items:input.limit===1?operators.filter(o=>o.id>input.after_id).slice(0,1):operators,next_id:null});return}
  if(['assignee.list','contact.list'].includes(operation)){await reply(route,{contract_version:'telecom.collections.v1',operation,items:[],next_id:null});return}
  if(operation==='service.installation_get'){await reply(route,installation(n));return}
  if(operation==='service.addon_list'){await reply(route,{contract_version:'telecom.service_commercial.v1',operation,service_id:id(4,n),as_of:'2026-10-11',items:[],next_id:null});return}
  if(operation==='service_location.list'){await reply(route,{contract_version:'service_location.v1',operation,items:[],next_id:null});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 const field=()=>page.getByLabel(kind==='portability'?'Fecha de solicitud de portabilidad':'Referencia del lugar',{exact:true})
 const value=(n:number)=>kind==='portability'?day(n):`Site ${n}`
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind='+kind)
  await expect(page.getByRole('heading',{name:title(kind,1),exact:true})).toBeVisible();await expect(field()).toHaveValue(value(1))
  await field().fill(kind==='portability'?'2026-11-11':'Draft site A');await page.getByRole('button',{name:'Seleccionar referencia A',exact:true}).dispatchEvent('click');await expect(field()).toHaveValue(kind==='portability'?'2026-11-11':'Draft site A')
  await page.getByRole('button',{name:kind==='portability'?'Revisar borrador de portabilidad':'Revisar instalación',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button',{name:'Seleccionar referencia B',exact:true}).dispatchEvent('click');await expect.poll(()=>held.length).toBe(1)
  await expect(page.getByRole('heading',{name:title(kind,1),exact:true})).toHaveCount(0);await expect(field()).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0)
  holdB=false;await primaryReply(held[0],2);await expect(page.getByRole('heading',{name:title(kind,2),exact:true})).toBeVisible();await expect(field()).toHaveValue(value(2));await expect(page.getByRole('dialog')).toHaveCount(0)
  delayA=true;await page.getByRole('button',{name:'Seleccionar referencia A',exact:true}).dispatchEvent('click');await expect.poll(()=>late.length).toBe(1)
  await page.getByRole('button',{name:'Seleccionar referencia C',exact:true}).dispatchEvent('click');await expect(page.getByRole('heading',{name:title(kind,3),exact:true})).toBeVisible();await expect(field()).toHaveValue(value(3))
  const response=page.waitForResponse(r=>r.url()===late[0].request().url()&&r.request().postData()===late[0].request().postData());await primaryReply(late[0],1);await response
  await expect(page.getByRole('heading',{name:title(kind,3),exact:true})).toBeVisible();await expect(field()).toHaveValue(value(3));await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('header').filter({has:page.getByRole('heading',{name:title(kind,3),exact:true})})).toContainText('Synthetic operator 2')
  await page.screenshot({path:info.outputPath(`commercial-current-${kind}-${width}.png`)})
  await page.getByRole('button',{name:'Seleccionar referencia D',exact:true}).dispatchEvent('click');await expect(page.getByRole('alert').first()).toBeVisible();await expect(page.getByRole('heading',{name:title(kind,3),exact:true})).toHaveCount(0);await expect(field()).toHaveCount(0)
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
