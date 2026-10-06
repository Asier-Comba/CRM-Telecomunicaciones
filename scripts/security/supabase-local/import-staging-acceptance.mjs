import {randomBytes,randomUUID}from 'node:crypto'
import {mkdtemp,readFile,rm}from 'node:fs/promises'
import {tmpdir}from 'node:os'
import {join}from 'node:path'
import {createDisposableImportStagingV1}from '../../../src/lib/server/import-staging-disposable-v1.ts'
import {validateCustomerCsvV1}from '../../../src/lib/server/import-csv-v1.ts'
export async function importStagingAcceptance({rpc,sql,check,http,users,wa,wb}){
 const job=randomUUID(),foreign=randomUUID(),create=(id,w,u)=>`('${id}','${w}','customers','${randomUUID()}','${'a'.repeat(64)}',1,1,'${randomUUID()}','${u}')`
 sql(`insert into public.import_jobs(id,workspace_id,import_kind,source_file_ref_id,source_file_digest_hmac,digest_key_version,mapping_schema_version,idempotency_key_id,created_by_user_id)values ${create(job,wa,users.ownerA.id)},${create(foreign,wb,users.ownerB.id)}`)
 const portFor=u=>({
  resolve:async()=>{const user=await http('/auth/v1/user',u.token);const role=await rpc('current_workspace_role',{p_workspace_id:u.workspace},u.token);return user.status===200&&user.json?.id===u.id&&role.status===200&&['owner','admin'].includes(role.json)?{workspaceId:u.workspace,actorId:u.id,role:role.json}:null},
  job:async(w,id)=>{const r=await rpc('importjob_v1_get',{p_workspace_id:w,p_input:{id}},u.token);return r.status===200&&r.json?.record?{id:r.json.record.id,status:r.json.record.status}:null}
 })
 const root=await mkdtemp(join(tmpdir(),'crm-real-import-test-')),env={NODE_ENV:'test',IMPORT_STAGING_ADAPTER:'disposable-local',IMPORT_STAGING_TEST_KEY:randomBytes(32).toString('hex')}
 const denied=async(fn,label)=>{let rejected=false;try{await fn()}catch{rejected=true}check(rejected,label)}
 try{
  const adapter=await createDisposableImportStagingV1(root,portFor(users.ownerA),env),g=await adapter.authorize(job,'stage')
  const bytes=new TextEncoder().encode('account_kind,legal_name\nlegal_entity,Synthetic customer\n'),object=randomUUID()
  const refs=await Promise.all(Array.from({length:20},()=>adapter.put(g,bytes,object)));check(refs.every(r=>JSON.stringify(r)===JSON.stringify(refs[0])),'import_staging_real_twenty_immutable_replays')
  const ref=refs[0],cipher=await readFile(join(root,wa,job,object+'.aead'));check(!cipher.includes(Buffer.from('Synthetic customer')),'import_staging_real_no_plaintext_at_rest')
  const clear=await adapter.get(g,ref);check(Buffer.from(clear).equals(Buffer.from(bytes)),'import_staging_real_AEAD_roundtrip')
  check(validateCustomerCsvV1(clear).valid_rows===1,'import_staging_real_bounded_CSV_validation_only')
  check(adapter.health().production_ready===false,'import_staging_real_no_production_claim')
  await denied(()=>adapter.get({...g},ref),'import_staging_real_forged_grant')
  await denied(()=>adapter.authorize(foreign,'stage'),'import_staging_real_foreign_job')
  const b=await createDisposableImportStagingV1(root,portFor(users.ownerB),env);await denied(()=>b.get(g,ref),'import_staging_real_cross_adapter_grant')
  sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
  check((await http('/auth/v1/user',users.ownerA.token)).status===200,'import_staging_real_revoked_JWT_still_valid')
  await denied(()=>adapter.get(g,ref),'import_staging_real_revoked_read_denied')
  sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
  check((await rpc('importjob_v1_cancel',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id:job,expected_version:1}},users.ownerA.token)).status===200,'import_staging_real_canonical_cancel')
  await denied(()=>adapter.get(g,ref),'import_staging_real_terminal_processing_denied')
  const cleanup=await adapter.authorize(job,'cleanup');await adapter.delete(cleanup,ref)
  let exists=true;try{await readFile(join(root,wa,job,object+'.aead'))}catch{exists=false}check(!exists,'import_staging_real_exact_terminal_cleanup')
  check(Number(sql(`select count(*)from public.customers where workspace_id='${wa}'and legal_name='Synthetic customer'`))===0,'import_staging_real_validation_did_not_apply')
  return{import_staging_disposable:'PASS_DISPOSABLE_ONLY',import_staging_crypto:'AES_256_GCM_EPHEMERAL_TEST_KEY',import_staging_scope:'REAL_AUTH_POSTGREST_CURRENT_MEMBERSHIP',import_processing_production:'BLOCKED_REGISTERED_KMS_SCOPED_WORKER_DOMAIN_ADAPTERS',import_xlsx:'UNREGISTERED',import_zip:'BLOCKED'}
 }finally{sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`);await rm(root,{recursive:true,force:true})}
}
