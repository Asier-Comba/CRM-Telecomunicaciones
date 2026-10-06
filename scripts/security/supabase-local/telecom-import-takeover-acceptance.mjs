import {randomBytes,randomUUID} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createDisposableImportStagingV1} from '../../../src/lib/server/import-staging-disposable-v1.ts'
import {stageProtectedTelecomImportV1} from '../../../src/lib/server/protected-telecom-import-v1.ts'
import {validateTelecomSafeImportV1} from '../../../src/lib/server/telecom-import-mapping-v1.ts'
/** Test-only worker uses live Auth/RPC authority and scoped disposable PostgreSQL reference facts. */
export async function telecomImportTakeoverAcceptance({rpc,sql,check,http,users,wa}){
 const actor=users.ownerA,job=randomUUID(),ordinary=randomUUID(),root=await mkdtemp(join(tmpdir(),'w2-telecom-import-'))
 const normal=async(name,input,op)=>{const r=await rpc(name,{p_workspace_id:wa,...(op?{p_operation:op}:{}),p_input:input},actor.token);check(r.status===200,'takeover_import_context_'+(op??name));return r.json}
 const c=await normal('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Synthetic Import Context'}),other=await normal('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Synthetic Other Import Context'})
 const o=await normal('catalog_v1_command',{command_id:randomUUID(),code:'w2_import_operator',display_name:'Synthetic Import Operator'},'operator.create')
 const contract=await normal('portfolio_v1_contract_create_manual',{command_id:randomUUID(),customer_id:c.id,operator_id:o.id,start_date:'2026-01-01',plan_version_id:null})
 const service=await normal('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,service_kind:'mobile',display_name:'Synthetic Import Mobile',plan_version_id:null})
 const line=await normal('portfolio_v1_line_create_manual',{command_id:randomUUID(),service_id:service.id,display_name:'Synthetic Import Line'})
 const fiber=await normal('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,service_kind:'fiber',display_name:'Synthetic Import Fibre',plan_version_id:null})
 const sim=await normal('sim_v1_command',{command_id:randomUUID(),customer_id:c.id,operator_id:o.id,kind:'physical',display_label:'Synthetic Import SIM'},'sim.create')
 sql(`insert into public.import_jobs(id,workspace_id,import_kind,source_file_ref_id,source_file_digest_hmac,digest_key_version,mapping_schema_version,idempotency_key_id,created_by_user_id)values('${job}','${wa}','protected_identifiers','${randomUUID()}','${'b'.repeat(64)}',1,1,'${randomUUID()}','${actor.id}'),('${ordinary}','${wa}','services','${randomUUID()}','${'c'.repeat(64)}',1,1,'${randomUUID()}','${actor.id}');`)
 const resolve=async()=>{const user=await http('/auth/v1/user',actor.token),role=await rpc('current_workspace_role',{p_workspace_id:wa},actor.token);return user.status===200&&user.json?.id===actor.id&&role.status===200&&['owner','admin'].includes(role.json)?{workspaceId:wa,actorId:actor.id,role:role.json}:null}
 const getJob=async(w,id)=>{const r=await rpc('importjob_v1_get',{p_workspace_id:w,p_input:{id}},actor.token);return r.status===200?r.json?.record:null}
 const tables={customers:'customers',operators:'telecom_operators',contracts:'telecom_contracts',services:'telecom_services',lines:'telecom_lines',sims:'telecom_sims'}
 const port={resolve,kind:async id=>(await getJob(wa,id))?.kind==='protected_identifiers'?'protected_identifiers':null,lookup:async(w,kind,id)=>{
  if(!(await resolve())||w!==wa||!Object.hasOwn(tables,kind))return null
  const context=kind==='contracts'||kind==='services'?",'customer_id',customer_id,'operator_id',operator_id"+ (kind==='services'?",'contract_id',contract_id":""):kind==='lines'?",'service_id',service_id":""
  const value=sql(`select jsonb_build_object('id',id,'kind','${kind}','workspaceId',workspace_id${context})from public.${tables[kind]} where workspace_id='${wa}'and id='${id}';`).trim()
  return value?JSON.parse(value):null
 }}
 const env={NODE_ENV:'test',IMPORT_STAGING_ADAPTER:'disposable-local',IMPORT_STAGING_TEST_KEY:randomBytes(32).toString('hex')}
 const worker={resolve,job:async(w,id)=>{const record=await getJob(w,id);return record?{id:record.id,status:record.status}:null}}
 const denied=async(fn,name)=>{let failed=false;try{await fn()}catch{failed=true}check(failed,name)}
 try{
  const adapter=await createDisposableImportStagingV1(root,worker,env)
  const headers='id,source,customer_id,contract_id,operator_id,service_kind,display_name,status\n'
  const rows=Array.from({length:25},(_,n)=>`${randomUUID()},import,${c.id},${contract.id},${o.id},mobile,Synthetic Import Candidate ${n},pending`)
  const bytes=new TextEncoder().encode(headers+rows.join('\n')),first=await validateTelecomSafeImportV1('services',bytes,port)
  check(first.valid_rows===25&&first.rows.length===20&&first.next_row===20,'takeover_import_real_refs_bounded_metadata')
  const last=await validateTelecomSafeImportV1('services',bytes,port,20);check(last.rows.length===5&&last.next_row===null,'takeover_import_real_cursor_end')
  const bad=new TextEncoder().encode(headers+`${randomUUID()},import,${other.id},${contract.id},${o.id},mobile,Synthetic Conflict,pending`)
  check((await validateTelecomSafeImportV1('services',bad,port)).errors.some(x=>x.code==='ancestry'),'takeover_import_real_cross_customer_rejected')
  const values=[['line',line.id,'msisdn','+34600123456'],['sim',sim.id,'iccid','89123456789012345678'],['sim',sim.id,'eid','12345678901234567890123456789012'],['service',fiber.id,'circuit_reference','CIRCUIT-123456'],['contract',contract.id,'provider_account_reference','ACCOUNT-123456'],['contract',contract.id,'provider_contract_reference','CONTRACT-123456']]
  const protectedBytes=new TextEncoder().encode('entity_kind,entity_id,identifier_kind,canonical_value\n'+values.map(r=>r.join(',')).join('\n')),object=randomUUID()
  const receipt=await stageProtectedTelecomImportV1(job,protectedBytes,adapter,port,object)
  check(receipt.total_rows===6&&receipt.production_ready===false,'takeover_protected_all_six_real_targets')
  check(JSON.stringify(await stageProtectedTelecomImportV1(job,protectedBytes,adapter,port,object))===JSON.stringify(receipt),'takeover_protected_exact_encrypted_replay')
  const cipher=await readFile(join(root,wa,job,object+'.aead'));check(values.every(r=>!cipher.includes(Buffer.from(r[3]))&&!JSON.stringify(receipt).includes(r[3])),'takeover_protected_no_plaintext_at_rest_or_receipt')
  await denied(()=>stageProtectedTelecomImportV1(ordinary,protectedBytes,adapter,port),'takeover_protected_ordinary_job_rejected')
  await denied(()=>validateTelecomSafeImportV1('services',protectedBytes,port),'takeover_protected_cannot_enter_ordinary_preview')
  sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${actor.id}';`)
  check((await http('/auth/v1/user',actor.token)).status===200,'takeover_import_revoked_jwt_valid')
  await denied(()=>validateTelecomSafeImportV1('services',bytes,port),'takeover_import_revoked_validation_denied')
  await denied(()=>stageProtectedTelecomImportV1(job,protectedBytes,adapter,port),'takeover_protected_revoked_stage_denied')
  sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${actor.id}';`)
  check((await normal('importjob_v1_cancel',{command_id:randomUUID(),id:job,expected_version:1})).status==='cancelled','takeover_protected_job_cancel')
  const cleanup=await adapter.authorize(job,'cleanup');await adapter.delete(cleanup,receipt.staging)
  check(sql(`select not exists(select 1 from public.telecom_services where workspace_id='${wa}'and display_name like'Synthetic Import Candidate%');`).trim()==='t','takeover_import_validation_never_claims_canonical_apply')
  return {w2_safe_import_mapping:'PASS_SEVENTEEN_SCHEMAS_NODE_REAL_AUTH_SCOPED_REFERENCE_VALIDATION',w2_protected_import:'PASS_SIX_TYPES_DISTINCT_JOB_ENCRYPTED_DISPOSABLE_SCOPE_REVOCATION',w2_import_canonical_apply:'DISABLED_REGISTERED_DOMAIN_ADAPTERS_AND_PRODUCTION_KMS_WORKER_REQUIRED'}
 }finally{sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${actor.id}';`);await rm(root,{recursive:true,force:true})}
}
