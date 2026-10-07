import {resolveTxt,resolveMx,resolveCname,resolve4,resolve6} from 'node:dns/promises'
import {readJson,run,hash,migrations,root,loopback} from './lib.mjs'
import {validateEnvironment,validValue} from './config.mjs'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
export function validateCompany(c){
 const errors=[]
 if(!c||typeof c!=='object'||Array.isArray(c))return {status:'BLOCKED',errors:['COMPANY_OBJECT_REQUIRED']}
 const fields=readJson('infra/platform/company.schema.json').properties
 if(Object.keys(c).some(k=>!Object.hasOwn(fields,k)))errors.push('UNKNOWN_COMPANY_FIELD')
 if(!['STAGING','PROD'].includes(c.environment))errors.push('INVALID_COMPANY_ENVIRONMENT')
 if(!validValue('origin',c.app_origin,c.environment))errors.push('INVALID_APP_ORIGIN')
 if(!/^[a-z]{20}$/.test(c.supabase_project_ref??''))errors.push('INVALID_PROJECT_REF')
 if(!Array.isArray(c.administrators)||new Set(c.administrators).size<2||c.administrators.some(a=>typeof a!=='string'||!a.trim()))errors.push('TWO_NAMED_ADMINISTRATORS_REQUIRED')
 if(c.auth?.email_confirmation!==true||c.auth?.mfa_required!==true)errors.push('AUTH_SECURITY_REQUIREMENTS')
 if(!Array.isArray(c.auth?.redirect_urls)||!c.auth.redirect_urls.length||c.auth.redirect_urls.some(u=>!validValue('url',u,c.environment)||new URL(u).origin!==c.app_origin||u.includes('*')))errors.push('AUTH_REDIRECT_MISMATCH')
 if(!Array.isArray(c.dns)||!c.dns.length||c.dns.some(r=>!r||!['TXT','MX','CNAME','A','AAAA'].includes(r.type)||!/^[a-zA-Z0-9_.-]{1,253}$/.test(r.name??'')||!Array.isArray(r.expected)||!r.expected.length||r.expected.some(v=>typeof v!=='string'||!v.length)))errors.push('EXACT_PROVIDER_DNS_RECORDS_REQUIRED')
 for(const n of ['retention_days','rpo_seconds','rto_seconds'])if(!Number.isSafeInteger(c.backup?.[n])||c.backup[n]<1)errors.push(`BACKUP_POLICY_${n.toUpperCase()}_REQUIRED`)
 for(const n of ['key_reference','offsite_reference'])if(typeof c.backup?.[n]!=='string'||!c.backup[n].trim())errors.push(`BACKUP_${n.toUpperCase()}_REQUIRED`)
 return {status:errors.length?'BLOCKED':'VALID',errors,governance_verified:false,values_included:false}
}
export function validateWorkflow(workflow){
 const errors=[]
 if(workflow?.active!==false)errors.push('WORKFLOW_MUST_BE_INACTIVE')
 if(!Array.isArray(workflow?.nodes)||!Array.isArray(workflow?.connections)&&typeof workflow?.connections!=='object')errors.push('INVALID_WORKFLOW')
 const text=JSON.stringify(workflow??{})
 if(/"(?:credentials|pinData|staticData)"\s*:/.test(text))errors.push('CREDENTIAL_OR_EXECUTION_DATA_FORBIDDEN')
 if(/(?:Bearer\s+|sb_secret_|sk-proj-|postgres(?:ql)?:\/\/|-----BEGIN)/i.test(text))errors.push('SECRET_LITERAL_FORBIDDEN')
 const allowed=new Set(['n8n-nodes-base.manualTrigger','n8n-nodes-base.noOp'])
 if(workflow?.nodes?.some(n=>!allowed.has(n.type)||Object.keys(n.parameters??{}).length))errors.push('ONLY_CLOSED_SYNTHETIC_NODES_ALLOWED')
 return {status:errors.length?'BLOCKED':'VALID',errors,effects_enabled:false}
}
export async function verifyDns(company,resolvers={TXT:resolveTxt,MX:resolveMx,CNAME:resolveCname,A:resolve4,AAAA:resolve6}){
 if(validateCompany(company).status!=='VALID')throw new Error('COMPANY_CONFIGURATION_INVALID')
 const results=[]
 for(const r of company.dns){
  try{const values=(await resolvers[r.type](r.name)).map(v=>Array.isArray(v)?v.join(''):r.type==='MX'?`${v.priority} ${v.exchange.replace(/\.$/,'')}`:String(v).replace(/\.$/,''))
   results.push({type:r.type,status:r.expected.every(v=>values.includes(v))?'PASS':'FAIL'})
  }catch{results.push({type:r.type,status:'UNAVAILABLE'})}
 }
 return {status:results.every(r=>r.status==='PASS')?'PASS':'BLOCKED',checks:results}
}
const eventTypes=new Set(['deployment_started','deployment_failed','backup_completed','backup_failed','restore_verified','provider_unavailable','request_completed'])
export function safeEvent(type,fields={}){
 if(!eventTypes.has(type))throw new Error('UNREGISTERED_EVENT')
 // Allowlist fields instead of trying to recognize every possible PII format.
 const event={event:type,at:new Date().toISOString()}
 for(const key of ['duration_ms','http_status','retry_count','queue_depth','bytes'])if(Number.isSafeInteger(fields[key])&&fields[key]>=0)event[key]=fields[key]
 if(['app','auth','storage','ai','n8n','mail','backup'].includes(fields.component))event.component=fields.component
 if(['PASS','FAIL','MISSING','DEGRADED','UNAVAILABLE'].includes(fields.status))event.status=fields.status
 return event
}
export function releaseManifest(){return {version:1,commit:run('git',['rev-parse','HEAD']).trim(),migration_head:migrations().at(-1)?.name,migration_count:migrations().length,config_sha256:hash(readFileSync(join(root,'infra/platform/environment-manifest.json'),'utf8').replaceAll('\r\n','\n')),artifact_digest:process.env.APP_IMAGE_DIGEST??null,providers:readJson('infra/platform/providers.json'),staging:'NOT_PROVEN',production:'NOT_PROVEN',w4_required:true,blockers:['HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED','COMPANY_ACCOUNTS_REQUIRED','W4_ACCEPTANCE_REQUIRED','STAGING_ACCEPTANCE_REQUIRED','DEPENDENCY_AUDIT_HIGH']}}
export function preflight(target,env=process.env){
 const config=validateEnvironment(env,target)
 return {...config,status:'BLOCKED',configuration_status:config.status,checks:{product_hosted:'NOT_ACCEPTED',provider_connections:'NOT_PROVEN',backup_freshness:'NOT_PROVEN',restore:'NOT_PROVEN',w4:'REQUIRED',artifact:validValue('digest',env.APP_IMAGE_DIGEST,target)?'PRESENT':'MISSING'},errors:[...config.errors,'HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED','LIVE_ACCEPTANCE_REQUIRED'],mutation_performed:false}
}
