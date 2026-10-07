import {writeFileSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {root,migrations,readJson,run} from './lib.mjs'
const source=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):null
const recovery=source?.evidence?.disaster_rehearsal
const packageProof=source?.package_proof??null
const boundaryProof=source?.boundary_proof??null
const acceptance={version:1,generated_at:new Date().toISOString(),head_at_generation:run('git',['rev-parse','HEAD']).trim(),base_w2_sha:'7ab6f56f10fc65aa7212ed5dfbdeacea8901756a',w2_last_observed:'692ba6fcc3c78ba3b57a2d8fbc2b8b82317b4b7c',w3_last_observed:'db5d9defbe06ce7b7543df78823c4ab15a38f80b',w3_source_consumed:null,pr:'https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/34',manifest:{file:'infra/platform/environment-manifest.json',entries:readJson('infra/platform/environment-manifest.json').entries.length,migrations:migrations().length},ci_package:packageProof,ci_boundaries:boundaryProof,evidence:source?{run_url:source.run_url,source_head_sha:source.source_head_sha,tested_merge_sha:source.evidence?.sha,overall:source.evidence?.result,recovery_stage:source.evidence?.recovery_stage,error:source.evidence?.error,zero_to_head:source.evidence?.zero_to_head,backend_checks:source.evidence?.w1_backend_checks,takeover_checks:source.evidence?.w2_backend_takeover_checks,backup:source.evidence?.backup,disaster_rehearsal:recovery}:null,local:{platform_tests:'PASS_23',typecheck:'PASS',offline_build:'PASS',build_health_smoke:'PASS',private_canary_boundary:'PASS_22_CLASSES_2006_FILES_CACHE_REMOVED',portability_scan:'PASS',embedded_70_migration_restore:'PASS',repository_bootstrap_tests:'386_PASS_5_WINDOWS_UNIX_PERMISSION_FAILURES',dependency_audit:'5_HIGH_INHERITED_BRACES_CHAIN',container:'HOST_DOCKER_UNAVAILABLE'},zero_to_app:source?.evidence?.result==='PASS'?'PASS_BACKEND_TRANSPORT_ONLY':'NOT_RUN',full_product_browser:'NOT_PROVEN_AT_W5_HEAD',disaster_rehearsal:recovery?.result??'NOT_RUN',staging:'NOT_PROVEN',production:'NOT_PROVEN',w4_required:true,platform_freeze:false,external_actions_required:['company ownership and two MFA administrators','separate Supabase staging/prod projects','domain/DNS/TLS provider bindings','human mail and verified Auth SMTP','accepted CRM outbound provider adapter','scoped AI/n8n/monitoring secrets if selected','approved retention/RPO/RTO/offsite/KMS','independent W4 and real staging','final protected production approval'],internal_work_remaining:['resolve/prove real Supabase disaster rehearsal','accepted W2 hosted runtime and W3 worker integration when published','independent hosted policy acceptance with accepted W2/W3 contracts'],next_5:['prove full real-local DB/Auth/Storage restore','review exact candidate SBOM and dependency advisory with W4','consume accepted W2 hosted runtime without bypass','obtain independent W4 platform review','bind company staging accounts and prove staging without customer data']}
const defs=[
 ['GitHub',true,true,'Company organization ownership/protection not established','git checkpoint push'],
 ['Supabase',true,source?.evidence?.zero_to_head==='PASS','Hosted company projects required','real local migration bootstrap'],
 ['DB',true,source?.evidence?.zero_to_head==='PASS','Hosted drift/ACL proof required','real local SQL and embedded contracts'],
 ['Auth',true,source?.evidence?.auth==='PASS','Hosted MFA/delivery/provider state required','real local create/login/refresh/logout/revoke'],
 ['Storage',true,source?.evidence?.storage==='PASS','Hosted object/ACL proof required','real local private object API'],
 ['App deploy',true,true,'W2 hosted runtime remains disabled','built server health smoke only'],
 ['DNS',true,false,'Provider-issued records and authority required','simulated resolver validator only'],
 ['human email',false,false,'Company mail account provisioning required','none'],
 ['Auth email',true,false,'SMTP and live deliverability required','synthetic config transport/templates only'],
 ['CRM email',false,false,'Accepted outbound delivery adapter required','contract only'],
 ['AI',true,false,'W3 accepted runtime/worker/live synthetic eval required','private environment/provider seam only'],
 ['n8n',true,false,'Persistent deployment/provider IDs/import and safe live test required','closed inactive workflow validation only'],
 ['VPS',true,false,'Company VPS/hardening/TLS required','deployment package only'],
 ['backup',true,source?.evidence?.backup?.database==='PASS','Hosted encrypted offsite/KMS/access/retention required','encrypted synthetic DB and object archive'],
 ['restore',true,recovery?.result==='PASS','Hosted full recovery and provider Auth assumptions required','real-local A to B rehearsal'],
 ['monitoring',true,false,'Provider binding/thresholds required','metadata/alert contract only'],
 ['logging',true,true,'Existing hosted runtime logs require independent review','allowlisted structured event redaction tests'],
 ['secrets',true,true,'Company scoped store and identities required','manifest/canary build boundaries'],
 ['rotation',true,false,'Provider-specific dual-secret/revocation proof required','runbook only'],
 ['CI/CD',true,true,'Release protection and accepted hosted deploy adapter required','CI contracts; no live deploy'],
 ['staging',true,false,'W2 hosted runtime, providers and W4 required','read-only fail-closed preflight'],
 ['production',true,false,'Staging/exact candidate/W4/backup/human approval required','read-only protected preflight only']
]
const rows=defs.map(([subsystem,implemented,local,blocker,scope])=>({subsystem,IMPLEMENTED:implemented,LOCALLY_PROVEN:!!local,EXTERNAL_CONFIG_REQUIRED:true,STAGING_PROVEN:false,PROD_PROVEN:false,BLOCKER:blocker,local_proof_scope:scope}))
const matrix={version:1,evidence_run:source?.run_url??null,rows,counts:Object.fromEntries(['IMPLEMENTED','LOCALLY_PROVEN','EXTERNAL_CONFIG_REQUIRED','STAGING_PROVEN','PROD_PROVEN'].map(k=>[k,rows.filter(r=>r[k]).length])),W4_REQUIRED:true,values_included:false}
writeFileSync(join(root,'docs/master/platform/W5_PLATFORM_ACCEPTANCE.json'),JSON.stringify(acceptance,null,2)+'\n')
writeFileSync(join(root,'docs/master/platform/ENTERPRISE_BOOTSTRAP_MATRIX.json'),JSON.stringify(matrix,null,2)+'\n')
console.log(JSON.stringify({acceptance:'GENERATED',counts:matrix.counts,staging:'NOT_PROVEN',production:'NOT_PROVEN'}))
