import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const b='20000000-0000-4000-8000-000000000002'
for(const mode of ['results','selected','current','denied'] as const)for(const width of [390,768,1440])test('document target label '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),label=mode==='current'?'Synthetic document company':'Synthetic'+ 'Z'.repeat(71),calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q)
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='global.search'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:b,customer_id:b,label,status:'active'}]}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=documents');await expect.poll(()=>calls.filter(q=>q.operation==='document.list').length).toBe(1)
  await page.getByRole('textbox',{name:'Buscar cliente para documentos',exact:true}).fill('Synthetic');await page.getByRole('button',{name:'Buscar registro',exact:true}).click()
  if(mode==='denied'){await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(page.getByRole('button',{name:'Empresa · '+label,exact:true})).toHaveCount(0);expect(calls.filter(q=>q.operation==='document.list')).toHaveLength(1);await page.getByRole('alert').scrollIntoViewIfNeeded()}
  else{
   const result=page.getByRole('button',{name:'Empresa · '+label,exact:true});await expect(result).toBeVisible()
   if(mode==='results')await result.scrollIntoViewIfNeeded()
   else{await result.click();const heading=page.getByRole('heading',{name:label,exact:true});await expect(heading).toBeVisible();await expect.poll(()=>calls.filter(q=>q.operation==='document.list').length).toBe(2);expect(calls.filter(q=>q.operation==='document.list').at(-1)?.input).toEqual({target_kind:'customer',target_id:b,status:'active',limit:20});await heading.scrollIntoViewIfNeeded()}
   const metrics=await (mode==='results'?result:page.getByRole('heading',{name:label,exact:true})).evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,viewport:innerWidth,mainClient:document.getElementById('main-content')!.clientWidth,mainScroll:document.getElementById('main-content')!.scrollWidth}))
   await writeFile(info.outputPath('metrics.json'),JSON.stringify({mode,width,metrics},null,2));expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1);expect(metrics.right).toBeLessThanOrEqual(width+1);expect(metrics.mainScroll).toBeLessThanOrEqual(metrics.mainClient+1)
  }
  expect(calls.filter(q=>q.operation==='global.search')).toHaveLength(1);expect(calls.filter(q=>!['document.list','global.search'].includes(q.operation))).toEqual([]);expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath('document-target-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
