import {expect} from '@playwright/test'
import {resolve} from 'node:path'

/** Extends the existing portfolio journey using real cookie commands/reads.
 * SQL observes synthetic state; only failure responses are injected. */
export async function customerRenewalCreationBrowser({page,origin,id,wa,contractId,importedId,day,sql,screenshotDir,report}){
 for(const value of [id,wa,contractId,importedId])if(!/^[0-9a-f-]{36}$/.test(value))throw Error('C360_RENEWAL_FIXTURE_REFUSED')
 const button=name=>page.getByRole('button',{name,exact:true}),step=name=>{report.w2_ui_action_step='renewal:'+name}
 const future=new Date(day+'T12:00:00Z');future.setUTCDate(future.getUTCDate()+365);const target=future.toISOString().slice(0,10)
 const count=()=>Number(sql(`select count(*) from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where c.workspace_id='${wa}' and c.customer_id='${id}'`))
 const permanences=Number(sql(`select count(*) from public.telecom_commitments p join public.telecom_contracts c on c.workspace_id=p.workspace_id and c.id=p.contract_id where c.workspace_id='${wa}' and c.customer_id='${id}'`)),before=count()
 const kpi=()=>page.getByLabel('Resumen real del cliente',{exact:true}).locator('dl > div').filter({has:page.getByText('Renovaciones / permanencias',{exact:true})}).locator('dd')
 async function choose(parentId){
  await button('Nueva renovación manual').click();const picker=page.getByLabel('Contrato de la renovación',{exact:true});await expect(picker).toBeEnabled()
  for(let n=0;n<8&&!await picker.locator('option[value="'+parentId+'"]').count();n++){const next=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='contract.list'&&q.input.customer_id===id&&q.input.limit===20&&!!q.input.after_id}catch{return false}});await button('Más relaciones de contrato').click();if((await next).status()!==200)throw Error('C360_RENEWAL_PARENT_PAGE_FAILED');await expect(picker).toBeEnabled()}
  await picker.selectOption(parentId);await button('Continuar con el contrato').click()
 }
 step('imported_parent_refusal');await page.setViewportSize({width:1440,height:960});await page.goto(origin+'/clients/'+id);await page.getByRole('tab',{name:'Renovaciones',exact:true}).click();await expect(kpi()).toHaveText(before+' / '+permanences)
 let prohibitedWrites=0;const refused=r=>{try{if(r.postDataJSON().operation==='contract.record_renewal')prohibitedWrites++}catch{}};page.on('request',refused)
 try{await choose(importedId);const dialog=page.getByRole('dialog',{name:'Nueva renovación del cliente',exact:true});await expect(dialog.getByRole('alert')).toHaveText('Selecciona un contrato manual en borrador o activo para registrar el seguimiento.');await expect(button('Registrar seguimiento')).toHaveCount(0);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();if(prohibitedWrites||count()!==before)throw Error('C360_RENEWAL_IMPORTED_WRITE')}finally{page.off('request',refused)}
 step('manual_parent');await choose(contractId);const dialog=page.getByRole('dialog',{name:'Registrar renovación manual',exact:true});await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Tipo de registro',{exact:true}).locator('option')).toHaveCount(1);await expect(dialog.getByLabel('Tipo de registro',{exact:true})).toHaveValue('renewal');await expect(dialog.getByLabel('Fecha objetivo',{exact:true})).toHaveAttribute('min',day);await dialog.getByLabel('Fecha objetivo',{exact:true}).fill(target)
 const summary=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return new URL(r.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===id}catch{return false}})
 const inputs=[];let createdId
 const unknown=async route=>{const q=route.request().postDataJSON();if(q.operation!=='contract.record_renewal'||q.input.contract_id!==contractId){await route.continue();return}inputs.push(q.input);if(inputs.length===1){const response=await route.fetch(),body=await response.json();if(response.status()!==200||!body.ok||typeof body.receipt?.id!=='string')throw Error('C360_RENEWAL_COMMIT_FAILED');createdId=body.receipt.id;await route.abort('failed')}else await route.continue()}
 const unavailable=async route=>{const q=route.request().postDataJSON();if(q.operation==='portfolio.get'&&q.input.kind==='renewal'&&q.input.id===createdId)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})});else await route.continue()}
 await page.route('**/api/portfolio/v1/commands',unknown);await page.route('**/api/portfolio/v1/queries',unavailable)
 try{
  step('commit_lost_receipt');await button('Registrar seguimiento').click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(button('Reintentar la misma acción')).toBeEnabled();await expect(dialog.getByLabel('Fecha objetivo',{exact:true})).toBeDisabled()
  const readFailure=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='portfolio.get'&&q.input.kind==='renewal'&&q.input.id===createdId&&r.status()===503}catch{return false}})
  step('exact_retry_then_read_failure');await button('Reintentar la misma acción').click();await readFailure;await expect(button('Consultar renovación registrada')).toBeEnabled();await expect(dialog.getByLabel('Fecha objetivo',{exact:true})).toBeDisabled();await expect(kpi()).toHaveText(before+' / '+permanences)
  if(inputs.length!==2||JSON.stringify(inputs[0])!==JSON.stringify(inputs[1])||inputs[0].contract_id!==contractId||inputs[0].target_on!==target||inputs[0].opens_on!==null||inputs[0].closes_on!==null||count()!==before+1)throw Error('C360_RENEWAL_REPLAY_CHANGED_OR_DUPLICATED')
 }finally{await page.unroute('**/api/portfolio/v1/commands',unknown);await page.unroute('**/api/portfolio/v1/queries',unavailable)}
 let extraWrites=0;const observe=r=>{try{if(r.postDataJSON().operation==='contract.record_renewal')extraWrites++}catch{}};page.on('request',observe)
 try{
  step('confirmed_read_only_recovery');await button('Consultar renovación registrada').click();await expect(dialog).toHaveCount(0);const response=await summary,body=await response.json()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==id||body.data.record.renewals!==before+1||body.data.record.permanences!==permanences||extraWrites)throw Error('C360_RENEWAL_SUMMARY_OR_SECOND_WRITE')
  await expect(kpi()).toHaveText((before+1)+' / '+permanences);await expect(page.getByRole('tab',{name:'Renovaciones',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('link',{name:'Ver renovación registrada',exact:true})).toHaveAttribute('href','/portfolio?kind=renewal&id='+createdId)
  if(sql(`select (r.contract_id='${contractId}' and c.customer_id='${id}' and r.version=1 and r.status='open' and r.source='manual' and r.target_on='${target}' and r.opens_on is null and r.closes_on is null)::text from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id='${wa}' and r.id='${createdId}'`)!=='true')throw Error('C360_RENEWAL_PERSISTED_SCOPE_MISMATCH')
  const wait=()=>page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='renewal.list'&&q.input.customer_id===id&&q.input.status==='open'}catch{return false}})
  let pending=wait();await page.getByLabel('Estado de Renovaciones',{exact:true}).selectOption('open');let collection=await pending,data=await collection.json()
  for(let n=0;n<8&&!data.data?.items?.some(r=>r.id===createdId)&&data.data?.next_id;n++){pending=wait();await button('Siguiente página de Renovaciones').click();collection=await pending;data=await collection.json()}
  const actual=data.data?.items?.find(r=>r.id===createdId);if(collection.status()!==200||!data.ok||!actual||actual.contract_id!==contractId||actual.target_on!==target||actual.status!=='open'||actual.source!=='manual')throw Error('C360_RENEWAL_NOT_IN_ACTUAL_COLLECTION')
  for(const width of [1440,768,390]){
   step('created_record_'+width);await page.setViewportSize({width,height:960});const record=page.locator('[data-domain-id="'+createdId+'"]:visible');await expect(record).toHaveCount(1);await expect(record.getByRole('link',{name:'Renovación',exact:true})).toHaveAttribute('href','/portfolio?kind=renewal&id='+createdId);await record.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(record).toBeInViewport({ratio:1});const fields=record.locator(width>=1280?'td':'dl > div');await expect(fields).toHaveCount(width>=1280?7:6);for(const field of await fields.all())await expect(field).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'customer360-created-renewal-row-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('C360_RENEWAL_ROW_OVERFLOW')
  }
  await page.setViewportSize({width:1440,height:960})
 }finally{page.off('request',observe)}
}

export async function viewerCustomerRenewalBrowser({page,origin,id}){
 await page.goto(origin+'/clients/'+id);const pending=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='renewal.list'&&q.input.customer_id===id}catch{return false}});await page.getByRole('tab',{name:'Renovaciones',exact:true}).click();if((await pending).status()!==200)throw Error('VIEWER_C360_RENEWAL_READ_FAILED');await expect(page.getByRole('button',{name:'Nueva renovación manual',exact:true})).toHaveCount(0)
}
