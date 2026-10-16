import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1'
const boundaries=[
 {name:'summer',before:'2026-10-15T21:59:00Z',after:'2026-10-15T22:01:00Z',first:'2026-10-15',next:'2026-10-16'},
 {name:'winter',before:'2026-12-31T22:59:00Z',after:'2026-12-31T23:01:00Z',first:'2026-12-31',next:'2027-01-01'},
 {name:'leap',before:'2028-02-28T22:59:00Z',after:'2028-02-28T23:01:00Z',first:'2028-02-28',next:'2028-02-29'},
]
for(const width of [390,768,1440])for(const boundary of boundaries)for(const advance of [false,true])test('billing proposal day '+boundary.name+' '+(advance?'midnight':'current')+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),id=fixture.invoice.id,calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic date customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='invoice.propose'){await reply({contract_version:'billing.v1',operation:q.operation,source:q.input.source,draft:q.input.draft,totals:calculateBillingV1(q.input.draft.lines),requires_review:true,saved:false});return}
  await route.continue()
 })
 try{
  await page.clock.setFixedTime(new Date(boundary.before));await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled();await page.waitForLoadState('networkidle')
  if(advance)await page.clock.setFixedTime(new Date(boundary.after))
  await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill('Factura a Synthetic date customer por enlace de 100 euros + IVA 21%');await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),date=editor.getByLabel('Fecha de emisión',{exact:true})
  await expect(editor).toBeVisible();await expect(date).toHaveValue(advance?boundary.next:boundary.first)
  expect(calls.filter(q=>q.operation==='invoice.propose')).toHaveLength(1);expect(calls.find(q=>q.operation==='invoice.propose')?.input.draft).toMatchObject({issue_on:advance?boundary.next:boundary.first})
  await date.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('proposal-day-'+boundary.name+'-'+(advance?'midnight':'current')+'-'+width+'.png')})
  expect(calls.some(q=>q.operation==='invoice.create_draft'||q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([])
 }finally{fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({boundary,advance,width,calls,errors},null,2));await page.close();await fixture.close()}
})
