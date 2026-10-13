import {expect,test} from '@playwright/test'
import {startInboxContactPaginationFixture} from './fixtures/inbox-contact-pagination-server.cjs'

const oldId='10000000-0000-4000-8000-000000000001',newId='10000000-0000-4000-8000-000000000002'
const oldDraft='Synthetic unsaved note for existing conversation A',newDraft='Synthetic first note for new conversation B'
for(const mode of ['cancel_empty','cancel_typed','commit_new'])for(const width of [390,768,1440])test(`inbox draft context ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startInboxContactPaginationFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const record=(id:string)=>({id,version:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:null,contact_id:null,last_seq:id===newId?1:0,created_at:'2026-10-11T09:00:00Z',updated_at:'2026-10-11T09:00:00Z',read_version:0,unread:false})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON();let data:unknown
  if(operation.startsWith('conversation.')||operation==='message.add_internal_note'){
   commands.push({operation,input})
   await route.fulfill({json:{ok:true,receipt:{contract_version:'inbox.v1',operation,command_id:input.command_id,id:newId,version:1,status:'open'}}});return
  }
  if(operation==='inbox.list')data={contract_version:'inbox.v1',operation,items:commands.length?[record(oldId),record(newId)]:[record(oldId)],next_id:null}
  else if(operation==='inbox.get_thread')data={contract_version:'inbox.v1',operation,conversation:record(input.id),messages:input.id===newId?[{id:'30000000-0000-4000-8000-000000000001',seq:1,kind:'internal_note',body:newDraft,actor_user_id:'40000000-0000-4000-8000-000000000001',created_at:'2026-10-11T09:00:00Z'}]:[],next_seq:null,provider_status:'not_configured'}
  else if(operation==='inbox.unread_summary')data={contract_version:'inbox.v1',operation,unread_count:0}
  else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  const note=page.getByRole('textbox',{name:'Nueva nota interna',exact:true})
  await expect(note).toBeVisible();await note.fill(oldDraft)
  const open=page.getByRole('button',{name:'Nueva conversación',exact:true})
  await open.click()
  const dialog=page.getByRole('dialog',{name:'Nueva conversación interna'}),first=dialog.getByRole('textbox',{name:'Primera nota interna'})
  await expect(first).toHaveValue('');await expect(dialog.getByRole('button',{name:'Crear conversación',exact:true})).toBeDisabled()
  if(mode!=='cancel_empty')await first.fill(newDraft)
  if(mode==='commit_new'){
   await dialog.getByRole('button',{name:'Crear conversación',exact:true}).click();await expect(dialog).toHaveCount(0)
   await expect(page.getByText(newDraft,{exact:true})).toBeVisible();await expect(note).toHaveValue('')
   expect(commands).toHaveLength(1);expect(commands[0].operation).toBe('conversation.create_internal');expect(commands[0].input.body).toBe(newDraft)
   expect(commands[0].input).not.toHaveProperty('id');expect(commands[0].input).not.toHaveProperty('expected_version')
  }else{
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
   await expect(note).toHaveValue(oldDraft);expect(commands).toEqual([])
   await expect(open).toBeFocused()
   await open.click();await expect(first).toHaveValue('');await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click()
   await expect(note).toHaveValue(oldDraft)
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
  await page.screenshot({path:info.outputPath(`inbox-draft-context-${mode}-${width}.png`),fullPage:true})
 }finally{await fixture.close()}
})
