import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
const customer={id,version:1,account_kind:'legal_entity',display_name:'Synthetic case customer',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const record={id,version:1,customer_id:id,contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Synthetic case notes',priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:24,created_at:'2026-10-01T10:00:00.000Z',updated_at:'2026-10-01T10:00:00.000Z',overdue:false}
const note=(seq:number)=>({id:`20000000-0000-4000-8000-${String(seq).padStart(12,'0')}`,seq,body:`Synthetic private note ${seq}`,actor_user_id:'40000000-0000-4000-8000-000000000001',created_at:'2026-10-01T10:00:00.000Z'})

// Actual CaseDetail/CaseNotes/repository/parsers and browser; HTTP is controlled.
// This is not real Auth/DB or a causal explanation of owner151's original fail.
for(const width of [390,768,1440])test(`private note cursor keeps keyboard focus and removes refused content at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture();let release!:()=>void,releasePrevious!:()=>void,waiting=false,previous=false,previousWaiting=false,deny=false
 const held=new Promise<void>(resolve=>release=resolve),inputs:unknown[]=[],commands:string[]=[]
 const previousHeld=new Promise<void>(resolve=>releasePrevious=resolve)
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='case.get'){await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation:q.operation,record}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[customer],next_id:null}}});return}
  if(q.operation==='case.note_list'){
   inputs.push(q.input)
   if(deny){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(q.input.after_seq===20){waiting=true;await held}
   else if(previous){previousWaiting=true;await previousHeld}
   const next=!!q.input.after_seq,items=Array.from({length:next?4:20},(_,i)=>note(i+(next?21:1)))
   await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation:q.operation,case_id:id,items,next_seq:next?null:20}}});return
  }
  if(!q.operation.endsWith('.list')&&!q.operation.endsWith('.get'))commands.push(q.operation)
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=case')
  await page.getByRole('button',{name:'Consultar notas internas',exact:true}).click()
  const drawer=page.getByRole('dialog',{name:'Notas internas de incidencia',exact:true})
  await expect(drawer.locator('[data-case-note-seq]')).toHaveCount(20)
  const next=drawer.getByRole('button',{name:'Más notas internas',exact:true})
  await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>waiting).toBe(true)
  await expect(drawer.locator('[data-case-note-seq]')).toHaveCount(0)
  release();await expect(drawer.locator('[data-case-note-seq]')).toHaveCount(4)
  await expect(drawer.getByText('Página 2 · 4 notas',{exact:true})).toBeFocused()
  expect(inputs).toEqual([{id,limit:20},{id,limit:20,after_seq:20}])
  await expect(next).toBeDisabled()
  await page.screenshot({path:info.outputPath(`case-notes-current-page-${width}.png`)})
  previous=true;await drawer.getByRole('button',{name:'Notas anteriores',exact:true}).click()
  await expect.poll(()=>previousWaiting).toBe(true)
  const close=drawer.getByRole('button',{name:'Cerrar panel',exact:true});await close.focus()
  releasePrevious();await expect(drawer.locator('[data-case-note-seq]')).toHaveCount(20)
  await expect(close).toBeFocused()
  expect(inputs.at(-1)).toEqual({id,limit:20})
  deny=true;await drawer.getByRole('button',{name:'Actualizar notas internas',exact:true}).click()
  await expect(drawer.getByRole('alert')).toBeVisible();await expect(drawer.locator('[data-case-note-seq]')).toHaveCount(0)
  await expect(drawer).not.toContainText('Synthetic private note')
  await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Consultar notas internas',exact:true})).toBeFocused()
  expect(commands).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();releasePrevious();try{if(!page.isClosed()){await page.unrouteAll({behavior:'wait'});await page.close()}}finally{await fixture.close()}}
})
