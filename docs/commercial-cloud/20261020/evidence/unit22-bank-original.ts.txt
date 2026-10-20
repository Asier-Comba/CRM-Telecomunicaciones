import {expect,test} from '@playwright/test'
import {startInboxContactPaginationFixture} from '../../tests/e2e-preview/fixtures/inbox-contact-pagination-server.cjs'
const old='10000000-0000-4000-8000-000000000001',created='10000000-0000-4000-8000-000000000002',body='Nota interna sintética revisada'
let fixture:Awaited<ReturnType<typeof startInboxContactPaginationFixture>>
test.beforeAll(async()=>{fixture=await startInboxContactPaginationFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const action of ['note','create'] as const)for(const mode of ['transport','malformed','wrong_receipt','denied','success'] as const)test(`inbox ${action} preserves reviewed intent after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 const id=action==='create'?created:old
 const record=(value:string)=>({id:value,version:value===id&&effects.size? action==='create'?1:2:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:null,contact_id:null,last_seq:value===id&&effects.size?1:0,created_at:'2026-10-11T09:00:00Z',updated_at:'2026-10-11T09:00:00Z',read_version:0,unread:false})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(['conversation.create_internal','message.add_internal_note'].includes(q.operation)){
   commands.push(q)
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   effects.add(q.input.command_id)
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='malformed'){await route.fulfill({contentType:'application/json',body:'{'});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'inbox.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id,version:action==='create'?1:2,status:'open'}}});return
  }
  if(q.operation==='inbox.list')data={contract_version:'inbox.v1',operation:q.operation,items:action==='create'&&effects.size?[record(old),record(created)]:[record(old)],next_id:null}
  else if(q.operation==='inbox.get_thread')data={contract_version:'inbox.v1',operation:q.operation,conversation:record(q.input.id),messages:q.input.id===id&&effects.size?[{id:'30000000-0000-4000-8000-000000000001',seq:1,kind:'internal_note',body,actor_user_id:'40000000-0000-4000-8000-000000000001',created_at:'2026-10-11T09:00:00Z'}]:[],next_seq:null,provider_status:'not_configured'}
  else if(q.operation==='inbox.unread_summary')data={contract_version:'inbox.v1',operation:q.operation,unread_count:0}
  else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url)
  if(action==='create')await page.getByRole('button',{name:'Nueva conversación',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nueva conversación interna',exact:true})
  const scope=action==='create'?dialog:page
  const field=scope.getByRole('textbox',{name:action==='create'?'Primera nota interna':'Nueva nota interna',exact:true})
  await expect(field).toBeVisible();await field.fill(body)
  await scope.getByRole('button',{name:action==='create'?'Crear conversación':'Guardar nota',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(['transport','malformed','wrong_receipt'].includes(mode)){
   await expect(field).toBeDisabled();await expect(field).toHaveValue(body)
   const retry=scope.getByRole('button',{name:'Comprobar la misma acción',exact:true})
   await expect(retry).toBeEnabled()
   await expect(page.getByRole('button',{name:'Nueva conversación',exact:true,includeHidden:true})).toBeDisabled()
   if(action==='create'){
    await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
   }
   await retry.click();await expect.poll(()=>commands.length).toBe(2)
   expect(commands[1]).toEqual(commands[0])
  }else if(mode==='denied'){
   await expect(field).toBeEnabled();await expect(field).toHaveValue(body)
   expect(effects.size).toBe(0)
  }
  if(mode!=='denied'){
   if(action==='create')await expect(dialog).toHaveCount(0)
   await expect(page.getByText(body,{exact:true})).toBeVisible()
   expect(effects.size).toBe(1)
   expect(commands[0].input.body).toBe(body)
   expect(commands[0].operation).toBe(action==='create'?'conversation.create_internal':'message.add_internal_note')
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`inbox-${action}-${mode}.png`)})
 }finally{await page.close()}
})
