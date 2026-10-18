import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
for(const mode of ['long','current','denied'] as const)for(const width of [390,768,1440])test('assistant customer name '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),label=mode==='current'?'Synthetic assistant company':'Synthetic'+'X'.repeat(71),calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer.list'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id,version:1,display_name:label,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return
  }
  if(q.operation==='customer360.summary'){await reply({contract_version:'telecom.reads.v1',operation:q.operation,as_of:'2026-10-18',record:{customer_id:id,contacts:1,contracts:1,services:1,lines:1,renewals:1,permanences:1,opportunities:1,tasks:1,meetings:1,cases:1,documents:null,billing:null,activity:1,portabilities:1,sims:1}});return}
  if(q.operation==='telecom.attention'){const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());await reply({contract_version:'telecom.attention.v1',operation:q.operation,as_of:day,fallback_on:day,items:[],next_cursor:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const context=page.getByRole('region',{name:'Contexto autorizado del cliente',exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=context')
  if(mode==='denied'){await expect(context.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(context.getByRole('heading',{level:3})).toHaveCount(0);await expect(context.getByRole('link',{name:'Abrir ficha del cliente',exact:true})).toHaveCount(0);expect(calls.filter(q=>q.operation!=='customer.list')).toEqual([])}
  else{
   const name=context.getByRole('heading',{name:label,level:3,exact:true});await expect(name).toBeVisible();await expect(context.getByRole('link',{name:'Abrir ficha del cliente',exact:true})).toHaveAttribute('href','/clients/'+id);await expect(context.getByRole('region',{name:'Resumen real del cliente'}).getByText('Comprobados a',{exact:false})).toBeVisible()
   await expect.poll(()=>calls.filter(q=>q.operation==='telecom.attention').length).toBe(1)
   const metrics=await name.evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,right:e.getBoundingClientRect().right,viewport:innerWidth,mainClient:document.getElementById('main-content')!.clientWidth,mainScroll:document.getElementById('main-content')!.scrollWidth}));await writeFile(info.outputPath('metrics.json'),JSON.stringify({mode,width,metrics},null,2));expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1);expect(metrics.right).toBeLessThanOrEqual(width+1);expect(metrics.mainScroll).toBeLessThanOrEqual(metrics.mainClient+1)
   expect(calls.filter(q=>q.operation==='customer360.summary')).toHaveLength(1);expect(calls.filter(q=>q.operation==='customer360.summary'||q.operation==='telecom.attention').every(q=>q.input.customer_id===id)).toBe(true)
  }
  expect(calls.filter(q=>q.operation==='customer.list')).toHaveLength(1);expect(calls.filter(q=>!['customer.list','customer360.summary','telecom.attention'].includes(q.operation))).toEqual([]);expect(errors).toEqual([]);await context.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('assistant-name-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
