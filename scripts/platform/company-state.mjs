import {validateCompany} from './operations.mjs'
import {validateEnvironment,validValue} from './config.mjs'
import {readJson} from './lib.mjs'
export function companyState(company,env){
 const contract=validateCompany(company),target=company?.environment
 const config=validateEnvironment(env,target)
 const parity=[]
 if(env.NEXT_PUBLIC_APP_URL!==company?.app_origin||env.AUTH_SITE_URL!==company?.app_origin||env.PRODUCT_V1_ORIGIN!==company?.app_origin)parity.push('COMPANY_ORIGIN_BINDING_MISMATCH')
 if(env.NEXT_PUBLIC_SUPABASE_URL!==`https://${company?.supabase_project_ref}.supabase.co`)parity.push('COMPANY_PROJECT_BINDING_MISMATCH')
 config.errors.push(...parity);if(parity.length)config.status='BLOCKED'
 const manifest=readJson('infra/platform/environment-manifest.json')
 const providers=Object.entries(readJson('infra/platform/providers.json').providers).map(([name,p])=>{
  const names=Array.isArray(p.configuration)?p.configuration:[]
  const missing=names.filter(n=>!env[n])
  const invalid=names.filter(n=>env[n]&&!validValue(manifest.entries.find(e=>e.name===n)?.type,env[n],target))
  return {name,status:!names.length||missing.length?'EXTERNAL_ACTION_REQUIRED':invalid.length?'FAILED':'CONFIGURED_NOT_VERIFIED',missing,invalid,owner:p.owner,live_verified:false}
 })
 return {version:1,environment:['STAGING','PROD'].includes(target)?target:'INVALID',status:'BLOCKED',configuration:{company:contract.status,environment:config.status},errors:[...contract.errors,...config.errors],providers,bootstrap_state:{contract:contract.status==='VALID'?'PASSED':'FAILED',bindings:config.status==='VALID'?'PASSED':'EXTERNAL_ACTION_REQUIRED',migrations:'NOT_RUN',auth_delivery_mfa:'EXTERNAL_ACTION_REQUIRED',dns_tls:'EXTERNAL_ACTION_REQUIRED',hosted_product:'W2_ACCEPTANCE_REQUIRED',durable_worker:'W3_ACCEPTANCE_REQUIRED',w4:'EXTERNAL_ACTION_REQUIRED',staging:'NOT_PROVEN',production:'NOT_PROVEN'},resume_policy:'Revalidate the exact company/target, preview unapplied canonical migrations, and read back configured providers; never mark a phase proven from a key or this report.',mutation_performed:false,values_included:false}
}
