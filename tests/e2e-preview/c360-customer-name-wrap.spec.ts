import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'

for(const area of ['header','facts','contacts'] as const)for(const mode of ['company','brand','current'] as const)for(const width of [390,768,1440])test('C360 customer name '+area+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),id='10000000-0000-4000-8000-000000000001',long='Synthetic Empresa '+('X'.repeat(80)),legal=mode==='company'?long:'Synthetic Empresa ordinaria',brand=mode==='brand'?long:null,contactName=mode==='company'?long.replace('Empresa','Contacto'):'Synthetic Contacto ordinario',jobTitle=mode==='brand'?long.replace('Empresa','Cargo'):'Cargo ordinario',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:legal,trade_name:brand,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='contact.list'||q.operation==='assignee.list'){const items=q.operation==='contact.list'&&area==='contacts'?[{id:'20000000-0000-4000-8000-000000000002',version:1,customer_id:id,display_name:contactName,job_title:jobTitle,status:'active',is_primary:true,has_email:false,has_phone:false}]:[];await reply({contract_version:'telecom.collections.v1',operation:q.operation,items,next_id:null});return}
  if(q.operation==='customer360.summary'){await reply({contract_version:'telecom.reads.v1',operation:q.operation,as_of:'2026-10-11',record:{customer_id:id,contacts:1,contracts:1,services:1,lines:1,renewals:1,permanences:1,opportunities:1,tasks:1,meetings:1,cases:1,documents:1,billing:1,activity:1,portabilities:1,sims:1}});return}
  if(q.operation==='telecom.attention'){const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());await reply({contract_version:'telecom.attention.v1',operation:q.operation,as_of:today,fallback_on:today,items:[],next_cursor:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail');const heading=page.getByRole('heading',{name:legal,exact:true,level:1}),header=page.locator('header').filter({has:heading})
  await expect(heading).toBeVisible();if(brand)await expect(header).toContainText(brand)
  if(area==='facts')await page.getByRole('tab',{name:'Empresa',exact:true}).click();if(area==='contacts')await page.getByRole('tab',{name:'Contactos',exact:true}).click();const target=area==='header'?header:area==='facts'?page.getByRole('heading',{name:'Datos de empresa',exact:true}).locator('..'):page.getByRole('heading',{name:'Contactos',exact:true}).locator('../..');await expect(target).toBeVisible();if(area==='facts'){await expect(target).toContainText(legal);if(brand)await expect(target).toContainText(brand)}if(area==='contacts'){await expect(target).toContainText(contactName+' · Principal');await expect(target).toContainText(jobTitle);await expect(target.getByRole('button',{name:'Editar contacto',exact:true})).toBeVisible();await expect(page.locator('[data-sensitive-value]')).toHaveCount(0);expect(calls.some(q=>q.operation==='sensitive.get')).toBe(false)}
  const metrics=await target.evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth,mainWidth:document.getElementById('main-content')!.clientWidth,mainScroll:document.getElementById('main-content')!.scrollWidth}));expect(metrics.scroll).toBeLessThanOrEqual(metrics.width+1);expect(metrics.mainScroll).toBeLessThanOrEqual(metrics.mainWidth+1)
  await expect(header.getByRole('button',{name:'Editar cliente',exact:true})).toBeVisible();await expect(header.getByRole('button',{name:'Archivar cliente',exact:true})).toBeVisible();expect(calls.filter(q=>q.operation==='customer.editor')).toHaveLength(1);expect(calls.some(q=>q.operation.endsWith('.create')||q.operation.endsWith('.update')||q.operation.endsWith('.archive'))).toBe(false);expect(errors).toEqual([])
  await target.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('customer-name-'+area+'-'+mode+'-'+width+'.png')});await writeFile(info.outputPath('metrics.json'),JSON.stringify(metrics,null,2))
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({area,mode,width,legal,brand,contactName,jobTitle,calls,errors},null,2));await page.close();await fixture.close()}
})
