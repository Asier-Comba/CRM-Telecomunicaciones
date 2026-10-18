import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
for(const width of [1280,1440,1920])for(const mode of ['long','ordinary','denied'])test(`global service operator label ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerDomainFixture(),reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 const title='Servicio de empresa',customerTitle='Cliente de empresa',operatorTitle=mode==='long'?'Operador'+'X'.repeat(152):'Synthetic operator'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='service.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(5,1),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:title,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null}],next_id:null}}});return
  }
  if(q.operation==='operator.get'){if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_OPERATOR_LABEL'}});return}await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:id(2,1),version:1,code:'synthetic_operator',display_name:operatorTitle,status:'active',source:'manual'}}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(1,1),version:1,display_name:customerTitle,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?global=1')
  const table=page.getByRole('table'),service=table.getByRole('link',{name:title,exact:true}),customerLink=table.getByRole('link',{name:customerTitle,exact:true}),operator=table.getByText(mode==='denied'?'Operador no disponible':operatorTitle,{exact:true})
  await expect(service).toBeVisible();await expect(service).toHaveAttribute('href','/services/'+id(5,1));await expect(customerLink).toBeVisible();await expect(customerLink).toHaveAttribute('href','/clients/'+id(1,1));await expect(operator).toBeVisible()
  const geometry=await table.evaluate(el=>{const s=el.parentElement!,v=s.getBoundingClientRect(),t=el.getBoundingClientRect(),cells=el.querySelectorAll('tbody td');return{viewportLeft:v.left,viewportRight:v.right,client:s.clientWidth,scroll:s.scrollWidth,tableWidth:t.width,firstCellWidth:cells[0].getBoundingClientRect().width,operatorCellWidth:cells[4].getBoundingClientRect().width,documentWidth:document.documentElement.scrollWidth,windowWidth:innerWidth}})
  const customerBox=await customerLink.boundingBox(),operatorBox=await operator.boundingBox()
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,operatorLength:operatorTitle.length,geometry,customerBox,operatorBox,reads,commands,unexpected,errors},null,2))
  await page.screenshot({path:info.outputPath(`domain-operator-label-${mode}-${width}.png`),fullPage:false})
  await expect(operator,'operator remains visible beside the customer label').toBeInViewport({ratio:0.9});await expect(customerLink,'complete customer label fits its column').toBeInViewport({ratio:0.9});expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+1)
  await expect(customerLink).toHaveText(customerTitle);if(mode==='denied'){await expect(page.getByText(operatorTitle,{exact:true})).toHaveCount(0);await expect(page.getByText('PRIVATE_OPERATOR_LABEL',{exact:true})).toHaveCount(0)}else await expect(operator).toHaveText(operatorTitle)
  await expect(page.getByRole('alert')).toHaveCount(0);expect(reads.filter(q=>q.operation==='service.list')).toEqual([{operation:'service.list',input:{limit:20,sort:'id_asc'}}]);expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,operatorLength:operatorTitle.length,geometry,customerBox,operatorBox,interaction:'OPERATOR_LABEL_AND_SERVICE_VISIBLE_SAFE_FALLBACK',reads,commands,unexpected,errors},null,2))
 }finally{await page.close();await fixture.close()}
})
