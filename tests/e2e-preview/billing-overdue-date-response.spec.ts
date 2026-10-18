import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

for(const mode of ['missing','dated','undated'] as const)for(const width of [390,768,1440])test('billing overdue date '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),customer=fixture.invoice.id,id='10000000-0000-4000-8000-000000000012',calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:customer,version:1,account_kind:'legal_entity',legal_name:'Synthetic due-date company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='invoice.list'){
   const summary=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,fixture.invoice[key as keyof typeof fixture.invoice]])),overdue=q.input.status==='overdue'
   const invoice={...summary,id,overdue,issue_on:mode==='dated'&&overdue?'2026-10-01':'2026-10-11',due_on:mode==='dated'&&overdue?'2026-10-05':null,number:{series:'A',year:2026,sequence:12}}
   await reply({contract_version:'billing.v1',operation:q.operation,items:[invoice],next_id:null});return
  }
  await route.continue()
 })
 const rows=page.getByRole('table',{name:'Listado de facturas',exact:true}),row=rows.locator('[data-invoice-id="'+id+'"]')
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(row).toBeVisible()
  if(mode!=='undated')await page.getByRole('combobox',{name:'Estado de facturas',exact:true}).selectOption('overdue')
  if(mode==='missing'){await expect(page.getByRole('alert').first()).toHaveText('No se pudo completar la acción.');await expect(rows.locator('[data-invoice-id]')).toHaveCount(0);await expect(page.getByText('No hay facturas en esta página con los filtros seleccionados.',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Siguiente página de facturas',exact:true})).toBeDisabled()}
  else{await expect(row).toBeVisible();await expect(row).toContainText('A/2026/000012');await expect(row).toContainText('30,25');await expect(page.getByRole('alert')).toHaveCount(0);if(mode==='dated'){await expect(row).toContainText('2026-10-05');await expect(row.getByText('Vencida',{exact:true})).toBeVisible()}else{await expect(row).toContainText('Sin vencimiento');await expect(row.getByText('Vencida',{exact:true})).toHaveCount(0)}}
  const lists=calls.filter(q=>q.operation==='invoice.list');expect(lists).toHaveLength(mode==='undated'?1:2);expect(lists.every(q=>q.input.customer_id===customer)).toBe(true);if(mode!=='undated')expect(lists.at(-1)!.input.status).toBe('overdue');expect(calls.some(q=>q.operation.startsWith('invoice.')&&!['invoice.list','invoice.financial_summary'].includes(q.operation))).toBe(false);expect(errors).toEqual([])
  await (mode==='missing'?page.getByRole('alert').first():rows).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('overdue-date-'+mode+'-'+width+'.png')})
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,calls,errors},null,2));await page.close();await fixture.close()}
})
