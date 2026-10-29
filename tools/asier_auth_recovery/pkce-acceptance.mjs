import {randomBytes,randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {expect} from '@playwright/test'
import {authOrigin as origin,authEndpoint} from './policy.mjs'
import {readLocalMailJson,localRecoveryEmailLink,localPkceCodeRedirect} from './pkce-policy.mjs'
import {responseForAction} from '../asier_compat62/response-action.mjs'

// Reuses the reviewed Auth runner's Next, Chromium, contexts and independent
// teardown. The two new scenarios do not replay implicit-link acceptance.
export async function realPkceAcceptance({url,anon,admin,fresh,check,report,phase}){
 if(process.platform!=='linux'||process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENTS_GLOBAL_AUTH!=='true'||process.env.DOCUMENTS_GLOBAL_SCOPE!=='AUTH_PKCE_ONLY'||process.env.AUTH_PKCE_ACCEPTANCE!=='true'||process.env.AUTH_RECOVERY_ACCEPTANCE==='true'||url!==authEndpoint)throw Error('D1_GLOBAL_AUTH_PKCE_DISPOSABLE_ONLY')
 const secret=()=>randomBytes(32).toString('base64url')+'!Aa1'
 async function actor(){
  const value={email:'pkce-'+randomUUID()+'@example.invalid',password:secret()}
  const created=await admin.auth.admin.createUser({...value,email_confirm:true})
  check(!created.error&&!!created.data.user?.id,'pkce_local_actor_created_without_email_or_membership')
  return{...value,id:created.data.user.id}
 }
 async function identity(ctx){
  const cookies=await ctx.cookies(origin),client=createServerClient(url,anon,{cookies:{getAll:()=>cookies.map(({name,value})=>({name,value})),setAll(){}}})
  const current=await client.auth.getSession(),token=current.data.session?.access_token
  if(current.error)throw Error('D1_GLOBAL_AUTH_PKCE_COOKIE_READ_FAILED')
  if(!token)return null
  const verified=await admin.auth.getUser(token)
  if(verified.error||!verified.data.user?.id||verified.data.user.is_anonymous||!verified.data.user.email_confirmed_at)throw Error('D1_GLOBAL_AUTH_PKCE_COOKIE_NOT_VERIFIED')
  // Decode only after Auth verification; comparison never grants permissions.
  const sid=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).session_id
  if(typeof sid!=='string'||!/^[a-f0-9-]{36}$/.test(sid))throw Error('D1_GLOBAL_AUTH_PKCE_SESSION_ID_INVALID')
  return{id:verified.data.user.id,sid}
 }
 async function requestEmail(trial,value){
  await trial.page.goto(origin+'/login')
  await trial.page.getByRole('button',{name:'¿La has olvidado?',exact:true}).click()
  await trial.page.getByLabel('Email',{exact:true}).fill(value.email)
  const response=await responseForAction(()=>trial.page.waitForResponse(r=>r.url().startsWith(url+'/auth/v1/recover')&&r.request().method()==='POST'),()=>trial.page.getByRole('button',{name:'Enviar enlace',exact:true}).click())
  check(response.status()===200,'pkce_recovery_requested_by_actual_login_ui')
  await expect(trial.page.getByText('Email enviado',{exact:true})).toBeVisible()
  // Poll only receipt of this newly requested local email, never resubmit it.
  for(let attempt=0;attempt<20;attempt++){
   const list=await readLocalMailJson('/api/v1/messages')
   if(!Array.isArray(list.messages)||list.messages.length>4)throw Error('D1_GLOBAL_AUTH_PKCE_MAILBOX_INVALID')
   const matches=list.messages.filter(m=>m.To?.length===1&&m.To[0]?.Address===value.email)
   if(matches.length>1)throw Error('D1_GLOBAL_AUTH_PKCE_DUPLICATE_MAIL')
   if(matches.length===1){
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(matches[0].ID))throw Error('D1_GLOBAL_AUTH_PKCE_MAIL_ID_INVALID')
    const link=localRecoveryEmailLink(await readLocalMailJson('/api/v1/message/'+matches[0].ID),value.email)
    check(true,'pkce_email_received_only_in_local_mailpit_and_link_validated')
    return link
   }
   await new Promise(done=>setTimeout(done,250))
  }
  throw Error('D1_GLOBAL_AUTH_PKCE_LOCAL_EMAIL_NOT_RECEIVED')
 }
 function observe(trial){
  const evidence={pkce_requests:0,password_writes:0,pkce_statuses:[]}
  trial.page.on('request',request=>{
   const target=new URL(request.url());if(target.origin!==url)return
   if(target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')==='pkce'&&request.method()==='POST')evidence.pkce_requests++
   if(target.pathname==='/auth/v1/user'&&request.method()==='PUT')evidence.password_writes++
  })
  trial.page.on('response',response=>{
   const target=new URL(response.url());if(target.origin===url&&target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')==='pkce'){
    if(evidence.pkce_statuses.length<4)evidence.pkce_statuses.push(response.status())
   }
  })
  return evidence
 }
 phase('pkce_actual_login_email_reset_password_readback')
 const value=await actor(),trial=await fresh(),evidence=observe(trial)
 const link=await requestEmail(trial,value)
 check(await identity(trial.ctx)===null,'pkce_request_does_not_create_a_browser_session')
 await trial.page.goto(link)
 await trial.page.waitForURL(origin+'/reset-password')
 await expect(trial.page.getByRole('button',{name:'Actualizar password',exact:true})).toBeEnabled()
 check(evidence.pkce_requests===1&&evidence.pkce_statuses.length===1&&evidence.pkce_statuses[0]===200,'pkce_code_exchanged_exactly_once_by_real_auth')
 check(evidence.password_writes===0,'pkce_link_does_not_automatically_change_password')
 const before=await identity(trial.ctx)
 check(before?.id===value.id,'pkce_cookie_identity_verified_by_real_auth')
 await trial.page.reload()
 await expect(trial.page.getByRole('button',{name:'Actualizar password',exact:true})).toBeEnabled()
 const reloaded=await identity(trial.ctx)
 check(reloaded?.id===before.id&&reloaded?.sid===before.sid&&evidence.pkce_requests===1&&evidence.password_writes===0,'pkce_reload_preserves_identity_without_reexchange_or_write')
 const password=secret()
 await trial.page.getByLabel('Nuevo password',{exact:true}).fill(password)
 await trial.page.getByLabel('Confirmar password',{exact:true}).fill(password)
 const captures=resolve(process.env.RUNNER_TEMP,'auth-recovery-local-ui');mkdirSync(captures,{recursive:true})
 await trial.page.screenshot({path:resolve(captures,'pkce-reset-ready.png'),animations:'disabled',mask:[trial.page.locator('input[type="password"]')]})
 await trial.page.getByRole('button',{name:'Actualizar password',exact:true}).click()
 await trial.page.waitForURL(origin+'/login?status=password-updated')
 check(evidence.password_writes===1&&trial.errors()===0,'pkce_explicit_single_password_write_and_safe_login_transition')
 const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 try{
  const signed=await verifier.auth.signInWithPassword({email:value.email,password})
  check(!signed.error&&signed.data.user?.id===value.id,'pkce_changed_password_authenticates_expected_user')
  const verified=await verifier.auth.getUser()
  check(!verified.error&&verified.data.user?.id===value.id,'pkce_password_readback_verified_by_real_auth')
 }finally{await verifier.auth.signOut()}
 await trial.ctx.close()
 report.pkce_positive={result:'PASS',...evidence}

 phase('pkce_code_without_verifier_preserves_different_prior_identity')
 const recipient=await actor(),prior=await actor(),requester=await fresh()
 const otherLink=await requestEmail(requester,recipient)
 // Inspect only this local verify redirect. The verifier remains in requester;
 // it is never copied into the independent browser holding another identity.
 const verified=await fetch(otherLink,{redirect:'manual',signal:AbortSignal.timeout(10000)})
 check(verified.status===303,'pkce_second_local_email_verifies_to_code_redirect')
 const destination=localPkceCodeRedirect(verified.headers.get('location'))
 await verified.body?.cancel();await requester.ctx.close()
 const negative=await fresh(),rejected=observe(negative)
 await negative.page.goto(origin+'/login')
 await negative.page.getByLabel('Email',{exact:true}).fill(prior.email)
 await negative.page.getByLabel('Contraseña',{exact:true}).fill(prior.password)
 const signed=await responseForAction(()=>negative.page.waitForResponse(r=>{const target=new URL(r.url());return target.origin===url&&target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')==='password'&&r.request().method()==='POST'}),()=>negative.page.getByRole('button',{name:'Iniciar sesión',exact:true}).click())
 check(signed.status()===200,'pkce_previous_independent_identity_logged_in_by_ui')
 await negative.page.waitForURL(address=>address.pathname!=='/login')
 const previous=await identity(negative.ctx)
 check(previous?.id===prior.id&&previous.id!==recipient.id,'pkce_prior_identity_is_distinct_from_recovery_recipient')
 await negative.page.goto(destination)
 await expect(negative.page.getByText('Enlace no activo',{exact:true})).toBeVisible()
 const after=await identity(negative.ctx)
 check(after?.id===previous.id&&after?.sid===previous.sid,'pkce_missing_verifier_preserves_prior_identity_and_session')
 check(rejected.pkce_requests===0&&rejected.password_writes===0&&negative.errors()===0,'pkce_missing_verifier_never_exchanges_or_changes_password')
 check(await negative.page.getByRole('button',{name:'Actualizar password',exact:true}).count()===0,'pkce_missing_verifier_never_exposes_password_form')
 await negative.ctx.close()
 report.pkce_negative={result:'PASS',...rejected,prior_session:'PRESERVED'}
 report.auth_scope='TWO_NEW_PKCE_SCENARIOS_LOCAL_MAIL_ONLY_NO_MEMBERSHIPS_OR_HOSTED_ACCEPTANCE'
}
