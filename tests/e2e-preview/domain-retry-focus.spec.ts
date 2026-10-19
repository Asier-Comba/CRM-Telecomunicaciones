import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const row={id:id(5,1),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:'Servicio recuperado',status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null}
for(const width of [390,768,1440])for(const mode of ['success','denied','chosen','empty'])test(`customer service retry outcome focus ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerDomainFixture(),held:Route[]=[],reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[];let calls=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='service.list'){calls++;if(calls===1){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}held.push(route);return}
  if(q.operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:id(2,1),version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(page.getByRole('alert')).toBeVisible();const retry=page.getByRole('button',{name:'Reintentar Servicios',exact:true});await retry.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1)
  await expect(retry).toHaveCount(0);await expect(page.getByRole('status')).toContainText('Cargando servicios');const refresh=page.getByRole('button',{name:'Actualizar Servicios',exact:true});if(mode==='chosen')await refresh.focus()
  if(mode==='denied')await held[0].fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_RETRY_BODY'}})
  else await held[0].fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'service.list',items:mode==='empty'?[]:[row],next_id:null}}})
  const status=page.getByText(mode==='empty'?'Página 1 · 0 registros':'Página 1 · 1 registro',{exact:true}),target=mode==='denied'?page.getByRole('alert'):status
  await expect(target).toBeVisible();if(mode==='empty')await expect(page.getByText('No hay registros de servicios en esta página.',{exact:true})).toBeVisible()
  const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent,body:document.activeElement===document.body}))
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,reads,commands,unexpected,errors},null,2));await page.screenshot({path:info.outputPath(`domain-retry-focus-${mode}-${width}.png`),fullPage:false})
  if(mode==='chosen')await expect(refresh).toBeFocused();else await expect(target).toBeFocused()
  await expect(page.getByText('PRIVATE_RETRY_BODY',{exact:true})).toHaveCount(0);expect(reads.filter(q=>q.operation==='service.list')).toEqual([{operation:'service.list',input:{customer_id:id(1,1),limit:20,sort:'id_asc'}},{operation:'service.list',input:{customer_id:id(1,1),limit:20,sort:'id_asc'}}]);expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,focus,interaction:'RETRY_OUTCOME_FOCUS_WITH_CHOSEN_CONTROL_PRESERVED',reads,commands,unexpected,errors},null,2))
 }finally{await page.close();await fixture.close()}
})
