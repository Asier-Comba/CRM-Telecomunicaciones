import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const width of [390,768,1440])for(const mode of ['link-A','link-B','scoped-A','scoped-B','invalid','absent','malformed-shape','denied','global'] as const)test('customer attention context '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const n=mode.endsWith('-B')?2:1,day='2026-10-16',isLink=mode.startsWith('link-')
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer360.summary'){await reply({contract_version:'telecom.reads.v1',operation:q.operation,as_of:day,record:{customer_id:q.input.customer_id,contacts:1,contracts:1,services:1,lines:1,renewals:1,permanences:1,opportunities:1,tasks:1,meetings:1,cases:1,documents:null,billing:null,activity:1,portabilities:1,sims:1}});return}
  if(q.operation==='assignee.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='telecom.attention'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   const cursor=q.input.customer_id&&!q.input.after_id?{after_sort_on:day,after_kind:'case',after_id:'20000000-0000-4000-8000-000000000001',fallback_on:day}:null
   await reply({contract_version:'telecom.attention.v1',operation:q.operation,as_of:day,fallback_on:day,items:[],next_cursor:cursor});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const attention=()=>reads.filter(q=>q.operation==='telecom.attention')
 try{
  await page.setViewportSize({width,height:960})
  if(isLink){
   await page.goto(fixture.url+'/?kind=overview');if(n===2)await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).click()
   await expect(page.getByRole('region',{name:'Resumen real del cliente'}).getByText('Visión comercial',{exact:true})).toBeVisible();await page.locator('summary').click()
   await expect(page.getByRole('link',{name:'Abrir centro de atención',exact:true})).toHaveAttribute('href','/attention?customer='+id(n));expect(attention().at(-1)?.input.customer_id).toBe(id(n))
  }else{
   const customer=mode==='invalid'?'bad':mode==='malformed-shape'?'------------------------------------':mode==='absent'||mode==='global'?undefined:id(n)
   await page.goto(fixture.url+'/?kind=attention-context'+(customer?'&customer='+encodeURIComponent(customer):''))
   await expect.poll(()=>attention().length).toBeGreaterThan(0)
   const scoped=mode.startsWith('scoped-')||mode==='denied'
   expect(attention()[0].input.customer_id).toBe(scoped?id(n):undefined)
   await expect(page.getByRole('combobox',{name:'Cliente vinculado',exact:true})).toHaveValue(scoped?id(n):'')
   if(mode==='denied'){
    await expect(page.getByRole('alert').filter({hasText:'No tienes permiso'})).toBeVisible();await expect(page.getByText('No hay seguimientos en esta ventana con los filtros seleccionados.',{exact:true})).toHaveCount(0)
    await page.getByRole('button',{name:'Reintentar atención',exact:true}).click();await expect.poll(()=>attention().length).toBe(2);expect(attention()[1].input.customer_id).toBe(id(n))
   }else if(scoped){
    await expect(page.getByRole('button',{name:'Siguiente página de atención',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Siguiente página de atención',exact:true}).click();await expect.poll(()=>attention().length).toBe(2)
    expect(attention()[1].input).toMatchObject({customer_id:id(n),after_id:'20000000-0000-4000-8000-000000000001',after_kind:'case',after_sort_on:day,fallback_on:day})
    await page.getByRole('button',{name:'Actualizar atención',exact:true}).click();await expect.poll(()=>attention().length).toBe(3);expect(attention()[2].input.customer_id).toBe(id(n))
    await page.screenshot({path:info.outputPath('attention-scoped-'+n+'-'+width+'.png')})
    await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await expect.poll(()=>attention().length).toBe(4);expect(attention()[3].input.customer_id).toBeUndefined();expect(attention()[3].input.after_id).toBeUndefined();await expect(page.getByRole('combobox',{name:'Cliente vinculado',exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'Página anterior de atención',exact:true})).toBeDisabled()
   }else await expect(page.getByText('No hay seguimientos en esta ventana con los filtros seleccionados.',{exact:true})).toBeVisible()
  }
  expect(errors).toEqual([]);expect(reads.every(q=>!q.operation.endsWith('.create')&&!q.operation.endsWith('.update'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,errors},null,2));await page.close();await fixture.close()}
})
