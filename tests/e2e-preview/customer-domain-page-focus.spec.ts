import {expect,test,type Route} from '@playwright/test'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const row=(n:number)=>({id:id(5,n),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:`Synthetic service ${n}`,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null})
for(const width of [390,768,1440])test(`customer service pagination preserves keyboard focus and chosen control at ${width}`,async({page},info)=>{
 const fixture=await startCustomerDomainFixture(),held:Route[]=[],commands:string[]=[];let hold=true,deny=false
 const reply=(route:Route,second:boolean)=>route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'service.list',items:Array.from({length:second?1:20},(_,i)=>row(i+(second?21:1))),next_id:second?null:id(5,20)}}})
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='service.list'){
   if(deny){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(hold&&q.input.after_id){held.push(route);return}
   await reply(route,!!q.input.after_id);return
  }
  if(q.operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:id(2,1),version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(!q.operation.endsWith('.get')&&!q.operation.endsWith('.list'))commands.push(q.operation)
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  const next=page.getByRole('button',{name:'Siguiente página de Servicios',exact:true});await expect(next).toBeEnabled();await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1)
  await expect(page.locator('[data-domain-id="'+id(5,1)+'"]')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('Cargando servicios')
  hold=false;await reply(held[0],true);const status=page.getByText('Página 2 · 1 registro',{exact:true});await expect(status).toBeVisible();await info.attach('loaded-page-focus',{body:Buffer.from(JSON.stringify(await page.evaluate(()=>({body:document.activeElement===document.body,tag:document.activeElement?.tagName,disabled:document.activeElement instanceof HTMLButtonElement?document.activeElement.disabled:null})))),contentType:'application/json'});await expect(status).toBeFocused();await page.screenshot({path:info.outputPath(`customer-domain-focus-${width}.png`)})
  const previous=page.getByRole('button',{name:'Página anterior de Servicios',exact:true});await previous.click();await expect(page.getByText('Página 1 · 20 registros',{exact:true})).toBeVisible()
  hold=true;await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(2);const refresh=page.getByRole('button',{name:'Actualizar Servicios',exact:true});await refresh.focus();hold=false;await reply(held[1],true);await expect(status).toBeVisible();await expect(refresh).toBeFocused()
  deny=true;await previous.focus();await page.keyboard.press('Enter');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('alert')).toBeFocused();await expect(page.locator('[data-domain-id]')).toHaveCount(0)
  expect(commands).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
