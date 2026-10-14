import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

// Real billing components/repository/parsers, controlled HTTP only; no Auth/DB claim.
const actions=[
 {operation:'invoice.issue',status:'draft',next:'issued',open:'Emitir factura'},
 {operation:'invoice.mark_paid',status:'issued',next:'paid',open:'Marcar como cobrada',title:'Registrar cobro'},
 {operation:'invoice.reverse_payment',status:'paid',next:'issued',open:'Revertir cobro'},
 {operation:'invoice.trash',status:'draft',next:'trashed',open:'Mover a papelera',title:'Mover borrador a papelera'},
 {operation:'invoice.restore',status:'trashed',next:'draft',open:'Restaurar borrador'},
 {operation:'issuer.set',status:'issued',next:'profile',open:'Configurar emisor',title:'Datos fiscales del emisor'},
 {operation:'customer_fiscal.set',status:'issued',next:'profile',open:'Datos fiscales del cliente'},
] as const
for(const failure of ['invalid','denied'] as const)for(const width of [390,768,1440])for(const action of actions)test(`billing ${action.operation} ${failure} receipt recovery at ${width}`,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),commands:unknown[]=[],applied=new Set<string>(),errors:string[]=[]
 let mutations=0,invoice={...fixture.invoice,status:action.status as string,number:action.status==='draft'||action.status==='trashed'?null:fixture.invoice.number,issued_at:action.status==='draft'||action.status==='trashed'?null:fixture.invoice.issued_at,paid_at:action.status==='paid'?fixture.invoice.issued_at:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/billing/v1**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().includes('/commands')){
   commands.push(q);expect(q.operation).toBe(action.operation)
   if(failure==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);mutations++;if(action.next!=='profile')invoice={...invoice,status:action.next,version:4,number:action.next==='issued'||action.next==='paid'?fixture.invoice.number:null,issued_at:action.next==='issued'||action.next==='paid'?fixture.invoice.issued_at:null,paid_at:action.next==='paid'?fixture.invoice.issued_at:null}}
   if(commands.length===1){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{contract_version:'billing.v1',command_id:'70000000-0000-4000-8000-000000000009',operation:q.operation,id:invoice.id,version:action.next==='profile'?2:4,status:action.next,number:action.next==='profile'?null:invoice.number}}}:{json:{ok:true,receipt:{contract_version:'billing.v1',command_id:q.input.command_id,operation:q.operation,id:invoice.id,version:action.next==='profile'?2:4,status:action.next,number:action.next==='profile'?null:invoice.number},extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'billing.v1',command_id:q.input.command_id,operation:q.operation,id:invoice.id,version:action.next==='profile'?2:4,status:action.next,number:action.next==='profile'?null:invoice.number}}});return
  }
  if(q.operation==='invoice.get'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,invoice}}});return}
  if(q.operation==='configuration.get'&&action.operation==='customer_fiscal.set'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,issuer:{version:1,profile:fixture.invoice.customer_fiscal,currency:'EUR',default_series:'A'},customer:{version:1,profile:fixture.invoice.customer_fiscal}}}});return}
  if(q.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  await route.continue()
 })
 await page.route('**/api/product/v1/queries',async route=>{
  await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',id:invoice.id,version:1,account_kind:'legal_entity',legal_name:'Synthetic fiscal customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(action.operation==='customer_fiscal.set'?'#fiscal-customer':''))
  await expect(page.getByRole('button',{name:action.open,exact:true})).toBeVisible()
  await expect.poll(()=>fixture.requests.some(q=>q.operation==='invoice.list')).toBe(true);fixture.releaseList()
  await page.getByRole('button',{name:action.open,exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'title'in action?action.title:action.open,exact:true})
  await dialog.getByRole('button',{name:action.next==='profile'?'Guardar datos fiscales':'Confirmar',exact:true}).click()
  if(failure==='denied'){await expect(dialog.getByRole('alert')).toContainText('No tienes permiso para esta acción.');const close=dialog.getByRole('button',{name:action.next==='profile'?'Cerrar panel':'Cancelar',exact:true});await expect(close).toBeEnabled();await close.click();await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(1);expect(mutations).toBe(0);return}
  await expect(dialog.getByRole('alert')).toContainText('No se pudo completar la acción.')
  if(action.next!=='profile')await dialog.getByRole('button',{name:'Cancelar',exact:true}).evaluate((b:HTMLButtonElement)=>b.click())
  else await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).evaluate((b:HTMLButtonElement)=>b.click())
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button',{name:action.next==='profile'?'Cerrar panel':'Cancelar',exact:true})).toBeDisabled()
  await expect(page.getByRole('combobox',{name:'Periodo',exact:true})).toBeDisabled()
  await expect(page.getByRole('button',{name:'Actualizar facturas',exact:true})).toBeDisabled()
  expect(commands).toHaveLength(1);expect(mutations).toBe(1)
  await page.screenshot({path:info.outputPath(`billing-invalid-${action.operation}-${width}.png`)})
  await dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
  await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(mutations).toBe(1)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(action.next!=='profile')await expect(page.locator('section[data-invoice-detail-id]')).toHaveAttribute('data-invoice-detail-version','4')
  const nextAction=action.next==='profile'?action.open:action.next==='issued'?'Marcar como cobrada':action.next==='paid'?'Revertir cobro':action.next==='trashed'?'Restaurar borrador':'Emitir factura'
  await page.getByRole('button',{name:nextAction,exact:true}).click()
  const nextDialog=page.getByRole('dialog')
  await nextDialog.getByRole('button',{name:action.next==='profile'?'Cerrar panel':'Cancelar',exact:true}).click()
  await expect(nextDialog).toHaveCount(0);expect(commands).toHaveLength(2)
 }finally{await page.unrouteAll({behavior:'wait'});await fixture.close()}
})
