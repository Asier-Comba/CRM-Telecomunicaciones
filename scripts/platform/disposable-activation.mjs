import {spawnSync} from 'node:child_process'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {root,migrations,hash,safeError,disposableGuard} from './lib.mjs'
import {exactSource} from './enterprise.mjs'

const phases=['CONFIGURATION','PREFLIGHT','PLAN','BOOTSTRAP','VERIFY','BACKUP','RESTORE_DRILL','TEARDOWN','RELEASE_CANDIDATE']
const blockers=['COMPANY_PROVIDER_CONFIGURATION_REQUIRED','CORPORATE_STAGING_NOT_PROVEN','OFFSITE_BACKUP_NOT_PROVEN','INDEPENDENT_W4_REQUIRED','SECURITY_GATES_NOT_ACCEPTED']
const negatives=['CORRUPT_ARCHIVE_REJECTED','WRONG_KEY_REJECTED','INCOMPLETE_ARCHIVE_FORMAT_REJECTED','NONCANONICAL_ARCHIVE_FORMAT_REJECTED','AMBIGUOUS_BUCKET_INVENTORY_REJECTED','MISSING_OBJECT_BYTES_REJECTED','PUBLIC_BUCKET_REJECTED','UNRECOGNIZED_MIGRATION_REJECTED','UNDECLARED_PUBLIC_MANIFEST_FIELD_REJECTED','UNDECLARED_PUBLIC_CONFIG_FIELD_REJECTED','NONCANONICAL_PUBLIC_CONFIG_REJECTED']
const fail=code=>{throw new Error(code)}
export function executionGuard(env=process.env,platform=process.platform,linked=existsSync(join(root,'supabase/.temp/project-ref'))){
 if(platform!=='linux'||env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.PLATFORM_TARGET!=='LOCAL'||env.NODE_ENV==='production')fail('ACTIVATION_DISPOSABLE_CI_LINUX_REQUIRED')
 if(linked||env.SUPABASE_ACCESS_TOKEN||env.SUPABASE_DB_PASSWORD||env.OPENAI_API_KEY)fail('ACTIVATION_HOSTED_OR_PAID_CONFIGURATION_FORBIDDEN')
 if(!env.RUNNER_TEMP||env.W2_PRODUCT_UI==='true')fail('ACTIVATION_ISOLATED_RECOVERY_JOB_REQUIRED')
}
export function activationPlan(source,manifest=migrations(),configDigest=hash(readFileSync(join(root,'supabase/config.toml')))){
 if(!/^[a-f0-9]{40}$/.test(source??'')||!Array.isArray(manifest)||!manifest.length||new Set(manifest.map(m=>m.name)).size!==manifest.length||manifest.some(m=>!/^\d{14}_[a-z0-9_]+\.sql$/.test(m.name??'')||!/^[a-f0-9]{64}$/.test(m.sha256??''))||!/^[a-f0-9]{64}$/.test(configDigest))fail('ACTIVATION_EXACT_MANIFEST_REQUIRED')
 return {version:1,mode:'ACTUAL_DISPOSABLE_LOCAL',source_sha:source,migration_count:manifest.length,migration_head:manifest.at(-1).name,migration_digest:hash(JSON.stringify(manifest)),config_sha256:configDigest,phases:phases.map(phase=>({phase,status:['CONFIGURATION','PLAN'].includes(phase)?'PREPARED':'NOT_RUN'})),hosted_staging:'NOT_PROVEN',production:'NOT_AUTHORIZED',company_configuration:'NOT_ACTIVATED',release:'NOT_ACCEPTED',ai_writes:'OFF',model:'NOT_RUN',blockers,values_included:false}
}
function roleProof(rows){
 const actors=['ownerA','ownerB','removedA','suspendedA','viewerA','adminA','memberA','memberB'],sessions=['FRESH_LOGIN','RETAINED_JWT']
 if(!Array.isArray(rows)||rows.length!==16||new Set(rows.map(r=>r.actor+':'+r.session)).size!==16)return false
 return rows.every(r=>actors.includes(r.actor)&&sessions.includes(r.session)&&r.status==='PASS'&&r.response_values_included===false&&r.assistant_raw==='DENIED'&&r.storage===(r.actor==='ownerA'?'AUTHORIZED':'DENIED'))
}
function deniedProof(rows){
 const sessions=['FRESH_LOGIN','RETAINED_JWT'],names=[]
 for(const s of sessions){
  for(const suffix of ['EXPIRED_TICKET','FORGED_TICKET','FOREIGN_REVEAL_SCOPE'])names.push(s+'_'+suffix)
  for(const actor of ['ownerB','removedA','suspendedA','viewerA','adminA'])for(const op of ['WRITE','REVEAL'])names.push(actor+'_'+s+'_'+op)
  for(const actor of ['memberA','memberB'])for(const op of ['FOREIGN_WRITE','FOREIGN_REVEAL'])names.push(actor+'_'+s+'_'+op)
 }
 return Array.isArray(rows)&&rows.length===names.length&&new Set(rows.map(r=>r.name)).size===names.length&&rows.every(r=>names.includes(r.name)&&r.status==='PASS'&&r.response_values_included===false)
}
export function executionEvidence(plan,evidence,exitCode){
 if(plan?.mode!=='ACTUAL_DISPOSABLE_LOCAL'||plan.version!==1||plan.phases?.map(p=>p.phase).join()!==phases.join())fail('ACTIVATION_PLAN_INVALID')
 const result=structuredClone(plan)
 const state=(phase,status)=>{result.phases.find(p=>p.phase===phase).status=status}
 state('PREFLIGHT','PASS')
 const bound=evidence?.sha===plan.source_sha&&evidence.environment==='LOCAL_SUPABASE_DOCKER'&&evidence.config_sha256===plan.config_sha256&&evidence.migration_count===plan.migration_count&&evidence.migration_head===plan.migration_head
 if(!bound){result.status='FAIL';result.error=evidence?'ACTIVATION_EVIDENCE_BINDING_MISMATCH':'ACTIVATION_SAFE_REPORT_ABSENT';result.teardown='UNKNOWN';return result}
 state('BOOTSTRAP',evidence.zero_to_head==='PASS'?'PASS':'FAIL')
 const verified=['auth','jwt','postgrest','rpc','storage'].every(k=>evidence[k]==='PASS')
 state('VERIFY',verified?'PASS':'FAIL')
 const b=evidence.backup,n=evidence.negative_recovery,r=evidence.disaster_rehearsal
 const backup=b?.database==='PASS'&&b.storage_bytes==='PASS'&&b.encryption==='AES-256-GCM'&&/^[a-f0-9]{64}$/.test(b.archive_sha256??'')&&Number.isSafeInteger(b.objects)&&b.objects>0&&b.auth_scope==='LOCAL_USERS_IDENTITIES_ONLY_NO_SESSIONS'&&Array.isArray(n)&&n.length===negatives.length&&new Set(n.map(x=>x.name)).size===negatives.length&&n.every(x=>negatives.includes(x.name)&&x.status==='PASS')
 state('BACKUP',backup?'PASS':'FAIL')
 const restored=r?.result==='PASS'&&r.fresh_rebuilds===2&&['schema_drift','database_hashes','tenant_isolation','revoked_member','auth_login'].every(k=>r[k]==='PASS')&&r.storage?.hashes==='PASS'&&r.storage.metadata==='PASS'&&r.storage.objects===b?.objects&&r.stale_admin_role==='DISPOSABLE_DOWNGRADE_TO_VIEWER_PRESERVED'&&roleProof(r.authorization_checks)&&deniedProof(r.denied_rpc_checks)&&evidence.recovery_configuration?.status==='PASS'&&evidence.recovery_configuration.private_values_included===false
 state('RESTORE_DRILL',restored?'PASS':'FAIL');state('TEARDOWN',evidence.teardown==='PASS'?'PASS':'FAIL');state('RELEASE_CANDIDATE','BLOCKED')
 result.status=exitCode===0&&evidence.result==='PASS'&&result.phases.filter(p=>!['CONFIGURATION','PLAN','RELEASE_CANDIDATE'].includes(p.phase)).every(p=>p.status==='PASS')?'PASS_DISPOSABLE_ONLY':'FAIL'
 result.teardown=evidence.teardown==='PASS'?'PASS':evidence.teardown==='FAIL'?'FAIL':'UNKNOWN'
 result.proof_counts={storage_objects:backup?b.objects:0,restored_auth_sessions:restored?16:0,restored_rpc_denials:restored?34:0,backup_negatives:backup?negatives.length:0}
 result.backend_checks=verified&&Number.isSafeInteger(evidence.w1_backend_checks)&&Number.isSafeInteger(evidence.w2_backend_takeover_checks)?evidence.w1_backend_checks+evidence.w2_backend_takeover_checks:null
 return result
}
export function activateDisposable(plan,env=process.env,runner=spawnSync){
 executionGuard(env);disposableGuard(env)
 const safePath=join(resolve(env.RUNNER_TEMP),'w4-supabase-safe-evidence.json')
 if(existsSync(safePath))fail('ACTIVATION_PREVIOUS_SAFE_ARTIFACT_FORBIDDEN')
 if(!existsSync(join(root,'.next/BUILD_ID')))fail('ACTIVATION_BUILD_REQUIRED')
 const child=runner(process.execPath,['--experimental-transform-types','scripts/security/supabase-local/run-stack.mjs'],{cwd:root,env:{...env,W5_RECOVERY:'true'},stdio:'ignore',timeout:2400000,maxBuffer:1024*1024})
 let evidence=null
 try{if(existsSync(safePath))evidence=JSON.parse(readFileSync(safePath,'utf8'))}catch{/* No contents/error text enter the public summary. */}
 return executionEvidence(plan,evidence,child.status)
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 let result
 try{
  if(!['plan','execute'].includes(process.argv[2]))fail('ACTIVATION_COMMAND_INVALID')
  const plan=activationPlan(exactSource())
  result=process.argv[2]==='plan'?plan:activateDisposable(plan)
  if(result.status==='FAIL')process.exitCode=1
 }catch(e){result={status:'FAIL',error:safeError(e),hosted_staging:'NOT_PROVEN',production:'NOT_AUTHORIZED',release:'NOT_ACCEPTED',values_included:false};process.exitCode=1}
 if(process.env.RUNNER_TEMP)writeFileSync(join(resolve(process.env.RUNNER_TEMP),'w5-disposable-activation.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'})
 console.log(JSON.stringify(result,null,2))
}
