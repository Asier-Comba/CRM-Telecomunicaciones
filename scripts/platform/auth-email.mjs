import { randomBytes, randomUUID } from 'node:crypto'
const api='http://127.0.0.1:54321', mail='http://127.0.0.1:54324', callback='http://127.0.0.1:3000/auth/callback'
export const redirectAttacks=['https://evil.example','//evil.example','http://%31%32%37.0.0.1:3000/auth/callback','http://127.0.0.1:3000@evil.example/auth/callback','http://127.0.0.1.evil.example:3000/auth/callback','javascript:alert(1)','data:text/html,hi','http://localhost:3000/auth/callback']
export function authLink(link) {
  const u=new URL(link)
  if(/[\\%\x00-\x20]/.test(link.split('?')[0]) || u.origin!==api || u.pathname!=='/auth/v1/verify' || u.username || u.password || u.hash)throw new Error('EMAIL_LINK_ORIGIN')
  const redirect=u.searchParams.get('redirect_to')
  if(redirect && !['http://127.0.0.1:3000',callback].includes(redirect))throw new Error('EMAIL_REDIRECT_OUTSIDE_ALLOWLIST')
  if([...u.searchParams.keys()].some(k=>!['token','type','redirect_to'].includes(k)) || !u.searchParams.get('token'))throw new Error('EMAIL_LINK_SHAPE')
  return u
}
export function safeHeader(value) {return typeof value==='string'&&value.length>0&&!/[\x00-\x1f\x7f]/.test(value)}
export async function authEmail({anon,service,privateValues=[]}) {
 let count=0
 function check(ok,name){if(!ok)throw new Error(`MAIL_${name}`);count++}
 async function request(path,body,token=anon,method='POST') {
  const r=await fetch(api+path,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:token===service?service:anon,authorization:`Bearer ${token}`,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});let json;try{json=await r.json()}catch{}return {status:r.status,json}
 }
 const password=()=>randomBytes(24).toString('base64url')+'aA1!'
 const signupEmail=`confirm-${randomUUID()}@example.invalid`, initial=password()
 async function capture(email,subject) {
  for(let attempt=0;attempt<30;attempt++) {
   const r=await fetch(mail+'/api/v1/messages',{signal:AbortSignal.timeout(5000)});check(r.ok,'MAILPIT_API')
   const list=await r.json(), summary=list.messages?.find(m=>m.Subject===subject && m.To?.some(t=>t.Address===email))
   if(summary){const rr=await fetch(mail+'/api/v1/message/'+encodeURIComponent(summary.ID),{signal:AbortSignal.timeout(5000)});check(rr.ok,'MAILPIT_MESSAGE');const msg=await rr.json()
    check(msg.To?.length===1 && msg.To[0].Address===email && email.endsWith('@example.invalid'),'SYNTHETIC_RECIPIENT')
    check(msg.Subject===subject,'SUBJECT');const html=msg.HTML||'',raw=JSON.stringify(msg)
    for(const value of [service,...privateValues])if(value&&value.length>8)check(!raw.includes(value),'PRIVATE_VALUE_ABSENT')
    check(!html.includes('<script')&&!html.includes('raw_user_meta_data')&&!html.includes('workspace_id')&&!html.includes('untrusted-ignored')&&!html.includes('<img'),'MINIMAL_TEMPLATE')
    const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'))
    check(links.length===1,'ONE_ACTION_LINK');const u=authLink(links[0]);return u
   }
   await new Promise(r=>setTimeout(r,200))
  }throw new Error('MAIL_CAPTURE_TIMEOUT')
 }
 async function consume(link) {
  const r=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(10000)})
  check(r.status===302 || r.status===303,'LINK_REDIRECT');const to=new URL(r.headers.get('location'))
  check(to.origin==='http://127.0.0.1:3000' && ['', '/', '/auth/callback'].includes(to.pathname),'FINAL_LOCAL_REDIRECT')
  const fragment=new URLSearchParams(to.hash.slice(1));return {token:fragment.get('access_token'),error:fragment.get('error')||fragment.get('error_code')}
 }
 const sign=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(callback),{email:signupEmail,password:initial,data:{workspace_id:'untrusted-ignored',display_name:'<img src=x onerror=alert(1)>'}})
 check(sign.status===200 && !sign.json?.access_token,'SIGNUP_UNCONFIRMED')
 check((await request('/auth/v1/token?grant_type=password',{email:signupEmail,password:initial})).status>=400,'UNCONFIRMED_LOGIN_DENIED')
 const confirmed=await consume(await capture(signupEmail,'W4 confirmation'));check(!!confirmed.token&&!confirmed.error,'CONFIRMATION_COMPLETED')
 const login=await request('/auth/v1/token?grant_type=password',{email:signupEmail,password:initial});check(login.status===200&&!!login.json?.access_token,'CONFIRMED_LOGIN')
 const membership=await request('/rest/v1/workspace_members?select=workspace_id',undefined,login.json.access_token,'GET');check(membership.status===200&&membership.json?.length===0,'NO_TENANT_FROM_USER_METADATA')
 await new Promise(r=>setTimeout(r,1100))
 check((await request('/auth/v1/recover?redirect_to='+encodeURIComponent(callback),{email:signupEmail})).status===200,'RESET_REQUEST')
 const recovery=await capture(signupEmail,'W4 recovery'), recoverySession=await consume(recovery);check(!!recoverySession.token&&!recoverySession.error,'RECOVERY_SESSION')
 const replacement=password();check((await request('/auth/v1/user',{password:replacement},recoverySession.token,'PUT')).status===200,'RESET_COMPLETED')
 check((await request('/auth/v1/token?grant_type=password',{email:signupEmail,password:initial})).status>=400,'OLD_PASSWORD_DENIED')
 check((await request('/auth/v1/token?grant_type=password',{email:signupEmail,password:replacement})).status===200,'NEW_PASSWORD_ACCEPTED')
 const replay=await consume(recovery);check(!replay.token&&!!replay.error,'RESET_LINK_SINGLE_USE')
 const oldSession=await request('/auth/v1/user',undefined,login.json.access_token,'GET')
 check([200,401,403].includes(oldSession.status),'OBSERVED_OLD_SESSION')
 const inviteEmail=`invite-${randomUUID()}@example.invalid`
 check((await request('/auth/v1/invite?redirect_to='+encodeURIComponent(callback),{email:inviteEmail},service)).status===200,'INVITE_REQUEST')
 const invite=await consume(await capture(inviteEmail,'W4 invite'));check(!!invite.token&&!invite.error,'INVITE_ACCEPT')
 const invitedMembership=await request('/rest/v1/workspace_members?select=workspace_id',undefined,invite.token,'GET');check(invitedMembership.status===200&&invitedMembership.json?.length===0,'INVITE_NOT_WORKSPACE_AUTHORITY')
 // Provider may reject or safely replace a disallowed redirect; it must never emit it.
 for(const bad of redirectAttacks) {
  const email=`redirect-${randomUUID()}@example.invalid`
  const r=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(bad),{email,password:password()})
  if(r.status===200)await capture(email,'W4 confirmation');else check(r.status>=400&&r.status<500,'REDIRECT_REJECT')
 }
 const absent=await request('/auth/v1/recover',{email:`unknown-${randomUUID()}@example.invalid`});check(absent.status===200,'RECOVERY_EXISTENCE_RESPONSE')
 return {AUTH_EMAIL_LOCAL:'PASS',SIGNUP:'PASS',CONFIRMATION:'PASS',RESET:'PASS',INVITE:'PASS',REDIRECT_DENIALS:redirectAttacks.length,SECRET_SCAN:'PASS',EXTERNAL_SENDS:0,checks:count,old_session_after_reset:oldSession.status===200?'JWT_REMAINS_VALID_UNTIL_PLATFORM_REVOCATION_OR_EXPIRY':'DENIED',account_enumeration:'RECOVERY_STATUS_ONLY_SIGNUP_PROVIDER_DEFINED',production_smtp:'NOT_TESTED'}
}
