import {createClient} from '@supabase/supabase-js'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {validateCompany} from './operations.mjs'
import {validateEnvironment} from './config.mjs'
import {run,migrations,safeError,root} from './lib.mjs'
export function desiredAuth(company,env){
 const templates=Object.fromEntries(['confirmation','recovery','invite'].map(n=>[`mailer_templates_${n}_content`,readFileSync(join(root,`infra/email/${n}.html`),'utf8').replaceAll('\r\n','\n')]))
 return {site_url:company.app_origin,uri_allow_list:company.auth.redirect_urls.join(','),mailer_autoconfirm:false,external_anonymous_users_enabled:false,external_email_enabled:true,refresh_token_rotation_enabled:true,mfa_totp_enroll_enabled:true,mfa_totp_verify_enabled:true,smtp_host:env.SMTP_HOST,smtp_port:env.SMTP_PORT,smtp_user:env.SMTP_USER,smtp_pass:env.SMTP_PASSWORD,smtp_admin_email:env.AUTH_MAIL_FROM,...templates}
}
export function compareAuth(actual,company){
 const expected=desiredAuth(company,{})
 const fields=Object.keys(expected).filter(k=>!k.startsWith('smtp_'))
 const errors=fields.filter(k=>actual[k]!==expected[k]).map(k=>`AUTH_DRIFT_${k.toUpperCase()}`)
 return {status:errors.length?'BLOCKED':'PASS',errors,secret_values_included:false,mfa_enrollment_verified:false,deliverability_verified:false}
}
export function hostedGuard(company,env){
 if(validateCompany(company).status!=='VALID'||company.environment!=='STAGING'||env.PLATFORM_TARGET!=='STAGING'||env.SUPABASE_STAGING_PROJECT_REF!==company.supabase_project_ref||env.SUPABASE_PROD_PROJECT_REF===company.supabase_project_ref)throw new Error('STAGING_TARGET_GUARD')
 if(env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.PLATFORM_ALLOW_STAGING_BOOTSTRAP!=='true')throw new Error('PROTECTED_STAGING_WORKFLOW_REQUIRED')
 if(validateEnvironment(env,'STAGING').status!=='VALID'||!env.SUPABASE_ACCESS_TOKEN||!env.SUPABASE_DB_PASSWORD||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('STAGING_CONFIGURATION_REQUIRED')
 if(env.NEXT_PUBLIC_SUPABASE_URL!==`https://${company.supabase_project_ref}.supabase.co`)throw new Error('PROJECT_URL_MISMATCH')
}
export async function configureAuth(company,env,transport=fetch){
 const endpoint=`https://api.supabase.com/v1/projects/${company.supabase_project_ref}/config/auth`
 const headers={authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'content-type':'application/json'}
 const r=await transport(endpoint,{method:'PATCH',headers,body:JSON.stringify(desiredAuth(company,env)),redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!r.ok)throw new Error('AUTH_CONFIG_WRITE_FAILED')
 const read=await transport(endpoint,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!read.ok)throw new Error('AUTH_CONFIG_READ_FAILED')
 const verified=compareAuth(await read.json(),company)
 if(verified.status!=='PASS')throw new Error('AUTH_CONFIGURATION_DRIFT')
 return verified
}
export function hostedPlan(company){
 const c=validateCompany(company)
 return {...c,execution:'PLAN_ONLY',environment:company.environment,steps:['protected company staging environment and target allowlist','pinned Supabase CLI link using environment credentials','migration preview (no automatic seed)','forward migrations in repository order','Auth URL/redirect/email/MFA config API update and redacted readback','private bucket inventory from canonical migrations','privilege/schema drift and synthetic staging smoke','independent W4 and delivery/MFA proof before promotion'],migrations:migrations(),production_mutations_supported:false}
}
if(process.argv[1]?.endsWith('hosted-bootstrap.mjs'))try{
 const company=JSON.parse(readFileSync(process.argv[2],'utf8'))
 if(!process.argv.includes('--execute'))console.log(JSON.stringify(hostedPlan(company),null,2))
 else{
  hostedGuard(company,process.env)
  if(run('supabase',['--version']).trim()!=='2.119.0')throw new Error('CLI_VERSION_MISMATCH')
  run('supabase',['link','--project-ref',company.supabase_project_ref])
  run('supabase',['db','push','--dry-run','--linked'])
  run('supabase',['db','push','--linked'],{timeout:600000})
  const auth=await configureAuth(company,process.env)
  const storage=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}).storage
  const buckets=await storage.listBuckets()
  if(buckets.error||!buckets.data?.length||buckets.data.some(b=>b.public))throw new Error('BUCKET_BOOTSTRAP_INVALID')
  console.log(JSON.stringify({status:'CONFIGURED_NOT_ACCEPTED',environment:'STAGING',auth,buckets:buckets.data.length,migration_count:migrations().length,staging_proven:false,w4_required:true,values_included:false}))
 }
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
