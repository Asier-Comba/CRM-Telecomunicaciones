import {expect,test} from '@playwright/test'
import {startInboxContactPaginationFixture} from '../../tests/e2e-preview/fixtures/inbox-contact-pagination-server.cjs'
const id='10000000-0000-4000-8000-000000000001',body='Nota sintética pendiente de consulta coherente'
let fixture:Awaited<ReturnType<typeof startInboxContactPaginationFixture>>
test.beforeAll(async()=>{fixture=await startInboxContactPaginationFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['stale','wrong_status','exact','newer','mark_read','mark_unread'] as const)test(`inbox confirmed receipt requires coherent ${mode} readback`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const readMarker=mode.startsWith('mark_')
 let applied=false,corrected=false,readbacks=0
 const record=()=>({id,version:!applied||readMarker||!corrected&&mode==='stale'?1:mode==='newer'?3:2,status:applied&&(mode==='newer'||!corrected&&mode==='wrong_status')?'closed':'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:null,contact_id:null,last_seq:applied&&!readMarker&&(!['stale'].includes(mode)||corrected)?1:0,created_at:'2026-10-11T09:00:00Z',updated_at:'2026-10-11T09:00:00Z',read_version:applied&&readMarker?1:0,unread:mode==='mark_read'?!applied:mode==='mark_unread'?applied:false})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(['message.add_internal_note','conversation.mark_read','conversation.mark_unread'].includes(q.operation)){
   commands.push(q);applied=true
   await route.fulfill({json:{ok:true,receipt:{contract_version:'inbox.v1',operation:q.operation,command_id:q.input.command_id,id,version:readMarker?1:2,status:mode==='mark_read'?'read':mode==='mark_unread'?'unread':'open'}}});return
  }
  if(q.operation==='inbox.list')data={contract_version:'inbox.v1',operation:q.operation,items:[record()],next_id:null}
  else if(q.operation==='inbox.get_thread'){
   if(applied)readbacks++
   const current=record()
   data={contract_version:'inbox.v1',operation:q.operation,conversation:current,messages:current.last_seq?[{id:'30000000-0000-4000-8000-000000000001',seq:1,kind:'internal_note',body,actor_user_id:'40000000-0000-4000-8000-000000000001',created_at:'2026-10-11T09:00:00Z'}]:[],next_seq:null,provider_status:'not_configured'}
  }else if(q.operation==='inbox.unread_summary')data={contract_version:'inbox.v1',operation:q.operation,unread_count:0}
  else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url)
  const field=page.getByRole('textbox',{name:'Nueva nota interna',exact:true})
  await expect(field).toBeVisible()
  if(readMarker)await page.getByRole('button',{name:mode==='mark_read'?'Marcar leído':'Marcar no leído',exact:true}).click()
  else{await field.fill(body);await page.getByRole('button',{name:'Guardar nota',exact:true}).click()}
  await expect.poll(()=>readbacks>0).toBe(true)
  if(['stale','wrong_status'].includes(mode)){
   await info.attach('readback-observation',{body:JSON.stringify({mode,commands,readbacks}),contentType:'application/json'})
   const retry=page.getByRole('button',{name:'Comprobar la misma acción',exact:true})
   await expect(retry).toBeEnabled();await expect(field).toBeDisabled();await expect(field).toHaveValue(body)
   await expect(page.getByRole('status').filter({hasText:'Cambio guardado. La conversación se ha actualizado.'})).toHaveCount(0)
   await page.locator('#main-content').evaluate(el=>{el.scrollTop=0})
   await page.screenshot({path:info.outputPath(`inbox-${mode}-registered.png`)})
   corrected=true;await retry.click()
  }
  await expect(page.getByRole('status').filter({hasText:'Cambio guardado. La conversación se ha actualizado.'})).toBeVisible()
  if(readMarker)await expect(page.getByRole('button',{name:mode==='mark_read'?'Marcar no leído':'Marcar leído',exact:true})).toBeEnabled()
  else await expect(page.getByText(body,{exact:true})).toBeVisible()
  expect(commands).toHaveLength(1)
  expect(commands[0].operation).toBe(readMarker?'conversation.'+mode:'message.add_internal_note')
  expect(commands[0].input.expected_version).toBe(readMarker?0:1)
  expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`inbox-${mode}-coherent.png`)})
 }finally{await page.close()}
})
