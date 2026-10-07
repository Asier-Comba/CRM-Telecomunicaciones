import {readJson,loopback} from './lib.mjs'
export function validValue(type,value,target){
 if(typeof value!=='string'||!value.trim())return false
 if(type==='boolean')return ['true','false'].includes(value)
 if(type==='enum')return ['LOCAL','DEV','STAGING','PROD'].includes(value)
 if(type==='node_env')return ['development','test','production'].includes(value)
 if(type==='hex32')return /^[0-9a-f]{64}$/i.test(value)
 if(type==='positive_integer')return /^\d+$/.test(value)&&Number(value)>0&&Number.isSafeInteger(Number(value))
 if(type==='digest')return /^sha256:[0-9a-f]{64}$/.test(value)
 if(['url','origin','https_url'].includes(type)){
  try{const u=new URL(value);return !u.username&&!u.password&&!u.search&&!u.hash&&(target==='LOCAL'?loopback(value):u.protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))&&(type!=='origin'||u.origin===value)}catch{return false}
 }
 if(type==='json_urls')try{const a=JSON.parse(value);return Array.isArray(a)&&a.length>0&&a.every(v=>typeof v==='string'&&!v.includes('*')&&validValue('url',v,target))}catch{return false}
 if(type==='json_emails')try{const a=JSON.parse(value);return Array.isArray(a)&&a.length>0&&a.every(v=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))}catch{return false}
 return true
}
export function validateEnvironment(env,target,manifest=readJson('infra/platform/environment-manifest.json')){
 const errors=[],hosted=['STAGING','PROD'].includes(target)
 if(!['LOCAL','DEV','STAGING','PROD'].includes(target)||env.PLATFORM_TARGET!==target)errors.push('TARGET_REQUIRED_OR_MISMATCH')
 for(const e of manifest.entries){
  const value=env[e.name],required=e.required[target]||e.required_when&&env[e.required_when.name]===e.required_when.equals
  if(required&&!value)errors.push(`MISSING_${e.name}`)
  if(value&&!validValue(e.type,value,target))errors.push(`INVALID_${e.name}`)
 }
 for(const name of Object.keys(env).filter(n=>n.startsWith('NEXT_PUBLIC_'))){
  if(!manifest.public_allowlist.includes(name))errors.push(`UNREGISTERED_PUBLIC_${name}`)
 }
 if(hosted){
  if(env.NODE_ENV!=='production')errors.push('HOSTED_REQUIRES_PRODUCTION_RUNTIME')
  for(const name of ['PRODUCT_LOCAL_INTEGRATION','PRODUCT_LOCAL_SYNTHETIC','NEXT_PUBLIC_FORCE_OFFLINE_DEV','NEXT_PUBLIC_ENABLE_DEMO_DATA'])if(env[name]==='true')errors.push(`FORBIDDEN_${name}`)
  if(env.IMPORT_STAGING_ADAPTER||env.IMPORT_STAGING_TEST_KEY)errors.push('DISPOSABLE_IMPORT_FORBIDDEN')
  if(env.AUTH_EMAIL_ENABLED!=='true')errors.push('AUTH_EMAIL_REQUIRED')
  if(env.PRODUCT_V1_ENABLED!=='true')errors.push('PRODUCT_RUNTIME_REQUIRED')
  for(const group of manifest.alternative_required_groups)if(!group.some(n=>env[n]))errors.push('PUBLIC_PLATFORM_KEY_REQUIRED')
  const publicKey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  try{if(JSON.parse(Buffer.from(publicKey?.split('.')[1]??'','base64url')).role==='service_role')errors.push('PRIVATE_ROLE_IN_PUBLIC_KEY')}catch{}
  if(publicKey?.startsWith('sb_secret_'))errors.push('PRIVATE_KEY_IN_PUBLIC_BINDING')
  if(env.PRODUCT_V1_ORIGIN!==env.NEXT_PUBLIC_APP_URL||env.AUTH_SITE_URL!==env.NEXT_PUBLIC_APP_URL)errors.push('APP_AUTH_ORIGIN_MISMATCH')
 }
 const requirements={AUTH_EMAIL_ENABLED:['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','AUTH_MAIL_FROM'],CRM_EMAIL_ENABLED:['CRM_MAIL_PROVIDER_REF','CRM_MAIL_FROM'],N8N_ENABLED:['N8N_BASE_URL','N8N_API_KEY','N8N_WEBHOOK_SECRET'],AI_ENABLED:['OPENAI_API_KEY']}
 for(const [flag,names]of Object.entries(requirements))if(env[flag]==='true')for(const n of names)if(!env[n])errors.push(`MISSING_${n}`)
 if(target==='STAGING'&&env.CRM_EMAIL_ENABLED==='true'&&!validValue('json_emails',env.CRM_EMAIL_ALLOWLIST,target))errors.push('STAGING_MAIL_ALLOWLIST_REQUIRED')
 return {environment:target,status:errors.length?'BLOCKED':'VALID',errors:[...new Set(errors)],values_included:false}
}
if(process.argv[1]?.endsWith('config.mjs')){const r=validateEnvironment(process.env,process.argv[2]);console.log(JSON.stringify(r,null,2));if(r.status!=='VALID')process.exitCode=1}
