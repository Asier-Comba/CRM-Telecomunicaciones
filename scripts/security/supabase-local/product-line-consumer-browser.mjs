import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function customerLineCreationBrowser({page,origin,id,wa,serviceId,sql,screenshotDir,report}){
 for(const value of [id,wa,serviceId])if(!/^[0-9a-f-]{36}$/.test(value))throw Error('C360_LINE_FIXTURE_REFUSED')
 const button=name=>page.getByRole('button',{name,exact:true}),step=name=>{report.w2_ui_action_step='line:'+name},name='W2 Customer360 Synthetic Line'
 const count=()=>Number(sql(`select count(*) from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where s.workspace_id='${wa}' and s.customer_id='${id}'`)),before=count()
 const kpi=()=>page.getByLabel('Resumen real del cliente',{exact:true}).locator('dl > div').filter({has:page.getByText('Líneas',{exact:true})}).locator('dd')
 // Explicit imported child is a negative fixture, never evidence of a UI create.
 const importedId=sql(`insert into public.telecom_services(workspace_id,customer_id,operator_id,contract_id,service_kind,display_name,source)select workspace_id,customer_id,operator_id,contract_id,service_kind,'W2 Synthetic Imported Line Parent','import' from public.telecom_services where workspace_id='${wa}' and id='${serviceId}' returning id`).trim()
 if(!/^[0-9a-f-]{36}$/.test(importedId))throw Error('C360_LINE_IMPORTED_FIXTURE_MISSING')
 async function choose(parentId){
  await button('Nueva línea manual').click();const picker=page.getByLabel('Servicio de la nueva línea',{exact:true});await expect(picker).toBeEnabled()
  for(let n=0;n<8&&!await picker.locator('option[value="'+parentId+'"]').count();n++){const next=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='service.list'&&q.input.customer_id===id&&q.input.limit===20&&!!q.input.after_id}catch{return false}});await button('Más relaciones de servicio').click();if((await next).status()!==200)throw Error('C360_LINE_PARENT_PAGE_FAILED');await expect(picker).toBeEnabled()}
  await picker.selectOption(parentId);await button('Continuar con el servicio').click()
 }
 step('imported_parent_refusal');await page.setViewportSize({width:1440,height:960});await page.goto(origin+'/clients/'+id);await page.getByRole('tab',{name:'Líneas',exact:true}).click();await expect(kpi()).toHaveText(String(before))
 let refusedWrites=0;const refused=r=>{try{if(r.postDataJSON().operation==='line.create_manual')refusedWrites++}catch{}};page.on('request',refused)
 try{await choose(importedId);const dialog=page.getByRole('dialog',{name:'Nueva línea del cliente',exact:true});await expect(dialog.getByRole('alert')).toHaveText('Selecciona un servicio manual pendiente, activo o suspendido bajo un contrato manual en borrador o activo.');await expect(button('Guardar activo manual')).toHaveCount(0);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();if(refusedWrites||count()!==before)throw Error('C360_LINE_IMPORTED_WRITE')}finally{page.off('request',refused)}
 step('manual_parent');await choose(serviceId);const dialog=page.getByRole('dialog',{name:'Registrar activo manual',exact:true});await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Tipo de registro',{exact:true}).locator('option')).toHaveCount(1);await expect(dialog.getByLabel('Tipo de registro',{exact:true})).toHaveValue('line');await dialog.getByLabel('Nombre del nuevo activo',{exact:true}).fill(name)
 const summary=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return new URL(r.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===id}catch{return false}})
 const inputs=[];let createdId
 const unknown=async route=>{const q=route.request().postDataJSON();if(q.operation!=='line.create_manual'||q.input.service_id!==serviceId){await route.continue();return}inputs.push(q.input);if(inputs.length===1){const response=await route.fetch(),body=await response.json();if(response.status()!==200||!body.ok||typeof body.receipt?.id!=='string')throw Error('C360_LINE_COMMIT_FAILED');createdId=body.receipt.id;await route.abort('failed')}else await route.continue()}
 const unavailable=async route=>{const q=route.request().postDataJSON();if(q.operation==='portfolio.get'&&q.input.kind==='line'&&q.input.id===createdId)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})});else await route.continue()}
 await page.route('**/api/portfolio/v1/commands',unknown);await page.route('**/api/portfolio/v1/queries',unavailable)
 try{
  step('lost_receipt');await button('Guardar activo manual').click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(button('Reintentar la misma acción')).toBeEnabled();await expect(dialog.getByLabel('Nombre del nuevo activo',{exact:true})).toBeDisabled()
  const readFailure=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='portfolio.get'&&q.input.kind==='line'&&q.input.id===createdId&&r.status()===503}catch{return false}})
  step('exact_retry_read_failure');await button('Reintentar la misma acción').click();await readFailure;await expect(button('Consultar el alta registrada')).toBeEnabled();await expect(dialog.getByLabel('Nombre del nuevo activo',{exact:true})).toBeDisabled();await expect(kpi()).toHaveText(String(before))
  if(inputs.length!==2||JSON.stringify(inputs[0])!==JSON.stringify(inputs[1])||inputs[0].service_id!==serviceId||inputs[0].display_name!==name||count()!==before+1)throw Error('C360_LINE_RETRY_CHANGED_OR_DUPLICATED')
 }finally{await page.unroute('**/api/portfolio/v1/commands',unknown);await page.unroute('**/api/portfolio/v1/queries',unavailable)}
 let extraWrites=0;const observe=r=>{try{if(r.postDataJSON().operation==='line.create_manual')extraWrites++}catch{}};page.on('request',observe)
 try{
  step('confirmed_read_only');await button('Consultar el alta registrada').click();await expect(dialog).toHaveCount(0);const response=await summary,body=await response.json()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==id||body.data.record.lines!==before+1||extraWrites)throw Error('C360_LINE_SUMMARY_OR_SECOND_WRITE')
  await expect(kpi()).toHaveText(String(before+1));await expect(page.getByRole('tab',{name:'Líneas',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('link',{name:'Ver línea registrada',exact:true})).toHaveAttribute('href','/portfolio?kind=line&id='+createdId)
  if(sql(`select (l.service_id='${serviceId}' and s.customer_id='${id}' and l.version=1 and l.status='pending' and l.source='manual' and l.display_name='${name}' and l.activated_on is null and l.ended_on is null)::text from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id='${wa}' and l.id='${createdId}'`)!=='true')throw Error('C360_LINE_PERSISTED_SCOPE_MISMATCH')
  const wait=()=>page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='line.list'&&q.input.customer_id===id&&q.input.status==='pending'}catch{return false}})
  let pending=wait();await page.getByLabel('Estado de Líneas',{exact:true}).selectOption('pending');let collection=await pending,data=await collection.json()
  for(let n=0;n<8&&!data.data?.items?.some(r=>r.id===createdId)&&data.data?.next_id;n++){pending=wait();await button('Siguiente página de Líneas').click();collection=await pending;data=await collection.json()}
  const actual=data.data?.items?.find(r=>r.id===createdId);if(collection.status()!==200||!data.ok||!actual||actual.service_id!==serviceId||actual.customer_id!==id||actual.display_name!==name||actual.status!=='pending'||actual.source!=='manual'||actual.activated_on!==null||actual.masked_msisdn!==null||actual.sim_id!==null||actual.masked_iccid!==null||actual.masked_eid!==null||actual.portability_id!==null)throw Error('C360_LINE_COLLECTION_OR_FALSE_IDENTIFIER')
  for(const width of [1440,768,390]){
   step('created_record_'+width);await page.setViewportSize({width,height:960});const record=page.locator('[data-domain-id="'+createdId+'"]:visible');await expect(record).toHaveCount(1);await expect(record.getByRole('link',{name,exact:true})).toHaveAttribute('href','/portfolio?kind=line&id='+createdId);await expect(record.getByText(/Consultando (operador|versión vendida)/)).toHaveCount(0);await record.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(record).toBeInViewport({ratio:1});const fields=record.locator('dl > div');await expect(fields).toHaveCount(12);for(const field of await fields.all())await expect(field).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'customer360-created-line-row-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('C360_LINE_ROW_OVERFLOW')
  }
  await page.setViewportSize({width:1440,height:960})
 }finally{page.off('request',observe)}
}

export async function viewerCustomerLineBrowser({page,id}){
 const pending=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='line.list'&&q.input.customer_id===id}catch{return false}});await page.getByRole('tab',{name:'Líneas',exact:true}).click();if((await pending).status()!==200)throw Error('VIEWER_C360_LINE_READ_FAILED');await expect(page.getByRole('button',{name:'Nueva línea manual',exact:true})).toHaveCount(0)
}
