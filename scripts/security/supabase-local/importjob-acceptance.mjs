import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
export async function importJobAcceptance({rpc,sql,check,users,wa,wb,url,anon,appUrl}){
 const id=randomUUID(),other=randomUUID(),create=(job,w,u)=>`('${job}','${w}','customers','${randomUUID()}','${'a'.repeat(64)}',1,1,'${randomUUID()}','${u}')`
 // Synthetic metadata fixtures only: no source bytes, plaintext staging or fabricated validation.
 sql(`insert into public.import_jobs(id,workspace_id,import_kind,source_file_ref_id,source_file_digest_hmac,digest_key_version,mapping_schema_version,idempotency_key_id,created_by_user_id)values ${create(id,wa,users.ownerA.id)},${create(other,wb,users.ownerB.id)}`)
 const cookieFor=async u=>{const values=[],s=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});await s.auth.setSession({access_token:u.token,refresh_token:u.refresh});return values.map(c=>c.name+'='+c.value).join('; ')}
 const cookie=await cookieFor(users.ownerA)
 const post=async(operation,input,c=cookie)=>{const r=await fetch(appUrl+'/api/import/v1',{method:'POST',headers:{cookie:c,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(15000)});return{status:r.status,json:await r.json()}}
 const list=await post('importjob.list',{limit:100});check(list.status===200&&list.json.data.items.some(j=>j.id===id)&&!list.json.data.items.some(j=>j.id===other),'importjob_actual_list_scoped')
 const get=await post('importjob.get',{id});check(get.status===200&&get.json.data.record.processing_status==='blocked_encrypted_staging_adapter'&&get.json.data.record.can_cancel===true,'importjob_actual_get_blocked_truth')
 check(!/(source_file|digest|payload|encrypted_payload|created_by|email)/.test(JSON.stringify(get.json)),'importjob_actual_minimized_DTO')
 for(const operation of ['importjob.begin','importjob.validate','importjob.apply','importjob.resume'])check((await post(operation,{id})).status===400,'importjob_actual_unimplemented_not_registered_'+operation)
 check((await post('importjob.get',{id:other})).status===404,'importjob_actual_foreign_id_hidden')
 const input={command_id:randomUUID(),id,expected_version:1},replays=await Promise.all(Array.from({length:20},()=>post('importjob.cancel',input)))
 check(replays.every(r=>r.status===200&&r.json.receipt.version===2&&JSON.stringify(r.json)===JSON.stringify(replays[0].json)),'importjob_actual_twenty_cancel_replays')
 check((await post('importjob.cancel',{...input,expected_version:2})).status===409,'importjob_actual_changed_replay_conflict')
 check((await post('importjob.cancel',{...input,command_id:randomUUID(),expected_version:2})).status===400,'importjob_actual_terminal_not_resumed')
 check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===1,'importjob_actual_one_cancel_audit')
 for(const u of [users.memberA,users.viewerA,users.ownerB]){
  const c=await cookieFor(u);for(const [operation,value]of [['importjob.get',{id}],['importjob.cancel',input]])check((await post(operation,value,c)).status>=400,'importjob_actual_role_denied_'+operation+'_'+u.role)
  const listed=await post('importjob.list',{},c);check(u===users.ownerB?listed.status===200&&!listed.json.data.items.some(j=>j.id===id):listed.status===403,'importjob_actual_list_role_or_scope_'+u.role)
 }
 check((await rpc('importjob_v1_list',{p_workspace_id:wb,p_input:{}},users.ownerA.token)).status===403,'importjob_actual_foreign_scope_denied')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 check((await post('importjob.cancel',input)).status===403,'importjob_actual_revoked_replay_denied')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 return{importjob_management:'PASS',importjob_processing:'BLOCKED_ENCRYPTED_STAGING_ADAPTER',importjob_quarantine_upload:'NOT_IMPLEMENTED'}
}
