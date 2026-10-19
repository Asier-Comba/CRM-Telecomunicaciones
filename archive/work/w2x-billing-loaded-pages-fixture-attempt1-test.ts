import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

for(const mode of ['next','previous','status','customer','refresh','denied'] as const)for(const width of [390,768,1440])test('billing loaded pages '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),a=fixture.invoice.id,b='20000000-0000-4000-8000-000000000007',first='10000000-0000-4000-8000-000000000011',second='10000000-0000-4000-8000-000000000012',filtered='10000000-0000-4000-8000-000000000013',other='10000000-0000-4000-8000-000000000014',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,failed=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:a,version:1,account_kind:'legal_entity',legal_name:'Synthetic loaded company A',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='global.search'){await reply({contract_version:'product.v1',items:[{kind:'customer',id:b,customer_id:b,label:'Synthetic loaded company B',status:'active'}]});return}
  if(q.operation==='invoice.list'){
   expect(q.input.limit).toBe(50);expect([a,b]).toContain(q.input.customer_id)
   if(q.input.after_id){expect(q.input.after_id).toBe(first);held=true;await gate;if(mode==='denied'&&!failed){failed=true;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}}
   const id=q.input.customer_id===b?other:q.input.status?filtered:q.input.after_id?second:first,sequence=id===first?11:id===second?12:id===filtered?13:14
   const summary=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,fixture.invoice[key as keyof typeof fixture.invoice]]))
   await reply({contract_version:'billing.v1',operation:q.operation,items:[{...summary,id,customer_id:q.input.customer_id,due_on:'2026-10-25',number:{series:'A',year:2026,sequence}}],next_id:id===first?first:null});return
  }
  await route.continue()
 })
 const rows=page.getByRole('table',{name:'Listado de facturas',exact:true}),next=page.getByRole('button',{name:'Siguiente página de facturas',exact:true}),previous=page.getByRole('button',{name:'Página anterior de facturas',exact:true}),refresh=page.getByRole('button',{name:'Actualizar facturas',exact:true}),lists=()=>calls.filter(q=>q.operation==='invoice.list')
 const row=(id:string)=>rows.locator('[data-invoice-id="'+id+'"]')
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(row(first)).toBeVisible();await expect(row(first)).toContainText('A/2026/000011');await expect(row(first)).toContainText('30,25');await expect(row(first)).toContainText('2026-10-25');await expect(previous).toBeDisabled();await expect(next).toBeEnabled();expect(lists()).toHaveLength(1);expect(lists()[0].input.after_id).toBeUndefined()
  await next.click();await expect.poll(()=>held).toBe(true);await expect(rows.locator('[data-invoice-id]')).toHaveCount(0);await expect(page.getByText('Cargando facturas…',{exact:true})).toBeVisible();await expect(next).toBeDisabled();await expect(previous).toBeDisabled();release()
  if(mode==='denied'){
   await expect(page.getByRole('alert').first()).toHaveText('No tienes permiso para esta acción.');await expect(rows.locator('[data-invoice-id]')).toHaveCount(0);await expect(page.getByText('No hay facturas en esta página con los filtros seleccionados.',{exact:true})).toHaveCount(0);await expect(next).toBeDisabled();await expect(previous).toBeDisabled();await refresh.click();await expect(row(first)).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)
  }else{
   await expect(row(second)).toBeVisible();await expect(row(first)).toHaveCount(0);await expect(row(second)).toContainText('A/2026/000012');await expect(next).toBeDisabled();await expect(previous).toBeEnabled()
   if(mode==='previous'){await previous.click();await expect(row(first)).toBeVisible();await expect(row(second)).toHaveCount(0)}
   if(mode==='status'){await page.getByRole('combobox',{name:'Estado de facturas',exact:true}).selectOption('issued');await expect(row(filtered)).toBeVisible();await expect(row(second)).toHaveCount(0);expect(lists().at(-1)!.input.status).toBe('issued')}
   if(mode==='customer'){await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Synthetic');await page.getByRole('button',{name:'Buscar cliente',exact:true}).click();const select=page.getByRole('combobox',{name:'Cliente para facturación',exact:true});await expect(select.locator('option[value="'+b+'"]')).toHaveCount(1);await select.selectOption(b);await expect(row(other)).toBeVisible();await expect(row(second)).toHaveCount(0);expect(lists().at(-1)!.input.customer_id).toBe(b)}
   if(mode==='refresh'){await refresh.click();await expect(row(first)).toBeVisible();await expect(row(second)).toHaveCount(0)}
  }
  if(mode!=='next'){expect(lists().at(-1)!.input.after_id).toBeUndefined();await expect(previous).toBeDisabled();await expect(page.getByText('Página 1 · Hasta 50 facturas',{exact:true})).toBeVisible()}
  else await expect(page.getByText('Página 2 · Hasta 50 facturas',{exact:true})).toBeVisible()
  expect(lists()).toHaveLength(mode==='next'?2:3);expect(lists().filter(q=>q.input.after_id!==undefined)).toHaveLength(1);expect(calls.filter(q=>q.operation==='invoice.financial_summary').every(q=>q.input.customer_id===undefined)).toBe(true)
  expect(calls.some(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary'].includes(q.operation))).toBe(false);expect(errors).toEqual([]);await rows.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('loaded-pages-'+mode+'-'+width+'.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors},null,2));await page.close();await fixture.close()}
})
