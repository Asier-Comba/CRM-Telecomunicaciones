import test from 'node:test'
import assert from 'node:assert/strict'
import {activationPlan,executionGuard,executionEvidence} from '../../scripts/platform/disposable-activation.mjs'
const source='a'.repeat(40),cfg='b'.repeat(64),migrations=[{name:'20260101000000_synthetic.sql',sha256:'c'.repeat(64)}]
const negatives=['CORRUPT_ARCHIVE_REJECTED','WRONG_KEY_REJECTED','INCOMPLETE_ARCHIVE_FORMAT_REJECTED','NONCANONICAL_ARCHIVE_FORMAT_REJECTED','AMBIGUOUS_BUCKET_INVENTORY_REJECTED','MISSING_OBJECT_BYTES_REJECTED','PUBLIC_BUCKET_REJECTED','UNRECOGNIZED_MIGRATION_REJECTED','UNDECLARED_PUBLIC_MANIFEST_FIELD_REJECTED','UNDECLARED_PUBLIC_CONFIG_FIELD_REJECTED','NONCANONICAL_PUBLIC_CONFIG_REJECTED']
function fixture(){
 const sessions=['FRESH_LOGIN','RETAINED_JWT'],authorization_checks=[],denied_rpc_checks=[]
 for(const actor of ['ownerA','ownerB','removedA','suspendedA','viewerA','adminA','memberA','memberB'])for(const session of sessions)authorization_checks.push({actor,session,status:'PASS',response_values_included:false,assistant_raw:'DENIED',storage:actor==='ownerA'?'AUTHORIZED':'DENIED'})
 for(const session of sessions){
  for(const suffix of ['EXPIRED_TICKET','FORGED_TICKET','FOREIGN_REVEAL_SCOPE'])denied_rpc_checks.push({name:session+'_'+suffix,status:'PASS',response_values_included:false})
  for(const actor of ['ownerB','removedA','suspendedA','viewerA','adminA'])for(const op of ['WRITE','REVEAL'])denied_rpc_checks.push({name:actor+'_'+session+'_'+op,status:'PASS',response_values_included:false})
  for(const actor of ['memberA','memberB'])for(const op of ['FOREIGN_WRITE','FOREIGN_REVEAL'])denied_rpc_checks.push({name:actor+'_'+session+'_'+op,status:'PASS',response_values_included:false})
 }
 return {environment:'LOCAL_SUPABASE_DOCKER',sha:source,config_sha256:cfg,migration_count:1,migration_head:migrations[0].name,result:'PASS',zero_to_head:'PASS',auth:'PASS',jwt:'PASS',postgrest:'PASS',rpc:'PASS',storage:'PASS',teardown:'PASS',w1_backend_checks:3,w2_backend_takeover_checks:2,negative_recovery:negatives.map(name=>({name,status:'PASS'})),backup:{database:'PASS',storage_bytes:'PASS',encryption:'AES-256-GCM',archive_sha256:'d'.repeat(64),objects:1,auth_scope:'LOCAL_USERS_IDENTITIES_ONLY_NO_SESSIONS'},recovery_configuration:{status:'PASS',private_values_included:false},disaster_rehearsal:{result:'PASS',fresh_rebuilds:2,schema_drift:'PASS',database_hashes:'PASS',storage:{hashes:'PASS',metadata:'PASS',objects:1},tenant_isolation:'PASS',revoked_member:'PASS',auth_login:'PASS',stale_admin_role:'DISPOSABLE_DOWNGRADE_TO_VIEWER_PRESERVED',authorization_checks,denied_rpc_checks}}
}
const plan=()=>activationPlan(source,migrations,cfg)
test('local plan is executable scope but never company account, hosted staging or release approval',()=>{
 const p=plan();assert.equal(p.mode,'ACTUAL_DISPOSABLE_LOCAL');assert.equal(p.hosted_staging,'NOT_PROVEN');assert.equal(p.release,'NOT_ACCEPTED');assert.equal(p.company_configuration,'NOT_ACTIVATED');assert.equal(p.ai_writes,'OFF')
 assert.equal(p.phases.find(x=>x.phase==='BOOTSTRAP').status,'NOT_RUN')
})
test('physical adapter guard denies hosted, paid, non-CI, production and product-journey duplication',()=>{
 const env={CI:'true',GITHUB_ACTIONS:'true',PLATFORM_TARGET:'LOCAL',RUNNER_TEMP:'/tmp/synthetic'}
 assert.doesNotThrow(()=>executionGuard(env,'linux',false))
 for(const mutation of [e=>e.CI='false',e=>e.GITHUB_ACTIONS='false',e=>e.PLATFORM_TARGET='STAGING',e=>e.NODE_ENV='production',e=>e.SUPABASE_ACCESS_TOKEN='private-canary',e=>e.SUPABASE_DB_PASSWORD='private-canary',e=>e.OPENAI_API_KEY='private-canary',e=>delete e.RUNNER_TEMP,e=>e.W2_PRODUCT_UI='true']){const e={...env};mutation(e);assert.throws(()=>executionGuard(e,'linux',false),/ACTIVATION_/)}
 assert.throws(()=>executionGuard(env,'win32',false));assert.throws(()=>executionGuard(env,'linux',true))
})
test('complete same-source fixture closes disposable chain with release explicitly blocked',()=>{
 const r=executionEvidence(plan(),fixture(),0)
 assert.equal(r.status,'PASS_DISPOSABLE_ONLY');assert.equal(r.phases.at(-1).status,'BLOCKED');assert.deepEqual(r.proof_counts,{storage_objects:1,restored_auth_sessions:16,restored_rpc_denials:34,backup_negatives:11});assert.equal(r.backend_checks,5)
})
test('missing or source/config/migration mismatched report never inherits recovery proof',()=>{
 assert.equal(executionEvidence(plan(),null,1).teardown,'UNKNOWN')
 for(const mutate of [e=>e.sha='e'.repeat(40),e=>e.config_sha256='e'.repeat(64),e=>e.migration_count=2,e=>e.migration_head='foreign.sql',e=>e.environment='HOSTED']){const e=fixture();mutate(e);const r=executionEvidence(plan(),e,0);assert.equal(r.status,'FAIL');assert.equal(r.error,'ACTIVATION_EVIDENCE_BINDING_MISMATCH')}
})
test('backup negatives and authenticated encryption are indispensable',()=>{
 for(const mutate of [e=>e.negative_recovery.pop(),e=>e.negative_recovery[1]=e.negative_recovery[0],e=>e.backup.encryption='PLAINTEXT',e=>e.backup.storage_bytes='FAIL',e=>e.backup.objects=0]){const e=fixture();mutate(e);assert.equal(executionEvidence(plan(),e,0).status,'FAIL')}
})
test('restore requires all current roles and sessions, ACL denial and private object metadata',()=>{
 for(const mutate of [r=>r.authorization_checks.pop(),r=>r.authorization_checks[1]=r.authorization_checks[0],r=>r.authorization_checks[2].storage='AUTHORIZED',r=>r.denied_rpc_checks.pop(),r=>r.denied_rpc_checks[1]=r.denied_rpc_checks[0],r=>r.stale_admin_role='ADMIN',r=>r.storage.metadata='FAIL',r=>r.fresh_rebuilds=1,r=>r.database_hashes='FAIL']){const e=fixture();mutate(e.disaster_rehearsal);assert.equal(executionEvidence(plan(),e,0).status,'FAIL')}
})
test('nonzero exit, partial acceptance, failed or unknown teardown cannot become PASS',()=>{
 for(const code of [1,null,undefined])assert.equal(executionEvidence(plan(),fixture(),code).status,'FAIL')
 for(const mutate of [e=>e.result='FAIL',e=>e.teardown='FAIL',e=>delete e.teardown,e=>e.auth='NOT_TESTED',e=>e.zero_to_head='FAIL']){const e=fixture();mutate(e);assert.equal(executionEvidence(plan(),e,0).status,'FAIL')}
})
test('summary discards provider payloads and leaves external gates unapproved',()=>{
 const e=fixture();e.private_payload='private-canary';e.backup.private_key='private-canary';e.disaster_rehearsal.untrusted_error='private-canary'
 const r=executionEvidence(plan(),e,0);assert.ok(!JSON.stringify(r).includes('private-canary'));assert.equal(r.production,'NOT_AUTHORIZED');assert.equal(r.model,'NOT_RUN')
})
