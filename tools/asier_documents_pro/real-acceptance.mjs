import {randomBytes,randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createClient} from '@supabase/supabase-js'
import {createServerClient,parseCookieHeader} from '@supabase/ssr'
import {chromium,expect} from '@playwright/test'
import {parseDocumentListV1,parseDocumentGetV1,parseDocumentReceiptV1} from '../../src/lib/server/document-runtime-v1.ts'

// This is availability and scoped product acceptance, never hosted Storage security approval.
export async function realDocumentsAcceptance({url,anon,service,sql,command,check,report,spawn}){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENTS_PRO_D1!=='true'||url!=='http://127.0.0.1:54321')throw Error('D1_DISPOSABLE_LOOPBACK_ONLY')
 const origin='http://127.0.0.1:3187',wa=randomUUID(),wb=randomUUID(),ca=randomUUID(),otherA=randomUUID(),emptyA=randomUUID(),cb=randomUUID()
 const owner=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),users={}
 const phase=name=>{report.document_phase=name;console.log(JSON.stringify({kind:'documents_d1_progress',phase:name}))}
 const api='/api/document/v1/',listInput=(id,status='active',after)=>({target_kind:'customer',target_id:id,status,limit:20,...(after?{after_id:after}:{})})
 let server,browser,context,page
 const screenshots=resolve(process.env.RUNNER_TEMP,'documents-pro-d1-ui');mkdirSync(screenshots,{recursive:true})
 async function post(ctx,kind,operation,input){
  const response=await ctx.request.post(origin+api+kind,{headers:{Origin:origin},data:{operation,input},timeout:15000})
  let body;try{body=await response.json()}catch{throw Error('D1_INVALID_JSON')}
  return{status:response.status(),body}
 }
 async function listed(ctx,id,status='active'){
  const input=listInput(id,status),r=await post(ctx,'queries','document.list',input)
  check(r.status===200&&r.body.ok===true&&!!parseDocumentListV1(input,r.body.data),'authorized_list_contract')
  return r.body.data
 }
 async function login(user){
  const ctx=await browser.newContext({viewport:{width:1440,height:960}}),p=await ctx.newPage();p.setDefaultTimeout(30000)
  await p.goto(origin+'/login');await p.locator('input[type="email"]').fill(user.email);await p.locator('input[type="password"]').fill(user.password)
  await p.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await p.waitForURL('**/dashboard')
  return{ctx,p}
 }
 async function verifiedCookieToken(cookies){
  const client=createServerClient(url,anon,{cookies:{getAll:()=>cookies.map(({name,value})=>({name,value})),setAll(){}}})
  const {data,error}=await client.auth.getSession(),token=data.session?.access_token
  check(!error&&!!token,'browser_session_token_available')
  // Session is only a token source here. Auth server verifies identity; DB decides access.
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()),verified=await owner.auth.getUser(token)
  check(!verified.error&&verified.data.user?.id===users.ownerA.id&&claims.exp>Date.now()/1000,'browser_jwt_verified_live')
  return token
 }
 async function stopServer(){
  if(!server||server.exitCode!==null||server.signalCode!==null)return
  const exited=new Promise(accept=>server.once('exit',accept));server.kill('SIGTERM')
  await Promise.race([exited,new Promise(accept=>setTimeout(accept,5000))])
  if(server.exitCode===null){server.kill('SIGKILL');await Promise.race([exited,new Promise(accept=>setTimeout(accept,5000))])}
  check(server.exitCode!==null||server.signalCode!==null,'own_next_process_stopped')
 }
 try{
  phase('synthetic_auth_setup')
  for(const [name,workspace,role] of [['ownerA',wa,'owner'],['memberA',wa,'member'],['viewerA',wa,'viewer'],['ownerB',wb,'owner']]){
   const email='documents-d1-'+name.toLowerCase()+'@example.invalid',password=randomBytes(32).toString('base64url')
   const {data,error}=await owner.auth.admin.createUser({email,password,email_confirm:true})
   check(!error&&!!data.user?.id,'synthetic_user_created_'+name)
   users[name]={id:data.user.id,email,password,workspace,role}
  }
  sql(`begin;insert into public.workspaces(id,name,slug)values('${wa}','Documents D1 Synthetic A','documents-d1-a'),('${wb}','Documents D1 Synthetic B','documents-d1-b');
   insert into public.workspace_members(workspace_id,user_id,role,status)values ${Object.values(users).map(u=>`('${u.workspace}','${u.id}','${u.role}','active')`).join(',')};
   ${Object.values(users).map(u=>`update public.profiles set workspace_id='${u.workspace}'where id='${u.id}';`).join('')}
   insert into public.customers(id,workspace_id,account_kind,legal_name,lifecycle,status,source)values
   ('${ca}','${wa}','legal_entity','Documents Synthetic A','customer','active','manual'),('${otherA}','${wa}','legal_entity','Documents Synthetic Other A','customer','active','manual'),('${emptyA}','${wa}','legal_entity','Documents Synthetic Empty A','customer','active','manual'),('${cb}','${wb}','legal_entity','Documents Synthetic B','customer','active','manual');commit;`)
  const docs=Array.from({length:123},()=>randomUUID()).sort(),otherDocs=Array.from({length:7},()=>randomUUID()),foreignDocs=Array.from({length:3},()=>randomUUID()),archived=randomUUID()
  const rows=[...docs.map(id=>[id,wa,ca,'active',users.ownerA.id]),...otherDocs.map(id=>[id,wa,otherA,'active',users.ownerA.id]),...foreignDocs.map(id=>[id,wb,cb,'active',users.ownerB.id]),[archived,wa,ca,'archived',users.ownerA.id]]
  // Explicit metadata fixtures, no successful upload or bytes-integrity claim.
  sql(`insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path,status,archived_at,created_by_user_id)values ${rows.map(([id,w,c,status,actor])=>`('${id}','${w}','${c}','contract','PRIVATE_D1_METADATA_FIXTURE.pdf','application/pdf',1024,'${w}/${id}/${randomUUID()}','${status}',${status==='archived'?'now()':'null'},'${actor}')`).join(',')};`)
  report.fixtures={workspaces:2,roles:4,target_active:123,other_target_active:7,foreign_active:3,archived:1,bytes:'NOT_CREATED_METADATA_ONLY'}
  phase('own_next_start')
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','RUNNER_TEMP','CI'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]))
  Object.assign(env,{NODE_ENV:'development',APP_ENV:'test',PRODUCT_STAGING_INTEGRATION:'false',PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_V1_ENABLED:'true',PRODUCT_DOCUMENT_CONTENT_ENABLED:'false',PRODUCT_DOCUMENT_MAINTENANCE_ENABLED:'false',PRODUCT_V1_ORIGIN:origin,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_ENABLE_DEMO_DATA:'false',NEXT_PUBLIC_FORCE_OFFLINE_DEV:'false',NEXT_TELEMETRY_DISABLED:'1',AI_PRODUCT_V2_ENABLED:'false',OPENAI_API_KEY:''})
  check(!Object.values(env).includes(service),'service_key_not_in_next_environment')
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3187'],{stdio:'ignore',env})
  let ready=false
  for(let attempt=0;attempt<20;attempt++){
   try{const r=await fetch(origin+api+'queries',{method:'POST',signal:AbortSignal.timeout(15000)});if(r.status===403){ready=true;break}}catch{}
   if(server.exitCode!==null)break;await new Promise(accept=>setTimeout(accept,250))
  }
  check(ready,'own_next_metadata_transport_ready')
  // Warm the login/command routes without granting or mutating anything.
  check((await fetch(origin+'/login',{signal:AbortSignal.timeout(30000)})).status===200,'login_route_ready')
  check((await fetch(origin+api+'commands',{method:'POST',signal:AbortSignal.timeout(30000)})).status===403,'anonymous_command_denied')
  browser=await chromium.launch()
  phase('owner_actual_browser_login')
  ;({ctx:context,p:page}=await login(users.ownerA));check(true,'owner_real_login')
  phase('scoped_123_all_pages')
  let queries=0
  const observe=request=>{if(request.url()===origin+api+'queries'&&request.method()==='POST'){try{if(request.postDataJSON().operation==='document.list')queries++}catch{}}}
  page.on('request',observe)
  await page.goto(origin+'/documents?customer='+ca);await expect(page.locator('[data-document-id]')).toHaveCount(20)
  const seen=[]
  for(let n=1;n<=7;n++){
   await expect(page.getByText('Página '+n+' · Hasta 20 documentos',{exact:true})).toBeVisible()
   seen.push(...await page.locator('[data-document-id]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-document-id'))))
   if(n<7){await page.getByRole('button',{name:'Siguiente página de documentos',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',docs[n*20])}
  }
  check(JSON.stringify(seen)===JSON.stringify(docs)&&new Set(seen).size===123&&queries===7,'one_target_123_exactly_seven_pages_no_fanout')
  await expect(page.getByRole('button',{name:'Siguiente página de documentos',exact:true})).toBeDisabled()
  page.off('request',observe)
  await page.getByRole('button',{name:'Volver al inicio del listado',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',docs[0])
  await page.getByRole('button',{name:'Siguiente página de documentos',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',docs[20]);await page.reload()
  await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',docs[20]);await page.getByRole('button',{name:'Página anterior de documentos',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',docs[0]);check(true,'real_reload_and_previous_page')
  phase('loaded_responsive_ui')
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:960});await expect(page.locator('[data-document-id]')).toHaveCount(20)
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'loaded_no_horizontal_overflow_'+width)
   await page.screenshot({path:resolve(screenshots,'inventory-'+width+'.png'),fullPage:false})
   const trigger=page.locator('[data-document-id]').first().getByRole('button',{name:'Ver metadatos',exact:true});await trigger.click()
   const drawer=page.getByRole('dialog',{name:'Metadatos del documento',exact:true});await expect(drawer).toBeVisible();await expect(drawer.getByRole('link',{name:'Abrir registro vinculado',exact:true})).toHaveAttribute('href','/clients/'+ca)
   await page.screenshot({path:resolve(screenshots,'metadata-'+width+'.png'),fullPage:false});await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);await expect(trigger).toBeFocused();check(true,'loaded_drawer_escape_focus_'+width)
  }
  check(await page.getByRole('button',{name:'Descargar archivo privado',exact:true}).count()===0&&await page.getByRole('button',{name:'Subir documento local',exact:true}).count()===0,'private_byte_controls_off')
  phase('empty_archive_and_tenant_contracts')
  await page.goto(origin+'/documents?customer='+emptyA);await expect(page.getByText('Sin documentos activos en esta página',{exact:true})).toBeVisible();check(true,'empty_target_not_global_workspace')
  await page.goto(origin+'/documents?customer='+ca);await expect(page.locator('[data-document-id]')).toHaveCount(20);await page.getByLabel('Estado de documentos',{exact:true}).selectOption('archived');await expect(page.locator('[data-document-id]')).toHaveCount(1);await page.reload();await expect(page.getByLabel('Estado de documentos',{exact:true})).toHaveValue('archived');await expect(page.locator('[data-document-id]')).toHaveCount(1);check(true,'real_archive_filter_reload')
  const deniedList=await listed(context,cb);check(deniedList.items.length===0,'foreign_target_list_empty')
  const ownGet=await post(context,'queries','document.get_metadata',{id:docs[0]});check(ownGet.status===200&&ownGet.body.ok&&!!parseDocumentGetV1(docs[0],ownGet.body.data),'own_metadata_positive_contract')
  const deniedGet=await post(context,'queries','document.get_metadata',{id:foreignDocs[0]});check(deniedGet.status===404&&deniedGet.body.error==='not_found','foreign_metadata_not_found')
  const foreignWrite=await post(context,'commands','document.archive',{id:foreignDocs[0],command_id:randomUUID(),expected_version:1});check([403,404].includes(foreignWrite.status)&&['access_denied','not_found'].includes(foreignWrite.body.error),'foreign_write_denied_without_internal_error')
  check(sql(`select version::text from public.documents where id='${foreignDocs[0]}'`)==='1','foreign_document_unchanged')
  const b=await login(users.ownerB)
  try{const own=await listed(b.ctx,cb);check(own.items.length===3&&own.items.every(d=>foreignDocs.includes(d.id)),'tenant_b_positive_documents');check((await listed(b.ctx,ca)).items.length===0,'tenant_b_cannot_list_a')}finally{await b.ctx.close()}
  for(const name of ['memberA','viewerA']){
   const limited=await login(users[name])
   try{
    await limited.p.goto(origin+'/documents?customer='+ca);await expect(limited.p.getByText('Documentos disponibles para administradores del espacio.',{exact:true})).toBeVisible();await expect(limited.p.locator('[data-document-id]')).toHaveCount(0)
    const read=await post(limited.ctx,'queries','document.list',listInput(ca)),write=await post(limited.ctx,'commands','document.archive',{id:docs[0],command_id:randomUUID(),expected_version:1})
    check(read.status===403&&read.body.error==='access_denied'&&write.status===403&&write.body.error==='access_denied','current_role_ui_and_server_denied_'+name)
   }finally{await limited.ctx.close()}
  }
  phase('committed_archive_lost_response_exact_replay')
  await page.goto(origin+'/documents?customer='+ca);await expect(page.locator('[data-document-id]')).toHaveCount(20)
  const inputs=[];let routeFailure=false
  await page.route(origin+api+'commands',async route=>{
   const request=route.request().postDataJSON()
   if(request.operation!=='document.archive'){await route.continue();return}
   inputs.push(request.input)
   if(inputs.length===1){try{const response=await route.fetch({timeout:15000});const body=await response.json();routeFailure=response.status()!==200||!body.ok||!parseDocumentReceiptV1('document.archive',request.input,body.receipt)}catch{routeFailure=true}finally{await route.abort('failed')}}else await route.continue()
  })
  await page.locator('[data-document-id]').first().getByRole('button',{name:'Archivar documento',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click()
  await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeVisible()
  check(!routeFailure&&sql(`select version::text||':'||status from public.documents where id='${docs[0]}'`)==='2:archived','archive_committed_before_lost_response')
  await expect(page.getByLabel('Estado de documentos',{exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(page.getByText('Metadatos actualizados.',{exact:true})).toBeVisible();await page.unrouteAll({behavior:'wait'})
  check(inputs.length===2&&JSON.stringify(inputs[0])===JSON.stringify(inputs[1])&&inputs[0].id===docs[0],'uncertain_retry_exact_same_intent')
  check(sql(`select count(*)from public.product_commands where workspace_id='${wa}'and command_id='${inputs[0].command_id}'`)==='1'&&sql(`select version from public.documents where id='${docs[0]}'`)==='2','uncertain_retry_one_command_one_effect')
  await page.getByLabel('Estado de documentos',{exact:true}).selectOption('archived');const archivedRow=page.locator('[data-document-id="'+docs[0]+'"]');await expect(archivedRow).toBeVisible();await archivedRow.getByRole('button',{name:'Restaurar documento',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(archivedRow).toHaveCount(0)
  check(sql(`select version::text||':'||status from public.documents where id='${docs[0]}'`)==='3:active','restore_real_readback')
  const stale=await post(context,'commands','document.archive',{id:docs[0],command_id:randomUUID(),expected_version:1});check(stale.status===409&&stale.body.error==='conflict'&&sql(`select version from public.documents where id='${docs[0]}'`)==='3','stale_cas_denied_without_change')
  phase('same_live_jwt_membership_revocation')
  await page.getByLabel('Estado de documentos',{exact:true}).selectOption('active');await expect(page.locator('[data-document-id]')).toHaveCount(20)
  const token=await verifiedCookieToken(await context.cookies(origin))
  try{
   sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
   const verified=await owner.auth.getUser(token);check(!verified.error&&verified.data.user?.id===users.ownerA.id,'same_revoked_membership_jwt_still_auth_valid')
   const response=page.waitForResponse(r=>r.url()===origin+api+'queries'&&r.request().postDataJSON()?.operation==='document.list')
   await page.getByRole('button',{name:'Actualizar documentos',exact:true}).click()
   const denied=await response,request=denied.request(),headers=await request.allHeaders(),body=request.postDataJSON()
   const requestToken=await verifiedCookieToken(parseCookieHeader(headers.cookie??''))
   check(requestToken===token&&denied.status()===403&&body.operation==='document.list'&&JSON.stringify(body.input)===JSON.stringify(listInput(ca)),'exact_request_same_live_jwt_target_server_403')
   await expect(page.locator('[data-document-id]')).toHaveCount(0);await expect(page.getByRole('alert')).toBeVisible();check(true,'revocation_withdraws_loaded_rows')
  }finally{
   sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
   check(sql(`select count(*)from public.workspace_members where workspace_id='${wa}'and user_id='${users.ownerA.id}'and status='active'`)==='1','own_membership_restored')
  }
  await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  phase('local_storage_outage_metadata_independence')
  const storage='supabase_storage_crm-telecom-local'
  const inspected=()=>JSON.parse(command('docker',['inspect',storage]))[0]
  const initial=inspected();check(initial.Name==='/'+storage&&/supabase\/storage-api:/.test(initial.Config.Image)&&initial.State.Running&&!initial.State.Paused,'exact_disposable_storage_running_unpaused')
  const probe=async()=>{try{return(await fetch(url+'/storage/v1/bucket',{headers:{apikey:anon,Authorization:'Bearer '+token},signal:AbortSignal.timeout(3000)})).status}catch{return 0}}
  check(await probe()===200,'storage_healthy_before_outage')
  let pauseAttempt=false
  try{
   pauseAttempt=true;command('docker',['pause',storage]);check(inspected().State.Paused===true,'exact_storage_pause_confirmed')
   const unavailable=await probe();check(unavailable===0||unavailable>=500,'storage_actually_unavailable')
   const response=page.waitForResponse(r=>r.url()===origin+api+'queries'&&r.request().postDataJSON()?.operation==='document.list')
   await page.getByRole('button',{name:'Actualizar documentos',exact:true}).click();const r=await response,body=await r.json();check(r.status()===200&&!!parseDocumentListV1(listInput(ca),body.data),'metadata_real_http_during_storage_outage');await expect(page.locator('[data-document-id]')).toHaveCount(20);check(true,'metadata_ui_survives_storage_outage')
  }finally{
   if(pauseAttempt){report.storage_restoration='FAIL';if(inspected().State.Paused)command('docker',['unpause',storage]);const restored=inspected();check(restored.State.Running&&!restored.State.Paused&&await probe()===200,'storage_restored_and_healthy');report.storage_restoration='PASS'}
  }
  phase('completed_scoped_only')
  report.auth='REAL_PASSWORD_LOGIN_USER_JWT';report.metadata_acceptance='SCOPED_TARGET_ONLY';report.storage_availability='LOCAL_OUTAGE_ONLY';report.ui_widths=[390,768,1440]
 }finally{
  let cleanupFailed=false
  for(const cleanup of [()=>page?.unrouteAll({behavior:'wait'}),()=>context?.close(),()=>browser?.close(),stopServer]){
   try{await cleanup()}catch{cleanupFailed=true}
  }
  report.browser_cleanup=cleanupFailed?'FAIL':'PASS'
  if(cleanupFailed)throw Error('D1_CLEANUP_FAILED')
 }
}
