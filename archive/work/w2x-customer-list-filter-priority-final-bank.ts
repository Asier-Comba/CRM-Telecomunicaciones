import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const mode of ['long','ordinary'])test(`customer inventory filter priority ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[]
 const title=mode==='long'?'Empresa'+'X'.repeat(153):'Empresa de prueba'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='customer.list'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_FIXTURE_CUSTOMER'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id,version:1,display_name:title,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return
  }
  if(q.operation==='assignee.list'||q.operation==='operator.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=customers-list')
  const row=page.locator('[data-customer-id="'+id+'"]').filter({visible:true}),link=row.getByRole('link',{name:title,exact:true})
  await expect(link).toBeVisible();await page.getByRole('heading',{name:'Clientes',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}))
  const geometry=await link.evaluate(el=>{const r=el.getBoundingClientRect(),m=document.querySelector('#main-content')!.getBoundingClientRect(),h=document.querySelector('h1')!.getBoundingClientRect(),c=el.closest('[data-customer-id]')!.getBoundingClientRect();return{rowTop:c.top,rowBottom:c.bottom,top:r.top,bottom:r.bottom,mainTop:m.top,mainBottom:m.bottom,headingTop:h.top,relativeToHeading:r.top-h.top}})
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,geometry,reads,commands,unexpected,errors},null,2))
  await page.screenshot({path:info.outputPath(`customer-filter-priority-${mode}-${width}.png`),fullPage:false})
  await expect(link,'first customer remains primary after aligning component heading').toBeInViewport({ratio:0.9})
  await expect(row,'at least half the first customer record stays in the viewport').toBeInViewport({ratio:0.5})
  const toggle=page.getByRole('button',{name:/^Filtros de clientes/}),status=page.getByRole('combobox',{name:'Estado de cliente',exact:true})
  if(width<768){
   await expect(toggle).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(status).toBeHidden()
   await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(status).toBeVisible()
   const controls=await toggle.getAttribute('aria-controls');expect(controls).toBeTruthy();await expect(page.locator('[id="'+controls+'"]')).toBeVisible()
  }else{await expect(toggle).toBeHidden();await expect(status).toBeVisible()}
  await status.selectOption('active');await expect.poll(()=>reads.filter(q=>q.operation==='customer.list'&&q.input.status==='active').length).toBe(1);await expect(link).toBeVisible()
  if(width<768){
   await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(status).toBeVisible();await expect(status).toHaveValue('active')
   await toggle.click();await expect(status).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toContainText('Aplicados');await expect(toggle).toBeFocused()
   await toggle.click();await expect(status).toHaveValue('active');await expect(toggle).toHaveAttribute('aria-expanded','true')
   await page.screenshot({path:info.outputPath(`customer-filter-expanded-${mode}-${width}.png`),fullPage:false})
  }
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,geometry,interaction:'FILTER_VALUES_AND_EXPANSION_PRESERVED',reads,commands,unexpected,errors},null,2))
  expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
 }finally{await page.close();await fixture.close()}
})
