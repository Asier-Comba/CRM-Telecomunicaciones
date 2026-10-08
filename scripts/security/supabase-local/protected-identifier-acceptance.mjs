import {randomUUID}from 'node:crypto'
// SQL prepares synthetic entities; every product operation uses real cookie/JWT transport.
export async function protectedIdentifierAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const customer=randomUUID(),operator=randomUUID(),contract=randomUUID(),service=randomUUID(),line=randomUUID(),second=randomUUID(),imported=randomUUID(),fixed=randomUUID()
 sql(`select set_config('request.jwt.claim.sub','${users.memberA.id}',false);
 insert into public.customers(id,workspace_id,account_kind,legal_name,created_by_user_id)values('${customer}','${wa}','legal_entity','TEL5 Synthetic Identifiers','${users.memberA.id}');
 insert into public.telecom_operators(id,workspace_id,code,display_name,created_by_user_id)values('${operator}','${wa}','identifier_${operator.replaceAll('-','')}','TEL5 Synthetic Identifier Operator','${users.ownerA.id}');
 insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,start_date,created_by_user_id)values('${contract}','${wa}','${customer}','${operator}','2026-01-01','${users.memberA.id}');
 insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,service_kind,display_name,created_by_user_id)values('${service}','${wa}','${customer}','${operator}','${contract}','mobile','TEL5 Synthetic Identifier Service','${users.memberA.id}');
 insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,service_kind,display_name,created_by_user_id)values('${fixed}','${wa}','${customer}','${operator}','${contract}','fiber','TEL5 Synthetic Circuit Service','${users.memberA.id}');
 insert into public.telecom_lines(id,workspace_id,service_id,display_name,source,created_by_user_id)values('${line}','${wa}','${service}','TEL5 Synthetic Identifier Line','manual','${users.memberA.id}'),('${second}','${wa}','${service}','TEL5 Synthetic Identifier Race','manual','${users.memberA.id}'),('${imported}','${wa}','${service}','TEL5 Synthetic Imported Line','import','${users.memberA.id}');`)
 const {createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of ['memberA','viewerA','ownerB']){
  const values=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}})
  check(!(await client.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'identifier_real_cookie_'+name)
  cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')
 }
 const post=async(operation,input,name='memberA',path='/api/identifiers/v1')=>{
  const r=await fetch(appUrl+path,{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)})
  check(r.headers.get('cache-control')==='no-store','identifier_no_store_'+operation)
  return{status:r.status,json:await r.json()}
 }
 const create={command_id:randomUUID(),entity_kind:'line',entity_id:line,identifier_kind:'msisdn',canonical_value:'+12025550123'}
 const r=await post('identifier.create_manual',create);check(r.status===200&&r.json.data.version===1,'identifier_create_individually_observed');const id=r.json.data.id
 check(!JSON.stringify(r.json).includes(create.canonical_value),'identifier_receipt_no_raw_value')
 const replay=await post('identifier.create_manual',create);check(JSON.stringify(replay.json)===JSON.stringify(r.json),'identifier_create_exact_receipt')
 const safe=await post('identifier.get',{id});check(safe.status===200&&safe.json.data.record.masked_display==='••••123'&&!Object.hasOwn(safe.json.data.record,'canonical_value'),'identifier_get_individually_observed')
 check((await post('identifier.get',{id},'ownerB')).status===404,'identifier_cross_tenant_hidden')
 check((await post('identifier.get',{id},'viewerA')).status===200,'identifier_viewer_masked_only')
 const list=await post('identifier.list',{entity_kind:'line',entity_id:line,limit:1});check(list.status===200&&list.json.data.items.length===1&&list.json.data.next_id===id,'identifier_list_individually_observed')
 const reveal={entity_kind:'telecom_identifier',entity_id:id,fields:['canonical_value']}
 const raw=await post('sensitive.get',reveal,'memberA','/api/sensitive/v1');check(raw.status===200&&raw.json.data.values.canonical_value===create.canonical_value&&Object.keys(raw.json.data.values).length===1,'identifier_requested_reveal_observed')
 check((await post('sensitive.get',reveal,'viewerA','/api/sensitive/v1')).status===403,'identifier_viewer_reveal_denied')
 check((await post('sensitive.get',reveal,'ownerB','/api/sensitive/v1')).status===404,'identifier_reveal_foreign_denied')
 check((await post('identifier.create_manual',{...create,command_id:randomUUID(),canonical_value:'2025550123'})).status===400,'identifier_ambiguous_number_denied')
 check((await post('identifier.create_manual',{...create,command_id:randomUUID(),entity_id:imported})).status===403,'identifier_imported_parent_read_only')
 check((await post('identifier.create_manual',{...create,command_id:randomUUID()},'viewerA')).status===403,'identifier_viewer_write_denied')
 check((await http('/rest/v1/telecom_identifiers?select=canonical_value',users.memberA.token)).status>=400,'identifier_raw_relation_denied')
 check((await rpc('identifier_v1_command',{p_workspace_id:wa,p_operation:'identifier.create_manual',p_input:{...create,command_id:randomUUID(),source:'integration'}},users.memberA.token)).status>=400,'identifier_rpc_input_closed')
 const retire={command_id:randomUUID(),id,expected_version:1},retired=await post('identifier.retire',retire);check(retired.status===200&&retired.json.data.version===2&&retired.json.data.status==='retired','identifier_retire_individually_observed')
 check(JSON.stringify((await post('identifier.retire',retire)).json)===JSON.stringify(retired.json),'identifier_retire_exact_replay')
 check((await post('identifier.retire',{...retire,command_id:randomUUID()})).status===409,'identifier_retire_stale_conflict')
 const history=await post('identifier.create_manual',{...create,command_id:randomUUID(),canonical_value:'+12025550124'});check(history.status===200&&history.json.data.id!==id,'identifier_replacement_preserves_prior_identity')
 check((await post('identifier.list',{entity_kind:'line',entity_id:line})).json.data.items.length===2,'identifier_retired_history_readable')
 for(const[kind,entity_kind,entity_id,value]of [['circuit_reference','service',fixed,'SYN-CIRCUIT-001'],['provider_account_reference','contract',contract,'SYN-ACCOUNT-001'],['provider_contract_reference','contract',contract,'SYN-CONTRACT-001']]){
  const response=await post('identifier.create_manual',{command_id:randomUUID(),entity_kind,entity_id,identifier_kind:kind,canonical_value:value});check(response.status===200,'identifier_registered_kind_'+kind)
  const masked=await post('identifier.get',{id:response.json.data.id});check(masked.status===200&&masked.json.data.record.masked_display==='••••001'&&!JSON.stringify(masked.json).includes(value),'identifier_reference_mask_'+kind)
 }
 const races=await Promise.all(Array.from({length:10},()=>post('identifier.create_manual',{...create,command_id:randomUUID(),entity_id:second,canonical_value:'+12025550125'})))
 check(races.filter(x=>x.status===200).length===1&&races.filter(x=>x.status===409).length===9,'identifier_assignment_concurrent_one_winner')
 // Privileged SQL inspects only counts/boolean privacy invariants, never reports raw values.
 const audit=sql(`select (select count(*) from public.product_reveal_audit_events where workspace_id='${wa}'and entity_kind='telecom_identifier'and entity_id='${id}')||':'||(select count(*) from public.product_commands where workspace_id='${wa}'and operation like 'identifier.%'and receipt::text like '%1202555012%')||':'||(select count(*) from public.product_audit_events where workspace_id='${wa}'and row_to_json(product_audit_events)::text like '%1202555012%');`)
 check(String(audit).trim()==='1:0:0','identifier_audit_receipt_value_free')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}';`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'identifier_revoked_jwt_still_valid')
 for(const[op,input]of [['identifier.create_manual',create],['identifier.retire',retire],['identifier.list',{entity_kind:'line',entity_id:line}],['identifier.get',{id}]])check((await post(op,input)).status===403,'identifier_current_revocation_'+op)
 check((await post('sensitive.get',reveal,'memberA','/api/sensitive/v1')).status===403,'identifier_reveal_revoked')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}';`)
 return{protected_identifier_operations_individually_observed:['identifier.create_manual','identifier.retire','identifier.list','identifier.get'],protected_identifier_reveal:'PASS_REQUESTED_CANONICAL_FIELD_AUDITED',protected_identifier_concurrency:'PASS_ONE_WINNER',protected_identifiers:'PASS_CANONICAL_MASK_HISTORY_REVOCATION_VALUE_FREE_AUDIT',protected_identifier_production_import:'BLOCKED_SEPARATE_PROTECTED_STAGING_REQUIRED'}
}
