import {expect} from '@playwright/test'
import {resolve} from 'node:path'

/** Existing cookie-backed commands/reads; SQL only observes synthetic state. */
export async function customerCaseConfirmedCreationBrowser({page,origin,id,sql,screenshotDir,report}){
 if(!/^[0-9a-f-]{36}$/.test(id))throw Error('C360_CASE_CREATION_FIXTURE_REFUSED')
 const step=name=>{report.w2_ui_action_step='case_creation:'+name},button=name=>page.getByRole('button',{name,exact:true}),title='W2 Synthetic Confirmed Case'
 const future=new Date();future.setUTCDate(future.getUTCDate()+7);const due=future.toISOString().slice(0,10)
 const count=()=>Number(sql(`select count(*) from public.service_cases where customer_id='${id}'`)),before=count()
 const kpi=()=>page.getByLabel('Resumen real del cliente',{exact:true}).locator('dl > div').filter({has:page.getByText('Incidencias',{exact:true})}).locator('dd')
 const read=operation=>page.waitForResponse(r=>{try{return r.request().method()==='POST'&&r.request().postDataJSON().operation===operation}catch{return false}})
 step('prepare');await page.setViewportSize({width:1440,height:960});const initial=read('customer360.summary');void initial.catch(()=>{});await page.goto(origin+'/clients/'+id);const initialResponse=await initial,initialBody=await initialResponse.json()
 if(initialResponse.status()!==200||!initialBody.ok||initialBody.data?.record?.customer_id!==id||initialBody.data.record.cases!==before)throw Error('C360_CASE_INITIAL_SUMMARY_MISMATCH')
 await page.getByRole('tab',{name:'Incidencias',exact:true}).click();await expect(kpi()).toHaveText(String(before));await button('Nueva incidencia').click()
 const dialog=page.getByRole('dialog',{name:'Nueva incidencia',exact:true});await dialog.getByLabel('Título de incidencia',{exact:true}).fill(title);await dialog.getByLabel('Tipo de incidencia',{exact:true}).selectOption('documentation');await dialog.getByLabel('Prioridad de incidencia',{exact:true}).selectOption('high');await dialog.getByLabel('Vencimiento de incidencia',{exact:true}).fill(due);await button('Revisar incidencia').click()
 const inputs=[];let createdId
 const uncertainty=async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='case.create'&&q.input.customer_id===id){inputs.push(q.input);if(inputs.length===1){const response=await route.fetch(),body=await response.json();if(response.status()!==200||!body.ok||typeof body.data?.id!=='string')throw Error('C360_CASE_REAL_COMMIT_FAILED');createdId=body.data.id;await route.abort('failed')}else await route.continue()}
  else if(q.operation==='case.get'&&q.input.id===createdId)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})})
  else await route.continue()
 }
 await page.route('**/api/cases/v1',uncertainty)
 try{
  step('real_commit_lost_delivery');await button('Registrar incidencia').click();const review=page.getByRole('dialog',{name:'Registrar incidencia',exact:true});await expect(review.getByRole('alert')).toBeVisible();await expect(button('Reintentar incidencia')).toBeEnabled();await expect(dialog.getByLabel('Título de incidencia',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Vencimiento de incidencia',{exact:true})).toBeDisabled()
  const failedRead=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='case.get'&&q.input.id===createdId&&r.status()===503}catch{return false}});void failedRead.catch(()=>{})
  step('same_input_replay_then_read_503');await button('Reintentar incidencia').click();await failedRead;await expect(review).toHaveCount(0);await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Consultar incidencia registrada',exact:true})).toBeEnabled();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByLabel('Título de incidencia',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Tipo de incidencia',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Prioridad de incidencia',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Vencimiento de incidencia',{exact:true})).toBeDisabled();await expect(kpi()).toHaveText(String(before));await expect(page.getByRole('link',{name:'Ver incidencia registrada',exact:true})).toHaveCount(0)
  if(inputs.length!==2||JSON.stringify(inputs[0])!==JSON.stringify(inputs[1])||Object.keys(inputs[0]).sort().join(',')!=='assigned_user_id,case_type,command_id,contract_id,customer_id,due_on,line_id,priority,service_id,title'||inputs[0].customer_id!==id||inputs[0].title!==title||inputs[0].case_type!=='documentation'||inputs[0].priority!=='high'||inputs[0].due_on!==due||inputs[0].contract_id!==null||inputs[0].service_id!==null||inputs[0].line_id!==null||inputs[0].assigned_user_id!==null||count()!==before+1)throw Error('C360_CASE_REPLAY_CHANGED_OR_DUPLICATED')
 }finally{await page.unroute('**/api/cases/v1',uncertainty)}
 const summaryRequests=new WeakSet();let extraWrites=0;const observe=r=>{try{const q=r.postDataJSON();if(q.operation==='case.create')extraWrites++;if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===id)summaryRequests.add(r)}catch{}};page.on('request',observe)
 const summary=page.waitForResponse(r=>summaryRequests.has(r.request()));void summary.catch(()=>{})
 const confirmed=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='case.get'&&q.input.id===createdId}catch{return false}});void confirmed.catch(()=>{})
 try{
  step('confirmed_read_only_recovery');await dialog.getByRole('button',{name:'Consultar incidencia registrada',exact:true}).click();const actualResponse=await confirmed,actualBody=await actualResponse.json(),actual=actualBody.data?.record
  if(actualResponse.status()!==200||!actualBody.ok||!actual||actual.id!==createdId||actual.customer_id!==id||actual.title!==title||actual.case_type!=='documentation'||actual.priority!=='high'||actual.due_on!==due||actual.status!=='open'||actual.source!=='manual'||actual.version!==1||actual.contract_id!==null||actual.service_id!==null||actual.line_id!==null||actual.assigned_user_id!==null||actual.internal_note_count!==0)throw Error('C360_CASE_CONFIRMED_CURRENT_RECORD_MISMATCH')
  await expect(dialog).toHaveCount(0);const response=await summary,body=await response.json()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==id||body.data.record.cases!==before+1||extraWrites||count()!==before+1)throw Error('C360_CASE_SUMMARY_OR_EXTRA_WRITE')
  await expect(kpi()).toHaveText(String(before+1));await expect(page.getByRole('tab',{name:'Incidencias',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('link',{name:'Ver incidencia registrada',exact:true})).toHaveAttribute('href','/cases/'+createdId)
  if(sql(`select (customer_id='${id}' and title='${title}' and case_type='documentation' and priority='high' and due_on='${due}' and status='open' and source='manual' and version=1 and contract_id is null and service_id is null and line_id is null and assigned_user_id is null and internal_note_count=0)::text from public.service_cases where id='${createdId}'`)!=='true')throw Error('C360_CASE_PERSISTED_SCOPE_MISMATCH')
  const collectionWait=()=>page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='case.list'&&q.input.customer_id===id&&q.input.status==='open'}catch{return false}})
  let pending=collectionWait();await page.getByLabel('Estado de Incidencias',{exact:true}).selectOption('open');let collection=await pending,data=await collection.json()
  for(let n=0;n<8&&!data.data?.items?.some(r=>r.id===createdId)&&data.data?.next_id;n++){pending=collectionWait();await button('Siguiente página de Incidencias').click();collection=await pending;data=await collection.json()}
  const row=data.data?.items?.find(r=>r.id===createdId);if(collection.status()!==200||!data.ok||!row||row.customer_id!==id||row.title!==title||row.case_type!=='documentation'||row.priority!=='high'||row.due_on!==due||row.status!=='open'||row.source!=='manual'||row.internal_note_count!==0)throw Error('C360_CASE_ACTUAL_COLLECTION_MISMATCH')
  for(const width of [1440,768,390]){
   step('created_record_'+width);await page.setViewportSize({width,height:960});const record=page.locator('[data-domain-id="'+createdId+'"]:visible');await expect(record).toHaveCount(1);await expect(record.getByRole('link',{name:title,exact:true})).toHaveAttribute('href','/cases/'+createdId);await record.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(record).toBeInViewport({ratio:1});const fields=record.locator(width>=1280?'td':'dl > div');await expect(fields).toHaveCount(width>=1280?8:7);for(const field of await fields.all())await expect(field).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'customer360-created-case-row-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('C360_CASE_CREATED_RECORD_OVERFLOW')
  }
  await page.setViewportSize({width:1440,height:960})
 }finally{page.off('request',observe)}
}

export async function viewerCustomerCaseCreationBrowser({page,origin,id}){
 if(!/^[0-9a-f-]{36}$/.test(id))throw Error('C360_CASE_VIEWER_FIXTURE_REFUSED')
 await page.goto(origin+'/clients/'+id);const pending=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='case.list'&&q.input.customer_id===id}catch{return false}});void pending.catch(()=>{});await page.getByRole('tab',{name:'Incidencias',exact:true}).click();if((await pending).status()!==200)throw Error('C360_CASE_VIEWER_COLLECTION_FAILED');await expect(page.getByRole('button',{name:'Nueva incidencia',exact:true})).toHaveCount(0)
}
