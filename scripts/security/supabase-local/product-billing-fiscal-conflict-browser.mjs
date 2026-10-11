import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function billingFiscalConflictBrowser({page,origin,sql,wa,customerId,screenshotDir,report}){
 const invoicesBefore=sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`)
 for(const kind of ['issuer','customer']){
  const operation=kind==='issuer'?'issuer.set':'customer_fiscal.set',open=kind==='issuer'?'Configurar emisor':'Datos fiscales del cliente'
  const step=name=>{if(report)report.w2_ui_action_step='billing_fiscal_conflict:'+kind+':'+name}
  const button=(target,name)=>target.getByRole('button',{name,exact:true})
  const configurationRead=target=>target.waitForResponse(response=>{try{const q=response.request().postDataJSON();return response.url().endsWith('/api/billing/v1/queries')&&q.operation==='configuration.get'&&q.input.customer_id===customerId}catch{return false}})
  const commandRead=target=>target.waitForResponse(response=>{try{const q=response.request().postDataJSON();return response.url().endsWith('/api/billing/v1/commands')&&q.operation===operation}catch{return false}})
  const versionSql=()=>sql(kind==='issuer'?`select version from public.billing_issuers where workspace_id='${wa}'`:`select version from public.billing_customer_profiles where workspace_id='${wa}' and customer_id='${customerId}'`)
  let other,failNextRead=false,failedReads=0,commands=[]
  const commandRoute=async route=>{const q=route.request().postDataJSON();if(q.operation===operation)commands.push(q.input);return route.continue()}
  const queryRoute=async route=>{const q=route.request().postDataJSON();if(failNextRead&&q.operation==='configuration.get'&&q.input.customer_id===customerId){failNextRead=false;failedReads++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})})}return route.continue()}
  step('prepare_fresh_document');await page.goto('about:blank');step('prepare_current_configuration_headers');const initialRead=configurationRead(page);await page.goto(origin+'/facturacion?customer='+customerId);const initialResponse=await initialRead;step('prepare_current_configuration_body');let initialBody;try{initialBody=await initialResponse.json()}catch{throw Error('BILLING_FISCAL_CONFIGURATION_BODY_UNAVAILABLE')};const version=initialBody.data?.[kind]?.version
  if(initialResponse.status()!==200||!initialBody.ok||!Number.isSafeInteger(version)||version<1||Number(versionSql())!==version)throw Error('BILLING_FISCAL_INITIAL_CONFIGURATION_INVALID')
  await expect(button(page,open)).toBeEnabled();await button(page,open).click();await expect(page.getByLabel('Razón social fiscal',{exact:true})).toBeEditable()
  await page.route('**/api/billing/v1/commands',commandRoute);await page.route('**/api/billing/v1/queries',queryRoute)
  try{
   step('concurrent_actual_page_save');other=await page.context().newPage();await other.goto(origin+'/facturacion?customer='+customerId);await expect(button(other,open)).toBeEnabled();await button(other,open).click();const otherSave=commandRead(other);await button(other,'Guardar datos fiscales').click();const otherResponse=await otherSave,otherBody=await otherResponse.json()
   if(otherResponse.status()!==200||!otherBody.ok||otherBody.receipt?.operation!==operation||otherBody.receipt.version!==version+1)throw Error('BILLING_FISCAL_CONCURRENT_WRITE_NOT_CONFIRMED')
   await expect(other.getByRole('dialog')).toHaveCount(0);await other.close();other=null
   step('stale_save_refused');const staleSave=commandRead(page);await button(page,'Guardar datos fiscales').click();const staleResponse=await staleSave,staleBody=await staleResponse.json()
   if(staleResponse.status()!==409||staleBody.ok!==false||staleBody.error!=='conflict'||commands.length!==1||commands[0].expected_version!==version||Number(versionSql())!==version+1)throw Error('BILLING_FISCAL_STALE_SAVE_NOT_REFUSED')
   await expect(button(page,'Cerrar y actualizar configuración')).toBeEnabled();await expect(button(page,'Guardar datos fiscales')).toBeDisabled();await expect(page.getByLabel('Razón social fiscal',{exact:true})).toBeDisabled()
   step('read_failure_keeps_locked');failNextRead=true;const failedRead=configurationRead(page);await button(page,'Cerrar y actualizar configuración').click();if((await failedRead).status()!==503)throw Error('BILLING_FISCAL_READ_FAILURE_NOT_EXERCISED')
   await expect(page.getByRole('dialog')).toHaveCount(1);await expect(button(page,'Cerrar y actualizar configuración')).toBeEnabled();await expect(button(page,'Guardar datos fiscales')).toBeDisabled();await expect(page.getByLabel('Razón social fiscal',{exact:true})).toBeDisabled();if(commands.length!==1||failedReads!==1||Number(versionSql())!==version+1)throw Error('BILLING_FISCAL_READ_FAILURE_WROTE_AGAIN')
   for(const width of [1440,768,390]){step('read_recovery_'+width);await page.setViewportSize({width,height:960});await button(page,'Cerrar y actualizar configuración').scrollIntoViewIfNeeded();await expect(button(page,'Cerrar y actualizar configuración')).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'billing-fiscal-'+kind+'-read-recovery-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('BILLING_FISCAL_RECOVERY_OVERFLOW')}
   step('current_read_only_recovery');const currentRead=configurationRead(page);await button(page,'Cerrar y actualizar configuración').click();const currentResponse=await currentRead,currentBody=await currentResponse.json()
   if(currentResponse.status()!==200||!currentBody.ok||currentBody.data?.[kind]?.version!==version+1||commands.length!==1||Number(versionSql())!==version+1)throw Error('BILLING_FISCAL_CURRENT_READ_MISMATCH')
   await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('Configuración actual recargada. Revisa antes de volver a guardar.',{exact:true})).toBeVisible()
   step('reviewed_current_version_save');await page.setViewportSize({width:1440,height:960});await button(page,open).click();await expect(page.getByLabel('Razón social fiscal',{exact:true})).toBeEditable();const reviewedSave=commandRead(page),reviewedConfigurationRead=configurationRead(page);await button(page,'Guardar datos fiscales').click();const reviewedResponse=await reviewedSave,reviewedBody=await reviewedResponse.json()
   if(reviewedResponse.status()!==200||!reviewedBody.ok||reviewedBody.receipt?.operation!==operation||reviewedBody.receipt.version!==version+2||commands.length!==2||commands[1].expected_version!==version+1||commands[1].command_id===commands[0].command_id||Number(versionSql())!==version+2)throw Error('BILLING_FISCAL_REVIEWED_SAVE_NOT_CONFIRMED')
   const reviewedConfigurationResponse=await reviewedConfigurationRead,reviewedConfigurationBody=await reviewedConfigurationResponse.json();if(reviewedConfigurationResponse.status()!==200||!reviewedConfigurationBody.ok||reviewedConfigurationBody.data?.[kind]?.version!==version+2)throw Error('BILLING_FISCAL_REVIEWED_CONFIGURATION_NOT_REFRESHED')
   await expect(page.getByRole('dialog')).toHaveCount(0);if(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`)!==invoicesBefore)throw Error('BILLING_FISCAL_RECOVERY_CHANGED_INVOICES')
  }finally{await other?.close();await page.unroute('**/api/billing/v1/commands',commandRoute);await page.unroute('**/api/billing/v1/queries',queryRoute);await page.setViewportSize({width:1440,height:960})}
 }
}
