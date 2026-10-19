import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=(n:number)=>({id:id(n),version:1,display_name:'Empresa '+n,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
for(const width of [390,768,1440])for(const mode of ['success','denied','chosen','filter_supersedes'])test(`customer pagination focus ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),held:Route[]=[],reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 const reply=(route:Route,second:boolean,filtered=false)=>route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'customer.list',items:second?[customer(21)]:filtered?[customer(1)]:Array.from({length:20},(_,n)=>customer(n+1)),next_id:second||filtered?null:id(20)}}})
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='customer.list'){
   if(q.input.after_id){held.push(route);return}
   await reply(route,false,!!q.input.status);return
  }
  if(q.operation==='assignee.list'||q.operation==='operator.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=customers-list')
  await expect(page.getByRole('link',{name:'Empresa 1',exact:true})).toBeVisible()
  const next=page.getByRole('button',{name:'Página siguiente',exact:true});await expect(next).toBeEnabled();await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1)
  await expect(page.locator('[data-customer-id]')).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'Cargando clientes'})).toBeVisible()
  const chosen=page.getByRole('button',{name:'Nuevo cliente',exact:true})
  if(mode==='chosen')await chosen.focus()
  if(mode==='filter_supersedes'){
   if(width<768)await page.getByRole('button',{name:/^Filtros de clientes/}).click()
   await page.getByRole('combobox',{name:'Estado de cliente',exact:true}).selectOption('active')
   await expect(page.getByRole('link',{name:'Empresa 1',exact:true})).toBeVisible()
  }
  const response=page.waitForResponse(r=>r.request()===held[0].request())
  if(mode==='denied')await held[0].fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_PAGE_FAILURE'}})
  else await reply(held[0],true)
  await (await response).finished();await page.waitForLoadState('networkidle')
  const target=mode==='denied'?page.getByRole('alert'):mode==='chosen'?chosen:page.getByRole('status').filter({hasText:mode==='filter_supersedes'?/^Página 1/:/^Página 2/})
  await expect(target).toBeVisible()
  const focus=await page.evaluate(()=>({body:document.activeElement===document.body,tag:document.activeElement?.tagName,role:document.activeElement?.getAttribute('role'),ariaLabel:document.activeElement?.getAttribute('aria-label')}))
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,reads,commands,unexpected,errors},null,2))
  await page.screenshot({path:info.outputPath(`customer-page-focus-${mode}-${width}.png`),fullPage:false})
  if(mode==='filter_supersedes'){
   await expect(target).not.toBeFocused();await expect(page.getByRole('link',{name:'Empresa 21',exact:true})).toHaveCount(0)
   await expect(page.getByRole('combobox',{name:'Estado de cliente',exact:true})).toHaveValue('active')
  }else{
   await expect(target,'pagination completion focuses its result unless another control was chosen').toBeFocused()
   if(mode==='denied'){
    await expect(page.locator('[data-customer-id]')).toHaveCount(0);await expect(page.getByText('PRIVATE_PAGE_FAILURE',{exact:true})).toHaveCount(0)
    const previous=page.getByRole('button',{name:'Página anterior',exact:true});await previous.focus();await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({hasText:/^Página 1/})).toBeFocused();await expect(page.getByRole('link',{name:'Empresa 1',exact:true})).toBeVisible()
   }else await expect(page.getByRole('link',{name:'Empresa 21',exact:true})).toBeVisible()
  }
  expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,interaction:'PAGINATION_FOCUS_AND_SUPERSESSION_PASS',reads,commands,unexpected,errors},null,2))
 }finally{await page.close();await fixture.close()}
})
