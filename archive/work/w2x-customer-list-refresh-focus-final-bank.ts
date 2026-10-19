import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=(n:number)=>({id:id(n),version:1,display_name:'Empresa '+n,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
for(const width of [390,768,1440])for(const mode of ['success','denied','chosen','retry_success','filter_supersedes'])test(`customer refresh focus ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),held:Route[]=[],reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 let ordinaryReads=0
 page.on('pageerror',e=>errors.push(e.message))
 const reply=(route:Route,n:number)=>route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'customer.list',items:[customer(n)],next_id:null}}})
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='customer.list'){
   if(q.input.status){await reply(route,3);return}
   ordinaryReads++
   if(ordinaryReads===1){
    if(mode==='retry_success'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_INITIAL_FAILURE'}});return}
    await reply(route,1);return
   }
   if(ordinaryReads===2){held.push(route);return}
   await reply(route,2);return
  }
  if(q.operation==='assignee.list'||q.operation==='operator.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=customers-list')
  if(mode==='retry_success'){
   await expect(page.getByRole('alert')).toBeVisible();const retry=page.getByRole('button',{name:'Reintentar clientes',exact:true});await retry.focus();await page.keyboard.press('Enter')
  }else{
   await expect(page.getByRole('link',{name:'Empresa 1',exact:true})).toBeVisible()
   if(width<768)await page.getByRole('button',{name:/^Filtros de clientes/}).click()
   const refresh=page.getByRole('button',{name:'Actualizar clientes',exact:true});await refresh.focus();await page.keyboard.press('Enter')
  }
  await expect.poll(()=>held.length).toBe(1);await expect(page.locator('[data-customer-id]')).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'Cargando clientes'})).toBeVisible()
  const chosen=page.getByRole('button',{name:'Nuevo cliente',exact:true})
  if(mode==='chosen')await chosen.focus()
  if(mode==='filter_supersedes'){
   const status=page.getByRole('combobox',{name:'Estado de cliente',exact:true});await expect(status).toBeVisible();await status.selectOption('active')
   await expect(page.getByRole('link',{name:'Empresa 3',exact:true})).toBeVisible()
  }
  const response=page.waitForResponse(r=>r.request()===held[0].request())
  if(mode==='denied')await held[0].fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_REFRESH_FAILURE'}})
  else await reply(held[0],2)
  await (await response).finished();await page.waitForLoadState('networkidle')
  const target=mode==='denied'?page.getByRole('alert'):mode==='chosen'?chosen:page.getByRole('status').filter({hasText:/^Página 1/})
  await expect(target).toBeVisible()
  const focus=await page.evaluate(()=>({body:document.activeElement===document.body,tag:document.activeElement?.tagName,role:document.activeElement?.getAttribute('role'),ariaLabel:document.activeElement?.getAttribute('aria-label')}))
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,reads,commands,unexpected,errors},null,2))
  await page.screenshot({path:info.outputPath(`customer-refresh-focus-${mode}-${width}.png`),fullPage:false})
  if(mode==='filter_supersedes'){
   await expect(target).not.toBeFocused();await expect(page.getByRole('link',{name:'Empresa 2',exact:true})).toHaveCount(0);await expect(page.getByRole('combobox',{name:'Estado de cliente',exact:true})).toHaveValue('active')
  }else{
   await expect(target,'refresh/retry completion focuses its outcome unless another control was chosen').toBeFocused()
   if(mode==='denied'){
    await expect(page.locator('[data-customer-id]')).toHaveCount(0);await expect(page.getByText('PRIVATE_REFRESH_FAILURE',{exact:true})).toHaveCount(0)
    const retry=page.getByRole('button',{name:'Reintentar clientes',exact:true});await retry.focus();await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({hasText:/^Página 1/})).toBeFocused();await expect(page.getByRole('link',{name:'Empresa 2',exact:true})).toBeVisible()
   }else await expect(page.getByRole('link',{name:'Empresa 2',exact:true})).toBeVisible()
  }
  expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,interaction:'REFRESH_RETRY_FOCUS_AND_SUPERSESSION_PASS',reads,commands,unexpected,errors},null,2))
 }finally{await page.close();await fixture.close()}
})
