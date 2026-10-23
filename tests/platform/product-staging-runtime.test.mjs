import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {validateEnvironment} from '../../scripts/platform/config.mjs'
import {root} from '../../scripts/platform/lib.mjs'
import {evaluateRuntime,reviewedStagingPolicy} from '../../scripts/platform/runtime-admission.mjs'
import {stagingAppOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'

const managed=()=>({PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingAppOriginV1,NEXT_PUBLIC_APP_URL:stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',BACKUP_RETENTION_DAYS:'7'})
const reviewed=()=>({version:'product.staging.runtime.v1',status:'ACCEPTED',origin:stagingAppOriginV1,auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false})
const legacy=target=>({...managed(),PLATFORM_TARGET:target,APP_ENV:target==='PROD'?'production':'staging',PRODUCT_STAGING_INTEGRATION:'false',PRODUCT_STAGING_USER_IDS:undefined,AUTH_EMAIL_ENABLED:'true',AUTH_SITE_URL:stagingAppOriginV1,AUTH_REDIRECT_URLS:JSON.stringify([stagingAppOriginV1+'/auth/callback',stagingAppOriginV1+'/reset-password']),SMTP_HOST:'smtp.fixture.invalid',SMTP_PORT:'587',SMTP_USER:'synthetic',SMTP_PASSWORD:'private_synthetic_canary',AUTH_MAIL_FROM:'auth@example.invalid'})
test('explicit product staging uses managed Supabase Auth without application SMTP or Auth control-plane impersonation',()=>{
 const result=validateEnvironment(managed(),'STAGING')
 assert.equal(result.status,'VALID',JSON.stringify(result))
 assert.equal(result.values_included,false)
})

test('complete managed profile can pass only an exact reviewed policy fixture',()=>{
 assert.equal(evaluateRuntime(managed(),'STAGING',reviewed()).accepted,true)
 for(const mutate of [p=>p.status='PROPOSED',p=>p.origin='https://other.invalid',p=>p.production_accepted=true,p=>p.auth='smtp',p=>p.extra=true,
  ...['w2','w5','w4'].map(k=>p=>p.reviews[k]='PENDING'),
  ...['ai','crm_mail','n8n','document_content','document_maintenance'].map(k=>p=>p.capabilities[k]=true),
  p=>delete p.capabilities.ai,p=>p.reviews.extra='APPROVED']){
  const p=reviewed();mutate(p)
  assert.equal(reviewedStagingPolicy(p,stagingAppOriginV1),false)
  assert.equal(evaluateRuntime(managed(),'STAGING',p).accepted,false)
 }
})

test('partial, contradictory or externally bound profiles stay blocked even with a reviewed fixture',()=>{
 const cases=[{APP_ENV:undefined},{NODE_ENV:'development'},{PRODUCT_V1_ENABLED:'false'},{BACKUP_RETENTION_DAYS:undefined},
  {PRODUCT_V1_ORIGIN:'https://other.invalid'},{NEXT_PUBLIC_APP_URL:'https://other.invalid'},
  {NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'},{NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:undefined},
  {NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_ambiguous_test'}, {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_private_canary'},
  {PRODUCT_STAGING_USER_IDS:undefined},{PRODUCT_STAGING_USER_IDS:'*'},
  {PRODUCT_STAGING_USER_IDS:managed().PRODUCT_STAGING_USER_IDS+','+managed().PRODUCT_STAGING_USER_IDS},
  {PRODUCT_LOCAL_INTEGRATION:'true'},{AUTH_EMAIL_ENABLED:'true'},{AUTH_SITE_URL:stagingAppOriginV1},
  {AUTH_REDIRECT_URLS:'[]'},{AUTH_MAIL_FROM:'auth@example.invalid'},
  ...['SUPABASE_SERVICE_ROLE_KEY','AGENT_TOOL_SECRET','ASSISTANT_PROVIDER','SMTP_PASSWORD','N8N_API_KEY','META_TOKEN','OPENAI_API_KEY'].map(k=>({[k]:'private_synthetic_canary'})),
  ...['AI_ENABLED','CRM_EMAIL_ENABLED','PRODUCT_DOCUMENT_CONTENT_ENABLED','PRODUCT_DOCUMENT_MAINTENANCE_ENABLED'].map(k=>({[k]:'true'}))]
 for(const change of cases){
  const r=evaluateRuntime({...managed(),...change},'STAGING',reviewed())
  assert.equal(r.accepted,false,Object.keys(change).join(','));assert.equal(r.configuration.status,'BLOCKED')
  assert.ok(!JSON.stringify(r).includes('private_synthetic_canary'));assert.ok(!JSON.stringify(r).includes(managed().PRODUCT_STAGING_USER_IDS))
 }
})

test('legacy SMTP validation remains intact but grants no staging or production runtime acceptance',()=>{
 for(const target of ['STAGING','PROD']){
  const env=legacy(target)
  assert.equal(validateEnvironment(env,target).status,'VALID',JSON.stringify(validateEnvironment(env,target)))
  assert.equal(evaluateRuntime(env,target,reviewed()).code,'HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED')
  delete env.SMTP_PASSWORD
  assert.ok(validateEnvironment(env,target).errors.includes('MISSING_SMTP_PASSWORD'))
 }
 assert.equal(evaluateRuntime({...managed(),PLATFORM_TARGET:'PROD'},'PROD',reviewed()).accepted,false)
})
test('real entrypoint stays closed with the proposed baked policy and cannot accept approval from environment',()=>{
 const r=spawnSync(process.execPath,['scripts/platform/entrypoint.mjs'],{cwd:root,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,...managed(),RUNTIME_APPROVED:'true',W4_APPROVED:'true'},encoding:'utf8',timeout:10000})
 assert.equal(r.status,1);assert.ok(r.stderr.includes('HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED'),r.stderr)
 assert.ok(!r.stderr.includes(managed().PRODUCT_STAGING_USER_IDS))
 assert.ok(!r.stderr.includes('MODULE_NOT_FOUND'))
})
