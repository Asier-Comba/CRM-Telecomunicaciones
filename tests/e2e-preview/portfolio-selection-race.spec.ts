import {expect,test,type Route} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'

const id=(n:number)=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer='10000000-0000-4000-8000-000000000001'
const record=(n:number)=>({id:id(n),version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',
  plan_version_id:null,start_date:'2026-10-01',signed_date:`2026-10-0${n}`,end_date:null,assigned_user_id:null})
const reply=(route:Route,n:number)=>route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:record(n)}}})

// Actual components/repository/DTOs and Chromium. Synthetic transport; this does
// not explain the previous actual Auth390 startup timeout or prove SQL/RLS.
for(const width of [390,768,1440])test(`portfolio last requested asset survives a late earlier read at ${width}`,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),counts=new Map<number,number>(),held:Route[]=[],commands:string[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='global.search'){
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[1,2].map(n=>({kind:'contract',id:id(n),customer_id:customer,label:'Asset '+(n===1?'A':'B'),status:'draft'}))}}});return
  }
  if(operation==='portfolio.get'){
   const n=Number(input.id.slice(-12)),count=(counts.get(n)??0)+1;counts.set(n,count)
   if(n===1&&count===2){held.push(route);return}
   await reply(route,n);return
  }
  if(operation==='contract.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return
  }
  if(operation==='customer.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:customer,version:1,display_name:'Synthetic asset customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return
  }
  if(operation==='assignee.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return
  }
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio')
  await page.getByLabel('Consultar cartera local',{exact:true}).fill('Asset')
  await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()
  const asset=(n:number)=>page.locator(`article[data-portfolio-id="${id(n)}"]`)
  await expect(asset(1)).toBeVisible();await expect(asset(2)).toBeVisible()
  await asset(1).getByRole('button',{name:'Ver activo',exact:true}).click();await expect.poll(()=>held.length).toBe(1)
  await asset(2).getByRole('button',{name:'Ver activo',exact:true}).click()
  const current=page.getByRole('dialog',{name:'Contrato: Asset B',exact:true})
  await expect(current).toBeVisible();await current.getByLabel('Fecha de firma',{exact:true}).fill('2026-12-12')
  const response=page.waitForResponse(r=>r.request()===held[0].request())
  await reply(held[0],1);await response
  await expect(current).toBeVisible();await expect(current.getByLabel('Fecha de firma',{exact:true})).toHaveValue('2026-12-12')
  await expect(page.getByRole('dialog',{name:'Contrato: Asset A',exact:true})).toHaveCount(0)
  await page.screenshot({path:info.outputPath('portfolio-current-'+width+'.png')})
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(counts.get(1)).toBe(2);expect(counts.get(2)).toBe(2)
 }finally{await page.close();await fixture.close()}
})
