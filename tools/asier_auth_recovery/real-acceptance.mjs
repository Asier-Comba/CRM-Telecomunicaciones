import {randomBytes,randomUUID} from 'node:crypto'
import {createServer} from 'node:net'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {chromium,expect} from '@playwright/test'
import {independentCleanup} from '../asier_documents_global/independent-cleanup.mjs'
import {authOrigin as origin,authEndpoint,authAppEnvironment,localActionLink} from './policy.mjs'

export async function realAuthRecoveryAcceptance({url,anon,service,check,report,spawn}){
 if(process.platform!=='linux'||process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENTS_GLOBAL_AUTH!=='true'||process.env.AUTH_RECOVERY_ACCEPTANCE!=='true'||process.env.DOCUMENTS_GLOBAL_SCOPE!=='AUTH_RECOVERY_ONLY'||url!==authEndpoint)throw Error('D1_GLOBAL_AUTH_DISPOSABLE_LOOPBACK_ONLY')
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const email='auth-recovery-'+randomUUID()+'@example.invalid',password=()=>randomBytes(32).toString('base64url')+'!Aa1'
 const canary='PRIVATE_SYNTHETIC_AUTH_ERROR',contexts=[]
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
  await page.waitForURL(origin+'/reset-password')
  await expect(page.getByRole('button',{name:'Actualizar password',exact:true})).toBeEnabled()
  check(new URL(page.url()).hash===''&&!new URL(page.url()).search,'callback_tokens_absent_from_reset_url')
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
  const first=await fresh(),secret=password();await first.page.goto(await link('invite'));await form(first.page,secret);await actualSession(first.ctx)
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
  await first.page.screenshot({path:resolve(captures,'induced-update-error.png'),mask:[first.page.locator('input[type="password"]')]})
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
  await third.page.screenshot({path:resolve(captures,'induced-callback-error-login.png')})
  report.scenarios={invite_actual_auth:'PASS',induced_update_error:'PASS',explicit_retry_actual_auth:'PASS',recovery_actual_auth:'PASS',induced_local_cleanup_error:'PASS'}
  report.auth_scope='ONE_SYNTHETIC_ACCOUNT_NO_WORKSPACE_GRANTS_NO_HOSTED_ACCEPTANCE'
 }finally{
  const cleanup=await independentCleanup([...contexts.map(ctx=>()=>ctx.close()),()=>browser?.close(),()=>stopServer()])
  report.auth_process_cleanup=cleanup.failed?'FAIL':'PASS'
  if(cleanup.failed)throw Error('D1_GLOBAL_AUTH_PROCESS_CLEANUP_FAILED')
 }
}
