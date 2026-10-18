import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {parseBillingReadV1} from '../../src/lib/server/billing-query-runtime-v1'

for(const mode of ['customer','status','overdue','current','workspace','current-overdue'] as const)for(const width of [390,768,1440])test('billing filter response '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),a=fixture.invoice.id,b='20000000-0000-4000-8000-000000000007',id='10000000-0000-4000-8000-000000000012',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:a,version:1,account_kind:'legal_entity',legal_name:'Synthetic filtered company A',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='invoice.list'){
   const summary=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,fixture.invoice[key as keyof typeof fixture.invoice]]))
   const invoice={...summary,id,customer_id:mode==='customer'||mode==='workspace'&&q.input.customer_id===undefined?b:a,status:mode==='status'&&q.input.status?'paid':'issued',overdue:mode==='current-overdue'&&q.input.status==='overdue',...(mode==='current-overdue'&&q.input.status==='overdue'?{issue_on:'2026-10-01',due_on:'2026-10-05'}:{}),number:{series:'A',year:2026,sequence:12}}
   const data={contract_version:'billing.v1',operation:q.operation,items:[invoice],next_id:null}
   expect(parseBillingReadV1('invoice.list',{limit:50},data)).not.toBeNull();await reply(data);return
  }
  await route.continue()
 })
 const rows=page.getByRole('table',{name:'Listado de facturas',exact:true}),negative=['customer','status','overdue'].includes(mode)
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');if(mode==='workspace'){await expect(rows.locator('[data-invoice-id="'+id+'"]')).toBeVisible();await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption('')}
  if(!['customer','workspace'].includes(mode)){
   await expect(rows.locator('[data-invoice-id="'+id+'"]')).toBeVisible();await page.getByRole('combobox',{name:'Estado de facturas',exact:true}).selectOption(mode.includes('overdue')?'overdue':'issued')
  }
  if(negative){await expect(page.getByRole('alert').first()).toHaveText('No se pudo completar la acción.');await expect(rows.locator('[data-invoice-id]')).toHaveCount(0);await expect(page.getByText('No hay facturas en esta página con los filtros seleccionados.',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Siguiente página de facturas',exact:true})).toBeDisabled()}
  else{const row=rows.locator('[data-invoice-id="'+id+'"]');await expect(row).toBeVisible();await expect(row).toContainText('A/2026/000012');await expect(row).toContainText('30,25');await expect(page.getByRole('alert')).toHaveCount(0);if(mode==='current-overdue')await expect(row).toContainText('Vencida')}
  const lists=calls.filter(q=>q.operation==='invoice.list');expect(lists).toHaveLength(mode==='customer'?1:2);expect(lists.every((q,index)=>mode==='workspace'&&index===1?q.input.customer_id===undefined:q.input.customer_id===a)).toBe(true)
  if(!['customer','workspace'].includes(mode))expect(lists.at(-1)!.input.status).toBe(mode.includes('overdue')?'overdue':'issued')
  expect(calls.some(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary'].includes(q.operation))).toBe(false);expect(errors).toEqual([]);await rows.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('filter-response-'+mode+'-'+width+'.png')})
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors},null,2));await page.close();await fixture.close()}
})
