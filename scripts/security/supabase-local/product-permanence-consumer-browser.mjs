import {expect} from '@playwright/test'
import {resolve} from 'node:path'

/** Real cookie command/read extension; SQL only observes synthetic state. */
export async function customerPermanenceCreationBrowser({page,origin,id,wa,contractId,importedId,day,sql,screenshotDir,report}){
 for(const value of [id,wa,contractId,importedId])if(!/^[0-9a-f-]{36}$/.test(value))throw Error('C360_PERMANENCE_FIXTURE_REFUSED')
 const button=name=>page.getByRole('button',{name,exact:true}),step=name=>{report.w2_ui_action_step='permanence:'+name}
 const future=new Date(day+'T12:00:00Z');future.setUTCDate(future.getUTCDate()+180);const end=future.toISOString().slice(0,10)
 const count=()=>Number(sql(`select count(*) from public.telecom_commitments p join public.telecom_contracts c on c.workspace_id=p.workspace_id and c.id=p.contract_id where c.workspace_id='${wa}' and c.customer_id='${id}'`))
 const renewals=Number(sql(`select count(*) from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where c.workspace_id='${wa}' and c.customer_id='${id}'`)),before=count()
 const kpi=()=>page.getByLabel('Resumen real del cliente',{exact:true}).locator('dl > div').filter({has:page.getByText('Renovaciones / permanencias',{exact:true})}).locator('dd')
 const contractRead=after=>page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='contract.list'&&q.input.customer_id===id&&q.input.limit===20&&(after?!!q.input.after_id:!q.input.after_id)}catch{return false}})
 async function choose(parentId){
  const pending=contractRead(false);await button('Nueva permanencia manual').click();const response=await pending,body=await response.json();if(response.status()!==200||!body.ok)throw Error('C360_PERMANENCE_PARENT_LIST_FAILED')
  const picker=page.getByLabel('Contrato de la permanencia',{exact:true});await expect(picker).toBeEnabled()
  for(let n=0;n<8&&!await picker.locator('option[value="'+parentId+'"]').count();n++){const next=contractRead(true);await button('Más relaciones de contrato').click();const r=await next;if(r.status()!==200||!(await r.json()).ok)throw Error('C360_PERMANENCE_PARENT_PAGE_FAILED');await expect(picker).toBeEnabled()}
  await picker.selectOption(parentId);await button('Continuar con el contrato').click()
 }
 step('imported_parent_refusal');await page.setViewportSize({width:1440,height:960});await page.goto(origin+'/clients/'+id);await page.getByRole('tab',{name:'Permanencias',exact:true}).click()
 let prohibitedWrites=0;const refused=r=>{try{if(r.postDataJSON().operation==='permanence.create_manual')prohibitedWrites++}catch{}};page.on('request',refused)
 try{await choose(importedId);const dialog=page.getByRole('dialog',{name:'Nueva permanencia del cliente',exact:true});await expect(dialog.getByRole('alert')).toHaveText('Selecciona un contrato manual en borrador o activo para registrar la permanencia.');await expect(button('Registrar permanencia')).toHaveCount(0);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();if(prohibitedWrites||count()!==before)throw Error('C360_PERMANENCE_IMPORTED_WRITE')}finally{page.off('request',refused)}
 step('manual_parent');await choose(contractId);const dialog=page.getByRole('dialog',{name:'Registrar permanencia manual',exact:true});await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Tipo de registro',{exact:true}).locator('option')).toHaveCount(1);await expect(dialog.getByLabel('Tipo de registro',{exact:true})).toHaveValue('permanence');await expect(dialog.getByLabel('Inicio de permanencia',{exact:true})).toHaveAttribute('min',day)
 await dialog.getByLabel('Inicio de permanencia',{exact:true}).fill(day);await expect(dialog.getByLabel('Fin de permanencia',{exact:true})).toHaveAttribute('min',day);await dialog.getByLabel('Fin de permanencia',{exact:true}).fill(end)
 const inputs=[];let createdId
 const unknown=async route=>{const q=route.request().postDataJSON();if(q.operation!=='permanence.create_manual'||q.input.contract_id!==contractId){await route.continue();return}inputs.push(q.input);if(inputs.length===1){const response=await route.fetch(),body=await response.json();if(response.status()!==200||!body.ok||typeof body.receipt?.id!=='string')throw Error('C360_PERMANENCE_COMMIT_FAILED');createdId=body.receipt.id;await route.abort('failed')}else await route.continue()}
 const unavailable=async route=>{const q=route.request().postDataJSON();if(q.operation==='portfolio.get'&&q.input.kind==='permanence'&&q.input.id===createdId)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})});else await route.continue()}
 await page.route('**/api/portfolio/v1/commands',unknown);await page.route('**/api/portfolio/v1/queries',unavailable)
 try{
  step('commit_lost_receipt');await button('Registrar permanencia').click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(button('Reintentar la misma acción')).toBeEnabled();await expect(dialog.getByLabel('Inicio de permanencia',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Fin de permanencia',{exact:true})).toBeDisabled()
  const readFailure=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='portfolio.get'&&q.input.kind==='permanence'&&q.input.id===createdId&&r.status()===503}catch{return false}})
  step('exact_retry_then_read_failure');await button('Reintentar la misma acción').click();await readFailure;await expect(button('Consultar permanencia registrada')).toBeEnabled();await expect(dialog.getByLabel('Inicio de permanencia',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Fin de permanencia',{exact:true})).toBeDisabled();await expect(kpi()).toHaveText(renewals+' / '+before)
  if(inputs.length!==2||JSON.stringify(inputs[0])!==JSON.stringify(inputs[1])||Object.keys(inputs[0]).sort().join(',')!=='command_id,commitment_kind,contract_id,ends_on,reason_code,starts_on'||inputs[0].contract_id!==contractId||inputs[0].commitment_kind!=='minimum_term'||inputs[0].starts_on!==day||inputs[0].ends_on!==end||inputs[0].reason_code!=='manual_record'||count()!==before+1)throw Error('C360_PERMANENCE_REPLAY_CHANGED_OR_DUPLICATED')
 }finally{await page.unroute('**/api/portfolio/v1/commands',unknown);await page.unroute('**/api/portfolio/v1/queries',unavailable)}
 const summaryRequests=new WeakSet();let extraWrites=0;const observe=r=>{try{const q=r.postDataJSON();if(q.operation==='permanence.create_manual')extraWrites++;if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===id)summaryRequests.add(r)}catch{}};page.on('request',observe)
 const summary=page.waitForResponse(r=>summaryRequests.has(r.request()));void summary.catch(()=>{})
 try{
  step('confirmed_read_only_recovery');await button('Consultar permanencia registrada').click();await expect(dialog).toHaveCount(0);const response=await summary,body=await response.json()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==id||body.data.record.permanences!==before+1||body.data.record.renewals!==renewals||extraWrites)throw Error('C360_PERMANENCE_SUMMARY_OR_SECOND_WRITE')
  await expect(kpi()).toHaveText(renewals+' / '+(before+1));await expect(page.getByRole('tab',{name:'Permanencias',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('link',{name:'Ver permanencia registrada',exact:true})).toHaveAttribute('href','/portfolio?kind=permanence&id='+createdId)
  if(sql(`select (p.contract_id='${contractId}' and c.customer_id='${id}' and p.service_id is null and p.version=1 and p.administrative_status='open' and p.source='manual' and p.commitment_kind='minimum_term' and p.starts_on='${day}' and p.ends_on='${end}' and p.reason_code='manual_record')::text from public.telecom_commitments p join public.telecom_contracts c on c.workspace_id=p.workspace_id and c.id=p.contract_id where p.workspace_id='${wa}' and p.id='${createdId}'`)!=='true')throw Error('C360_PERMANENCE_PERSISTED_SCOPE_MISMATCH')
  const wait=()=>page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='permanence.list'&&q.input.customer_id===id&&q.input.status==='open'}catch{return false}})
  let pending=wait();await page.getByLabel('Estado de Permanencias',{exact:true}).selectOption('open');let collection=await pending,data=await collection.json()
  for(let n=0;n<8&&!data.data?.items?.some(r=>r.id===createdId)&&data.data?.next_id;n++){pending=wait();await button('Siguiente página de Permanencias').click();collection=await pending;data=await collection.json()}
  const actual=data.data?.items?.find(r=>r.id===createdId);if(collection.status()!==200||!data.ok||!actual||actual.customer_id!==id||actual.contract_id!==contractId||actual.service_id!==null||actual.commitment_kind!=='minimum_term'||actual.starts_on!==day||actual.ends_on!==end||actual.status!=='open'||actual.source!=='manual')throw Error('C360_PERMANENCE_NOT_IN_ACTUAL_COLLECTION')
  for(const width of [1440,768,390]){
   step('created_record_'+width);await page.setViewportSize({width,height:960});const record=page.locator('[data-domain-id="'+createdId+'"]:visible');await expect(record).toHaveCount(1);await expect(record.getByRole('link',{name:'Permanencia',exact:true})).toHaveAttribute('href','/portfolio?kind=permanence&id='+createdId);await record.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(record).toBeInViewport({ratio:1});const fields=record.locator(width>=1280?'td':'dl > div');await expect(fields).toHaveCount(width>=1280?8:7);for(const field of await fields.all())await expect(field).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'customer360-created-permanence-row-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('C360_PERMANENCE_ROW_OVERFLOW')
  }
  await page.setViewportSize({width:1440,height:960})
 }finally{page.off('request',observe)}
}

export async function viewerCustomerPermanenceBrowser({page,origin,id}){
 await page.goto(origin+'/clients/'+id);const pending=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='permanence.list'&&q.input.customer_id===id}catch{return false}});await page.getByRole('tab',{name:'Permanencias',exact:true}).click();if((await pending).status()!==200)throw Error('VIEWER_C360_PERMANENCE_READ_FAILED');await expect(page.getByRole('button',{name:'Nueva permanencia manual',exact:true})).toHaveCount(0)
}
