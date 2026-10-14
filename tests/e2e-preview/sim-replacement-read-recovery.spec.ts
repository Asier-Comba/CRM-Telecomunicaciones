import {expect,test} from '@playwright/test'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const id=(kind:number,n=1)=>`${kind}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=id(1),operator=id(2),current=id(4),line=id(5),contract=id(6),service=id(7),first=id(4,10),cursor=id(4,29),second=id(4,30)
const sim=(key:string,active=false)=>({id:key,version:1,customer_id:customer,operator_id:operator,kind:'physical',display_label:active?'Synthetic active SIM':key===first?'Synthetic replacement one':'Synthetic replacement two',status:active?'active':'prepared',source:'manual',masked_iccid:'••••123',masked_eid:null,assigned_line_id:active?line:null,activated_at:active?'2026-10-01T12:00:00Z':null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-01T12:00:00Z'})
for(const target of ['first','second'] as const)for(const failure of ['transport','server','denied'] as const)for(const width of [390,768,1440])test(`SIM replacement ${target} page ${failure} recovery at ${width}`,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),requests:Record<string,unknown>[]=[],commands:string[]=[],errors:string[]=[]
 let failed=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON(),reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='sim.get'){await reply({contract_version:'sim.v1',operation,record:sim(current,true)});return}
  if(operation==='sim.history'){await reply({contract_version:'sim.v1',operation,line_id:line,items:[],next_id:null});return}
  if(operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[{id:customer,version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation,record:{id:operator,version:1,code:'synthetic_2',display_name:'Synthetic operator',status:'active',source:'manual'}});return}
  if(operation==='line.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[{id:line,version:1,service_id:service,customer_id:customer,contract_id:contract,operator_id:operator,plan_version_id:null,display_name:'Synthetic line',status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:'••••123',sim_id:current,sim_kind:'physical',sim_status:'active',masked_iccid:'••••123',masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null}],next_id:null});return}
  if(operation==='portfolio.get'){
   const base={id:input.id,version:1,status:'active',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null}
   await reply({contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='contract'?{...base,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}:{...base,contract_id:contract,service_kind:'mobile',display_name:'Synthetic service',activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}});return
  }
  if(operation==='sim.list'){
   requests.push(input)
   const isTarget=target==='first'?!input.after_id:input.after_id===cursor
   if(isTarget&&(!failed||failure==='denied')){failed=true;if(failure==='transport'){await route.abort('failed');return}await route.fulfill({status:failure==='denied'?403:503,json:{ok:false,error:failure==='denied'?'access_denied':'internal_safe'}});return}
   await reply({contract_version:'sim.v1',operation,items:input.after_id?[sim(second)]:Array.from({length:20},(_,i)=>sim(id(4,i+10))),next_id:input.after_id?null:cursor});return
  }
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=sim')
  await expect(page.getByRole('heading',{name:'Synthetic active SIM',exact:true})).toBeVisible()
  const select=page.getByRole('combobox',{name:'SIM/eSIM de sustitución',exact:true}),replace=page.getByRole('button',{name:'Revisar sustitución de SIM/eSIM',exact:true})
  if(target==='second'){await select.selectOption(first);await page.getByRole('button',{name:'Más SIM de sustitución',exact:true}).click()}
  await expect(page.getByRole('alert')).toHaveText(failure==='denied'?'No tienes permiso para esta acción.':failure==='transport'?'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.':'No se pudo completar la acción.')
  await expect(select).toBeDisabled()
  const retry=page.getByRole('button',{name:'Reintentar SIM de sustitución',exact:true});await expect(retry).toBeEnabled();await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
  const before=requests.length;expect(before).toBe(target==='first'?1:2)
  await page.screenshot({path:info.outputPath(`sim-replacement-${target}-${failure}-${width}.png`)})
  await retry.click();await expect.poll(()=>requests.length).toBe(before+1);expect(requests.at(-1)).toEqual(requests.at(-2))
  expect(requests.at(-1)).toEqual({customer_id:customer,operator_id:operator,status:'prepared',source:'manual',limit:20,...(target==='second'?{after_id:cursor}:{})})
  if(failure==='denied'){await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(select).toBeDisabled();if(target==='first')await expect(replace).toBeDisabled()}
  else{
   await expect(select).toBeEnabled();await expect(page.getByRole('alert')).toHaveCount(0)
   if(target==='second')await expect(select).toHaveValue(first)
   await select.selectOption(target==='first'?first:second);await expect(replace).toBeEnabled()
   await replace.click();await expect(page.getByRole('dialog')).toBeVisible()
  }
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
