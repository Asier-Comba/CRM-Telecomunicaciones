import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerDomainFixture} from './fixtures/customer-domain-server.cjs'
const id=(prefix:number,n:number)=>`${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
for(const width of [390,768,1440])for(const mode of ['long','ordinary','denied'])test(`customer service title ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerDomainFixture(),reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 const title=mode==='long'?'Servicio'+'X'.repeat(152):'Servicio de empresa'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='service.list'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_FIXTURE_SENTINEL'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(5,1),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:title,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null}],next_id:null}}});return
  }
  if(q.operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:id(2,1),version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}}}});return}
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  if(mode==='denied'){
   await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('[data-domain-id]')).toHaveCount(0)
   await expect(page.getByRole('link',{name:title,exact:true})).toHaveCount(0);await expect(page.getByText('PRIVATE_FIXTURE_SENTINEL',{exact:true})).toHaveCount(0)
   expect(reads.map(x=>x.operation)).toEqual(['service.list'])
   await page.screenshot({path:info.outputPath(`customer-service-title-denied-${width}.png`),fullPage:false})
   await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,reads,commands,unexpected,errors},null,2))
  }else{
   const link=page.getByRole('link',{name:title,exact:true}).filter({visible:true});await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','/services/'+id(5,1))
   await expect(page.getByText('Synthetic operator',{exact:true}).filter({visible:true})).toBeVisible()
   const geometry=width<1280?await page.locator('article[data-domain-id="'+id(5,1)+'"]').evaluate(el=>{const c=el.getBoundingClientRect(),h=el.querySelector('h3')!,l=h.querySelector('a')!.getBoundingClientRect();return{cardLeft:c.left,cardRight:c.right,client:el.clientWidth,scroll:el.scrollWidth,titleClient:h.clientWidth,titleScroll:h.scrollWidth,linkRight:l.right,titleText:h.textContent,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}}):null
   await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,titleLength:title.length,geometry,reads,commands,unexpected,errors},null,2))
   await page.screenshot({path:info.outputPath(`customer-service-title-${mode}-${width}.png`),fullPage:false})
   if(geometry){expect(geometry.titleText).toBe(title);expect(geometry.titleScroll,'complete card title has no clipped text').toBeLessThanOrEqual(geometry.titleClient+1);expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+1);expect(geometry.linkRight).toBeLessThanOrEqual(geometry.cardRight+1)}
   else await expect(page.locator('tr[data-domain-id="'+id(5,1)+'"]')).toBeVisible()
   expect(reads.filter(x=>x.operation==='service.list')).toEqual([{operation:'service.list',input:{customer_id:id(1,1),limit:20,sort:'id_asc'}}])
  }
  expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
 }finally{await page.close();await fixture.close()}
})
