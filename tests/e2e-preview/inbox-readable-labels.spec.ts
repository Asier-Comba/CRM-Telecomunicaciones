import {expect,test} from '@playwright/test'
import {startInboxContactPaginationFixture} from './fixtures/inbox-contact-pagination-server.cjs'
const threadId=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),userId=(n:number)=>'40000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const mode of ['names','refusal'])for(const width of [390,1440])test(`inbox readable labels ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startInboxContactPaginationFixture(),reads:string[]=[],commands:string[]=[],errors:string[]=[]
 const record=(id:string)=>({id,version:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:userId(2),customer_id:null,contact_id:null,last_seq:1,created_at:'2026-10-13T00:00:00Z',updated_at:'2026-10-13T00:00:00Z',read_version:0,unread:false})
 page.on('pageerror',()=>errors.push('PAGE_ERROR'))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON();reads.push(operation)
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  let data:unknown
  if(operation==='inbox.list')data={contract_version:'inbox.v1',operation,items:[record(threadId(1)),record(threadId(2))],next_id:null}
  else if(operation==='inbox.get_thread')data={contract_version:'inbox.v1',operation,conversation:record(input.id),messages:[{id:'30000000-0000-4000-8000-000000000001',seq:1,kind:'internal_note',body:'Synthetic readable note',actor_user_id:userId(2),created_at:'2026-10-13T00:00:00Z'}],next_seq:null,provider_status:'not_configured'}
  else if(operation==='inbox.unread_summary')data={contract_version:'inbox.v1',operation,unread_count:0}
  else if(operation==='assignee.list'){
   if(mode==='refusal'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   data={contract_version:'telecom.collections.v1',operation,items:[{user_id:userId(1),display_name:'Fixture titular',role:'owner'},{user_id:userId(2),display_name:'Alicia Comercial',role:'member'}],next_id:null}
  }else if(operation==='member.list')data={contract_version:'team.v1',operation,items:[{id:'60000000-0000-4000-8000-000000000001',user_id:userId(2),version:1,role:'member',status:'active'}],next_id:null}
  else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(page.locator('[data-conversation-id]')).toHaveCount(2)
  await expect(page.getByText('Synthetic readable note',{exact:true})).toBeVisible()
  const listText=await page.locator('[data-conversation-id] span').allTextContents()
  await page.screenshot({path:info.outputPath(`inbox-readable-${mode}-${width}.png`),fullPage:true})
  expect(listText.filter(t=>t.startsWith('Conversación'))).toEqual(['Conversación interna 1','Conversación interna 2'])
  if(mode==='names'){
   await expect(page.getByRole('combobox',{name:'Asignar responsable de conversación'})).toContainText('Alicia Comercial')
   await expect(page.getByText('Alicia Comercial · Nota 1',{exact:true})).toBeVisible()
   await expect(page.getByText('Responsable: Alicia Comercial',{exact:true})).toBeVisible()
  }else{
   await expect(page.getByText('Autor registrado · Nota 1',{exact:true})).toBeVisible()
   await expect(page.getByText('Responsable: Nombre no disponible',{exact:true})).toBeVisible()
  }
  const content=await page.getByRole('main').innerText()
  expect(content).not.toContain('10000000');expect(content).not.toContain('40000000')
  expect(reads.filter(op=>op==='assignee.list')).toHaveLength(1);expect(reads).not.toContain('member.list');expect(commands).toEqual([]);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
 }finally{await fixture.close()}
})
