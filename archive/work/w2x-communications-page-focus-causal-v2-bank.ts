import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(p:number,n:number)=>`${p}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const row=(n:number)=>({id:id(2,n),version:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:id(1,1),contact_id:null,last_seq:0,created_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T10:00:00Z',read_version:0,unread:true})
for(const width of [390,768,1440])for(const mode of ['success','denied','chosen','empty'])test(`customer linked communications page focus ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),held:Route[]=[],reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='inbox.list'){if(q.input.after_id){held.push(route);return}await route.fulfill({json:{ok:true,data:{contract_version:'inbox.v1',operation:'inbox.list',items:Array.from({length:20},(_,i)=>row(i+1)),next_id:id(2,20)}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=communications')
  const next=page.getByRole('button',{name:'Más conversaciones',exact:true});await expect(next).toBeEnabled();await expect(page.getByRole('link',{name:'Abrir conversación interna',exact:true})).toHaveCount(20);await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1)
  await expect(page.getByRole('status').filter({hasText:'Consultando conversaciones'})).toContainText('Consultando conversaciones');await expect(page.getByRole('link',{name:'Abrir conversación interna',exact:true})).toHaveCount(0)
  const refresh=page.getByRole('button',{name:'Actualizar comunicaciones',exact:true});if(mode==='chosen')await refresh.focus()
  if(mode==='denied')await held[0].fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_CONVERSATION_BODY'}})
  else await held[0].fulfill({json:{ok:true,data:{contract_version:'inbox.v1',operation:'inbox.list',items:mode==='empty'?[]:[row(21)],next_id:null}}})
  const status=page.getByText('Página 2',{exact:true}),target=mode==='denied'?page.getByRole('alert'):status
  await expect(target).toBeVisible();if(mode==='empty')await expect(page.getByText('No hay conversaciones vinculadas en esta página.',{exact:true})).toBeVisible()
  if(mode==='success'||mode==='chosen'){await expect(page.getByRole('link',{name:'Abrir conversación interna',exact:true})).toHaveCount(1);await expect(page.getByRole('link',{name:'Abrir conversación interna',exact:true})).toHaveAttribute('href','/inbox?id='+id(2,21))}
  const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent,body:document.activeElement===document.body}))
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,reads,commands,unexpected,errors},null,2));await page.screenshot({path:info.outputPath(`communications-page-focus-${mode}-${width}.png`),fullPage:false})
  if(mode==='chosen')await expect(refresh).toBeFocused();else await expect(target).toBeFocused()
  await expect(page.getByText('PRIVATE_CONVERSATION_BODY',{exact:true})).toHaveCount(0);expect(reads).toEqual([{operation:'inbox.list',input:{limit:20}},{operation:'inbox.list',input:{limit:20,after_id:id(2,20)}}]);expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,interaction:'LINKED_CONVERSATION_PAGINATION_FOCUS_AND_CHOSEN_CONTROL',reads,commands,unexpected,errors},null,2))
 }finally{await page.close();await fixture.close()}
})
