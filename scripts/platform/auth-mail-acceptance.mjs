import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {disposableGuard,root,run} from './lib.mjs'

// Separate empty runner: temporary local settings cannot change shared Auth policy.
disposableGuard()
const scratch=mkdtempSync(join(tmpdir(),'w5-auth-mail-')),evidence={scope:'LOCAL_SUPABASE_MAILPIT',source_sha:run('git',['rev-parse','HEAD']).trim(),status:'NOT_RUN',checks:[],external_deliverability:'NOT_PROVEN'}
let started=false
const requireProof=(ok,name)=>{if(!ok)throw new Error(name);evidence.checks.push({name,status:'PASS'})}
function cli(args){const r=spawnSync('supabase',[...args,'--workdir',scratch],{encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024});if(r.status!==0)throw new Error('LOCAL_MAIL_STACK_COMMAND_FAILED');return r.stdout}
const api='http://127.0.0.1:54321',mailbox='http://127.0.0.1:54324'
async function request(path,key,body){return fetch(api+path,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)})}
async function message(email,subject){
 for(let i=0;i<40;i++){
  const r=await fetch(mailbox+'/api/v1/messages',{signal:AbortSignal.timeout(2000)});if(!r.ok)throw new Error('LOCAL_MAILBOX_UNAVAILABLE')
  const found=(await r.json()).messages?.find(m=>m.Subject===subject&&m.To?.some(t=>t.Address===email))
  if(found){const detail=await fetch(mailbox+'/api/v1/message/'+encodeURIComponent(found.ID),{signal:AbortSignal.timeout(2000)});return detail.json()}
  await new Promise(r=>setTimeout(r,250))
 }throw new Error('LOCAL_MAIL_CAPTURE_TIMEOUT')
}
function verificationLink(m){const href=m.HTML?.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');const u=new URL(href);if(u.origin!==api||u.pathname!=='/auth/v1/verify')throw new Error('AUTH_MAIL_LINK_INVALID');return u}
async function verify(link){const response=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(15000)});if(response.status!==302)throw new Error('AUTH_MAIL_VERIFY_STATUS');return new URL(response.headers.get('location'))}
try{
 cpSync(join(root,'supabase'),join(scratch,'supabase'),{recursive:true,filter:p=>!p.includes('.temp')&&!p.includes('.branches')});cpSync(join(root,'infra/email'),join(scratch,'infra/email'),{recursive:true})
 const config=readFileSync(join(scratch,'supabase/config.toml'),'utf8')+'\n[inbucket]\nenabled = true\nport = 54324\n[auth.email]\nenable_signup = true\nenable_confirmations = true\nmax_frequency = "1m"\notp_expiry = 60\n'+['confirmation','recovery','invite'].map(n=>`[auth.email.template.${n}]\nsubject = "W5 ${n}"\ncontent_path = "./infra/email/${n}.html"`).join('\n')+'\n'
 writeFileSync(join(scratch,'supabase/config.toml'),config)
 requireProof(run('supabase',['--version']).trim()==='2.119.0','CLI_PIN')
 requireProof(!run('docker',['ps','-a','--format','{{.Names}}']).includes('crm-telecom-local'),'EMPTY_LOCAL_TARGET')
 started=true;cli(['start','--exclude','realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor'])
 const status=JSON.parse(cli(['status','--output','json'])),anon=status.ANON_KEY,service=status.SERVICE_ROLE_KEY
 requireProof(status.API_URL===api&&!!anon&&!!service,'LOCAL_IDENTITY')
 const password=randomBytes(32).toString('base64url'),email=`mail-${randomBytes(8).toString('hex')}@example.invalid`
 requireProof((await request('/auth/v1/signup?redirect_to='+encodeURIComponent('http://127.0.0.1:3000/auth/callback'),anon,{email,password})).ok,'SIGNUP_SENT')
 requireProof(!(await request('/auth/v1/token?grant_type=password',anon,{email,password})).ok,'UNCONFIRMED_LOGIN_REJECTED')
 const confirmation=await message(email,'W5 confirmation');requireProof(confirmation.HTML.includes('lang="es"')&&confirmation.HTML.includes('Confirma tu correo')&&confirmation.To.some(t=>t.Address===email)&&!!confirmation.From?.Address,'SPANISH_TEMPLATE_ENVELOPE')
 const link=verificationLink(confirmation);requireProof(link.searchParams.get('redirect_to')==='http://127.0.0.1:3000/auth/callback','EXACT_REDIRECT')
 const confirmed=await verify(link);requireProof(confirmed.origin==='http://127.0.0.1:3000'&&confirmed.hash.includes('access_token='),'CONFIRMATION_VERIFIED')
 const duplicate=await verify(link);requireProof(duplicate.hash.includes('error='),'USED_LINK_REJECTED')
 requireProof((await request('/auth/v1/token?grant_type=password',anon,{email,password})).ok,'CONFIRMED_LOGIN')
 requireProof((await request('/auth/v1/recover?redirect_to='+encodeURIComponent('https://foreign.example.invalid/steal'),anon,{email})).ok,'RECOVERY_SENT')
 const recovery=await message(email,'W5 recovery'),recoveryLink=verificationLink(recovery)
 requireProof(recoveryLink.searchParams.get('redirect_to')!=='https://foreign.example.invalid/steal','FOREIGN_REDIRECT_NOT_USED')
 requireProof(recovery.HTML.includes('Restablece tu contraseña'),'RECOVERY_TEMPLATE')
 const rate=await request('/auth/v1/recover',anon,{email});requireProof(rate.status===429,'REPEAT_MAIL_RATE_LIMITED')
 const invited=`invite-${randomBytes(8).toString('hex')}@example.invalid`;requireProof((await request('/auth/v1/invite',service,{email:invited})).ok,'INVITE_SENT')
 const invite=await message(invited,'W5 invite');requireProof(invite.HTML.includes('La invitación no sustituye la autorización'),'INVITE_AUTHORITY_WARNING')
 requireProof((await verify(verificationLink(invite))).hash.includes('access_token='),'INVITE_VERIFIED')
 // Actual elapsed expiry, never a mocked clock or altered database timestamp.
 await new Promise(r=>setTimeout(r,62000))
 const expired=await verify(recoveryLink);requireProof(expired.hash.includes('error='),'ELAPSED_RECOVERY_EXPIRY')
 evidence.status='PASS'
}catch(e){evidence.status='FAIL';evidence.error=/^[A-Z][A-Z0-9_]{0,100}$/.test(e.message)?e.message:'LOCAL_MAIL_ACCEPTANCE_FAILURE';process.exitCode=1}
finally{if(started){try{cli(['stop','--no-backup','--project-id','crm-telecom-local']);evidence.teardown='PASS'}catch{evidence.teardown='FAIL';process.exitCode=1}}rmSync(scratch,{recursive:true,force:true});console.log(JSON.stringify(evidence));if(process.env.RUNNER_TEMP)writeFileSync(join(process.env.RUNNER_TEMP,'w5-auth-mail-safe-evidence.json'),JSON.stringify(evidence,null,2)+'\n')}
