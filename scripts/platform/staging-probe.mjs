import { readFileSync } from 'node:fs'
export function stagingTarget(runtime,cfg) {
 if(runtime.TARGET_ENV!=='STAGING' || runtime.SYNTHETIC_STAGING_AUTHORIZED!=='true' || !/^https:\/\/github\.com\/Asier-Comba\/CRM-Telecomunicaciones\/(issues|pull)\/\d+$/.test(runtime.STAGING_APPROVAL_REF||''))throw new Error('STAGING_APPROVAL_REQUIRED')
 if(!/^[a-z0-9]{8,32}$/.test(runtime.STAGING_APPROVED_PROJECT_REF||'')||!/^[a-z0-9]{8,32}$/.test(runtime.PROD_SUPABASE_PROJECT_REF||'')||!runtime.PROD_APP_HOSTNAME)throw new Error('DECLARED_TARGET_IDENTITIES_REQUIRED')
 const ref=cfg?.values?.SUPABASE_PROJECT_REF,url=cfg?.values?.SUPABASE_URL,app=cfg?.values?.PUBLIC_APP_URL
 if(cfg?.target!=='STAGING'||ref!==runtime.STAGING_APPROVED_PROJECT_REF||ref===runtime.PROD_SUPABASE_PROJECT_REF)throw new Error('PROJECT_SCOPE_DENIED')
 let sb,site;try{sb=new URL(url);site=new URL(app)}catch{throw new Error('STAGING_URL_INVALID')}
 if(sb.protocol!=='https:'||sb.hostname!==`${ref}.supabase.co`||sb.username||sb.password||sb.pathname!=='/'||sb.search||sb.hash||site.protocol!=='https:'||site.username||site.password||site.search||site.hash||site.hostname===runtime.PROD_APP_HOSTNAME||/[\\%\s]/.test(url+app))throw new Error('STAGING_HOST_DENIED')
 if(!runtime.SUPABASE_ANON_KEY)throw new Error('STAGING_PUBLIC_API_KEY_REQUIRED')
 return sb.origin
}
export async function probe(runtime,cfg,transport=fetch) {
 const url=stagingTarget(runtime,cfg)
 const options={method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:runtime.SUPABASE_ANON_KEY,authorization:`Bearer ${runtime.SUPABASE_ANON_KEY}`}}
 const auth=await transport(url+'/auth/v1/settings',options)
 const denied=await transport(url+'/rest/v1/workspaces?select=id&limit=1',options)
 if(auth.status!==200 || ![401,403].includes(denied.status))throw new Error('STAGING_READ_ONLY_SMOKE_FAILED')
 return {result:'PASS',environment:'HOSTED_STAGING_READ_ONLY',requests:2,writes:0,authSettingsReachable:true,anonymousBusinessReadDenied:true,fullAcceptance:'NOT_PERFORMED',realData:'NOT_APPROVED'}
}
if(process.argv[1]===new URL(import.meta.url).pathname)try{console.log(JSON.stringify(await probe(process.env,JSON.parse(readFileSync(process.argv[2],'utf8')))))}catch(e){console.log(JSON.stringify({result:'FAIL',error:/^[A-Z_]+$/.test(e.message)?e.message:'BOUNDED_STAGING_FAILURE'}));process.exitCode=1}
