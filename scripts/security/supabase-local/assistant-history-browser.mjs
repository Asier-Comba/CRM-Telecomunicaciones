import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assistantUpstreamDiagnostic } from './assistant-server-diagnostics.mjs'

/** Actual cookie browser/history RPC on the same disposable development app. */
export async function assistantHistoryBrowser({ origin, cookie, viewerCookie, call, sql, wa, wb, users, check }) {
  const browser = await chromium.launch()
  let context, page, failureDir, phase='CONTEXT_START'
  try {
    context = await browser.newContext({ viewport: { width:1440, height:960 } })
    await context.addCookies(cookie.split('; ').map(part => { const at=part.indexOf('='); return { name:part.slice(0,at), value:part.slice(at+1), url:origin } }))
    page=await context.newPage();page.setDefaultTimeout(30000)
    const dir=resolve(process.env.RUNNER_TEMP,'w3-history-ui');failureDir=dir;mkdirSync(dir,{recursive:true})
    const pending=op=>page.waitForResponse(response=>{try{return new URL(response.url()).pathname==='/api/assistant/v2/threads'&&response.request().postDataJSON().operation===op}catch{return false}})
    const customer=randomUUID(),foreignCustomer=randomUUID()
    sql(`insert into public.customers(id,workspace_id,account_kind,legal_name,created_by_user_id) values('${customer}','${wa}','legal_entity','W3 UI Authorized Context','${users.ownerA.id}'),('${foreignCustomer}','${wb}','legal_entity','W3 UI Foreign Context','${users.ownerB.id}')`)
    const ordinary=[],observe=request=>{try{const input=request.postDataJSON();if(input?.operation)ordinary.push(input)}catch{}}
    page.on('request',observe)
    const summary=page.waitForResponse(response=>{try{const request=response.request().postDataJSON();return new URL(response.url()).pathname==='/api/telecom/reads/v1'&&request.operation==='customer360.summary'&&request.input.customer_id===customer}catch{return false}})
    await page.goto(origin+'/assistant?customer='+customer)
    const summaryResponse=await summary,summaryBody=await summaryResponse.json(),contextRegion=page.getByRole('region',{name:'Contexto autorizado del cliente',exact:true})
    check(summaryResponse.status()===200&&summaryBody.data?.record?.customer_id===customer&&summaryBody.data.record.contracts===0&&summaryBody.data.record.services===0&&summaryBody.data.record.lines===0,'assistant_history_browser_context_actual_scoped_summary')
    await expect(contextRegion.getByRole('heading',{name:'W3 UI Authorized Context',exact:true})).toBeVisible()
    await expect(contextRegion.getByRole('link',{name:'Abrir ficha del cliente',exact:true})).toHaveAttribute('href','/clients/'+customer)
    await expect(contextRegion.getByText(/Recuentos completos del cliente/)).toBeVisible()
    check(ordinary.some(request=>request.operation==='customer.list'&&request.input.limit===1)&&!ordinary.some(request=>request.operation==='customer.editor'),'assistant_history_browser_context_ordinary_identity_no_privileged_editor')
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await page.getByRole('main').evaluate(el=>{el.scrollTop=0});await page.screenshot({path:resolve(dir,'history-context-'+width+'.png'),fullPage:true});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'assistant_history_browser_context_responsive_'+width)}
    ordinary.length=0
    phase='CONTEXT_FOREIGN'
    await page.goto(origin+'/assistant?customer='+foreignCustomer)
    await expect(page.getByRole('region',{name:'Contexto autorizado del cliente',exact:true}).getByRole('alert')).toHaveText('El registro ya no está disponible.')
    await expect(page.getByText('W3 UI Foreign Context',{exact:true})).toHaveCount(0)
    await expect(page.getByText('W3 UI Authorized Context',{exact:true})).toHaveCount(0)
    check(!ordinary.some(request=>request.operation==='customer.editor'||request.operation==='customer360.summary'||request.operation==='telecom.attention'),'assistant_history_browser_context_foreign_reference_no_dependent_read_or_leak')
    ordinary.length=0
    phase='CONTEXT_INVALID'
    await page.goto(origin+'/assistant?customer=invalid')
    await expect(page.getByText('Abre el asistente desde una ficha de cliente para consultar su contexto actual autorizado.',{exact:true})).toBeVisible()
    check(!ordinary.some(request=>request.operation==='customer.list'||request.operation==='customer360.summary'||request.operation==='telecom.attention'),'assistant_history_browser_context_invalid_reference_no_read')
    page.off('request',observe)
    // Viewer uses the same ordinary identity and redacted summary under actual
    // cookie scope. Restore only these disposable membership/profile fixtures.
    const previousStatus=sql(`select status from public.workspace_members where workspace_id='${wa}' and user_id='${users.viewerA.id}'`),previousWorkspace=sql(`select coalesce(workspace_id::text,'') from public.profiles where id='${users.viewerA.id}'`)
    check(['active','suspended'].includes(previousStatus)&&(!previousWorkspace||/^[0-9a-f-]{36}$/.test(previousWorkspace)),'assistant_history_browser_context_viewer_fixture_binding')
    let viewerContext
    phase='CONTEXT_VIEWER'
    try{
      sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.viewerA.id}';update public.profiles set workspace_id='${wa}' where id='${users.viewerA.id}'`)
      viewerContext=await browser.newContext({viewport:{width:390,height:960}})
      await viewerContext.addCookies(viewerCookie.split('; ').map(part=>{const at=part.indexOf('=');return{name:part.slice(0,at),value:part.slice(at+1),url:origin}}))
      const viewerPage=await viewerContext.newPage();viewerPage.setDefaultTimeout(30000)
      const viewerRequests=[];viewerPage.on('request',request=>{try{const body=request.postDataJSON();if(body?.operation)viewerRequests.push(body.operation)}catch{}})
      const viewerSummary=viewerPage.waitForResponse(response=>{try{return response.request().postDataJSON().operation==='customer360.summary'}catch{return false}})
      await viewerPage.goto(origin+'/assistant?customer='+customer)
      const viewerResponse=await viewerSummary,viewerBody=await viewerResponse.json()
      check(viewerResponse.status()===200&&viewerBody.data?.record?.customer_id===customer&&viewerBody.data.record.documents===null&&viewerBody.data.record.billing===null,'assistant_history_browser_context_viewer_real_redaction')
      await expect(viewerPage.getByRole('heading',{name:'W3 UI Authorized Context',exact:true})).toBeVisible()
      await expect(viewerPage.getByText(/Documentos: Acceso restringido · Facturación: Acceso restringido/)).toBeVisible()
      check(viewerRequests.includes('customer.list')&&!viewerRequests.includes('customer.editor'),'assistant_history_browser_context_viewer_no_privileged_editor')
    }finally{await viewerContext?.close();sql(`update public.workspace_members set status='${previousStatus}' where workspace_id='${wa}' and user_id='${users.viewerA.id}';update public.profiles set workspace_id=${previousWorkspace?"'"+previousWorkspace+"'":'null'} where id='${users.viewerA.id}'`)}
    await page.setViewportSize({width:1440,height:960})
    phase='HISTORY_CREATE'
    await page.goto(origin+'/assistant?customer='+customer)
    await expect(page.getByRole('heading',{name:'Asistente de cartera',exact:true})).toBeVisible()
    await expect(page.getByRole('button',{name:'Actualizar historial',exact:true})).toBeEnabled()
    await expect(page.getByLabel('Consulta al asistente',{exact:true})).toBeDisabled()
    await page.getByLabel('Título de nueva conversación',{exact:true}).fill('W3 UI Synthetic History')
    // Keep route-handler failures in the awaited test path. Throwing from this
    // callback bypasses the harness report/teardown and hides the HTTP refusal.
    let commitStatus=null,commitDiagnostic=null,completeCommit
    const commitComplete=new Promise(resolve=>{completeCommit=resolve})
    const creates=[],loseDelivery=async route=>{const request=route.request().postDataJSON();if(request.operation!=='thread.create'){await route.continue();return}creates.push(request);if(creates.length===1){try{const upstream=await route.fetch();commitStatus=upstream.status();if(commitStatus!==200)commitDiagnostic=await assistantUpstreamDiagnostic(upstream)}catch{commitStatus=null}finally{try{await route.abort('failed')}finally{completeCommit()}}}else await route.continue()}
    const started=performance.now(),events=[],operations=new Set(['thread.list','thread.create','thread.get','thread.rename','thread.archive','message.page'])
    const operation=request=>{try{const q=request.postDataJSON();return new URL(request.url()).pathname==='/api/assistant/v2/threads'&&operations.has(q.operation)?q.operation:null}catch{return null}}
    const recordEvent=(request,kind,status=null)=>{const op=operation(request);if(op){if(events.length===32)events.shift();events.push({operation:op,kind,status,elapsed_ms:Math.round(performance.now()-started)})}}
    const onResponse=response=>recordEvent(response.request(),'HTTP',response.status()),onFailed=request=>recordEvent(request,'NETWORK_FAILURE')
    page.on('response',onResponse);page.on('requestfailed',onFailed)
    const captureBeforeDrain=async()=>{
      // Closed booleans/operation enums only: never content, identity, errors,
      // URLs, cookies, headers, browser storage or database credentials.
      const display=await page.evaluate(()=>{
        const aside=document.querySelector('aside[aria-label="Conversaciones persistentes"]'),input=aside?.querySelector('input[aria-label="Título de nueva conversación"]'),buttons=Array.from(aside?.querySelectorAll('button')??[])
        const retry=buttons.find(button=>button.textContent==='Reintentar misma creación'),create=buttons.find(button=>button.textContent==='Nueva conversación')
        return {busy:document.querySelector('[aria-busy]')?.getAttribute('aria-busy')==='true',title_disabled:input?.disabled??null,retry_visible:!!retry,create_visible:!!create,create_disabled:create?.disabled??null,uncertain_alert:Array.from(document.querySelectorAll('[role="alert"]')).some(alert=>alert.textContent?.includes('No se pudo confirmar el resultado.'))}
      })
      writeFileSync(resolve(dir,'failed-create-before-route-drain-safe.json'),JSON.stringify({scope:'SYNTHETIC_COOKIE_BROWSER_CREATE_BEFORE_ROUTE_DRAIN',phase,upstream_status:commitStatus,upstream_diagnostic:commitDiagnostic,create_attempts:creates.length,same_first_two_inputs:creates.length>=2?JSON.stringify(creates[0])===JSON.stringify(creates[1]):null,events,display},null,2)+'\n')
      await page.screenshot({path:resolve(dir,'failed-'+phase+'-before-route-drain.png'),fullPage:true})
    }
    await page.route('**/api/assistant/v2/threads',loseDelivery)
    let response,body
    try{
      phase='CREATE_CLICK';await page.getByRole('button',{name:'Nueva conversación',exact:true}).click()
      // Observe the upstream command inside the existing 30s page budget before
      // testing its intentionally lost UI delivery (unchanged 5s expect budget).
      phase='CREATE_UPSTREAM';let commitTimer
      try{await Promise.race([commitComplete,new Promise((_,reject)=>{commitTimer=setTimeout(()=>reject(Error('W3_HISTORY_UI_CREATE_UPSTREAM_TIMEOUT')),30000)})])}finally{clearTimeout(commitTimer)}
      check(commitStatus===200,'assistant_history_browser_commit_before_delivery_loss_http_'+(commitStatus??'NO_RESPONSE'))
      phase='CREATE_LOST_DELIVERY';await expect(page.getByRole('alert').filter({hasText:'No se pudo confirmar el resultado.'})).toBeVisible();await expect(page.getByLabel('Título de nueva conversación',{exact:true})).toBeDisabled()
      const created=pending('thread.create');await page.getByRole('button',{name:'Reintentar misma creación',exact:true}).click();response=await created;body=await response.json()
      check(creates.length===2&&JSON.stringify(creates[0])===JSON.stringify(creates[1]),'assistant_history_browser_same_create_identity_retry')
    }catch(error){await captureBeforeDrain().catch(()=>{});throw error}finally{await page.unrouteAll({behavior:'wait'});page.off('response',onResponse);page.off('requestfailed',onFailed)}
    check(response.status()===200&&body.ok&&body.data?.record?.version===1,'assistant_history_browser_actual_create')
    const id=body.data.record.id;check(/^[0-9a-f-]{36}$/.test(id),'assistant_history_browser_created_uuid')
    check(sql(`select count(*) from public.assistant_conversations_v2 where id='${id}' and workspace_id='${wa}' and actor_id='${users.ownerA.id}' and version=1`)==='1','assistant_history_browser_retry_single_persisted_thread')
    await expect(page.getByRole('heading',{name:'W3 UI Synthetic History',exact:true})).toBeVisible()
    for(let i=0;i<11;i++){
      const turn_id=randomUUID(),text=i===0?'<img src=x onerror=alert(1)> historical only':'Synthetic historical request '+i
      check((await call('turn.start',{id,turn_id,text})).status===200,'assistant_history_browser_seed_real_start')
      check((await call('turn.finish',{id,turn_id,status:'completed',answer:'Synthetic historical answer '+i})).status===200,'assistant_history_browser_seed_real_finish')
    }
    phase='HISTORY_MESSAGES'
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click()
    await expect(page.locator('[data-history-message]')).toHaveCount(20)
    await expect(page.getByText('<img src=x onerror=alert(1)> historical only',{exact:true})).toBeVisible()
    await expect(page.getByRole('region',{name:'Mensajes históricos',exact:true}).locator('img')).toHaveCount(0)
    await page.getByRole('button',{name:'Más mensajes',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(2)
    await expect(page.getByRole('button',{name:'Más mensajes',exact:true})).toBeDisabled()
    await page.getByRole('button',{name:'Mensajes anteriores',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    check(true,'assistant_history_browser_actual_message_cursor_literal_history')
    phase='HISTORY_RENAME'
    await page.getByLabel('Nuevo título de conversación',{exact:true}).fill('W3 UI Renamed History')
    const renamed=pending('thread.rename');await page.getByRole('button',{name:'Guardar título',exact:true}).click()
    check((await(await renamed).json()).data?.record?.version===2,'assistant_history_browser_rename_cas')
    await page.reload();await expect(page.getByRole('button',{name:'Abrir conversación: W3 UI Renamed History',exact:true})).toBeVisible()
    await page.getByRole('button',{name:'Abrir conversación: W3 UI Renamed History',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    check(true,'assistant_history_browser_reload_persistence')
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await page.getByRole('main').evaluate(el=>{el.scrollTop=0});await page.screenshot({path:resolve(dir,'history-'+width+'.png'),fullPage:true});await page.getByRole('main').evaluate(el=>{el.scrollTop=el.scrollHeight});await page.screenshot({path:resolve(dir,'history-lower-'+width+'.png'),fullPage:true});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'assistant_history_browser_responsive_'+width)}
    phase='STORAGE_PRIVACY'
    const cache=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]))
    check(!cache.includes('W3 UI Renamed History')&&!cache.includes('historical only')&&!cache.includes('W3 UI Authorized Context')&&!cache.includes('W3 UI Foreign Context'),'assistant_history_browser_no_history_browser_storage')
    phase='HISTORY_REVOCATION'
    sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.ownerA.id}'`)
    try{await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'No tienes acceso a este historial.'})).toBeVisible();await expect(page.locator('[data-history-message]')).toHaveCount(0);await expect(page.locator('[data-history-thread]')).toHaveCount(0);check(true,'assistant_history_browser_revocation_clears_display')}
    finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.ownerA.id}'`)}
    phase='HISTORY_REVOCATION_RECOVERY'
    const recoveredReads=['customer360.summary','telecom.attention'].map(operation=>page.waitForResponse(response=>{try{const request=response.request().postDataJSON();return request.operation===operation&&request.input.customer_id===customer}catch{return false}}))
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    for(const response of await Promise.all(recoveredReads)){check(response.status()===200&&(await response.json()).ok===true,'assistant_history_browser_context_recovery_actual_reads')}
    await expect(page.getByRole('heading',{name:'W3 UI Authorized Context',exact:true})).toBeVisible()
    await expect(contextRegion.getByText(/Recuentos completos del cliente/)).toBeVisible()
    await expect(contextRegion.locator('summary')).toHaveText('Prioridades del cliente · 0 en esta página')
    phase='CONTEXT_REVOCATION'
    sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.ownerA.id}'`)
    try{const deniedIdentity=page.waitForResponse(response=>{try{const request=response.request().postDataJSON();return new URL(response.url()).pathname==='/api/product/v1/queries'&&request.operation==='customer.list'&&request.input.limit===1}catch{return false}});phase='CONTEXT_REVOCATION_CLICK';await page.getByRole('button',{name:'Actualizar contexto',exact:true}).click();phase='CONTEXT_REVOCATION_HTTP';check((await deniedIdentity).status()===403,'assistant_history_browser_context_revocation_actual_identity_denied');phase='CONTEXT_REVOCATION_ASSERT';await expect(page.getByRole('alert').filter({hasText:'Tu acceso ha cambiado. Actualiza el historial.'})).toBeVisible();await expect(page.locator('[data-history-message]')).toHaveCount(0);await expect(page.locator('[data-history-thread]')).toHaveCount(0);await expect(page.getByRole('region',{name:'Contexto autorizado del cliente',exact:true})).toHaveCount(0);check(true,'assistant_history_browser_context_revocation_clears_history_and_context')}
    finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.ownerA.id}'`)}
    phase='CONTEXT_REVOCATION_RECOVERY'
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    phase='HISTORY_ARCHIVE'
    await page.getByRole('button',{name:'Archivar conversación',exact:true}).click();const archived=pending('thread.archive');await page.getByRole('button',{name:'Confirmar archivo',exact:true}).click()
    check((await(await archived).json()).data?.record?.archived===true,'assistant_history_browser_archive_real')
    await expect(page.getByText('Conversación archivada. Sus mensajes se conservan.',{exact:true})).toBeVisible();await expect(page.locator('[data-history-message]')).toHaveCount(20);await expect(page.getByRole('button',{name:'Abrir conversación: W3 UI Renamed History',exact:true})).toHaveCount(0)
    check((await call('message.page',{id,limit:50})).json?.items?.length===22,'assistant_history_browser_archive_preserves_messages')
    phase='HISTORY_THREAD_CURSOR'
    for(let i=0;i<21;i++)check((await call('thread.create',{id:randomUUID(),title:'Synthetic history cursor '+i})).status===200,'assistant_history_browser_cursor_seed')
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.locator('[data-history-thread]')).toHaveCount(20)
    const first=await page.locator('[data-history-thread]').evaluateAll(nodes=>nodes.map(node=>node.dataset.historyThread))
    await page.getByRole('button',{name:'Más conversaciones',exact:true}).click();await expect(page.locator('[data-history-thread]')).toHaveCount(1)
    const last=await page.locator('[data-history-thread]').getAttribute('data-history-thread');check(!first.includes(last)&&new Set(first).size===20,'assistant_history_browser_thread_cursor_no_duplicates')
    await expect(page.getByRole('button',{name:'Más conversaciones',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Conversaciones anteriores',exact:true}).click();await expect(page.locator('[data-history-thread]')).toHaveCount(20)
    return 'PASS_ACTUAL_COOKIE_BROWSER_HISTORY_CAS_PAGINATION_REVOCATION'
  } catch(error){
    if(page&&!page.isClosed()&&failureDir){await page.getByRole('main').evaluate(element=>{element.scrollTop=0}).catch(()=>{});await page.screenshot({path:resolve(failureDir,'failed-'+phase+'.png'),fullPage:true}).catch(()=>{})}
    const message=String(error?.message??'')
    if(/^CHECK_ASSISTANT_HISTORY_BROWSER_COMMIT_BEFORE_DELIVERY_LOSS_HTTP_(?:[1-5][0-9]{2}|NO_RESPONSE)$/.test(message)||message==='W3_HISTORY_UI_CREATE_UPSTREAM_TIMEOUT')throw error
    const kind=/timeout/i.test(String(error?.message??''))?'TIMEOUT':/strict mode violation/.test(String(error?.message??''))?'AMBIGUOUS':error instanceof TypeError?'TYPE_ERROR':'ASSERTION'
    throw Error('W3_HISTORY_UI_'+phase+'_'+kind)
  } finally { await context?.close();await browser.close() }
}
