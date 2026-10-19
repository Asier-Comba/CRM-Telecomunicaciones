import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(p:number,n:number)=>`${p}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const service=(n:number)=>({id:id(5,n),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:'Servicio destino '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null})
for(const width of [390,768,1440])for(const mode of ['return_success','return_denied','initial_retry','pending_next'])test(`customer document target read recovery ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),held:Route[]=[],reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[],stages:Record<string,unknown>[]=[];let calls=0
 const reply=(route:Route,second=false)=>route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'service.list',items:Array.from({length:second?1:20},(_,i)=>service(i+(second?21:1))),next_id:second?null:id(5,20)}}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='service.list'){
   calls++;if(calls===1){if(mode==='initial_retry')await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_DESTINATION'}});else await reply(route);return}
   if(q.input.after_id&&mode!=='pending_next'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_DESTINATION'}});return}
   held.push(route);return
  }
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=customer-document-targets');await expect.poll(()=>reads.filter(q=>q.operation==='document.list').length).toBe(1)
  await page.getByRole('combobox',{name:'Destino de documentos del cliente',exact:true}).selectOption('service')
  const select=page.getByRole('combobox',{name:'Registro para documentos del cliente',exact:true}),previous=page.getByRole('button',{name:'Destinos anteriores',exact:true}),next=page.getByRole('button',{name:'Más destinos',exact:true})
  const capture=async(phase:string)=>{stages.push({phase,selectDisabled:await select.isDisabled(),previousDisabled:await previous.isDisabled(),focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,body:document.activeElement===document.body}))});await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,phase,stages,reads,commands,unexpected,errors},null,2));await page.screenshot({path:info.outputPath(`customer-documents-read-${mode}-${width}.png`),fullPage:false})}
  if(mode==='initial_retry'){
   await expect(page.getByRole('alert')).toBeVisible();await expect(previous).toBeDisabled();const retry=page.getByRole('button',{name:'Reintentar destinos',exact:true});await retry.focus();await page.keyboard.press('Enter')
  }else{
   await expect(select.locator('option')).toHaveCount(21);await next.focus();await page.keyboard.press('Enter')
   if(mode!=='pending_next'){await expect(page.getByRole('alert')).toBeVisible();await capture('NEXT_DENIED_BEFORE_PREVIOUS');await expect(previous,'previous destinations remain available after a failed next page').toBeEnabled();await previous.focus();await page.keyboard.press('Enter')}
  }
  await expect.poll(()=>held.length).toBe(1);await expect(select).toBeDisabled();await expect(previous).toBeDisabled();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'Consultando destinos'})).toBeVisible();await capture('PENDING_READ_GUARDS')
  if(mode==='return_denied'){await held[0].fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_DESTINATION'}});await expect(page.getByRole('alert')).toBeVisible();await capture('RETURN_DENIED_BEFORE_FOCUS');await expect(page.getByRole('alert')).toBeFocused();await expect(select).toBeDisabled();await expect(previous).toBeDisabled()}
  else{
   await reply(held[0],mode==='pending_next');await expect(select.locator('option')).toHaveCount(mode==='pending_next'?2:21);await expect(select).toBeEnabled();await capture('RESULT_BEFORE_FOCUS');if(mode!=='pending_next')await expect(select).toBeFocused()
   const chosen=id(5,mode==='pending_next'?21:1);await select.selectOption(chosen);await expect.poll(()=>reads.filter(q=>q.operation==='document.list'&&q.input.target_kind==='service').at(-1)?.input.target_id).toBe(chosen);await expect(previous)[mode==='pending_next'?'toBeEnabled':'toBeDisabled']();await expect(next)[mode==='pending_next'?'toBeDisabled':'toBeEnabled']()
  }
  await expect(page.getByText('PRIVATE_DESTINATION',{exact:true})).toHaveCount(0);const base={customer_id:id(1,1),limit:20},after={...base,after_id:id(5,20)};expect(reads.filter(q=>q.operation==='service.list')).toEqual((mode.startsWith('return_')?[base,after,base]:mode==='initial_retry'?[base,base]:[base,after]).map(input=>({operation:'service.list',input})));expect(reads.filter(q=>q.operation==='document.list')).toHaveLength(mode==='return_denied'?1:2);expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await capture('DESTINATION_READ_RECOVERY_AND_SELECTION_PASS')
 }finally{await page.close();await fixture.close()}
})
