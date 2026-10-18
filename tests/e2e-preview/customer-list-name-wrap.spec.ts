import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const mode of ['long','ordinary','denied'])test(`customer inventory name ${mode} at ${width}`,async({page},info)=>{
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
  if(mode==='denied'){
   await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('[data-customer-id]')).toHaveCount(0);await expect(page.getByText('PRIVATE_FIXTURE_CUSTOMER',{exact:true})).toHaveCount(0)
   await page.screenshot({path:info.outputPath(`customer-list-name-denied-${width}.png`),fullPage:false})
   await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,reads,commands,unexpected,errors},null,2))
  }else{
   const row=page.locator('[data-customer-id="'+id+'"]'),link=row.getByRole('link',{name:title,exact:true});await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','/clients/'+id)
   const geometry=await link.evaluate(el=>{const a=el.getBoundingClientRect(),c=el.closest('td,article')!.getBoundingClientRect();return{left:a.left,right:a.right,client:el.clientWidth,scroll:el.scrollWidth,cellRight:c.right,text:el.textContent,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}})
   await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,titleLength:title.length,geometry,reads,commands,unexpected,errors},null,2))
   await page.screenshot({path:info.outputPath(`customer-list-name-${mode}-${width}.png`),fullPage:false})
   expect(geometry.text).toBe(title);expect(geometry.scroll,'name does not overflow its clickable cell').toBeLessThanOrEqual(geometry.client+1)
   await row.getByRole('checkbox',{name:'Seleccionar '+title,exact:true}).check();await expect(page.getByRole('status').filter({hasText:'1 seleccionados'})).toBeVisible()
   await page.getByRole('button',{name:'Quitar selección',exact:true}).click();await expect(row.getByRole('checkbox')).not.toBeChecked()
   await row.getByRole('checkbox').check();await page.getByRole('combobox',{name:'Estado de cliente',exact:true}).selectOption('active')
   await expect.poll(()=>reads.filter(q=>q.operation==='customer.list'&&q.input.status==='active').length).toBe(1);await expect(link).toBeVisible();await expect(row.getByRole('checkbox')).not.toBeChecked();await expect(page.getByRole('button',{name:'Quitar selección',exact:true})).toHaveCount(0)
   await expect(row.getByRole('link',{name:'Abrir 360',exact:true})).toHaveAttribute('href','/clients/'+id)
   await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,titleLength:title.length,geometry,interaction:'SELECTION_CLEAR_FILTER_RESET_PASS',reads,commands,unexpected,errors},null,2))
  }
  expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
 }finally{await page.close();await fixture.close()}
})
