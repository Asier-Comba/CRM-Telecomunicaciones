import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=(n:number)=>({id:id(n),version:1,account_kind:'legal_entity',display_name:'Cliente sintético '+n,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
const record=(n:number)=>({id:id(n),version:1,customer_id:id(n),contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Incidencia sintética '+n,priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-10-01T10:00:00.000Z',updated_at:'2026-10-01T10:00:00.000Z',overdue:false})
for(const stage of ['command','refresh_case','refresh_customer','current','current_denied'] as const)for(const width of [390,768,1440])test(`case command refresh ${stage} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{},updated=false
 const gate=new Promise<void>(resolve=>{release=resolve})
 const retired=stage!=='current'&&stage!=='current_denied'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='case.update'){
   commands.push(q)
   if(stage==='command'){held=true;await gate}
   updated=true
   await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation:q.operation,command_id:q.input.command_id,id:q.input.id,version:2,status:'open',source:'manual',resolution_code:null,cancellation_code:null,note_id:null,note_seq:null}}});return
  }
  reads.push(q)
  if(q.operation==='case.get'){
   const n=q.input.id===id(1)?1:2
   if(n===1&&updated&&stage==='refresh_case'){held=true;await gate}
   if(n===1&&updated&&stage==='current_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation:q.operation,record:{...record(n),...(n===1&&updated?{version:2,title:'Incidencia actualizada'}:{})}}}});return
  }
  if(q.operation==='customer.list'){
   const n=q.input.after_id===id(0)?1:2
   if(n===1&&updated&&stage==='refresh_customer'){held=true;await gate}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[customer(n)],next_id:null}}});return
  }
  if(q.operation==='assignee.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=case')
  await expect(page.getByRole('heading',{name:'Incidencia sintética 1',exact:true})).toBeVisible()
  await page.getByRole('textbox',{name:'Título de incidencia',exact:true}).fill('Incidencia actualizada')
  await page.getByRole('button',{name:'Revisar datos de incidencia',exact:true}).click()
  await page.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
  if(retired){
   await expect.poll(()=>held).toBe(true)
   const beforeCase=reads.filter(q=>q.operation==='case.get'&&q.input.id===id(1)).length
   const beforeCustomer=reads.filter(q=>q.operation==='customer.list'&&q.input.after_id===id(0)).length
   // An external route change may unmount an editor while its modal is busy.
   await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).evaluate((b:HTMLButtonElement)=>b.click())
   await expect(page.getByRole('heading',{name:'Incidencia sintética 2',exact:true})).toBeVisible()
   const op=stage==='command'?'case.update':stage==='refresh_case'?'case.get':'customer.list'
   const response=page.waitForResponse(r=>{const q=r.request().postDataJSON();return q?.operation===op&&(op==='customer.list'?q.input.after_id===id(0):q.input.id===id(1))})
   release();await (await response).finished();await page.waitForLoadState('networkidle')
   expect(reads.filter(q=>q.operation==='case.get'&&q.input.id===id(1))).toHaveLength(beforeCase)
   expect(reads.filter(q=>q.operation==='customer.list'&&q.input.after_id===id(0))).toHaveLength(beforeCustomer)
   await expect(page.getByRole('heading',{name:'Incidencia sintética 2',exact:true})).toBeVisible()
   await expect(page.getByRole('heading',{name:'Incidencia actualizada',exact:true})).toHaveCount(0)
   await expect(page.getByRole('alert')).toHaveCount(0)
  }else if(stage==='current'){
   await expect(page.getByRole('heading',{name:'Incidencia actualizada',exact:true})).toBeVisible()
   await expect(page.getByRole('textbox',{name:'Título de incidencia',exact:true})).toHaveValue('Incidencia actualizada')
   expect(reads.filter(q=>q.operation==='case.get'&&q.input.id===id(1))).toHaveLength(2)
   await expect(page.getByRole('alert')).toHaveCount(0)
  }else{
   await expect(page.getByRole('alert')).toBeVisible()
   await expect(page.getByRole('heading',{name:'Incidencia actualizada',exact:true})).toHaveCount(0)
  }
  expect(commands).toHaveLength(1);expect(commands[0].operation).toBe('case.update')
  expect(commands[0].input).toMatchObject({id:id(1),expected_version:1,title:'Incidencia actualizada'})
  expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath(`case-command-refresh-${stage}-${width}.png`)})
 }finally{
  release();await page.unrouteAll({behavior:'wait'})
  await writeFile(info.outputPath('observations.json'),JSON.stringify({stage,width,held,updated,reads,commands,errors},null,2))
  await page.close();await fixture.close()
 }
})
