import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0'),mask=(n:number)=>'••••'+(100+n)
const modes=['reference','company','actor','reader','current','current_outbound'] as const,widths=[390,768,1440]
for(const mode of modes)for(const width of widths)test('portability detail line context '+mode+' at '+width,async({page},info)=>{
 const current=mode.startsWith('current'),outbound=mode==='current_outbound'
 const fixture=await startCommercialResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:unknown[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const contract=(n:number)=>({id:id(6,n),version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null})
 const service=(n:number)=>({id:id(4,n),version:1,status:'active',source:'manual',customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,service_kind:'mobile',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'})
 const line=(n:number)=>({id:id(5,n),version:1,service_id:id(4,n),customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,display_name:'Synthetic line '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:mask(n),sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
 const row=(n:number)=>({id:id(4,n),version:1,customer_id:id(1,n),contract_id:id(6,n),service_id:id(4,n),line_id:id(5,n),number_identifier_id:id(7,n),masked_display:mask(n),direction:outbound?'outbound':'inbound',donor_operator_id:id(outbound?2:3,1),target_operator_id:id(outbound?3:2,1),requested_on:'2026-10-0'+n,submitted_on:null,scheduled_on:null,started_on:null,completed_on:null,closed_on:null,status:'draft',reason_code:null,owner_user_id:null,source:'manual',created_at:'2026-10-15T12:00:00Z',updated_at:'2026-10-15T12:00:00Z'})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q);const n=Number(String(input.customer_id??input.service_id??input.id??id(1,1)).slice(-12))
  if(operation==='portability.update_draft'){commands.push(q);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='portability.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portability.v1',operation,record:row(n)}}});return}
  if(operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='service'?service(n):contract(n)}}});return}
  if(operation==='line.list'){if(n===1&&!held){held=true;await gate}await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[line(n)],next_id:null}}});return}
  if(operation==='customer.list'){const wanted=Number(String(input.after_id).slice(-12))+1;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:id(1,wanted),version:1,display_name:'Synthetic customer '+wanted,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  const operator=(prefix:number)=>({id:id(prefix,1),version:1,code:'synthetic_'+prefix,display_name:'Synthetic operator '+prefix,status:'active',source:'manual'})
  if(operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:operator(Number(String(input.id)[0]))}}});return}
  if(operation==='operator.list'){const operators=(current?[2,3,8]:[2,3]).map(operator);await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:input.limit===1?operators.filter(o=>o.id>String(input.after_id)).slice(0,1):operators,next_id:null}}});return}
  if(['assignee.list','contact.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const parents=()=>reads.filter(q=>q.operation==='portfolio.get'&&(q.input.id===id(4,1)||q.input.id===id(6,1)))
 let before=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portability&reset_scope=1');await expect.poll(()=>held).toBe(true)
  if(!current){
   const label=mode==='reference'?'Seleccionar referencia B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético'
   await page.getByRole('button',{name:label,exact:true}).dispatchEvent('click')
   const header=page.locator('header').filter({has:page.getByRole('heading',{name:'Portabilidad · '+mask(mode==='reference'?2:1),exact:true})})
   await expect(header).toContainText('Synthetic customer '+(mode==='reference'?2:1));await expect(header).toContainText('Synthetic operator 2');await expect(header).toContainText('Synthetic operator 3')
  }
  before=parents().length
  const response=page.waitForResponse(r=>{const q=r.request().postDataJSON();return q?.operation==='line.list'&&q.input.customer_id===id(1,1)&&q.input.limit===1})
  release();await (await response).finished();await page.waitForLoadState('networkidle');expect(parents().length-before).toBe(current?2:0)
  const header=page.locator('header').filter({has:page.getByRole('heading',{name:'Portabilidad · '+mask(mode==='reference'?2:1),exact:true})})
  await expect(header).toContainText('Synthetic customer '+(mode==='reference'?2:1));await expect(header).toContainText('Synthetic operator 2');await expect(header).toContainText('Synthetic operator 3')
  await header.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('portability-detail-line-'+mode+'-'+width+'.png')});expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,before,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
