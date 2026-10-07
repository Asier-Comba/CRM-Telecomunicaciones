import {readFileSync} from 'node:fs'
import {migrations,run,safeError} from './lib.mjs'
export function promotionGate(candidate,target,now=Date.now()){
 const errors=[],sha=run('git',['rev-parse','HEAD']).trim()
 if(!['STAGING','PROD'].includes(target))errors.push('INVALID_PROMOTION_TARGET')
 if(candidate?.commit!==sha)errors.push('CANDIDATE_SHA_MISMATCH')
 if(!/^sha256:[0-9a-f]{64}$/.test(candidate?.artifact_digest??''))errors.push('ARTIFACT_DIGEST_REQUIRED')
 if(candidate?.migration_head!==migrations().at(-1)?.name)errors.push('MIGRATION_HEAD_MISMATCH')
 if(candidate?.tests?.result!=='PASS'||candidate?.config?.result!=='PASS')errors.push('TEST_CONFIG_PROOF_REQUIRED')
 if(candidate?.w4?.result!=='APPROVED'||candidate.w4.commit!==sha||typeof candidate.w4.evidence_url!=='string'||!candidate.w4.evidence_url.startsWith('https://github.com/'))errors.push('INDEPENDENT_W4_PROOF_REQUIRED')
 if(candidate?.product_hosted_runtime!=='ACCEPTED')errors.push('HOSTED_PRODUCT_RUNTIME_REQUIRED')
 if(target==='PROD'){
  if(candidate?.staging?.result!=='PASS'||candidate.staging.commit!==sha)errors.push('EXACT_STAGING_PROOF_REQUIRED')
  if(candidate?.recovery?.result!=='PASS'||candidate?.backup?.result!=='PASS')errors.push('RECOVERY_BACKUP_PROOF_REQUIRED')
  const age=now-Date.parse(candidate?.backup?.at)
  if(!Number.isFinite(age)||age<0||!Number.isSafeInteger(candidate?.backup?.max_age_seconds)||candidate.backup.max_age_seconds<=0||age>candidate.backup.max_age_seconds*1000)errors.push('BACKUP_FRESHNESS_REQUIRED')
 }
 // Current implementation is preparatory. No JSON document can unlock the
 // current W2 loopback-only runtime or replace protected workflow approval.
 errors.push('CURRENT_HOSTED_RUNTIME_BLOCKED')
 return {status:'BLOCKED',target,errors,mutation_performed:false,human_environment_approval_required:true}
}
if(process.argv[1]?.endsWith('promotion.mjs'))try{const r=promotionGate(JSON.parse(readFileSync(process.argv[2],'utf8')),process.argv[3]);console.log(JSON.stringify(r,null,2));process.exitCode=1}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
