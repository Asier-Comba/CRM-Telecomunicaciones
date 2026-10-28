import {randomBytes,randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createClient} from '@supabase/supabase-js'
import {createServerClient,parseCookieHeader} from '@supabase/ssr'
import {chromium,expect} from '@playwright/test'
import {parseDocumentLibraryInputV2,parseDocumentLibraryPageV2} from '../../src/lib/server/document-library-runtime-v2.ts'
import {parseDocumentGetV1,parseDocumentReceiptV1} from '../../src/lib/server/document-runtime-v1.ts'
import {globalDocumentsFixture} from './fixture-sql.mjs'
import {beginLateResponseObservation,settledLateResponseObservation,cleanLateResponseObservation,endLateResponseObservation} from './late-response-observer.mjs'
import {closedLateFailure,libraryDenialAlert} from './late-failure-diagnostic.mjs'
import {independentCleanup} from './independent-cleanup.mjs'
import {responseForAction} from '../asier_compat62/response-action.mjs'

// Only synthetic metadata and current USER JWTs. Service credentials stay in
// this Node fixture process; local outage is never hosted Storage acceptance.
export async function realGlobalDocumentsAcceptance({url,anon,service,sql,command,check,report,spawn}){
 if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENTS_GLOBAL_AUTH!=='true'||url!=='http://127.0.0.1:54321')throw Error('D1_GLOBAL_DISPOSABLE_LOOPBACK_ONLY')
 const origin='http://127.0.0.1:3187',library='/api/document/library/v2/queries',v1='/api/document/v1/',admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),users={}
 const phase=name=>{report.document_phase=name;console.log(JSON.stringify({kind:'documents_global_progress',phase:name}))}
 const captures=resolve(process.env.RUNNER_TEMP,'documents-global-d1-ui');mkdirSync(captures,{recursive:true})
 let server,browser,context,page,serverSpawnFailed=false
 async function post(ctx,operation,input,endpoint=library){
  const response=await ctx.request.post(origin+endpoint,{headers:{Origin:origin},data:{operation,input},timeout:15000})
  let body;try{body=await response.json()}catch{throw Error('D1_GLOBAL_INVALID_JSON')}
  return{status:response.status(),body}
 }
 async function listed(ctx,input={}){
  const r=await post(ctx,'document.library_list',input),normalized=parseDocumentLibraryInputV2(input)
  check(r.status===200&&r.body.ok===true&&!!parseDocumentLibraryPageV2(normalized,r.body.data),'real_authorized_global_closed_contract')
  check(!JSON.stringify(r.body).includes('PRIVATE_GLOBAL')&&!JSON.stringify(r.body).includes('storage_path'),'real_metadata_excludes_protected_filename_and_path')
  return r.body.data
 }
 async function login(user){
  const ctx=await browser.newContext({viewport:{width:1440,height:960},timezoneId:'Europe/Madrid'}),p=await ctx.newPage();p.setDefaultTimeout(30000)
  try{await p.goto(origin+'/login');await p.locator('input[type="email"]').fill(user.email);await p.locator('input[type="password"]').fill(user.password);await p.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await p.waitForURL('**/dashboard');return{ctx,p}}catch(error){await ctx.close();throw error}
 }
 async function verifiedToken(cookies){
  const client=createServerClient(url,anon,{cookies:{getAll:()=>cookies.map(({name,value})=>({name,value})),setAll(){}}})
  const {data,error}=await client.auth.getSession(),token=data.session?.access_token
  check(!error&&!!token,'actual_browser_cookie_token_available')
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()),verified=await admin.auth.getUser(token)
  check(!verified.error&&verified.data.user?.id===users.ownerA.id&&claims.exp>Date.now()/1000,'actual_browser_jwt_verified_and_unexpired')
  return token
 }
 async function stopServer(){
  if(!server||server.exitCode!==null||server.signalCode!==null||serverSpawnFailed&&!server.pid)return
  const exited=new Promise(accept=>server.once('exit',accept));server.kill('SIGTERM')
  await Promise.race([exited,new Promise(accept=>setTimeout(accept,5000))])
  if(server.exitCode===null&&server.signalCode===null){server.kill('SIGKILL');await Promise.race([exited,new Promise(accept=>setTimeout(accept,5000))])}
  check(server.exitCode!==null||server.signalCode!==null,'own_next_process_stopped')
 }
 try{
  phase('synthetic_auth_and_canonical_fixtures')
  const workspaces=[randomUUID(),randomUUID(),randomUUID()]
  for(const [name,index,role]of [['ownerA',0,'owner'],['adminA',0,'admin'],['memberA',0,'member'],['viewerA',0,'viewer'],['ownerB',1,'owner'],['emptyOwner',2,'owner']]){
   const email='documents-global-'+name.toLowerCase()+'@example.invalid',password=randomBytes(32).toString('base64url')
   const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true})
   check(!error&&/^[0-9a-f-]{36}$/.test(data.user?.id??''),'real_synthetic_auth_user_'+name)
   users[name]={id:data.user.id,email,password,workspace:workspaces[index],role}
  }
  const f=globalDocumentsFixture(users);sql(f.sql)
  report.fixtures={workspaces:3,actors:6,roles:['owner','admin','member','viewer'],active_a:123,active_b:3,empty_workspace:0,archived_a:1,target_kinds:6,customers_a:3,bytes:'NOT_CREATED_METADATA_ONLY'}
  const ownerClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const auth=await ownerClient.auth.signInWithPassword({email:users.ownerA.email,password:users.ownerA.password})
  check(!auth.error&&auth.data.user?.id===users.ownerA.id,'fixture_user_password_auth_before_gate_check')
  check(sql('select enabled::text from documents_library_private.settings where singleton')==='false','database_library_gate_defaults_off')
  const gated=await ownerClient.rpc('document_library_v2_list',{p_workspace_id:f.wa,p_input:{}})
  check(gated.error?.code==='PT503'&&gated.data===null,'authenticated_rpc_cannot_bypass_disabled_gate')
  for(const [name,key]of [['anonymous',anon],['service_role',service]]){
   const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),r=await client.rpc('document_library_v2_list',{p_workspace_id:f.wa,p_input:{}})
   check(r.data===null&&!!r.error&&['42501','PGRST202'].includes(r.error.code),'rpc_execute_denied_'+name)
  }
  sql('update documents_library_private.settings set enabled=true where singleton') // disposable fixture only
  phase('own_next_start_with_library_flag_only_in_disposable_process')
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','RUNNER_TEMP','CI'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]))
  Object.assign(env,{NODE_ENV:'development',APP_ENV:'test',PRODUCT_STAGING_INTEGRATION:'false',PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_V1_ENABLED:'true',PRODUCT_DOCUMENT_LIBRARY_ENABLED:'true',PRODUCT_DOCUMENT_CONTENT_ENABLED:'false',PRODUCT_DOCUMENT_MAINTENANCE_ENABLED:'false',PRODUCT_V1_ORIGIN:origin,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_ENABLE_DEMO_DATA:'false',NEXT_PUBLIC_FORCE_OFFLINE_DEV:'false',NEXT_TELEMETRY_DISABLED:'1',AI_PRODUCT_V2_ENABLED:'false',OPENAI_API_KEY:''})
  check(!Object.values(env).includes(service),'service_key_excluded_from_next_environment')
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3187'],{stdio:'ignore',env})
  server.on('error',()=>{serverSpawnFailed=true})
  let ready=false
  for(let attempt=0;attempt<20;attempt++){try{if((await fetch(origin+library,{method:'POST',signal:AbortSignal.timeout(15000)})).status===403){ready=true;break}}catch{}if(serverSpawnFailed||server.exitCode!==null)break;await new Promise(accept=>setTimeout(accept,250))}
  check(ready,'own_loopback_next_ready_and_anonymous_denied')
  check((await fetch(origin+'/login',{signal:AbortSignal.timeout(30000)})).status===200,'real_login_page_ready')
  browser=await chromium.launch();({ctx:context,p:page}=await login(users.ownerA));check(true,'owner_real_browser_login')

  async function lateRoleDrill(){
  phase('late_real_authorized_response_after_role_revocation')
  await page.goto(origin+'/documents');await page.getByRole('button',{name:'Todos los documentos',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  let held=false,releaseHold,heldFailure=false;const hold=new Promise(accept=>{releaseHold=accept})
  await page.route(origin+library,async route=>{const body=route.request().postDataJSON();if(body.input?.query!=='General'){await route.continue();return}try{const response=await route.fetch({timeout:15000});held=response.status()===200;await hold;await route.fulfill({response})}catch{heldFailure=true}})
  try{
   await page.getByRole('textbox',{name:'Buscar documentos',exact:true}).fill('General');await page.getByRole('button',{name:'Buscar documentos',exact:true}).click();await expect.poll(()=>held).toBe(true)
   sql(`update public.workspace_members set role='viewer'where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'`)
   report.late_step='new_denied_read_and_alert';await page.getByRole('textbox',{name:'Buscar documentos',exact:true}).fill('NO_MATCH_GLOBAL');const denied=await responseForAction(()=>page.waitForResponse(r=>r.url()===origin+library&&r.request().postDataJSON()?.input?.query==='NO_MATCH_GLOBAL'),()=>page.getByRole('button',{name:'Buscar documentos',exact:true}).click()),deniedBody=await denied.json();check(denied.status()===403&&deniedBody.ok===false&&deniedBody.error==='access_denied','real_new_read_denied_after_role_change');const denial=libraryDenialAlert(page);await expect(denial).toHaveCount(1);await expect(denial).toBeVisible();await expect(denial).toContainText('No tienes permiso para esta acción.');await expect(page.locator('[data-document-id]')).toHaveCount(0)
   report.late_step='install_observer';await beginLateResponseObservation(page,library);report.late_step='release_and_finish_route';releaseHold();await page.unrouteAll({behavior:'wait'});report.late_step='wait_json_and_render';const observed=await settledLateResponseObservation(page);report.late_response_observation=observed
   check(!heldFailure&&cleanLateResponseObservation(observed)&&await page.locator('[data-document-id]').count()===0,'late_real_response_processed_and_retired_before_reload')
   await endLateResponseObservation(page)
   await page.reload();await expect(page.getByText('Documentos disponibles para administradores del espacio.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Archivar',exact:true})).toHaveCount(0);check(true,'real_role_reload_withdraws_privileged_controls')
  }catch(error){report.late_failure=await closedLateFailure(page,error);throw error}finally{
   report.role_restoration='FAIL'
   // No browser failure may prevent either DB restoration or verification.
   const cleanup=await independentCleanup([()=>releaseHold(),()=>sql(`update public.workspace_members set role='owner'where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'`),()=>{check(sql(`select count(*)from public.workspace_members where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'and role='owner'`)==='1','own_role_restored');report.role_restoration='PASS'},()=>endLateResponseObservation(page),()=>page.unrouteAll({behavior:'wait'})])
   if(cleanup.failed)throw Error('D1_GLOBAL_ROLE_CLEANUP_FAILED')
  }
  }
  if(process.env.DOCUMENTS_GLOBAL_SCOPE==='LATE_ROLE_ONLY'){await lateRoleDrill();report.diagnostic_scope='LATE_ROLE_ONLY_NOT_FULL_ACCEPTANCE';return}

  phase('initial_global_123_six_targets_seven_pages')
  const inputs=[],observe=request=>{if(request.url()===origin+library&&request.method()==='POST'){try{const body=request.postDataJSON();if(body.operation==='document.library_list')inputs.push(body.input)}catch{}}}
  page.on('request',observe)
  await page.goto(origin+'/documents');await expect(page.locator('[data-document-id]')).toHaveCount(20)
  await expect(page.getByText('20 en esta página · 123 documentos en la consulta',{exact:true})).toBeVisible()
  const expectedIds=f.docs.map(d=>d.id).reverse(),seen=[]
  for(let n=1;n<=7;n++){
   await expect(page.getByText('Página '+n+' · Hasta 20 documentos',{exact:true})).toBeVisible()
   seen.push(...await page.locator('[data-document-id]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-document-id'))))
   if(n<7){await page.getByRole('button',{name:'Siguiente página',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',expectedIds[n*20])}
  }
  report.pagination_observation={observed_rows:seen.length,unique_rows:new Set(seen).size,expected_rows:123,ordered_set_exact:JSON.stringify(seen)===JSON.stringify(expectedIds),missing_rows:expectedIds.filter(id=>!seen.includes(id)).length,unexpected_rows:seen.filter(id=>!expectedIds.includes(id)).length,requests:inputs.length,global_inputs_only:inputs.every(i=>!i.target&&!i.customer_id&&i.status==='active'&&i.limit===20)}
  check(JSON.stringify(seen)===JSON.stringify(expectedIds)&&new Set(seen).size===123,'real_global_all_123_exact_order_no_omission_duplicate')
  // The controlled StrictMode test of this ready-gated component proves one
  // initial read; unlike v1's immediate effect there is no initial double read.
  check(inputs.length===7&&report.pagination_observation.global_inputs_only&&new Set(inputs.map(i=>i.cursor??'INITIAL')).size===7,'real_seven_global_cursor_reads_no_target_fanout')
  await expect(page.getByRole('button',{name:'Siguiente página',exact:true})).toBeDisabled();page.off('request',observe)
  await page.getByRole('button',{name:'Volver al principio',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',expectedIds[0])
  const first=await listed(context),oldest=f.docs[0]
  check(first.total_count===123&&!!first.next_cursor&&!first.items.some(d=>d.id===oldest.id),'real_global_first_page_and_old_document_outside_it')
  await page.getByRole('button',{name:'Siguiente página',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',expectedIds[20]);await page.reload();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',expectedIds[20])
  await page.getByRole('button',{name:'Página anterior',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',expectedIds[0]);check(true,'real_global_reload_and_previous_cursor')
  check(!page.url().includes(first.next_cursor),'opaque_cursor_never_in_browser_url')

  phase('current_database_gate_unavailable_ui_is_not_empty')
  try{
   sql('update documents_library_private.settings set enabled=false where singleton')
   const response=await responseForAction(()=>page.waitForResponse(r=>r.url()===origin+library&&r.request().postDataJSON()?.operation==='document.library_list'),()=>page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click()),body=await response.json()
   check(response.status()===503&&body.error==='unavailable','real_database_gate_blocks_current_http_read');await expect(page.locator('[data-document-id]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Biblioteca pendiente de habilitación',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Sin documentos activos',exact:true})).toHaveCount(0);check(true,'real_unavailable_ui_distinct_from_complete_empty')
  }finally{sql('update documents_library_private.settings set enabled=true where singleton');check(sql('select enabled::text from documents_library_private.settings where singleton')==='true','own_disposable_database_gate_restored')}
  await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)

  phase('global_search_filters_order_and_history')
  await page.getByRole('textbox',{name:'Buscar documentos',exact:true}).fill(oldest.id.slice(0,8));await page.getByRole('button',{name:'Buscar documentos',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(1);await expect(page.locator('[data-document-id]')).toHaveAttribute('data-document-id',oldest.id)
  await page.reload();await expect(page.getByRole('textbox',{name:'Buscar documentos',exact:true})).toHaveValue(oldest.id.slice(0,8));await expect(page.locator('[data-document-id]')).toHaveAttribute('data-document-id',oldest.id)
  check(!page.url().includes(oldest.id.slice(0,8)),'query_reference_never_in_browser_url');check((await listed(context,{query:'UNSEARCHABLE'})).total_count===0,'protected_original_filename_not_searchable')
  await page.getByRole('button',{name:'Quitar filtros',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  await page.getByLabel('Categoría documental',{exact:true}).selectOption('contract');await page.getByLabel('Formato documental',{exact:true}).selectOption('pdf');await page.getByLabel('Incorporado desde',{exact:true}).fill('2026-09-01');await page.getByLabel('Incorporado hasta',{exact:true}).fill('2026-09-01');await page.getByLabel('Ordenar documentos',{exact:true}).selectOption('created_asc')
  const combined=f.docs.filter(d=>d.document_kind==='contract'&&d.media_type==='application/pdf')
  await expect(page.getByText(new RegExp('· '+combined.length+' documentos en la consulta'))).toBeVisible();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',combined[0].id);await page.reload();await expect(page.getByLabel('Formato documental',{exact:true})).toHaveValue('pdf');await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',combined[0].id);check(true,'real_combined_server_filters_order_and_reload')
  await page.getByRole('button',{name:'Quitar filtros',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  await page.getByRole('button',{name:'Filtrar por empresa Global Synthetic Company 2',exact:true}).first().click();const companyCount=f.docs.filter(d=>d.target.customer===f.customers[1]).length;await expect(page.getByText(new RegExp('· '+companyCount+' documentos en la consulta'))).toBeVisible();check((await listed(context,{customer_id:f.customers[1]})).total_count===companyCount,'real_customer_filter_includes_canonical_ancestry')
  await page.getByRole('button',{name:'Quitar filtros',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  const target=first.items[0].context.target;await page.locator('[data-document-id]').first().getByRole('button',{name:'Sólo este registro',exact:true}).click();await expect(page.getByText(new RegExp('· '+f.docs.filter(d=>d.target.kind===target.kind&&d.target.id===target.id).length+' documentos en la consulta'))).toBeVisible();check(true,'real_exact_target_filter')
  await page.goBack();await expect(page.getByText('20 en esta página · 123 documentos en la consulta',{exact:true})).toBeVisible();await page.goForward();await expect(page.getByRole('heading',{name:'Documentos del registro',exact:true})).toBeVisible();check(true,'real_global_browser_back_forward')
  await page.getByRole('button',{name:'Quitar filtros',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)

  phase('loaded_responsive_full_authenticated_crm')
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:960});await expect(page.locator('[data-document-id]')).toHaveCount(20);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'real_loaded_no_horizontal_overflow_'+width)
   await page.screenshot({path:resolve(captures,'global-inventory-'+width+'.png'),fullPage:false})
   const trigger=page.locator('[data-document-id]').first().getByRole('button',{name:'Ver detalles',exact:true});await trigger.click();const drawer=page.getByRole('dialog',{name:'Detalles del documento',exact:true});await expect(drawer).toBeVisible();await expect(drawer.getByRole('link',{name:'Abrir registro vinculado',exact:true})).toHaveAttribute('href','/services/'+f.targets[2].id)
   await page.keyboard.press('Tab');check(await drawer.evaluate(node=>node.contains(document.activeElement)),'real_drawer_tab_stays_inside_'+width);await page.keyboard.press('Shift+Tab');check(await drawer.evaluate(node=>node.contains(document.activeElement)),'real_drawer_shift_tab_stays_inside_'+width)
   await page.screenshot({path:resolve(captures,'global-details-'+width+'.png'),fullPage:false});await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);await expect(trigger).toBeFocused();check(true,'real_loaded_escape_and_return_focus_'+width)
  }
  await page.setViewportSize({width:1440,height:960})
  check(await page.getByRole('button',{name:'Descargar archivo privado',exact:true}).count()===0&&await page.getByRole('button',{name:'Subir documento local',exact:true}).count()===0,'new_private_byte_controls_not_enabled')
  check(!(await page.content()).includes('PRIVATE_GLOBAL')&&!(await page.content()).includes(service),'protected_filename_and_service_key_absent_from_loaded_html')

  phase('roles_tenants_empty_and_cursor_negative_controls')
  const cursorPage=await listed(context),scopeCursor=cursorPage.next_cursor
  check(!!scopeCursor&&(await listed(context,{cursor:scopeCursor})).items.length===20,'real_owner_cursor_positive_before_other_scope_negatives')
  for(const name of ['adminA','ownerB','emptyOwner','memberA','viewerA']){
   const account=await login(users[name])
   try{
    await account.p.goto(origin+'/documents')
    if(['memberA','viewerA'].includes(name)){
     await expect(account.p.getByText('Documentos disponibles para administradores del espacio.',{exact:true})).toBeVisible();await expect(account.p.locator('[data-document-id]')).toHaveCount(0)
     const read=await post(account.ctx,'document.library_list',{}),write=await post(account.ctx,'document.archive',{id:oldest.id,command_id:randomUUID(),expected_version:1},v1+'commands')
     check(read.status===403&&read.body.error==='access_denied'&&write.status===403&&write.body.error==='access_denied','real_current_role_server_and_ui_denied_'+name)
    }else{
     const result=await listed(account.ctx)
     check(result.total_count===(name==='adminA'?123:name==='ownerB'?3:0),'real_positive_workspace_inventory_'+name)
     if(name==='emptyOwner'){await expect(account.p.getByRole('heading',{name:'Sin documentos activos',exact:true})).toBeVisible();await expect(account.p.locator('[data-document-id]')).toHaveCount(0);check(true,'real_empty_workspace_complete_distinct_from_failure')}
     if(name==='ownerB'){check(result.items.every(d=>f.foreign.includes(d.id)),'real_tenant_b_positive_set');check((await listed(account.ctx,{query:oldest.id.slice(0,8)})).total_count===0,'real_tenant_b_cannot_search_a');const cursor=await post(account.ctx,'document.library_list',{cursor:scopeCursor});check(cursor.status===400&&cursor.body.error==='validation','real_foreign_tenant_cursor_rejected')}
     if(name==='adminA'){const cursor=await post(account.ctx,'document.library_list',{cursor:scopeCursor});check(cursor.status===400&&cursor.body.error==='validation','real_other_actor_cursor_rejected')}
    }
   }finally{await account.ctx.close()}
  }
  for(const input of [{query:f.foreign[0].slice(0,8)},{customer_id:f.cb},{target:{kind:'customer',id:f.cb}}])check((await listed(context,input)).total_count===0,'real_foreign_query_filter_or_target_no_count_leak')
  const get=await post(context,'document.get_metadata',{id:f.foreign[0]},v1+'queries'),write=await post(context,'document.archive',{id:f.foreign[0],command_id:randomUUID(),expected_version:1},v1+'commands')
  check(get.status===404&&get.body.error==='not_found'&&[403,404].includes(write.status)&&sql(`select version from public.documents where id='${f.foreign[0]}'`)==='1','real_foreign_get_write_denied_and_unchanged')
  const damaged=scopeCursor.slice(0,40)+(scopeCursor[40]==='A'?'B':'A')+scopeCursor.slice(41)
  for(const input of [{cursor:damaged},{cursor:scopeCursor,sort:'created_asc'},{cursor:scopeCursor,limit:100},{cursor:scopeCursor,query:'General'}]){const result=await post(context,'document.library_list',input);check(result.status===400&&result.body.error==='validation','real_tampered_or_changed_filter_cursor_rejected')}
  if(!/^[A-Za-z0-9_-]{32,4096}$/.test(scopeCursor))throw Error('D1_GLOBAL_INVALID_FIXTURE_CURSOR')
  const expired=sql(`select rtrim(translate(replace(encode(extensions.pgp_sym_encrypt((extensions.pgp_sym_decrypt(decode(translate('${scopeCursor}','-_','+/')||repeat('=',(4-length('${scopeCursor}')%4)%4),'base64'),encode(s.key_bytes,'hex'))::jsonb||jsonb_build_object('expires_at',statement_timestamp()-interval '1 second'))::text,encode(s.key_bytes,'hex'),'cipher-algo=aes256,compress-algo=0'),'base64'),E'\\n',''),'+/','-_'),'=')from documents_library_private.settings s where singleton`)
  const expiredResult=await post(context,'document.library_list',{cursor:expired});check(expiredResult.status===400&&expiredResult.body.error==='validation','real_expired_authentic_cursor_rejected')
  const invalidInput=await post(context,'document.library_list',{object_ref:'FORBIDDEN_SYNTHETIC'});check(invalidInput.status===400&&invalidInput.body.error==='validation','real_closed_input_rejects_storage_identifier')

  phase('committed_archive_lost_response_exact_replay_and_cas')
  await page.goto(origin+'/documents');await page.getByRole('button',{name:'Todos los documentos',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  const changedId=expectedIds[0],intents=[];let commandFailure=false
  await page.route(origin+v1+'commands',async route=>{
   const body=route.request().postDataJSON();if(body.operation!=='document.archive'){await route.continue();return}intents.push(body.input)
   if(intents.length===1){try{const response=await route.fetch({timeout:15000}),json=await response.json();commandFailure=response.status()!==200||!json.ok||!parseDocumentReceiptV1('document.archive',body.input,json.receipt)}catch{commandFailure=true}finally{await route.abort('failed')}}else await route.continue()
  })
  await page.locator('[data-document-id]').first().getByRole('button',{name:'Archivar',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeVisible()
  check(!commandFailure&&sql(`select version::text||':'||status from public.documents where id='${changedId}'`)==='2:archived','real_archive_committed_before_lost_response')
  await expect(page.getByLabel('Estado de biblioteca',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(page.getByText('Documento actualizado.',{exact:true})).toBeVisible();await page.unrouteAll({behavior:'wait'})
  check(intents.length===2&&JSON.stringify(intents[0])===JSON.stringify(intents[1])&&intents[0].id===changedId&&sql(`select count(*)from public.product_commands where workspace_id='${f.wa}'and command_id='${intents[0].command_id}'`)==='1'&&sql(`select version from public.documents where id='${changedId}'`)==='2','real_uncertain_retry_same_intent_one_command_one_effect')
  await page.getByLabel('Estado de biblioteca',{exact:true}).selectOption('archived');const archivedRow=page.locator('[data-document-id="'+changedId+'"]');await expect(archivedRow).toBeVisible();await page.reload();await expect(archivedRow).toBeVisible();await archivedRow.getByRole('button',{name:'Restaurar',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(archivedRow).toHaveCount(0)
  check(sql(`select version::text||':'||status from public.documents where id='${changedId}'`)==='3:active','real_restore_persists_and_readback')
  const stale=await post(context,'document.archive',{id:changedId,command_id:randomUUID(),expected_version:1},v1+'commands');check(stale.status===409&&stale.body.error==='conflict'&&sql(`select version from public.documents where id='${changedId}'`)==='3','real_stale_cas_denied_without_effect')

  await lateRoleDrill()

  phase('same_still_valid_browser_jwt_membership_revocation')
  await page.goto(origin+'/documents');await page.getByRole('button',{name:'Todos los documentos',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  const token=await verifiedToken(await context.cookies(origin))
  try{
   sql(`update public.workspace_members set status='suspended'where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'`)
   check(sql(`select count(*)from public.workspace_members where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'and status='suspended'`)==='1','actual_membership_suspended_before_denied_request')
   const verified=await admin.auth.getUser(token);check(!verified.error&&verified.data.user?.id===users.ownerA.id,'same_revoked_membership_jwt_still_auth_valid')
   const denied=await responseForAction(()=>page.waitForResponse(r=>r.url()===origin+library&&r.request().postDataJSON()?.operation==='document.library_list'),()=>page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click()),request=denied.request(),headers=await request.allHeaders(),body=request.postDataJSON(),actualToken=await verifiedToken(parseCookieHeader(headers.cookie??'')),deniedBody=await denied.json()
   check(actualToken===token&&denied.status()===403&&deniedBody.ok===false&&deniedBody.error==='access_denied'&&body.operation==='document.library_list'&&JSON.stringify(Object.entries(body.input).sort())===JSON.stringify(Object.entries(parseDocumentLibraryInputV2({})).sort()),'exact_denied_global_request_uses_same_live_jwt_and_input');await expect(page.locator('[data-document-id]')).toHaveCount(0);check(true,'real_membership_revocation_withdraws_loaded_inventory')
  }finally{sql(`update public.workspace_members set status='active'where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'`);check(sql(`select count(*)from public.workspace_members where workspace_id='${f.wa}'and user_id='${users.ownerA.id}'and status='active'`)==='1','own_membership_restored')}
  await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)

  phase('actual_local_storage_outage_and_verified_restoration')
  const storage='supabase_storage_crm-telecom-local',inspected=()=>JSON.parse(command('docker',['inspect',storage]))[0],initial=inspected()
  check(initial.Name==='/'+storage&&/supabase\/storage-api:/.test(initial.Config.Image)&&initial.State.Running&&!initial.State.Paused,'exact_disposable_storage_running_unpaused')
  const probe=async()=>{try{return(await fetch(url+'/storage/v1/bucket',{headers:{apikey:anon,Authorization:'Bearer '+token},signal:AbortSignal.timeout(3000)})).status}catch{return 0}}
  check(await probe()===200,'actual_storage_healthy_before_outage');let pauseAttempt=false
  try{
   pauseAttempt=true;command('docker',['pause',storage]);check(inspected().State.Paused===true,'exact_storage_pause_confirmed');const unavailable=await probe();check(unavailable===0||unavailable>=500,'actual_storage_unavailable_not_auth_denial')
   const response=await responseForAction(()=>page.waitForResponse(r=>r.url()===origin+library&&r.request().postDataJSON()?.operation==='document.library_list'),()=>page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click()),body=await response.json();check(response.status()===200&&!!parseDocumentLibraryPageV2(parseDocumentLibraryInputV2({}),body.data),'real_global_metadata_http_survives_storage_outage');await expect(page.locator('[data-document-id]')).toHaveCount(20);check(true,'real_global_ui_survives_storage_outage')
   const ownGet=await post(context,'document.get_metadata',{id:changedId},v1+'queries');check(ownGet.status===200&&!!parseDocumentGetV1(changedId,ownGet.body.data),'existing_metadata_reader_independent_of_storage')
  }finally{if(pauseAttempt){report.storage_restoration='FAIL';if(inspected().State.Paused)command('docker',['unpause',storage]);const restored=inspected();check(restored.State.Running&&!restored.State.Paused&&await probe()===200,'storage_restored_running_and_http_healthy');report.storage_restoration='PASS'}}
  phase('completed_global_metadata_only')
  report.auth='REAL_PASSWORD_LOGIN_USER_JWT';report.metadata_acceptance='GLOBAL_LIBRARY_REAL';report.storage_availability='LOCAL_OUTAGE_ONLY';report.ui_widths=[390,768,1440]
 }finally{
  let failed=false
  for(const cleanup of [()=>page?.unrouteAll({behavior:'wait'}),()=>context?.close(),()=>browser?.close(),stopServer]){try{await cleanup()}catch{failed=true}}
  report.browser_cleanup=failed?'FAIL':'PASS';if(failed)throw Error('D1_GLOBAL_CLEANUP_FAILED')
 }
}
