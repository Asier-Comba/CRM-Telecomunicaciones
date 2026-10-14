import {expect} from '@playwright/test'
import {randomUUID} from 'node:crypto'
import {resolve} from 'node:path'

export async function billingArchivedCustomerBrowser({page,origin,check,sql,wa,day,screenshotDir}){
 await check('billing_archived_customer_draft_preparation_refused_history_and_inactive_preserved',async()=>{
  const label='W2 archived billing boundary'
  async function command(endpoint,operation,input){
   const value=await page.evaluate(async({endpoint,operation,input})=>{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,input})});const body=await response.json();return{status:response.status(),ok:body.ok,receipt:body.ok?body.receipt:null}},{endpoint,operation,input})
   if(value.status!==200||value.ok!==true||!value.receipt||!/^[0-9a-f-]{36}$/.test(value.receipt.id))throw Error('BILLING_CUSTOMER_STATE_FIXTURE_COMMAND_REFUSED')
   return value.receipt
  }
  await page.goto(origin+'/facturacion')
  const customer=await command('/api/product/v1/commands','customer.create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:label,lifecycle:'customer'})
  const invoice=await command('/api/billing/v1/commands','invoice.create_draft',{command_id:randomUUID(),customer_id:customer.id,issue_on:day,due_on:null,series:'W2A',currency:'EUR',lines:[{description:'W2 archived history fixture',quantity_milli:1000,unit_price_minor:100,discount_bps:0,tax_bps:0,withholding_bps:0}]})
  await page.goto(origin+'/facturacion?create=1');const creation=page.getByRole('dialog',{name:'Nueva factura',exact:true});await creation.getByLabel('Buscar empresa para factura',{exact:true}).fill(label);await expect(creation.getByLabel('Cliente vinculado',{exact:true}).locator(`option[value="${customer.id}"]`)).toHaveCount(1);await creation.getByLabel('Cliente vinculado',{exact:true}).selectOption(customer.id)
  const archived=await command('/api/product/v1/commands','customer.archive',{command_id:randomUUID(),id:customer.id,expected_version:customer.version})
  const invoicesBefore=Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`)),billingCommands=[]
  const pattern='**/api/billing/v1/commands',observe=async route=>{billingCommands.push(route.request().postDataJSON().operation);await route.continue()}
  await page.route(pattern,observe)
  try{
   await creation.getByRole('button',{name:'Preparar borrador',exact:true}).click();await expect(creation.getByText('El cliente está archivado. Selecciona otro cliente para preparar un borrador.',{exact:true})).toBeVisible();await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0);await creation.getByRole('button',{name:'Cerrar panel',exact:true}).click()
   await page.goto(origin+'/facturacion?customer='+customer.id+'&invoice='+invoice.id);await expect(page.getByLabel('Cliente para facturación',{exact:true})).toHaveValue(customer.id);await expect(page.locator(`section[data-invoice-detail-id="${invoice.id}"]`)).toBeVisible();await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true})).toBeDisabled();await expect(page.getByText('Crear con texto o audio',{exact:true})).toHaveCount(0)
   const notice=page.getByText('El cliente está archivado. Puedes consultar sus facturas; no preparar nuevos borradores.',{exact:true});await expect(notice).toBeVisible()
   for(const width of [390,768,1440]){await page.setViewportSize({width,height:960});await notice.scrollIntoViewIfNeeded();await expect(notice).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'billing-archived-customer-'+width+'.png')})}
   if(billingCommands.length||Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`))!==invoicesBefore)throw Error('ARCHIVED_CUSTOMER_DRAFT_CREATED')
  }finally{await page.unroute(pattern,observe)}
  await command('/api/product/v1/commands','customer.restore',{command_id:randomUUID(),id:customer.id,expected_version:archived.version})
  // This isolated synthetic fixture seeds the permitted inactive state; no schema/grant change.
  sql(`update public.customers set status='inactive' where workspace_id='${wa}' and id='${customer.id}'`)
  await page.goto(origin+'/facturacion?customer='+customer.id);const prepare=page.getByRole('button',{name:'Nuevo borrador local',exact:true});await expect(prepare).toBeEnabled();await prepare.click();const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true});await expect(editor).toBeVisible();await expect(editor.getByLabel('Cliente de factura',{exact:true})).toHaveValue(customer.id);await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  if(Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`))!==invoicesBefore)throw Error('INACTIVE_CUSTOMER_PREPARATION_SAVED_WITHOUT_REVIEW')
 })
}
