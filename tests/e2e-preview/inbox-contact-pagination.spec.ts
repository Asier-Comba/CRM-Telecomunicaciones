import {expect,test,type Route} from '@playwright/test'
import {startInboxContactPaginationFixture} from './fixtures/inbox-contact-pagination-server.cjs'

const conversationId='10000000-0000-4000-8000-000000000001'
const customerA='20000000-0000-4000-8000-000000000001',customerB='20000000-0000-4000-8000-000000000002'
const contactId=(n:number)=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const contacts=(customer:string,page:number)=>({contract_version:'product.v1',customer_id:customer,
 items:Array.from({length:page===1?20:1},(_,i)=>({id:contactId(page===1?i+1:21),version:1,display_name:`Synthetic ${customer===customerA?'A':'B'} contact ${page===1?i+1:21}`,job_title:null,email:null,phone:null,is_primary:false,status:'active'})),
 next_id:page===1?contactId(20):null})

for(const mode of ['late_refusal','same_customer_return','one_pending_page','current_refusal_retry'])for(const width of [390,768,1440])test(`inbox contact pagination ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startInboxContactPaginationFixture(),held:Route[]=[],commands:string[]=[],errors:string[]=[]
 const record={id:conversationId,version:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:null,contact_id:null,last_seq:0,created_at:'2026-10-11T09:00:00Z',updated_at:'2026-10-11T09:00:00Z',read_version:0,unread:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  let data:unknown
  if(operation==='inbox.list')data={contract_version:'inbox.v1',operation,items:[record],next_id:null}
  else if(operation==='inbox.get_thread')data={contract_version:'inbox.v1',operation,conversation:record,messages:[],next_seq:null,provider_status:'not_configured'}
  else if(operation==='inbox.unread_summary')data={contract_version:'inbox.v1',operation,unread_count:0}
  else if(operation==='global.search')data={contract_version:'product.v1',items:[customerA,customerB].map((id,i)=>({kind:'customer',id,customer_id:id,label:`Synthetic company ${i===0?'A':'B'}`,status:'active'}))}
  else if(operation==='contact.editors'){
   if(input.after_id){held.push(route);return}
   data=contacts(input.customer_id,1)
  }else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  const context=page.getByRole('complementary',{name:'Contexto de conversación'})
  await expect(context).toBeVisible();await context.getByRole('textbox',{name:'Buscar empresa para agenda'}).fill('Synthetic')
  const customer=context.getByRole('combobox',{name:'Cliente vinculado'}),contact=context.getByRole('combobox',{name:'Contacto de conversación'})
  await expect(customer.locator('option')).toHaveCount(3);await customer.selectOption(customerA)
  await expect(contact.locator('option')).toHaveCount(21)
  const more=context.getByRole('button',{name:'Cargar más contactos'})
  await more.click();await expect.poll(()=>held.length).toBe(1)
  if(mode==='one_pending_page'){
   if(await more.isEnabled())await more.click()
   await expect.poll(()=>held.length).toBe(1)
   await expect(more).toBeDisabled()
  }else if(mode!=='current_refusal_retry'){
   await customer.selectOption(customerB);await expect(contact.locator('option').nth(1)).toHaveText('Synthetic B contact 1')
   if(mode==='same_customer_return'){
    await customer.selectOption(customerA);await expect(contact.locator('option')).toHaveCount(21)
    await expect(contact.locator('option').nth(1)).toHaveText('Synthetic A contact 1')
   }
  }
  let reply=held[0]
  if(mode==='current_refusal_retry'){
   const refused=page.waitForResponse(r=>r.url()===reply.request().url()&&r.request().postData()===reply.request().postData())
   await reply.fulfill({status:403,json:{ok:false,error:'access_denied'}});await (await refused).finished()
   await expect(context.getByRole('alert')).toHaveCount(1);await expect(contact.locator('option')).toHaveCount(21);await expect(more).toBeEnabled()
   await more.click();await expect.poll(()=>held.length).toBe(2);await expect(more).toBeDisabled();reply=held[1]
  }
  const response=page.waitForResponse(r=>r.url()===reply.request().url()&&r.request().postData()===reply.request().postData())
  await reply.fulfill(mode==='late_refusal'?{status:403,json:{ok:false,error:'access_denied'}}:{json:{ok:true,data:contacts(customerA,2)}})
  await (await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(context.getByRole('alert')).toHaveCount(0)
  await expect(contact.locator('option')).toHaveCount(['one_pending_page','current_refusal_retry'].includes(mode)?22:21)
  if(['one_pending_page','current_refusal_retry'].includes(mode))await expect(more).toHaveCount(0)
  else await expect(more).toBeEnabled()
  await contact.selectOption(contactId(1));await expect(contact).toHaveValue(contactId(1))
  expect(commands).toEqual([]);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
  await page.screenshot({path:info.outputPath(`inbox-contact-pagination-${mode}-${width}.png`),fullPage:true})
 }finally{await fixture.close()}
})
