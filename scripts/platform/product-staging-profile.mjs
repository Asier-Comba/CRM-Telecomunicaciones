import {readStagingAdmissionV1} from '../../src/lib/server/product-staging-admission-v1.ts'

export const managedProductStaging=(env,target)=>target==='STAGING'&&env.PRODUCT_STAGING_INTEGRATION==='true'
// These configure a platform-managed mailer/control plane, not the Supabase SDK.
export const managedAuthBindings=new Set(['AUTH_EMAIL_ENABLED','AUTH_SITE_URL','AUTH_REDIRECT_URLS'])
export function productStagingErrors(env){
 const errors=[]
 // Whole-profile failures are separate from the cohort parser's existing codes.
 if(readStagingAdmissionV1(env).status!=='enabled')errors.push('MANAGED_AUTH_PROFILE_INVALID')
 if(env.NEXT_PUBLIC_APP_URL!==env.PRODUCT_V1_ORIGIN)errors.push('APP_AUTH_ORIGIN_MISMATCH')
 if(!/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??''))errors.push('MANAGED_AUTH_PUBLISHABLE_KEY_REQUIRED')
 if(env.NEXT_PUBLIC_SUPABASE_ANON_KEY!==undefined)errors.push('PRODUCT_STAGING_AMBIGUOUS_PUBLIC_KEY')
 if(env.AUTH_EMAIL_ENABLED!==undefined&&env.AUTH_EMAIL_ENABLED!=='false')errors.push('PRODUCT_STAGING_APP_SMTP_CONFLICT')
 for(const name of ['AUTH_SITE_URL','AUTH_REDIRECT_URLS','AUTH_MAIL_FROM','SUPABASE_SERVICE_ROLE_KEY','AGENT_TOOL_SECRET','ASSISTANT_PROVIDER'])
  if(env[name]!==undefined)errors.push('PRODUCT_STAGING_FORBIDDEN_'+name)
 for(const name of Object.keys(env))if(/^(SMTP_|N8N_|META_|OPENAI_)/.test(name))errors.push('PRODUCT_STAGING_EXTERNAL_BINDING_FORBIDDEN')
 for(const name of ['AI_ENABLED','CRM_EMAIL_ENABLED','PRODUCT_DOCUMENT_CONTENT_ENABLED','PRODUCT_DOCUMENT_MAINTENANCE_ENABLED'])
  if(env[name]!==undefined&&env[name]!=='false')errors.push('PRODUCT_STAGING_CAPABILITY_FORBIDDEN_'+name)
 return errors
}
