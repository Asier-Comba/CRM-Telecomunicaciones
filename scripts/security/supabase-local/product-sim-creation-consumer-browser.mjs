import {expect} from '@playwright/test'
import {resolve} from 'node:path'

/** Normal cookie writes/reads; only lost transport and failed reads are injected. */
export async function customerSimConfirmedCreationBrowser({page,origin,id,operatorId,sql,screenshotDir,report}){
 for(const value of [id,operatorId])if(!/^[0-9a-f-]{36}$/.test(value))throw Error('C360_SIM_CREATION_FIXTURE_REFUSED')
 const step=name=>{report.w2_ui_action_step='sim_creation:'+name},button=name=>page.getByRole('button',{name,exact:true}),label='W2 Synthetic Confirmed eSIM'
 const count=()=>Number(sql(`select count(*) from public.telecom_sims where customer_id='${id}'`)),before=count()
 const kpi=()=>page.getByLabel('Resumen real del cliente',{exact:true}).locator('dl > div').filter({has:page.getByText('SIM/eSIM',{exact:true})}).locator('dd')
 const read=operation=>page.waitForResponse(r=>{try{return r.request().method()==='POST'&&r.request().postDataJSON().operation===operation}catch{return false}})
 step('prepare');await page.setViewportSize({width:1440,height:960});const initial=read('customer360.summary');void initial.catch(()=>{});await page.goto(origin+'/clients/'+id);const initialResponse=await initial,initialBody=await initialResponse.json()
 if(initialResponse.status()!==200||!initialBody.ok||initialBody.data?.record?.customer_id!==id||initialBody.data.record.sims!==before)throw Error('C360_SIM_INITIAL_SUMMARY_MISMATCH')
 await page.getByRole('tab',{name:'SIM/eSIM',exact:true}).click();await expect(kpi()).toHaveText(String(before))
 const operators=read('operator.list');void operators.catch(()=>{});await button('Nueva SIM/eSIM').click();if((await operators).status()!==200)throw Error('C360_SIM_OPERATOR_LIST_FAILED')
 const dialog=page.getByRole('dialog',{name:'Nueva SIM/eSIM',exact:true}),picker=dialog.getByLabel('Operador de SIM/eSIM',{exact:true});await expect(picker).toBeEnabled()
 for(let n=0;n<8&&!await picker.locator('option[value="'+operatorId+'"]').count();n++){const next=read('operator.list');await button('Más operadores').click();if((await next).status()!==200)throw Error('C360_SIM_OPERATOR_PAGE_FAILED');await expect(picker).toBeEnabled()}
 await picker.selectOption(operatorId);await dialog.getByLabel('Nombre de SIM/eSIM',{exact:true}).fill(label);await dialog.getByLabel('Tipo de SIM',{exact:true}).selectOption('esim');await button('Revisar alta de SIM/eSIM').click()
 const inputs=[];let createdId
 const uncertainty=async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='sim.create'&&q.input.customer_id===id){inputs.push(q.input);if(inputs.length===1){const response=await route.fetch(),body=await response.json();if(response.status()!==200||!body.ok||typeof body.data?.id!=='string')throw Error('C360_SIM_REAL_COMMIT_FAILED');createdId=body.data.id;await route.abort('failed')}else await route.continue()}
  else if(q.operation==='sim.get'&&q.input.id===createdId)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unavailable'})})
  else await route.continue()
 }
 await page.route('**/api/sims/v1',uncertainty)
 try{
  step('real_commit_lost_delivery');await button('Confirmar cambio').click();const review=page.getByRole('dialog',{name:'Registrar SIM/eSIM',exact:true});await expect(review.getByRole('alert')).toBeVisible();await expect(button('Reintentar misma operación')).toBeEnabled();await expect(dialog.getByLabel('Nombre de SIM/eSIM',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('Tipo de SIM',{exact:true})).toBeDisabled();await expect(picker).toBeDisabled()
  const failedRead=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='sim.get'&&q.input.id===createdId&&r.status()===503}catch{return false}});void failedRead.catch(()=>{})
  step('same_input_replay_then_read_503');await button('Reintentar misma operación').click();await failedRead;await expect(review).toHaveCount(0);await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Actualizar lectura',exact:true})).toBeEnabled();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByLabel('Nombre de SIM/eSIM',{exact:true})).toBeDisabled();await expect(picker).toBeDisabled();await expect(kpi()).toHaveText(String(before));await expect(page.getByRole('link',{name:'Ver SIM/eSIM registrada',exact:true})).toHaveCount(0)
  if(inputs.length!==2||JSON.stringify(inputs[0])!==JSON.stringify(inputs[1])||Object.keys(inputs[0]).sort().join(',')!=='command_id,customer_id,display_label,kind,operator_id'||inputs[0].customer_id!==id||inputs[0].operator_id!==operatorId||inputs[0].kind!=='esim'||inputs[0].display_label!==label||count()!==before+1)throw Error('C360_SIM_REPLAY_CHANGED_OR_DUPLICATED')
 }finally{await page.unroute('**/api/sims/v1',uncertainty)}
 const summaryRequests=new WeakSet();let extraWrites=0;const observe=r=>{try{const q=r.postDataJSON();if(q.operation==='sim.create')extraWrites++;if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/telecom/reads/v1'&&q.operation==='customer360.summary'&&q.input.customer_id===id)summaryRequests.add(r)}catch{}};page.on('request',observe)
 const summary=page.waitForResponse(r=>summaryRequests.has(r.request()));void summary.catch(()=>{})
 const confirmed=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='sim.get'&&q.input.id===createdId}catch{return false}});void confirmed.catch(()=>{})
 try{
  step('confirmed_read_only_recovery');await dialog.getByRole('button',{name:'Actualizar lectura',exact:true}).click();const actualResponse=await confirmed,actualBody=await actualResponse.json(),actual=actualBody.data?.record
  if(actualResponse.status()!==200||!actualBody.ok||!actual||actual.id!==createdId||actual.customer_id!==id||actual.operator_id!==operatorId||actual.kind!=='esim'||actual.display_label!==label||actual.status!=='prepared'||actual.source!=='manual'||actual.version!==1||actual.masked_iccid!==null||actual.masked_eid!==null||actual.assigned_line_id!==null||actual.activated_at!==null)throw Error('C360_SIM_CONFIRMED_CURRENT_RECORD_MISMATCH')
  await expect(dialog).toHaveCount(0);const response=await summary,body=await response.json()
  if(response.status()!==200||!body.ok||body.data?.record?.customer_id!==id||body.data.record.sims!==before+1||extraWrites||count()!==before+1)throw Error('C360_SIM_SUMMARY_OR_EXTRA_WRITE')
  await expect(kpi()).toHaveText(String(before+1));await expect(page.getByRole('tab',{name:'SIM/eSIM',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('link',{name:'Ver SIM/eSIM registrada',exact:true})).toHaveAttribute('href','/sims/'+createdId)
  if(sql(`select (customer_id='${id}' and operator_id='${operatorId}' and kind='esim' and display_label='${label}' and status='prepared' and source='manual' and version=1 and activated_at is null)::text from public.telecom_sims where id='${createdId}'`)!=='true'||sql(`select count(*) from public.telecom_sim_associations where sim_id='${createdId}'`)!=='0')throw Error('C360_SIM_PERSISTED_PREPARATION_MISMATCH')
  const collectionWait=()=>page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='sim.list'&&q.input.customer_id===id&&q.input.status==='prepared'}catch{return false}})
  let pending=collectionWait();await page.getByLabel('Estado de SIM/eSIM',{exact:true}).selectOption('prepared');let collection=await pending,data=await collection.json()
  for(let n=0;n<8&&!data.data?.items?.some(r=>r.id===createdId)&&data.data?.next_id;n++){pending=collectionWait();await button('Siguiente página de SIM/eSIM').click();collection=await pending;data=await collection.json()}
  const row=data.data?.items?.find(r=>r.id===createdId);if(collection.status()!==200||!data.ok||!row||row.customer_id!==id||row.operator_id!==operatorId||row.kind!=='esim'||row.status!=='prepared'||row.source!=='manual'||row.masked_iccid!==null||row.masked_eid!==null||row.activated_at!==null)throw Error('C360_SIM_ACTUAL_COLLECTION_MISMATCH')
  for(const width of [1440,768,390]){
   step('created_record_'+width);await page.setViewportSize({width,height:960});const record=page.locator('[data-domain-id="'+createdId+'"]:visible');await expect(record).toHaveCount(1);await expect(record.getByRole('link',{name:label,exact:true})).toHaveAttribute('href','/sims/'+createdId);await record.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(record).toBeInViewport({ratio:1});const fields=record.locator(width>=1280?'td':'dl > div');await expect(fields).toHaveCount(width>=1280?7:6);for(const field of await fields.all())await expect(field).toBeInViewport({ratio:1});await expect(record.getByText('No registrado',{exact:true})).toHaveCount(3);await page.screenshot({path:resolve(screenshotDir,'customer360-created-sim-row-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('C360_SIM_CREATED_RECORD_OVERFLOW')
  }
  await page.setViewportSize({width:1440,height:960})
 }finally{page.off('request',observe)}
}

export async function viewerCustomerSimCreationBrowser({page,origin,id}){
 if(!/^[0-9a-f-]{36}$/.test(id))throw Error('C360_SIM_VIEWER_FIXTURE_REFUSED')
 await page.goto(origin+'/clients/'+id);const pending=page.waitForResponse(r=>{try{const q=r.request().postDataJSON();return q.operation==='sim.list'&&q.input.customer_id===id}catch{return false}});void pending.catch(()=>{});await page.getByRole('tab',{name:'SIM/eSIM',exact:true}).click();if((await pending).status()!==200)throw Error('C360_SIM_VIEWER_COLLECTION_FAILED');await expect(page.getByRole('button',{name:'Nueva SIM/eSIM',exact:true})).toHaveCount(0)
}
