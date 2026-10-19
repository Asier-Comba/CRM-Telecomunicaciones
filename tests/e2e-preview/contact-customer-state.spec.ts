import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const status of ['active','inactive','archived'] as const)for(const role of ['owner','viewer'] as const)test(`contacts respect ${status} customer and ${role} UI at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:string[]=[],privateReads:string[]=[]
 const customer={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic contact lifecycle company',trade_name:null,lifecycle:'customer',status,source:'manual',assigned_user_id:null}
 const ordinary={id,version:1,account_kind:customer.account_kind,display_name:customer.legal_name,lifecycle:customer.lifecycle,status,source:'manual',assigned_user_id:null}
 const contact={id:'20000000-0000-4000-8000-000000000001',version:1,customer_id:id,display_name:'Synthetic principal contact',job_title:'Synthetic role',status:'active',is_primary:true,has_email:false,has_phone:false}
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='customer.editor'){await route.fulfill({json:{ok:true,data:customer}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[ordinary],next_id:null}}});return}
  if(q.operation==='contact.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[contact],next_id:null}}});return}
  if(q.operation==='contact.editors'||q.operation==='sensitive.reveal')privateReads.push(q.operation)
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail')
  if(role==='viewer')await page.getByRole('button',{name:'Cambiar a lector sintético',exact:true}).click()
  await expect(page.getByRole('heading',{name:customer.legal_name,exact:true})).toBeVisible()
  await page.getByRole('tab',{name:'Contactos',exact:true}).click()
  const panel=page.getByRole('tabpanel')
  await expect(panel.getByRole('heading',{name:'Synthetic principal contact · Principal',exact:true})).toBeVisible()
  const allowed=status==='active'&&role==='owner'
  await expect(panel.getByRole('button',{name:'Añadir contacto',exact:true})).toHaveCount(allowed?1:0)
  await expect(panel.getByRole('button',{name:'Editar contacto',exact:true})).toHaveCount(allowed?1:0)
  if(allowed){await panel.getByRole('button',{name:'Editar contacto',exact:true}).click();await expect(page.getByLabel('Nombre del contacto',{exact:true})).toHaveValue(contact.display_name);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)}
  expect(commands).toEqual([]);expect(privateReads).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await panel.scrollIntoViewIfNeeded()
  await expect(panel.getByRole('heading',{name:'Synthetic principal contact · Principal',exact:true})).toBeInViewport()
  await page.screenshot({path:info.outputPath(`contacts-${status}-${role}-${width}.png`)})
 }finally{try{if(!page.isClosed()){await page.unrouteAll({behavior:'wait'});await page.close()}}finally{await fixture.close()}}
})
