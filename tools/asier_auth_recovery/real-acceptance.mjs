import {randomBytes,randomUUID} from 'node:crypto'
import {createServer} from 'node:net'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {chromium,expect} from '@playwright/test'
import {independentCleanup} from '../asier_documents_global/independent-cleanup.mjs'
import {authOrigin as origin,authEndpoint,authAppEnvironment,localActionLink} from './policy.mjs'
import {safeAuthLocation,safeAuthResponse} from './observation.mjs'
import {responseForAction} from '../asier_compat62/response-action.mjs'

export async function realAuthRecoveryAcceptance({url,anon,service,check,report,spawn}){
 if(process.platform!=='linux'||process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENTS_GLOBAL_AUTH!=='true'||process.env.AUTH_RECOVERY_ACCEPTANCE!=='true'||process.env.DOCUMENTS_GLOBAL_SCOPE!=='AUTH_RECOVERY_ONLY'||url!==authEndpoint)throw Error('D1_GLOBAL_AUTH_DISPOSABLE_LOOPBACK_ONLY')
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const email='auth-recovery-'+randomUUID()+'@example.invalid',password=()=>randomBytes(32).toString('base64url')+'!Aa1'
 const canary='PRIVATE_SYNTHETIC_AUTH_ERROR',contexts=[],pages=[]
 const pendingHeaderObservations=[],headerObservationState={failed:false}
 const network=[];report.auth_network=network
 let userId,server,browser,spawnFailed=false
 const phase=name=>{report.auth_phase=name;console.log(JSON.stringify({kind:'auth_recovery_progress',phase:name}))}
 async function link(type){
  const result=await admin.auth.admin.generateLink({type,email,options:{redirectTo:origin+'/auth/callback'}})
  check(!result.error&&!!result.data.user?.id,'local_'+type+'_link_generated_without_email')
  if(userId)check(result.data.user.id===userId,'recovery_links_bind_same_synthetic_user')
  else userId=result.data.user.id
  return localActionLink(result.data.properties.action_link,type)
 }
 async function fresh(){
  const ctx=await browser.newContext({viewport:{width:1440,height:960}});contexts.push(ctx)
  const page=await ctx.newPage();page.setDefaultTimeout(30000)
  pages.push(page)
  page.on('response',response=>{if(network.length<32){const safe=safeAuthResponse(response.url(),response.status(),response.headers().location);if(safe)network.push(safe)}})
  let pageErrors=0;page.on('pageerror',()=>{pageErrors++})
  return{ctx,page,errors:()=>pageErrors}
 }
 async function actualSession(ctx){
  const cookies=await ctx.cookies(origin),client=createServerClient(url,anon,{cookies:{getAll:()=>cookies.map(({name,value})=>({name,value})),setAll(){}}})
  const session=await client.auth.getSession(),token=session.data.session?.access_token
  check(!session.error&&!!token,'actual_browser_cookie_session_available')
  const verified=await admin.auth.getUser(token)
  check(!verified.error&&verified.data.user?.id===userId&&!verified.data.user.is_anonymous&&!!verified.data.user.email_confirmed_at,'actual_browser_session_verified_by_local_auth')
 }
 async function form(page,secret){
  phase('await_reset_url')
  await page.waitForURL(origin+'/reset-password')
  phase('await_reset_button_enabled')
  await expect(page.getByRole('button',{name:'Actualizar password',exact:true})).toBeEnabled()
  check(new URL(page.url()).hash===''&&!new URL(page.url()).search,'callback_tokens_absent_from_reset_url')
  phase('fill_reset_password')
  await page.getByLabel('Nuevo password',{exact:true}).fill(secret)
  await page.getByLabel('Confirmar password',{exact:true}).fill(secret)
 }
 async function passwordVerified(secret){
  const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  try{
   const result=await client.auth.signInWithPassword({email,password:secret})
   check(!result.error&&result.data.user?.id===userId,'new_password_authenticates_same_synthetic_identity')
   const verified=await client.auth.getUser()
   check(!verified.error&&verified.data.user?.id===userId,'new_password_session_readback_from_auth')
  }finally{await client.auth.signOut()}
 }
 async function stopServer(){
  if(!server||server.exitCode!==null||server.signalCode!==null||spawnFailed&&!server.pid)return
  const exited=new Promise(done=>server.once('exit',done));server.kill('SIGTERM')
  await Promise.race([exited,new Promise(done=>setTimeout(done,5000))])
  if(server.exitCode===null&&server.signalCode===null){server.kill('SIGKILL');await Promise.race([exited,new Promise(done=>setTimeout(done,5000))])}
  check(server.exitCode!==null||server.signalCode!==null,'own_auth_next_process_stopped')
 }
 try{
  phase('own_next_start_all_document_and_ai_flags_off')
  await new Promise((done,reject)=>{const probe=createServer();probe.once('error',()=>reject(Error('D1_GLOBAL_AUTH_PORT_IN_USE')));probe.listen(3000,'127.0.0.1',()=>probe.close(done))})
  const env=authAppEnvironment(process.env,anon)
  check(!Object.values(env).includes(service),'service_key_excluded_from_auth_next_environment')
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3000'],{stdio:'ignore',env})
  server.on('error',()=>{spawnFailed=true})
  let ready=false
  for(let attempt=0;attempt<20;attempt++){try{if((await fetch(origin+'/login',{signal:AbortSignal.timeout(15000)})).status===200){ready=true;break}}catch{}if(spawnFailed||server.exitCode!==null)break;await new Promise(done=>setTimeout(done,250))}
  check(ready,'own_loopback_auth_login_page_ready')
  browser=await chromium.launch()
  phase('actual_invite_callback_and_induced_update_error')
  const first=await fresh(),secret=password();const invite=await link('invite');phase('navigate_actual_invite');await first.page.goto(invite);await form(first.page,secret);await actualSession(first.ctx)
  let puts=0,induced=false
  const endpoint=url+'/auth/v1/user'
  await first.page.route(endpoint,async route=>{
   if(route.request().method()!=='PUT'){await route.continue();return}
   puts++;induced=true
   await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'validation_failed',msg:canary})})
  })
  await first.page.getByRole('button',{name:'Actualizar password',exact:true}).click()
  await expect(first.page.getByText('No se pudo confirmar el cambio',{exact:true})).toBeVisible()
  await expect(first.page.getByRole('button',{name:'Actualizar password',exact:true})).toBeEnabled()
  check(induced&&puts===1,'one_induced_put_no_implicit_retry_through_error_settlement')
  check(!(await first.page.locator('body').innerText()).includes(canary)&&first.errors()===0,'induced_provider_error_not_rendered_and_no_unhandled_page_error')
  const captures=resolve(process.env.RUNNER_TEMP,'auth-recovery-local-ui');mkdirSync(captures,{recursive:true})
  await first.page.screenshot({path:resolve(captures,'induced-update-error.png'),animations:'disabled',mask:[first.page.locator('input[type="password"]')]})
  await first.page.unroute(endpoint)
  phase('explicit_retry_actual_auth_password_write_and_readback')
  await first.page.getByRole('button',{name:'Actualizar password',exact:true}).click()
  await first.page.waitForURL(origin+'/login?status=password-updated')
  await passwordVerified(secret);await first.ctx.close()
  phase('actual_recovery_fresh_browser_context')
  const second=await fresh(),nextSecret=password();await second.page.goto(await link('recovery'));await form(second.page,nextSecret);await actualSession(second.ctx)
  await second.page.getByRole('button',{name:'Actualizar password',exact:true}).click()
  await second.page.waitForURL(origin+'/login?status=password-updated');await passwordVerified(nextSecret)
  check(second.errors()===0,'recovery_browser_no_unhandled_page_error');await second.ctx.close()
  phase('actual_session_with_induced_local_storage_cleanup_exception')
  const third=await fresh();let unexpectedPuts=0,cleanupThrew=false
  await third.ctx.exposeBinding('__observeAuthCleanup',()=>{cleanupThrew=true})
  third.page.on('request',request=>{if(request.url()===endpoint&&request.method()==='PUT')unexpectedPuts++})
  await third.ctx.addInitScript(({message})=>{
   const original=Storage.prototype.removeItem
   Storage.prototype.removeItem=function(key){
    if(key==='nowcrm-demo-mode'){void window.__observeAuthCleanup();throw new DOMException(message,'SecurityError')}
    return original.call(this,key)
   }
  },{message:canary})
  await third.page.goto(await link('recovery'))
  await expect.poll(()=>cleanupThrew).toBe(true)
  check(true,'actual_callback_cleanup_exception_injected_after_session')
  await third.page.waitForURL(origin+'/login?error=callback');await actualSession(third.ctx)
  check(third.errors()===0&&unexpectedPuts===0&&!(await third.page.locator('body').innerText()).includes(canary),'induced_local_cleanup_failure_safe_login_without_password_write')
  await third.page.screenshot({path:resolve(captures,'induced-callback-error-login.png'),animations:'disabled'})
  report.scenarios={invite_actual_auth:'PASS',induced_update_error:'PASS',explicit_retry_actual_auth:'PASS',recovery_actual_auth:'PASS',induced_local_cleanup_error:'PASS'}
  await third.ctx.close()

  phase('real_auth_pair_negative_fixtures')
  // Two additional local identities, no membership or domain commands. These
  // adversarial links combine genuine Auth sessions privately; type is not
  // proof that the fabricated link was issued as an email invitation.
  const actors=[]
  for(const name of ['a','b']){
   const actor={email:'auth-pair-'+name+'-'+randomUUID()+'@example.invalid',password:password()}
   const created=await admin.auth.admin.createUser({...actor,email_confirm:true})
   check(!created.error&&!!created.data.user?.id,'real_negative_pair_actor_created_'+name)
   actors.push({...actor,id:created.data.user.id})
  }
  async function signedIn(actor){
   const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
   const signed=await client.auth.signInWithPassword({email:actor.email,password:actor.password}),session=signed.data.session
   check(!signed.error&&session?.user.id===actor.id&&!!session.access_token&&!!session.refresh_token,'real_private_negative_fixture_password_session')
   const verified=await admin.auth.getUser(session.access_token)
   check(!verified.error&&verified.data.user?.id===actor.id,'real_private_negative_fixture_session_verified')
   check(typeof sessionId(session.access_token)==='string'&&/^[a-f0-9-]{36}$/.test(sessionId(session.access_token)),'real_private_negative_fixture_session_identity_available')
   return session
  }
  const sessionId=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).session_id
  check(actors[0].id!==actors[1].id,'real_negative_pair_actors_are_distinct')
  async function browserIdentity(ctx){
   const cookies=await ctx.cookies(origin),client=createServerClient(url,anon,{cookies:{getAll:()=>cookies.map(({name,value})=>({name,value})),setAll(){}}})
   const current=await client.auth.getSession()
   if(current.error)throw Error('D1_GLOBAL_AUTH_NEGATIVE_COOKIE_READ_FAILED')
   if(!current.data.session)return null
   const token=current.data.session.access_token,verified=await admin.auth.getUser(token)
   if(verified.error||!verified.data.user)throw Error('D1_GLOBAL_AUTH_NEGATIVE_COOKIE_NOT_VERIFIED')
   return{id:verified.data.user.id,session:sessionId(token)}
  }
  const security=[];report.security_scenarios=security
  async function rejectedPair(name,access,refresh,expectedRefreshes,{priorActor}={}){
   phase('real_pair_negative_'+name)
   const trial=await fresh(),headerObservations=[],evidence={name,result:'IN_PROGRESS',refresh_requests:0,password_writes:0,original_access_requests:0,header_observation_failure:false,credential_url_at_auth_request:false,prior_session:priorActor?'PENDING':'ABSENT'}
   security.push(evidence)
   const observePairRequest=request=>{
    const target=new URL(request.url())
    if(target.origin!==url)return
    if(target.pathname==='/auth/v1/user'&&request.method()==='PUT')evidence.password_writes++
    const refreshRequest=request.method()==='POST'&&target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')==='refresh_token'
    if(refreshRequest)evidence.refresh_requests++
    const address=new URL(trial.page.url()),credentialUrl=address.hash.includes('access_token=')||address.hash.includes('refresh_token=')
    if(refreshRequest&&credentialUrl)evidence.credential_url_at_auth_request=true
    // An unrelated prior-session read is not admission of the link's access.
    // Capture URL state BEFORE awaiting the complete sensitive header set.
    if(target.pathname==='/auth/v1/user'&&request.method()==='GET'){
     if(headerObservations.length>=32){evidence.header_observation_failure=true;headerObservationState.failed=true;return}
     const observed=Promise.resolve().then(()=>request.allHeaders()).then(headers=>{
      if(headers.authorization==='Bearer '+access){evidence.original_access_requests++;if(credentialUrl)evidence.credential_url_at_auth_request=true}
     }).catch(()=>{evidence.header_observation_failure=true;headerObservationState.failed=true})
     headerObservations.push(observed);pendingHeaderObservations.push(observed)
    }
   }
   trial.page.on('request',observePairRequest)
   let prior=null
   if(priorActor){
    await trial.page.goto(origin+'/login')
    await trial.page.locator('input[type="email"]').fill(priorActor.email)
    await trial.page.locator('input[type="password"]').fill(priorActor.password)
    await trial.page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
    await expect.poll(async()=>{try{return(await browserIdentity(trial.ctx))?.id===priorActor.id}catch{return false}}).toBe(true)
    prior=await browserIdentity(trial.ctx)
    check(prior?.id===priorActor.id,'real_prior_browser_identity_established_without_membership_commands')
   }
   const fragment=new URLSearchParams({type:'recovery',access_token:access,refresh_token:refresh})
   await responseForAction(()=>trial.page.waitForURL(origin+'/login?error=callback'),()=>trial.page.goto(origin+'/auth/callback#'+fragment))
   await expect(trial.page.getByRole('button',{name:'Iniciar sesión',exact:true})).toBeVisible()
   const after=await browserIdentity(trial.ctx),address=new URL(trial.page.url())
   trial.page.off('request',observePairRequest)
   await Promise.all(headerObservations)
   check(!evidence.header_observation_failure&&evidence.original_access_requests===(priorActor?0:1),'real_original_access_header_coverage_'+name)
   check(address.origin===origin&&address.pathname==='/login'&&!address.hash&&!address.searchParams.has('access_token')&&!address.searchParams.has('refresh_token'),'real_negative_pair_returns_to_token_free_login_'+name)
   check(prior?after?.id===prior.id&&after?.session===prior.session:after===null,'real_negative_pair_preserves_prior_or_absent_cookie_session_'+name)
   check(evidence.password_writes===0&&trial.errors()===0&&evidence.refresh_requests===expectedRefreshes&&!evidence.credential_url_at_auth_request,'real_negative_pair_no_password_write_or_early_link_credential_request_'+name)
   evidence.result='PASS';evidence.prior_session=prior?'PRESERVED':'ABSENT'
   await trial.ctx.close()
  }
  const invalidAccessSession=await signedIn(actors[0]),pieces=invalidAccessSession.access_token.split('.'),signature=pieces[2]
  pieces[2]=(signature[0]==='A'?'B':'A')+signature.slice(1)
  await rejectedPair('invalid_access_signature',pieces.join('.'),invalidAccessSession.refresh_token,0)
  const invalidRefreshSession=await signedIn(actors[0])
  await rejectedPair('invalid_refresh',invalidRefreshSession.access_token,'synthetic-invalid-refresh',1)
  const foreignAccess=await signedIn(actors[0]),foreignRefresh=await signedIn(actors[1])
  check(foreignAccess.user.id!==foreignRefresh.user.id&&sessionId(foreignAccess.access_token)!==sessionId(foreignRefresh.access_token),'real_foreign_identity_pair_fixture')
  await rejectedPair('different_identity',foreignAccess.access_token,foreignRefresh.refresh_token,1)
  const sameAccess=await signedIn(actors[0]),sameRefresh=await signedIn(actors[0])
  check(sameAccess.user.id===sameRefresh.user.id&&sessionId(sameAccess.access_token)!==sessionId(sameRefresh.access_token),'real_same_identity_different_session_pair_fixture')
  await rejectedPair('same_identity_different_session',sameAccess.access_token,sameRefresh.refresh_token,1)
  const priorLink=await signedIn(actors[0])
  await rejectedPair('prior_identity_preserved',priorLink.access_token,priorLink.refresh_token,0,{priorActor:actors[1]})
  check(security.length===5&&security.every(s=>s.result==='PASS'),'all_five_real_pair_negative_scenarios_accepted')
  report.auth_scope='ONE_POSITIVE_LINK_ACTOR_TWO_PAIR_NEGATIVE_ACTORS_NO_MEMBERSHIP_COMMANDS_NO_HOSTED_ACCEPTANCE'
 }catch(error){
  const page=pages.at(-1)
  report.auth_failure_kind=error?.name==='TimeoutError'?'TIMEOUT':'OTHER'
  if(page&&!page.isClosed()){
   const observation={location:safeAuthLocation(page.url())}
   try{
    observation.reset_button_count=await page.getByRole('button',{name:'Actualizar password',exact:true}).count()
    observation.inactive_link_count=await page.getByText('Enlace no activo',{exact:true}).count()
    observation.safe_callback_message_count=await page.getByText('No se ha podido confirmar la sesión.',{exact:true}).count()
    observation.password_input_count=await page.locator('input[type="password"]').count()
   }catch{observation.dom_read='UNAVAILABLE'}
   report.auth_failure_observation=observation
  }
  throw error
 }finally{
  const cleanup=await independentCleanup([...contexts.map(ctx=>()=>ctx.close()),async()=>{
   await Promise.all(pendingHeaderObservations)
   report.auth_header_observation_cleanup=headerObservationState.failed?'FAIL':'PASS'
   if(headerObservationState.failed)throw Error('D1_GLOBAL_AUTH_HEADER_OBSERVATION_FAILED')
  },()=>browser?.close(),()=>stopServer()])
  report.auth_process_cleanup=cleanup.failed?'FAIL':'PASS'
  if(cleanup.failed)throw Error('D1_GLOBAL_AUTH_PROCESS_CLEANUP_FAILED')
 }
}
