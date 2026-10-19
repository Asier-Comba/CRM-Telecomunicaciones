import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const phase of ['command','refresh'] as const)for(const mode of ['reference','company','actor','reader','current'] as const)for(const width of [390,768,1440])test('service command read '+phase+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,written=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const service=(n:number)=>({id:id(4,n),version:1,status:'active',source:'manual',customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'})
 const contract=(n:number)=>({id:id(6,n),version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q)
  const n=Number(String(input.customer_id??input.service_id??input.id??id(1,1)).slice(-12))
  if(operation==='service.installation_set'){
   commands.push(q);if(phase==='command'){held=true;await gate}written=true
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.service_commercial.v1',operation,command_id:input.command_id,id:input.service_id,service_id:input.service_id,service_version:2,version:2,status:'recorded'}}});return
  }
  if(operation==='portfolio.get'){
   if(input.kind==='service'&&n===1&&written&&phase==='refresh'&&!held){held=true;await gate}
   const record=input.kind==='service'?service(n):contract(n);if(input.kind==='service'&&n===1&&written)record.version=2
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:input.kind,record}}});return
  }
  if(operation==='customer.list'){const wanted=Number(String(input.after_id).slice(-12))+1;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:id(1,wanted),version:1,display_name:'Synthetic customer '+wanted,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(['assignee.list','contact.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  if(operation==='service.installation_get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.service_commercial.v1',operation,service_id:id(4,n),service_version:n===1&&written?2:1,service_kind:'fiber',source:'manual',plan_version_id:null,activated_on:'2026-10-01',ended_on:null,installation:{version:n===1&&written?2:1,site_label:n===1&&written?'Updated synthetic site':'Site '+n,location_id:null,installation_contact_id:null,activation_target_on:'2026-10-01',source:'manual'}}}});return}
  if(operation==='service.addon_list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.service_commercial.v1',operation,service_id:id(4,n),as_of:'2026-10-15',items:[],next_id:null}}});return}
  if(operation==='service_location.list'){await route.fulfill({json:{ok:true,data:{contract_version:'service_location.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 let before={services:0,contracts:0,customers:0}
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=service&reset_scope=1');await expect(page.getByLabel('Referencia del lugar',{exact:true})).toHaveValue('Site 1');await page.getByLabel('Referencia del lugar',{exact:true}).fill('Updated synthetic site');await page.getByRole('button',{name:'Revisar instalación',exact:true}).click();await page.getByRole('dialog',{name:'Confirmar cambio del servicio',exact:true}).getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){
   await page.getByRole('button',{name:mode==='reference'?'Seleccionar referencia B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).dispatchEvent('click')
   await expect(page.getByRole('heading',{name:'Synthetic service '+(mode==='reference'?2:1),exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Referencia del lugar',{exact:true})).toHaveValue('Site '+(mode==='reference'?2:1))
  }
  const count=(operation:string,kind?:string)=>reads.filter(q=>q.operation===operation&&(kind?q.input.kind===kind&&q.input.id===id(kind==='service'?4:6,1):q.input.after_id===id(1,0))).length
  before={services:count('portfolio.get','service'),contracts:count('portfolio.get','contract'),customers:count('customer.list')}
  const response=page.waitForResponse(r=>{const q=r.request().postDataJSON();return phase==='command'?q?.operation==='service.installation_set':q?.operation==='portfolio.get'&&q?.input.kind==='service'&&q?.input.id===id(4,1)})
  release();await (await response).finished();await page.waitForLoadState('networkidle')
  if(mode==='current'){
   await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Referencia del lugar',{exact:true})).toHaveValue('Updated synthetic site');expect(count('portfolio.get','service')-before.services).toBe(phase==='command'?1:0);expect(count('portfolio.get','contract')-before.contracts).toBe(1);expect(count('customer.list')-before.customers).toBeGreaterThan(0)
   await page.getByLabel('Referencia del lugar',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('service-command-current-'+phase+'-'+width+'.png')})
  }else{expect(count('portfolio.get','service')-before.services).toBe(0);expect(count('portfolio.get','contract')-before.contracts).toBe(0);expect(count('customer.list')-before.customers).toBe(0)}
  expect(commands).toHaveLength(1);expect(commands[0].input).toMatchObject({service_id:id(4,1),expected_service_version:1,expected_details_version:1,site_label:'Updated synthetic site'});expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({phase,mode,width,before,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
