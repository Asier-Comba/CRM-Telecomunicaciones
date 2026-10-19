import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(p:number,n:number)=>`${p}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const service=(n:number)=>({id:id(5,n),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:'Servicio '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null})
const conversation=(n:number)=>({id:id(2,n),version:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:id(1,1),contact_id:null,last_seq:0,created_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T10:00:00Z',read_version:0,unread:true})
for(const flow of ['services','communications'])for(const width of [390,768,1440])for(const mode of ['failed_next_back','initial_error','pending_next'])test(`collection error previous ${flow} ${mode} at ${width}`,async({page},info)=>{
 const fixture=await (flow==='services'?startCustomerDomainFixture():startCustomerResourceFixture()),held:Route[]=[],reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[];let calls=0
 const operation=flow==='services'?'service.list':'inbox.list',prefix=flow==='services'?5:2
 const reply=(route:Route,second:boolean)=>route.fulfill({json:{ok:true,data:{contract_version:flow==='services'?'telecom.collections.v1':'inbox.v1',operation,items:Array.from({length:second?1:20},(_,i)=>(flow==='services'?service:conversation)(i+(second?21:1))),next_id:second?null:id(prefix,20)}}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation===operation){calls++;if(mode==='initial_error'||q.input.after_id&&mode==='failed_next_back'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_PREVIOUS_PAGE'}});return}if(q.input.after_id||calls===3){held.push(route);return}await reply(route,false);return}
  if(q.operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:id(2,1),version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(flow==='communications'?'/?kind=communications':''))
  const previous=page.getByRole('button',{name:flow==='services'?'Página anterior de Servicios':'Conversaciones anteriores',exact:true}),next=page.getByRole('button',{name:flow==='services'?'Siguiente página de Servicios':'Más conversaciones',exact:true})
  const capture=async(phase:string)=>{const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,body:document.activeElement===document.body}));await writeFile(info.outputPath('observations.json'),JSON.stringify({flow,width,mode,phase,previousDisabled:await previous.isDisabled(),focus,reads,commands,unexpected,errors},null,2));await page.screenshot({path:info.outputPath(`collection-error-back-${flow}-${mode}-${width}.png`),fullPage:false})}
  if(mode==='initial_error'){await expect(page.getByRole('alert')).toBeVisible();await expect(previous).toBeDisabled();await expect(next).toBeDisabled()}
  else{
   await expect(next).toBeEnabled();await next.focus();await page.keyboard.press('Enter')
   if(mode==='failed_next_back'){
    await expect(page.getByRole('alert')).toBeVisible();if(await previous.isDisabled())await capture('DENIED_PAGE_PREVIOUS_DISABLED');await expect(previous,'previous page remains available after a failed next page').toBeEnabled();await previous.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);await expect(previous).toBeDisabled();await expect(page.getByRole('alert')).toHaveCount(0);await reply(held[0],false)
    const status=page.getByText(flow==='services'?'Página 1 · 20 registros':'Página 1',{exact:true});await expect(status).toBeFocused();await expect(previous).toBeDisabled();await expect(next).toBeEnabled()
   }else{
    await expect.poll(()=>held.length).toBe(1);await expect(previous).toBeDisabled();await reply(held[0],true);await expect(previous).toBeEnabled();await expect(next).toBeDisabled();await expect(page.getByText(flow==='services'?'Página 2 · 1 registro':'Página 2',{exact:true})).toBeFocused()
   }
  }
  await expect(page.getByText('PRIVATE_PREVIOUS_PAGE',{exact:true})).toHaveCount(0);const main=reads.filter(q=>q.operation===operation),base=flow==='services'?{customer_id:id(1,1),limit:20,sort:'id_asc'}:{limit:20};expect(main).toEqual((mode==='initial_error'?[base]:mode==='failed_next_back'?[base,{...base,after_id:id(prefix,20)},base]:[base,{...base,after_id:id(prefix,20)}]).map(input=>({operation,input})));expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await capture('PREVIOUS_ERROR_RECOVERY_AND_PENDING_GUARDS_PASS')
 }finally{await page.close();await fixture.close()}
})
