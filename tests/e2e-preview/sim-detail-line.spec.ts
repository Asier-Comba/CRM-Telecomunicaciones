import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
const modes=['reference','company','actor','reader','current'] as const,widths=[390,768,1440]
for(const kind of ['physical','esim'] as const)for(const mode of modes)for(const width of widths)test('SIM detail line context '+kind+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:unknown[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve}),title=(n:number)=>'Synthetic SIM '+kind+' '+n
 const sim=(n:number)=>({id:id(4,n),version:1,customer_id:id(1,n),operator_id:id(2,1),kind,display_label:title(n),status:'active',source:'manual',masked_iccid:'••••123',masked_eid:kind==='esim'?'••••789':null,assigned_line_id:id(5,n),activated_at:'2026-10-01T12:00:00Z',replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-15T12:00:00Z'})
 const line=(n:number)=>({id:id(5,n),version:1,service_id:id(7,n),customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,display_name:'Synthetic line '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:'••••456',sim_id:id(4,n),sim_kind:kind,sim_status:'active',masked_iccid:'••••123',masked_eid:kind==='esim'?'••••789':null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q);const n=Number(String(input.customer_id??input.line_id??input.service_id??input.id??id(1,1)).slice(-12))
  if(operation.startsWith('sim.')&&!['sim.get','sim.list','sim.history'].includes(operation)){commands.push(q);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='sim.get'){await route.fulfill({json:{ok:true,data:{contract_version:'sim.v1',operation,record:sim(n)}}});return}
  if(operation==='sim.list'){await route.fulfill({json:{ok:true,data:{contract_version:'sim.v1',operation,items:[],next_id:null}}});return}
  if(operation==='sim.history'){await route.fulfill({json:{ok:true,data:{contract_version:'sim.v1',operation,line_id:input.line_id,items:[],next_id:null}}});return}
  if(operation==='customer.list'){const wanted=Number(String(input.after_id).slice(-12))+1;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:id(1,wanted),version:1,display_name:'Synthetic customer '+wanted,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(operation==='line.list'){if(n===1&&!held){held=true;await gate}await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[line(n)],next_id:null}}});return}
  if(operation==='portfolio.get'){const base={id:input.id,version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null};await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='contract'?{...base,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}:{...base,contract_id:id(6,n),service_kind:'mobile',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}}}});return}
  if(operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const parents=()=>reads.filter(q=>q.operation==='portfolio.get'&&(q.input.id===id(7,1)||q.input.id===id(6,1)))
 let before=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=sim&reset_scope=1');await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){
   const label=mode==='reference'?'Seleccionar recurso B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético'
   await page.getByRole('button',{name:label,exact:true}).dispatchEvent('click')
   const n=mode==='reference'?2:1,header=page.locator('header').filter({has:page.getByRole('heading',{name:title(n),exact:true})});await expect(header).toContainText('Synthetic customer '+n);await expect(header).toContainText('Synthetic operator')
  }
  before=parents().length
  const response=page.waitForResponse(r=>{const q=r.request().postDataJSON();return q?.operation==='line.list'&&q.input.customer_id===id(1,1)&&q.input.limit===1})
  release();await (await response).finished();await page.waitForLoadState('networkidle');expect(parents().length-before).toBe(mode==='current'?2:0)
  const n=mode==='reference'?2:1,header=page.locator('header').filter({has:page.getByRole('heading',{name:title(n),exact:true})});await expect(header).toContainText('Synthetic customer '+n);await expect(header).toContainText('Synthetic operator');await expect(header).toContainText(kind==='esim'?'eSIM':'SIM física');if(kind==='esim')await expect(header).toContainText('••••789')
  await header.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('sim-detail-line-'+kind+'-'+mode+'-'+width+'.png')});expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({kind,mode,width,before,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
