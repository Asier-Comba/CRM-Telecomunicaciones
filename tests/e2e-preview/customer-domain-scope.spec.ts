import {expect,test,type Route} from '@playwright/test'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const row=(customer:number,n:number)=>({id:id(5,customer*100+n),version:1,customer_id:id(1,customer),contract_id:id(6,customer),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:`Synthetic customer ${customer} service ${n}`,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null})
type ListInput={customer_id:string;after_id?:string;status?:string;limit:number;sort:string}
const reply=(route:Route,n:number,input:ListInput)=>route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'service.list',items:n===1&&!input.after_id?Array.from({length:20},(_,i)=>row(n,i+1)):[row(n,input.after_id?21:1)],next_id:n===1&&!input.after_id?id(5,120):null}}})
for(const width of [390,768,1440])test(`customer collection retires rows cursor and filter on scope change at ${width}`,async({page},info)=>{
 const fixture=await startCustomerDomainFixture(),commands:string[]=[],errors:string[]=[],reads:ListInput[]=[],held:{route:Route;input:ListInput}[]=[],late:{route:Route;input:ListInput}[]=[]
 let holdB=true,delayA=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='service.list'){
   reads.push(input);const n=Number(input.customer_id.slice(-12))
   if(n===4){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(n===2&&holdB){held.push({route,input});return}
   if(n===1&&delayA){late.push({route,input});return}
   await reply(route,n,input);return
  }
  if(operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(operation==='customer.list'){const n=Number(input.after_id.slice(-12))+1;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:id(1,n),version:1,display_name:`Synthetic customer ${n}`,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 const choose=(name:string)=>page.getByRole('button',{name:`Seleccionar colección ${name}`,exact:true}).dispatchEvent('click')
 const record=(customer:number,n:number)=>page.getByRole('link',{name:`Synthetic customer ${customer} service ${n}`,exact:true}).filter({visible:true})
 const filter=()=>page.getByLabel('Estado de Servicios',{exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(record(1,1)).toBeVisible();await filter().selectOption('active');await expect(record(1,1)).toBeVisible()
  await page.getByRole('button',{name:'Siguiente página de Servicios',exact:true}).click();await expect(record(1,21)).toBeVisible();await expect(page.getByText('Página 2 · 1 registros',{exact:true})).toBeVisible()
  const count=reads.length;await choose('A');await expect(record(1,21)).toBeVisible();await expect(filter()).toHaveValue('active');expect(reads).toHaveLength(count)
  await choose('B');await expect.poll(()=>held.length).toBe(1)
  await expect(record(1,21)).toHaveCount(0);await expect(page.getByRole('status')).toContainText('Cargando servicios');await expect(filter()).toHaveValue('')
  expect(held[0].input).toEqual({customer_id:id(1,2),limit:20,sort:'id_asc'});await expect(page.getByRole('button',{name:'Página anterior de Servicios',exact:true})).toBeDisabled()
  holdB=false;await reply(held[0].route,2,held[0].input);await expect(record(2,1)).toBeVisible();await expect(page.getByText('Página 1 · 1 registros',{exact:true})).toBeVisible()
  delayA=true;await choose('A');await expect.poll(()=>late.length).toBe(1);await choose('C');await expect(record(3,1)).toBeVisible()
  const response=page.waitForResponse(r=>r.request()===late[0].route.request());await reply(late[0].route,1,late[0].input);await response;await expect(record(3,1)).toBeVisible();await expect(record(1,1)).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByText('Synthetic operator',{exact:true}).filter({visible:true})).toBeVisible()
  await page.screenshot({path:info.outputPath(`customer-current-domain-${width}.png`)})
  await choose('D');await expect(page.getByRole('alert')).toBeVisible();await expect(record(3,1)).toHaveCount(0);await expect(page.getByRole('button',{name:'Siguiente página de Servicios',exact:true})).toBeDisabled()
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
