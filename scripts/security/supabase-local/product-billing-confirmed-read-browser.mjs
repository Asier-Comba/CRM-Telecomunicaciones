import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function billingConfirmedReadBrowser({page,origin,sql,wa,customerId,day,screenshotDir}){
 const button=name=>page.getByRole('button',{name,exact:true}),field=name=>page.getByLabel(name,{exact:true})
 const notes='W2 confirmed current invoice',count=()=>Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}' and customer_id='${customerId}'`)),before=count()
 let invoiceId=null,lost=true,failRead=true,reads=0,commands=[],phase='create'
 const commandRoute=async route=>{
  const q=route.request().postDataJSON()
  if(!['invoice.create_draft','invoice.update_draft','invoice.issue'].includes(q.operation)||q.operation==='invoice.create_draft'&&q.input.notes!==notes||q.operation!=='invoice.create_draft'&&q.input.id!==invoiceId)return route.continue()
  commands.push(JSON.stringify(q))
  if(q.operation==='invoice.create_draft'&&lost){lost=false;const response=await route.fetch(),body=await response.json();if(response.status()!==200||!body.ok||!body.receipt?.id)throw Error('BILLING_CONFIRMED_CREATE_NOT_COMMITTED');invoiceId=body.receipt.id;return route.abort('failed')}
  return route.continue()
 }
 const queryRoute=async route=>{
  const q=route.request().postDataJSON();if(q.operation!=='invoice.get'||q.input.id!==invoiceId)return route.continue()
  reads++;if(failRead){failRead=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})})}
  return route.continue()
 }
 const currentRead=()=>page.waitForResponse(response=>{try{const q=response.request().postDataJSON();return response.status()===200&&response.url().endsWith('/api/billing/v1/queries')&&q.operation==='invoice.get'&&q.input.id===invoiceId}catch{return false}})
 await page.goto(origin+'/facturacion?customer='+customerId);await expect(button('Nuevo borrador local')).toBeEnabled();await button('Nuevo borrador local').click()
 await field('Concepto 1').fill('W2 confirmed synthetic invoice');await field('Precio 1').fill('10');await field('Fecha de emisión').fill(day);await field('Notas de factura').fill(notes);await page.getByRole('checkbox').check()
 await page.route('**/api/billing/v1/commands',commandRoute);await page.route('**/api/billing/v1/queries',queryRoute)
 try{
  const failedDelivery=page.waitForEvent('requestfailed',{predicate:request=>{try{const q=request.postDataJSON();return request.url().endsWith('/api/billing/v1/commands')&&q.operation==='invoice.create_draft'&&q.input.notes===notes}catch{return false}}})
  await button('Guardar borrador local').click();await failedDelivery;await expect(button('Reintentar la misma acción')).toBeEnabled();await expect(field('Precio 1')).toBeDisabled();await button('Reintentar la misma acción').click()
  await expect(button('Consultar factura registrada')).toBeEnabled();await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toBeVisible();await expect(field('Precio 1')).toBeDisabled();await expect(field('Cliente de factura')).toBeDisabled();await expect(page.getByRole('button',{name:'Nuevo borrador local',exact:true,includeHidden:true})).toBeDisabled();await expect(button('Reintentar la misma acción')).toHaveCount(0)
  if(commands.length!==2||commands[0]!==commands[1]||count()!==before+1||reads!==1)throw Error('BILLING_CONFIRMED_COMMIT_REPLAY_OR_READ_FAILURE_NOT_PROVEN')
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await button('Consultar factura registrada').scrollIntoViewIfNeeded();await expect(button('Consultar factura registrada')).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'billing-confirmed-read-recovery-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('BILLING_CONFIRMED_RECOVERY_OVERFLOW')}
  const createdRead=currentRead();await button('Consultar factura registrada').click();const createdBody=await (await createdRead).json(),created=createdBody.data
  if(!createdBody.ok||!created?.invoice||created.invoice.id!==invoiceId||created.invoice.customer_id!==customerId||created.invoice.version!==1||created.invoice.status!=='draft'||created.invoice.number!==null||created.invoice.totals.total_minor!==1210)throw Error('BILLING_CONFIRMED_CREATE_READ_MISMATCH')
  await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Borrador guardado',exact:true})).toBeVisible();if(commands.length!==2||reads!==2||count()!==before+1)throw Error('BILLING_CONFIRMED_CREATE_RECOVERY_WROTE_AGAIN')
  await page.setViewportSize({width:1440,height:960});phase='update';failRead=true;await button('Editar borrador').click();await field('Precio 1').fill('25');await page.getByRole('checkbox').check();await button('Guardar borrador local').click();await expect(button('Consultar factura registrada')).toBeEnabled();await expect(field('Precio 1')).toBeDisabled()
  if(commands.length!==3||JSON.parse(commands[2]).operation!=='invoice.update_draft'||reads!==3||sql(`select version||':'||total_minor from public.billing_invoices where id='${invoiceId}'`)!=='2:3025')throw Error('BILLING_CONFIRMED_UPDATE_NOT_COMMITTED_ONCE')
  const updatedRead=currentRead();await button('Consultar factura registrada').click();const updatedBody=await (await updatedRead).json(),updated=updatedBody.data;await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0);await expect(page.getByText('Total confirmado por el servidor: 30,25',{exact:false})).toBeVisible()
  if(!updatedBody.ok||!updated?.invoice||updated.invoice.version!==2||updated.invoice.customer_id!==customerId||updated.invoice.totals.total_minor!==3025||commands.length!==3||reads!==4)throw Error('BILLING_CONFIRMED_UPDATE_RECOVERY_MISMATCH')
  phase='issue';failRead=true;await button('Emitir factura').click();await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();await expect(button('Consultar factura registrada')).toBeEnabled();await expect(button('Emitir factura')).toHaveCount(0);await expect(button('Nuevo borrador local')).toBeDisabled();await expect(page.getByText('Factura emitida con numeración del servidor.',{exact:true})).toHaveCount(0)
  const storedNumber=sql(`select series||':'||number_year||':'||number_sequence from public.billing_invoices where id='${invoiceId}' and status='issued' and version=3`)
  if(!storedNumber||commands.length!==4||JSON.parse(commands[3]).operation!=='invoice.issue'||reads!==5||count()!==before+1)throw Error('BILLING_CONFIRMED_ISSUE_NOT_COMMITTED_ONCE')
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await button('Consultar factura registrada').scrollIntoViewIfNeeded();await expect(button('Consultar factura registrada')).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'billing-confirmed-issued-read-recovery-'+width+'.png'),fullPage:true})}
  const issuedRead=currentRead();await button('Consultar factura registrada').click();const issuedBody=await (await issuedRead).json(),issued=issuedBody.data;await expect(button('Marcar como cobrada')).toBeVisible()
  if(!issuedBody.ok||!issued?.invoice||issued.invoice.version!==3||issued.invoice.status!=='issued'||issued.invoice.customer_id!==customerId||`${issued.invoice.number.series}:${issued.invoice.number.year}:${issued.invoice.number.sequence}`!==storedNumber||commands.length!==4||reads!==6||count()!==before+1)throw Error('BILLING_CONFIRMED_ISSUE_RECOVERY_CHANGED_NUMBER_OR_WROTE_AGAIN')
  const detail=page.locator(`section[data-invoice-detail-id="${invoiceId}"]`)
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await detail.scrollIntoViewIfNeeded();await expect(detail).toBeInViewport({ratio:1});await expect(detail).toHaveAttribute('data-invoice-detail-version','3');await page.screenshot({path:resolve(screenshotDir,'billing-confirmed-current-invoice-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('BILLING_CONFIRMED_CURRENT_INVOICE_OVERFLOW')}
 }catch(error){throw Error('billing_confirmed_read:'+phase,{cause:error})}
 finally{await page.unroute('**/api/billing/v1/commands',commandRoute);await page.unroute('**/api/billing/v1/queries',queryRoute);await page.setViewportSize({width:1440,height:960})}
}
