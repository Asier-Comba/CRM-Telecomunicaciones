import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createInterface} from 'node:readline/promises'
import {hash,migrations,run,safeError} from './lib.mjs'
import {companyState} from './company-state.mjs'

export const phases=['PREFLIGHT','PLAN','PROVISION','CONFIGURE','DEPLOY','VERIFY','ACCEPT']
const choices={environment:['STAGING','PROD'],human_mail:['UNSELECTED','MANAGED_COMPANY'],hosting:['UNSELECTED','VPS','MANAGED'],backup:['UNSELECTED','OFFSITE'],n8n:['DISABLED','PREPARATORY'],ai:['DISABLED','PREPARATORY']}
const shaPattern=/^[a-f0-9]{40}$/
export function validateOwnership(c){
 const errors=[],o=c?.ownership
 if(!o||Object.keys(o).some(k=>!['organization','account_class','administrators','billing_owner','recovery_contacts','security_owner','asset_owner','offboarding_owner'].includes(k)))errors.push('OWNERSHIP_CONTRACT_REQUIRED')
 if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(o?.organization??''))errors.push('COMPANY_ORGANIZATION_REQUIRED')
 if(o?.account_class!=='COMPANY')errors.push('PERSONAL_ACCOUNT_FORBIDDEN')
 const admins=Array.isArray(o?.administrators)?o.administrators:[]
 if(!Array.isArray(admins)||admins.length<2||new Set(admins.map(a=>a?.identity?.toLowerCase())).size!==admins.length||admins.some(a=>!a||Object.keys(a).some(k=>!['identity','human','mfa','role'].includes(k))||!/^[A-Za-z0-9_.@-]{3,100}$/.test(a.identity??'')||a.human!==true||!['PASSKEY','MFA'].includes(a.mfa)||a.role!=='ADMIN'))errors.push('TWO_DISTINCT_HUMAN_MFA_ADMINS_REQUIRED')
 for(const k of ['billing_owner','security_owner','asset_owner','offboarding_owner'])if(typeof o?.[k]!=='string'||!admins?.some(a=>a?.identity===o[k]))errors.push(`${k.toUpperCase()}_REQUIRED`)
 if(!Array.isArray(o?.recovery_contacts)||o.recovery_contacts.length<2||new Set(o.recovery_contacts).size!==o.recovery_contacts.length||o.recovery_contacts.some(a=>!admins?.some(x=>x?.identity===a)))errors.push('INDIVIDUAL_RECOVERY_CONTACTS_REQUIRED')
 return errors
}
export function publicConfiguration(c){
 const errors=[]
 if(!c||c.version!==3||Object.keys(c).some(k=>!['version','company','ownership','choices','recovery_policy'].includes(k)))errors.push('PUBLIC_CONFIGURATION_CONTRACT_REQUIRED')
 if(!c?.choices||Object.keys(c.choices).some(k=>!Object.hasOwn(choices,k)))errors.push('UNKNOWN_PROVIDER_CHOICE')
 for(const [k,values]of Object.entries(choices))if(!values.includes(c?.choices?.[k]))errors.push(`INVALID_${k.toUpperCase()}_CHOICE`)
 if(c?.company?.environment!==c?.choices?.environment)errors.push('TARGET_BINDING_MISMATCH')
 if(c?.recovery_policy?.approval!=='UNAPPROVED'&&!(c?.recovery_policy?.approval==='COMPANY_APPROVED'&&shaPattern.test(c.recovery_policy.source_sha??'')&&typeof c.recovery_policy.evidence_url==='string'&&c.recovery_policy.evidence_url.startsWith('https://github.com/')))errors.push('RECOVERY_POLICY_APPROVAL_REQUIRED')
 return [...errors,...validateOwnership(c)]
}
export function companyPreflight(c,env={},evidence={}){
 const publicErrors=publicConfiguration(c),base=companyState(c?.company,env)
 const missing=base.errors.filter(e=>e.startsWith('MISSING_'))
 const errors=[...new Set([...publicErrors,...base.errors])]
 const providers=base.providers.map(p=>({name:p.name,status:'PROVIDER_UNAVAILABLE',configuration:p.status}))
 const security=evidence.w4==='APPROVED'?'EXACT_SOURCE_REVIEW_STILL_REQUIRED':'SECURITY_REVIEW_REQUIRED'
 return {version:3,status:errors.length?(publicErrors.length?'BLOCKED':'CONFIGURATION_MISSING'):'READY_FOR_CONFIGURATION',errors,missing,providers,security,readiness:{configuration:errors.length?'BLOCKED':'READY_FOR_CONFIGURATION',staging:'NOT_PROVEN',production:'NOT_PROVEN'},mutation_performed:false,values_included:false,governance:'DECLARED_NOT_VERIFIED',rpo_rto:c?.recovery_policy?.approval==='COMPANY_APPROVED'?'APPROVAL_REFERENCE_NOT_VERIFIED':'UNAPPROVED'}
}
export function enterprisePlan(c,sourceSha){
 if(!shaPattern.test(sourceSha))throw new Error('EXACT_SOURCE_SHA_REQUIRED')
 if(publicConfiguration(c).length)throw new Error('PUBLIC_CONFIGURATION_INVALID')
 const manifest=migrations(),binding=hash(JSON.stringify({c,sourceSha,manifest}))
 return {version:3,mode:'PLAN_ONLY',binding,source_sha:sourceSha,target:c.choices.environment,migration_count:manifest.length,migration_digest:hash(JSON.stringify(manifest)),phases:phases.map(phase=>({phase,status:phase==='PLAN'?'PLANNED':'NOT_RUN',requires:phase==='ACCEPT'?['EXACT_W2','EXACT_W3_IF_ENABLED','INDEPENDENT_W4','PROTECTED_HUMAN_APPROVAL']:phase==='PROVISION'?['COMPANY_IDENTITY','EXACT_PROJECT','PROTECTED_WORKFLOW']:[]})),mutation_performed:false,provider_values_included:false}
}
// This adapter interface deliberately supports disposable simulations only.
// Hosted deploy/provision adapters cannot be registered through CLI or JSON.
export async function simulateEnterprise(plan,state,adapters){
 if(plan?.mode!=='PLAN_ONLY'||!shaPattern.test(plan.source_sha??'')||!Array.isArray(plan.phases)||plan.phases.map(p=>p.phase).join()!==phases.join()||adapters?.scope!=='DISPOSABLE_SIMULATION')throw new Error('HOSTED_EXECUTION_FORBIDDEN')
 if(state&&(state.binding!==plan.binding||state.source_sha!==plan.source_sha||state.target!==plan.target))throw new Error('RESUME_BINDING_MISMATCH')
 const result=state?structuredClone(state):{version:3,binding:plan.binding,source_sha:plan.source_sha,target:plan.target,phases:[],audit:[],status:'NOT_RUN',hosted_mutation_performed:false}
 if(!/^[a-f0-9]{64}$/.test(plan.binding??'')||result.phases.some(p=>!phases.includes(p.phase)||!['SIMULATED_PASS','BLOCKED'].includes(p.status))||new Set(result.phases.map(p=>p.phase)).size!==result.phases.length)throw new Error('RESUME_STATE_INVALID')
 const completed=result.phases.filter(p=>p.status==='SIMULATED_PASS').map(p=>p.phase)
 if(completed.join()!==phases.slice(0,completed.length).join())throw new Error('RESUME_PHASE_ORDER_INVALID')
 for(const phase of phases){
  if(completed.includes(phase))continue
  const key=hash(`${plan.binding}:${phase}`)
  try{
   if(typeof adapters[phase]!=='function')throw new Error('ADAPTER_UNAVAILABLE')
   const proof=await adapters[phase]({idempotency_key:key,source_sha:plan.source_sha,target:plan.target})
   if(proof?.status!=='SIMULATED_PASS'||proof?.idempotency_key!==key)throw new Error('ADAPTER_PROOF_INVALID')
   result.phases=result.phases.filter(p=>p.phase!==phase);result.phases.push({phase,status:'SIMULATED_PASS',idempotency_key:key})
   result.audit.push({phase,status:'SIMULATED_PASS'});result.status='SIMULATED_PASS'
  }catch{result.phases=result.phases.filter(p=>p.phase!==phase);result.phases.push({phase,status:'BLOCKED'});result.audit.push({phase,status:'BLOCKED'});result.status='BLOCKED';break}
 }
 result.staging='NOT_PROVEN';result.production='NOT_PROVEN';return result
}
export function saveState(path,state){
 // State contains phase metadata only, never provider responses or credentials.
 if(state?.version!==3||state.hosted_mutation_performed!==false)throw new Error('UNSAFE_STATE')
 const clean={version:3,binding:state.binding,source_sha:state.source_sha,target:state.target,status:state.status,phases:state.phases.map(p=>({phase:p.phase,status:p.status,...(p.idempotency_key?{idempotency_key:p.idempotency_key}:{})})),audit:state.audit.map(p=>({phase:p.phase,status:p.status})),hosted_mutation_performed:false,staging:'NOT_PROVEN',production:'NOT_PROVEN'}
 writeFileSync(`${path}.tmp`,JSON.stringify(clean,null,2)+'\n',{mode:0o600,flag:'wx'});renameSync(`${path}.tmp`,path)
}
async function init(path){
 if(existsSync(path))throw new Error('CONFIGURATION_ALREADY_EXISTS')
 const rl=createInterface({input:process.stdin,output:process.stdout})
 const ask=async(label)=>{const v=(await rl.question(`${label} (public configuration only): `)).trim();if(/Bearer|sb_secret_|sk-proj-|PRIVATE KEY|postgres(?:ql)?:\/\/|password|token/i.test(v))throw new Error('SECRET_INPUT_FORBIDDEN');return v}
 try{
 const environment=await ask('Environment STAGING or PROD'),organization=await ask('Company organization'),a=await ask('First named human administrator'),b=await ask('Second named human administrator'),origin=await ask('Exact HTTPS application origin'),ref=await ask('Public Supabase project reference')
 const selection={environment};for(const [k,v]of Object.entries(choices))if(k!=='environment')selection[k]=await ask(`${k}: ${v.join(' / ')}`)
 const config={version:3,company:{environment,app_origin:origin,supabase_project_ref:ref,administrators:[a,b],auth:{redirect_urls:[`${origin}/auth/callback`],email_confirmation:true,mfa_required:true},dns:[],backup:{retention_days:null,rpo_seconds:null,rto_seconds:null,key_reference:'UNCONFIGURED',offsite_reference:'UNCONFIGURED'}},ownership:{organization,account_class:'COMPANY',administrators:[a,b].map(identity=>({identity,human:true,mfa:'MFA',role:'ADMIN'})),billing_owner:a,security_owner:a,asset_owner:b,offboarding_owner:b,recovery_contacts:[a,b]},choices:selection,recovery_policy:{approval:'UNAPPROVED'}}
 if(publicConfiguration(config).length)throw new Error('PUBLIC_CONFIGURATION_INVALID')
 writeFileSync(path,JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({status:'PLAN_ONLY',configuration_written:true,provider_connection_performed:false,governance:'DECLARED_NOT_VERIFIED'}))
 }finally{rl.close()}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{const [command,path]=process.argv.slice(2)
 if(command==='init'){if(!path)throw new Error('PUBLIC_CONFIG_PATH_REQUIRED');await init(path)}
 else {const c=path?JSON.parse(readFileSync(path,'utf8')):{};const result=command==='plan'?enterprisePlan(c,run('git',['rev-parse','HEAD']).trim()):companyPreflight(c,process.env);console.log(JSON.stringify(result,null,2));if(command!=='plan'&&result.status!=='READY_FOR_CONFIGURATION')process.exitCode=1}
 }catch(e){console.error(JSON.stringify({status:'BLOCKED',error:safeError(e),mutation_performed:false}));process.exitCode=1}
}
