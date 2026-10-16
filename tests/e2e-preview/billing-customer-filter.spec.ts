import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const width of [390,768,1440])for(const mode of ['denied','not-found','transport','malformed','current'] as const)test('billing customer filter retained '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),id=fixture.invoice.id,reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(q.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='customer.editor'){
   held=true;await gate
   if(mode==='transport'){await route.abort('failed');return}
   if(mode==='denied'||mode==='not-found'){await route.fulfill({status:mode==='denied'?403:404,json:{ok:false,error:mode==='denied'?'access_denied':'not_found'}});return}
   await route.fulfill({json:{ok:true,data:mode==='malformed'?{contract_version:'product.v1',id}:{contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic scoped billing customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}}});return
  }
  await route.continue()
 })
 const lists=()=>reads.filter(q=>q.operation==='invoice.list')
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?customer_scope=1');await expect.poll(()=>held).toBe(true);await expect.poll(()=>lists().length).toBe(1);expect(lists()[0].input.customer_id).toBe(id)
  release()
  if(mode==='current')await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled()
  else await expect(page.getByRole('alert').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(lists().filter(q=>q.input.customer_id!==id)).toHaveLength(0)
  const select=page.getByRole('combobox',{name:'Cliente para facturación',exact:true});await expect(select).toHaveValue(id)
  if(mode!=='current'){await expect(select.locator('option:checked')).toHaveText('Cliente sin verificar');await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeDisabled()}
  else await expect(select.locator('option:checked')).toHaveText('Synthetic scoped billing customer')
  const before=lists().length;await page.getByRole('button',{name:'Actualizar facturas',exact:true}).click();await expect.poll(()=>lists().length).toBe(before+1);expect(lists().at(-1)!.input.customer_id).toBe(id)
  expect(reads.filter(q=>q.operation==='invoice.financial_summary').every(q=>q.input.customer_id===undefined)).toBe(true)
  await select.scrollIntoViewIfNeeded();expect(await select.evaluate(el=>{const box=el.getBoundingClientRect(),card=el.closest('section')!.getBoundingClientRect();return box.left>=card.left&&box.right<=card.right})).toBe(true);await page.screenshot({path:info.outputPath('billing-customer-filter-'+mode+'-'+width+'.png')})
  await select.selectOption('');await expect.poll(()=>lists().length).toBe(before+2);expect(lists().at(-1)!.input.customer_id).toBeUndefined();expect(lists().filter(q=>q.input.customer_id===undefined)).toHaveLength(1)
  expect(reads.some(q=>q.operation==='invoice.create_draft'||q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,errors},null,2));await page.close();await fixture.close()}
})
