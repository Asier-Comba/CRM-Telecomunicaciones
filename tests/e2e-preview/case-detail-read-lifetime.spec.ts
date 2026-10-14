import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=(n:number)=>({id:id(n),version:1,account_kind:'legal_entity',display_name:'Cliente sintético '+n,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
const record=(n:number)=>({id:id(n),version:1,customer_id:id(n),contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Incidencia sintética '+n,priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-10-01T10:00:00.000Z',updated_at:'2026-10-01T10:00:00.000Z',overdue:false})
for(const stage of ['case_success','case_denied','customer_success'] as const)for(const width of [390,768,1440])test(`case detail late ${stage} after selection change at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='case.get'){
   if(q.input.id===id(1)&&stage!=='customer_success'&&!held){held=true;await gate}
   if(q.input.id===id(1)&&stage==='case_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation:q.operation,record:record(q.input.id===id(1)?1:2)}}});return
  }
  if(q.operation==='customer.list'){
   const n=q.input.after_id===id(0)?1:2
   if(n===1&&stage==='customer_success'&&!held){held=true;await gate}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[customer(n)],next_id:null}}});return
  }
  if(q.operation==='assignee.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=case')
  await expect.poll(()=>held).toBe(true)
  const before=reads.filter(q=>q.operation==='customer.list'&&q.input.after_id===id(0)).length
  await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Incidencia sintética 2',exact:true})).toBeVisible()
  const operation=stage==='customer_success'?'customer.list':'case.get'
  const response=page.waitForResponse(r=>{
   const q=r.request().postDataJSON()
   return q?.operation===operation&&(operation==='case.get'?q.input.id===id(1):q.input.after_id===id(0))
  })
  release();await (await response).finished();await page.waitForLoadState('networkidle')
  expect(reads.filter(q=>q.operation==='customer.list'&&q.input.after_id===id(0))).toHaveLength(before)
  await expect(page.getByRole('heading',{name:'Incidencia sintética 2',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Incidencia sintética 1',exact:true})).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Consultar notas internas',exact:true})).toBeEnabled()
  expect(commands).toEqual([]);expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath(`case-detail-late-${stage}-${width}.png`)})
 }finally{
  release();await page.unrouteAll({behavior:'wait'})
  await writeFile(info.outputPath('observations.json'),JSON.stringify({stage,width,held,reads,commands,errors},null,2))
  await page.close();await fixture.close()
 }
})
