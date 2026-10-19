import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from '../crm-w2x-document-upload-uncertain/tests/e2e-preview/fixtures/commercial-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0'),mask=(n:number)=>'••••'+(100+n),syntheticNumber='+447700900123'
for(const key of ['Escape','Tab'] as const)test('line number nested cancel '+key,async({page},info)=>{
 const mode='uncertain',width=390
 const fixture=await startCommercialResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[],applied=new Set<string>()
 let written=false,effects=0,reject=false
 const contract=(n:number)=>({id:id(6,n),version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null})
 const service=(n:number)=>({id:id(4,n),version:1,status:'active',source:'manual',customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,service_kind:'mobile',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'})
 const line=(n:number)=>({id:id(5,n),version:1,service_id:id(4,n),customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,display_name:'Synthetic line '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:mask(n),sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(operation==='identifier.create_manual'){commands.push(q);if(reject){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return};if(!applied.has(String(input.command_id))){applied.add(String(input.command_id));effects++};written=true;if(mode==='uncertain'&&commands.length===1){await route.abort('failed');return};await reply({contract_version:'identifiers.v1',operation,command_id:input.command_id,id:id(7,2),version:1,status:'active'});return}
  if(operation==='portability.list'){await reply({contract_version:'portability.v1',operation,items:[],next_id:null});return}
  if(operation==='portfolio.get'){await reply({contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='service'?service(1):contract(1)});return}
  if(operation==='line.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[line(1)],next_id:null});return}
  if(operation==='identifier.list'){const item=(n:number,masked_display:string)=>({id:id(7,n),entity_kind:'line',entity_id:id(5,1),identifier_kind:'msisdn',masked_display,status:'active',source:'manual',valid_from:'2026-10-01T12:00:00Z',valid_until:null,version:1});await reply({contract_version:'identifiers.v1',operation,items:written?[item(1,mask(1)),item(2,'••••123')]:[item(1,mask(1))],next_id:null});return}
  if(operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer 1',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  const operator=(prefix:number)=>({id:id(prefix,1),version:1,code:'synthetic_'+prefix,display_name:'Synthetic operator '+prefix,status:'active',source:'manual'})
  if(operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation,record:operator(Number(String(input.id)[0]))});return}
  if(operation==='operator.list'){const operators=[2,3,8].map(operator);await reply({contract_version:'telecom.collections.v1',operation,items:input.limit===1?operators.filter(o=>o.id>String(input.after_id)).slice(0,1):operators,next_id:null});return}
  if(['assignee.list','contact.list'].includes(operation)){await reply({contract_version:'telecom.collections.v1',operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const form=page.getByRole('dialog',{name:'Número protegido de la línea',exact:true}),parent=page.getByRole('dialog',{name:'Nueva portabilidad',exact:true}),modal=page.locator('dialog[aria-describedby]')
 async function open(){await parent.getByRole('button',{name:'Registrar número protegido de la línea',exact:true}).click();await expect(form.getByLabel('Número internacional protegido',{exact:true})).toHaveValue('')}
 async function review(){await open();await form.getByLabel('Número internacional protegido',{exact:true}).fill(syntheticNumber);await form.getByRole('button',{name:'Revisar número protegido',exact:true}).click()}
 let before:unknown,after:unknown,cancelEvents:unknown
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portability-create-lifetime&reset_scope=1');await page.getByRole('button',{name:'Nueva portabilidad',exact:true}).click();await parent.getByRole('combobox',{name:'Línea de portabilidad',exact:true}).selectOption(id(5,1));await expect(parent.getByRole('button',{name:'Registrar número protegido de la línea',exact:true})).toBeEnabled();await review();await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect(modal.getByRole('alert')).toBeVisible();expect(effects).toBe(1);expect(commands).toHaveLength(1)
  await page.evaluate(()=>{const events:unknown[]=[];(window as unknown as {cancelEvents:unknown[]}).cancelEvents=events;document.addEventListener('cancel',e=>{const x={target:(e.target as Element).querySelector('h2')?.textContent,defaultPreventedBefore:e.defaultPrevented,defaultPreventedAfter:false};events.push(x);queueMicrotask(()=>{x.defaultPreventedAfter=e.defaultPrevented})},true)})
  before={parent:await parent.count(),form:await form.count(),modal:await modal.count()};await page.keyboard.press(key);await page.waitForLoadState('networkidle');after={parent:await parent.count(),form:await form.count(),modal:await modal.count()};cancelEvents=await page.evaluate(()=>(window as unknown as {cancelEvents:unknown[]}).cancelEvents)
  await expect(modal).toBeVisible();await expect(form).toBeVisible();await expect(parent).toBeVisible();expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({key,before,after,cancelEvents,effects,commands,errors,scope:'Complementary source87 keyboard event only,not childX or real DB'},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
