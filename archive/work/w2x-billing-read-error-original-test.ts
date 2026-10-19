import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const width of [390,768,1440])for(const mode of ['list','financial','configuration','identity','uncertain-command'] as const)test('billing read recovery error ownership '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),id=fixture.invoice.id,reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const failedOperation=mode==='list'||mode==='uncertain-command'?'invoice.list':mode==='financial'?'invoice.financial_summary':mode==='configuration'?'configuration.get':null
 let failed=false,listCount=0,retryHeld=false,releaseInvoice:()=>void=()=>{},releaseRetry:()=>void=()=>{}
 const invoiceGate=new Promise<void>(resolve=>{releaseInvoice=resolve}),retryGate=new Promise<void>(resolve=>{releaseRetry=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='customer.editor'){
   if(mode==='identity'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await reply({contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic recovery customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return
  }
  if(q.operation==='invoice.get'){await invoiceGate;await reply({contract_version:'billing.v1',operation:q.operation,invoice:{...fixture.invoice,customer_id:id}});return}
  if(q.operation==='invoice.mark_paid'){await route.fulfill({status:500,json:{ok:false,error:'internal_safe'}});return}
  if(q.operation==='invoice.list'){listCount++;if(mode==='uncertain-command'&&listCount===2){retryHeld=true;await retryGate}}
  if(q.operation===failedOperation&&!failed){failed=true;if(mode==='financial')await reply({contract_version:'billing.v1',operation:q.operation});else await route.fulfill({status:500,json:{ok:false,error:'internal_safe'}});return}
  if(q.operation==='invoice.list'){await reply({contract_version:'billing.v1',operation:q.operation,items:[],next_id:null});return}
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(mode==='uncertain-command'?'/facturacion#fiscal-customer':'/facturacion?customer_scope=1'))
  await expect(page.getByRole('alert').first()).toBeVisible()
  if(mode==='uncertain-command'){
   releaseInvoice();await expect(page.getByRole('region',{name:'Factura seleccionada',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)
   await page.getByRole('button',{name:'Actualizar facturas',exact:true}).click();await expect.poll(()=>retryHeld).toBe(true)
   await page.getByRole('button',{name:'Marcar como cobrada',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Registrar cobro',exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
   await expect(dialog.getByRole('alert')).toHaveText('No se pudo completar la acción.');await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeEnabled()
   releaseRetry();await expect(page.getByText('No hay facturas en esta página con los filtros seleccionados.',{exact:true})).toBeVisible();await expect(dialog.getByRole('alert')).toHaveText('No se pudo completar la acción.');await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeEnabled()
  }else{
   const before=listCount;await page.getByRole('button',{name:'Actualizar facturas',exact:true}).click();await expect.poll(()=>listCount).toBe(before+1)
   await expect(page.getByText('No hay facturas en esta página con los filtros seleccionados.',{exact:true})).toBeVisible();await expect(page.getByText(/^Resumen del espacio · corte/)).toBeVisible()
   if(mode==='identity'){await expect(page.getByRole('alert').first()).toHaveText('No tienes permiso para esta acción.');await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeDisabled();await expect(page.getByRole('combobox',{name:'Cliente para facturación',exact:true})).toHaveValue(id)}
   else{await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeEnabled();expect(reads.filter(q=>q.operation===failedOperation)).toHaveLength(2)}
  }
  await page.screenshot({path:info.outputPath('billing-read-error-'+mode+'-'+width+'.png')});expect(reads.filter(q=>q.operation==='invoice.mark_paid')).toHaveLength(mode==='uncertain-command'?1:0);expect(reads.some(q=>q.operation==='invoice.create_draft'||q.operation==='invoice.issue')).toBe(false);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{releaseInvoice();releaseRetry();fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,errors,failed,listCount},null,2));await page.close();await fixture.close()}
})
