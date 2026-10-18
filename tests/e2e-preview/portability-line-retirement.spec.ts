import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const direction of ['inbound','outbound'] as const)for(const mode of ['retired','closed','current'] as const)for(const width of [390,768,1440])test('portability selected line retirement '+direction+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:unknown[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const line=(n:number)=>({id:id(5,n),version:1,service_id:id(4,n),customer_id:id(1,1),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,display_name:'Synthetic line '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:'••••456',sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(operation==='portability.create'||operation==='identifier.create_manual'){commands.push(q);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='portability.list'){await reply({contract_version:'portability.v1',operation,items:[],next_id:null});return}
  if(operation==='line.list'){
   if(input.limit===1){const n=Number(String(input.after_id).slice(-12))+1;if(n===2){held=true;await gate}await reply({contract_version:'telecom.collections.v1',operation,items:[line(n)],next_id:null})}
   else await reply({contract_version:'telecom.collections.v1',operation,items:[line(1),line(2)],next_id:null});return
  }
  if(operation==='portfolio.get'){
   const n=Number(String(input.id).slice(-12)),base={id:input.id,version:1,status:'active',source:'manual',customer_id:id(1,1),operator_id:id(2,1),plan_version_id:null}
   await reply({contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='contract'?{...base,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}:{...base,contract_id:id(6,n),service_kind:'mobile',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}});return
  }
  if(operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  const operator=(prefix:number)=>({id:id(prefix,1),version:1,code:'synthetic_'+prefix,display_name:'Synthetic operator '+prefix,status:'active',source:'manual'})
  if(operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation,record:operator(Number(String(input.id)[0]))});return}
  if(operation==='operator.list'){const operators=[2,3,8].map(operator);await reply({contract_version:'telecom.collections.v1',operation,items:input.limit===1?operators.filter(o=>o.id>String(input.after_id)).slice(0,1):operators,next_id:null});return}
  if(operation==='identifier.list'){await reply({contract_version:'identifiers.v1',operation,items:[],next_id:null});return}
  if(['assignee.list','contact.list'].includes(operation)){await reply({contract_version:'telecom.collections.v1',operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const parentsB=()=>reads.filter(q=>q.operation==='portfolio.get'&&(q.input.id===id(4,2)||q.input.id===id(6,2)))
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portability-create');await page.getByRole('button',{name:'Nueva portabilidad',exact:true}).click()
  const form=page.getByRole('dialog',{name:'Nueva portabilidad',exact:true}),select=form.getByRole('combobox',{name:'Línea de portabilidad',exact:true}),ready=form.getByRole('button',{name:'Registrar número protegido de la línea',exact:true})
  await form.getByRole('combobox',{name:'Dirección de portabilidad',exact:true}).selectOption(direction);await select.selectOption(id(5,1));await expect(ready).toBeEnabled()
  await select.selectOption(id(5,2));await expect.poll(()=>held).toBe(true);await expect(ready).toBeDisabled();expect(parentsB()).toEqual([])
  if(mode==='retired'){await select.selectOption(id(5,1));await expect(ready).toBeEnabled()}
  if(mode==='closed'){await form.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(form).toHaveCount(0)}
  const response=page.waitForResponse(r=>{const q=r.request().postDataJSON();return q?.operation==='line.list'&&q.input.limit===1&&q.input.after_id===id(5,1)})
  release();await (await response).finished();await page.waitForLoadState('networkidle')
  expect(parentsB()).toHaveLength(mode==='current'?2:0)
  if(mode!=='closed'){await expect(select).toHaveValue(id(5,mode==='current'?2:1));await expect(ready).toBeEnabled();await select.scrollIntoViewIfNeeded()}
  await page.screenshot({path:info.outputPath('portability-line-'+direction+'-'+mode+'-'+width+'.png')});expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({direction,mode,width,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
