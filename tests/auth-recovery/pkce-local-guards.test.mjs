import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {pkceScopeGuard,assertLocalMailTransport,readLocalMailJson,localRecoveryEmailLink,localPkceCodeRedirect} from '../../tools/asier_auth_recovery/pkce-policy.mjs'

const email='pkce-00000000-0000-4000-8000-000000000001@example.invalid'
const link='http://127.0.0.1:54321/auth/v1/verify?'+new URLSearchParams({token:'SYNTHETIC_ONLY',type:'recovery',redirect_to:'http://127.0.0.1:3000/reset-password'})
const message=()=>({To:[{Address:email}],HTML:'<a href="'+link.replaceAll('&','&amp;')+'">Reset</a>'})
const containers=()=>[
 {Name:'/supabase_auth_crm-telecom-local',State:{Running:true},Config:{Env:['GOTRUE_SMTP_HOST=supabase_inbucket_crm-telecom-local','GOTRUE_SMTP_PORT=1025']}},
 {Name:'/supabase_inbucket_crm-telecom-local',State:{Running:true,Health:{Status:'healthy'}},Config:{Env:['MP_SMTP_DISABLE_RDNS=true']},NetworkSettings:{Ports:{'8025/tcp':[{HostIp:'0.0.0.0',HostPort:'54324'}]}}},
]
test('PKCE scope needs its own flag and refuses mixed recovery activation',()=>{
 assert.equal(pkceScopeGuard({}),false)
 assert.equal(pkceScopeGuard({DOCUMENTS_GLOBAL_SCOPE:'AUTH_PKCE_ONLY',AUTH_PKCE_ACCEPTANCE:'true'}),true)
 for(const env of [{DOCUMENTS_GLOBAL_SCOPE:'AUTH_PKCE_ONLY'},{DOCUMENTS_GLOBAL_SCOPE:'AUTH_PKCE_ONLY',AUTH_PKCE_ACCEPTANCE:'true',AUTH_RECOVERY_ACCEPTANCE:'true'},{DOCUMENTS_GLOBAL_SCOPE:'AUTH_RECOVERY_ONLY',AUTH_PKCE_ACCEPTANCE:'true'}])assert.throws(()=>pkceScopeGuard(env),/^Error: D1_GLOBAL_AUTH_PKCE_/)
})
test('local SMTP readback rejects external destinations, credentials, hooks, relay or wrong resource',()=>{
 assert.equal(assertLocalMailTransport(containers()),true)
 for(const mutate of [
  c=>c[0].Name='/supabase_auth_OTHER',c=>c[1].Name='/supabase_inbucket_OTHER',c=>c[0].State.Running=false,c=>c[1].State.Health.Status='starting',
  c=>c[0].Config.Env[0]='GOTRUE_SMTP_HOST=outside.invalid',c=>c[0].Config.Env[1]='GOTRUE_SMTP_PORT=587',
  c=>c[0].Config.Env.push('GOTRUE_SMTP_USER=PRIVATE'),c=>c[0].Config.Env.push('GOTRUE_SMTP_PASS=PRIVATE'),c=>c[0].Config.Env.push('GOTRUE_HOOK_SEND_EMAIL_ENABLED=true'),
  c=>c[1].Config.Env.push('MP_SMTP_RELAY_CONFIG=PRIVATE'),c=>c[1].Config.Env.push('MP_SMTP_FORWARD_TO=PRIVATE'),c=>c[1].Config.Env.push('MP_SEND_API_AUTH=PRIVATE'),
  c=>c[0].Config.Env.push('GOTRUE_SMTP_HOST=duplicate'),c=>c[1].NetworkSettings.Ports['8025/tcp'][0].HostPort='8025',c=>c.push(c[1]),
 ]){const value=containers();mutate(value);assert.throws(()=>assertLocalMailTransport(value),error=>/^D1_GLOBAL_AUTH_PKCE_/.test(error.message)&&!error.message.includes('PRIVATE'))}
})
test('email body supplies only one exact local recovery link for the synthetic recipient',()=>{
 assert.equal(localRecoveryEmailLink(message(),email),link)
 for(const mutate of [m=>m.To[0].Address='other@example.invalid',m=>m.To.push({Address:email}),m=>m.HTML=m.HTML.replace('127.0.0.1:54321','outside.invalid'),m=>m.HTML=m.HTML.replace('type=recovery','type=invite'),m=>m.HTML=m.HTML.replace('SYNTHETIC_ONLY',''),m=>m.HTML=m.HTML.replace('reset-password','dashboard'),m=>m.HTML=m.HTML.replace('verify?','verify?access_token=PRIVATE&'),m=>m.HTML=m.HTML.replace('verify?','verify?token=duplicate&'),m=>m.HTML+='<a href="https://outside.invalid/PRIVATE">other</a>',m=>m.HTML='x'.repeat(65537)]){
  const value=message();mutate(value);assert.throws(()=>localRecoveryEmailLink(value,email),error=>error.message==='D1_GLOBAL_AUTH_PKCE_INVALID_LOCAL_EMAIL')
 }
 assert.throws(()=>localRecoveryEmailLink(message(),'human@example.com'))
})
test('verify redirect cannot carry tokens, errors, duplicates or an external destination',()=>{
 const valid='http://127.0.0.1:3000/reset-password?code=SYNTHETIC_ONLY'
 assert.equal(localPkceCodeRedirect(valid),valid)
 for(const value of [valid.replace('3000','3187'),valid.replace('reset-password','dashboard'),valid+'#access_token=PRIVATE',valid+'&code=duplicate',valid+'&access_token=PRIVATE',valid+'&error=PRIVATE',valid.replace('SYNTHETIC_ONLY',''),'PRIVATE'])assert.throws(()=>localPkceCodeRedirect(value),error=>error.message==='D1_GLOBAL_AUTH_PKCE_REDIRECT_INVALID')
})
test('Mailpit reader fixes loopback GET paths and bounds responses without releasing mail',async()=>{
 const calls=[],fetcher=async(url,options)=>{calls.push({url,...options});return new Response('{"messages":[]}',{status:200})}
 assert.deepEqual(await readLocalMailJson('/api/v1/messages',fetcher),{messages:[]})
 assert.equal(calls[0].url,'http://127.0.0.1:54324/api/v1/messages');assert.equal(calls[0].method,'GET');assert.equal(calls[0].redirect,'error')
 for(const path of ['https://outside.invalid','/api/v1/send','/api/v1/message/x/release','/api/v1/message/../messages','/api/v1/messages?external=PRIVATE'])await assert.rejects(readLocalMailJson(path,fetcher),/^Error: D1_GLOBAL_AUTH_PKCE_MAIL_READ_INVALID$/)
 assert.equal(calls.length,1)
 await assert.rejects(readLocalMailJson('/api/v1/messages',async()=>new Response('PRIVATE',{status:302})),/^Error: D1_GLOBAL_AUTH_PKCE_MAIL_READ_FAILED$/)
 await assert.rejects(readLocalMailJson('/api/v1/messages',async()=>new Response('x'.repeat(131073))),/^Error: D1_GLOBAL_AUTH_PKCE_MAIL_TOO_LARGE$/)
})
for(const scenario of [
 {scope:'AUTH_PKCE_ONLY',flag:'false',recovery:'false',error:'D1_GLOBAL_AUTH_PKCE_OPT_IN_REQUIRED'},
 {scope:'AUTH_PKCE_ONLY',flag:'true',recovery:'true',error:'D1_GLOBAL_AUTH_PKCE_MIXED_SCOPE'},
 {scope:'AUTH_RECOVERY_ONLY',flag:'true',recovery:'true',error:'D1_GLOBAL_AUTH_PKCE_MIXED_SCOPE'},
 {scope:'AUTH_PKCE_ONLY',flag:'true',recovery:'false',error:'D1_GLOBAL_EXPLICIT_DISPOSABLE_CI_ONLY'},
])test('ordinary PKCE runner refuses '+scenario.error+' before resources',t=>{
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'auth-pkce-guard-'))
 t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'auth-pkce-guard-')));rmSync(dir,{recursive:true})})
 const result=spawnSync(process.execPath,['--experimental-transform-types','tools/asier_documents_global/run.mjs'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env:{...process.env,CI:'false',GITHUB_ACTIONS:'false',DOCUMENTS_GLOBAL_AUTH:'false',DOCUMENTS_GLOBAL_SCOPE:scenario.scope,AUTH_PKCE_ACCEPTANCE:scenario.flag,AUTH_RECOVERY_ACCEPTANCE:scenario.recovery,RUNNER_TEMP:dir},encoding:'utf8',timeout:30000,windowsHide:true})
 assert.equal(result.status,1)
 const report=JSON.parse(readFileSync(join(dir,'documents-global-d1.safe.json'),'utf8'))
 assert.equal(report.error,scenario.error);assert.deepEqual(report.checks,[]);assert.equal(report.source,undefined);assert.equal(report.command_failure,undefined)
 assert.equal(report.storage_88_adopted,false);assert.equal(report.STAGING_DEPLOYED,false)
})
