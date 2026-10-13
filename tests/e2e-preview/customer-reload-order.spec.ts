import {expect,test,type Route} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
const editor=(version:number)=>({contract_version:'product.v1',id,version,account_kind:'legal_entity',legal_name:`Synthetic customer revision ${version}`,trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null})
const reply=(route:Route,version:number)=>route.fulfill({json:{ok:true,data:editor(version)}})
// Real components/repository/parsers and Chromium, synthetic transport only.
// Latest denial must not become a customer from an earlier successful read.
for(const denied of [false,true])for(const width of [390,768,1440])test(`customer manual reload supersedes initial ${denied?'denied':'updated'} read at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),held:Route[]=[],commands:string[]=[],errors:string[]=[];let reads=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='customer.editor'){
   reads++;if(reads===1){held.push(route);return}
   if(denied)await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});else await reply(route,2)
   return
  }
  if(operation==='contact.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail')
  await expect.poll(()=>held.length).toBe(1)
  await page.getByRole('button',{name:'Volver a consultar',exact:true}).click();await expect.poll(()=>reads).toBe(2)
  if(denied)await expect(page.getByText('Cliente no disponible',{exact:true})).toBeVisible()
  else await expect(page.getByRole('heading',{name:'Synthetic customer revision 2',exact:true})).toBeVisible()
  const response=page.waitForResponse(r=>r.request()===held[0].request());await reply(held[0],1);await response
  // Flush the fulfilled request's React commit before asserting a negative.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  if(denied){await expect(page.getByText('Cliente no disponible',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Editar cliente',exact:true})).toHaveCount(0)}
  else await expect(page.getByRole('heading',{name:'Synthetic customer revision 2',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Synthetic customer revision 1',exact:true})).toHaveCount(0)
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath(`customer-reload-${denied?'denied':'updated'}-${width}.png`)})
 }finally{await page.close();await fixture.close()}
})
