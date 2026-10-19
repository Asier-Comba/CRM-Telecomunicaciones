import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
for(const width of [1280,1440,1920])for(const mode of ['long','ordinary'])test(`customer service table title ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerDomainFixture(),reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 const title=mode==='long'?'Servicio'+'X'.repeat(152):'Servicio de empresa'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='service.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(5,1),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:title,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null}],next_id:null}}});return
  }
  if(q.operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:id(2,1),version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  const table=page.getByRole('table'),link=table.getByRole('link',{name:title,exact:true}),operator=table.getByText('Synthetic operator',{exact:true})
  await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','/services/'+id(5,1));await expect(operator).toBeVisible()
  const geometry=await table.evaluate(el=>{const s=el.parentElement!,v=s.getBoundingClientRect(),t=el.getBoundingClientRect(),c=el.querySelector('tbody td')!.getBoundingClientRect();return{viewportLeft:v.left,viewportRight:v.right,client:s.clientWidth,scroll:s.scrollWidth,tableWidth:t.width,firstCellWidth:c.width,documentWidth:document.documentElement.scrollWidth,windowWidth:innerWidth}})
  const titleBox=await link.boundingBox(),operatorBox=await operator.boundingBox()
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,titleLength:title.length,geometry,titleBox,operatorBox,reads,commands,unexpected,errors},null,2))
  await page.screenshot({path:info.outputPath(`customer-service-table-title-${mode}-${width}.png`),fullPage:false})
  await expect(operator,'short operator field remains available beside the complete record name').toBeInViewport({ratio:0.9})
  await expect(link,'complete name fits the visible service table').toBeInViewport({ratio:0.9});await expect(link).toHaveText(title)
  expect(geometry.scroll,'this simple service row fits without name-forced horizontal scroll').toBeLessThanOrEqual(geometry.client+1)
  expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,titleLength:title.length,geometry,titleBox,operatorBox,interaction:'TITLE_AND_OPERATOR_IN_VIEW_PASS',reads,commands,unexpected,errors},null,2))
 }finally{await page.close();await fixture.close()}
})
