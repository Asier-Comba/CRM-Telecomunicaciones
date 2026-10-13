import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
const customer={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic contact recovery company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const contact={id:'20000000-0000-4000-8000-000000000001',version:1,customer_id:id,display_name:'Synthetic recovered contact',job_title:null,status:'active',is_primary:false,has_email:false,has_phone:false}
for(const denied of [false,true])test(`contact read has explicit retry and ${denied?'preserves refusal':'recovers current rows'}`,async({page})=>{
 const fixture=await startCustomerResourceFixture();let contactReads=0;const commands:string[]=[],errors:string[]=[]
 page.on('pageerror',()=>errors.push('PAGE_ERROR'))
 await page.route('**/api/**',async route=>{
  const body=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='customer.editor'){await route.fulfill({json:{ok:true,data:customer}});return}
  if(body.operation==='contact.list'){
   contactReads++;expect(body.input).toEqual({customer_id:id,limit:20,sort:'id_asc'})
   if(contactReads===1){await route.fulfill({status:503,json:{ok:false,error:'unavailable'}});return}
   if(denied){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'contact.list',items:[contact],next_id:null}}});return
  }
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.goto(fixture.url+'/?kind=detail')
  await expect(page.getByRole('heading',{name:customer.legal_name,exact:true})).toBeVisible()
  await expect.poll(()=>contactReads).toBe(1)
  await page.getByRole('button',{name:'Volver a consultar contactos',exact:true}).click()
  await expect.poll(()=>contactReads).toBe(2)
  if(denied){await expect(page.getByText('No tienes permiso para esta acción.',{exact:true})).toBeVisible();await expect(page.getByText(contact.display_name,{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Volver a consultar contactos',exact:true})).toBeVisible()}
  else{await expect(page.getByText(contact.display_name,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Volver a consultar contactos',exact:true})).toHaveCount(0)}
  expect(contactReads).toBe(2);expect(commands).toEqual([]);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
