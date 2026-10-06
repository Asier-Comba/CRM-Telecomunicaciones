import {randomUUID} from 'node:crypto'
export async function externalIdentityAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const {createServerClient}=await import('@supabase/ssr'),cookies={}
 for(const name of ['ownerA','adminA','memberA','viewerA','ownerB']){
  const values=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}})
  check(!(await client.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'identity_cookie_'+name)
  cookies[name]=values.map(v=>v.name+'='+v.value).join('; ')
 }
 const observed=new Set(),saved=[]
 const post=async(op,input,name='ownerA')=>{
  const response=await fetch(appUrl+'/api/telecom/external-identities/v1',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)})
  check(response.headers.get('cache-control')==='no-store','identity_no_store_'+op)
  return {status:response.status,json:await response.json()}
 }
 const command=async(op,input)=>{const r=await post(op,input);check(r.status===200&&r.json.ok,'identity_individually_observed_'+op);observed.add(op);saved.push([op,input,r.json]);return r.json.data}
 const createCustomer=async legal_name=>{const r=await rpc('product_v1_customer_create',{p_workspace_id:wa,p_input:{command_id:randomUUID(),account_kind:'legal_entity',legal_name}},users.ownerA.token);check(r.status===200,'identity_customer_setup_http_'+r.status);return r.json}
 const c=await createCustomer('Synthetic Identity Acceptance Customer')
 const other=await createCustomer('Synthetic Other Identity Acceptance')
 check(!!c?.id&&!!other?.id,'identity_scoped_customer_setup')
 const integration=await command('external_identity.integration_register',{command_id:randomUUID(),integration_key:'synthetic.acceptance',provider_code:'generic.telecom.v1',display_name:'Synthetic Identity Registry',source:'integration'})
 check(integration.external_effect==='disabled','identity_registration_not_provider_activation')
 const base={integration_id:integration.id,external_kind:'subscriber',external_id:'SYNTHETIC-IDENTITY-PRIVATE-ACCEPTANCE',local_entity_kind:'customer',local_entity_id:c.id}
 const binding=await command('external_identity.bind',{command_id:randomUUID(),...base})
 check((await post('external_identity.bind',{command_id:randomUUID(),...base})).json.data?.id===binding.id,'identity_duplicate_mapping_no_duplicate_row')
 for(const[name,status]of [['memberA',403],['viewerA',403],['ownerB',404]])check((await post('external_identity.bind',{command_id:randomUUID(),...base},name)).status===status,'identity_role_scope_'+name)
 check((await post('external_identity.bind',{command_id:randomUUID(),...base,local_entity_id:other.id})).status===409,'identity_immutable_local_binding')
 check((await post('external_identity.bind',{command_id:randomUUID(),...base,url:'https://invalid'})).status===400,'identity_arbitrary_url_rejected')
 check((await post('external_identity.bind',{command_id:randomUUID(),...base,local_entity_id:randomUUID()})).status===404,'identity_missing_target_rejected')
 const raceBase={...base,external_id:'SYNTHETIC-IDENTITY-RACE'},inputs=Array.from({length:20},(_,n)=>({command_id:randomUUID(),...raceBase,local_entity_id:n%2?c.id:other.id})),races=await Promise.all(inputs.map(i=>post('external_identity.bind',i)))
 const winners=races.filter(r=>r.status===200),conflicts=races.filter(r=>r.status===409)
 check(winners.length===10&&conflicts.length===10&&new Set(winners.map(r=>r.json.data.id)).size===1,'identity_concurrent_distinct_targets_one_mapping_no_rebind')
 for(let n=0;n<23;n++)await command('external_identity.bind',{command_id:randomUUID(),...base,external_id:'SYNTHETIC-IDENTITY-PAGE-'+n})
 let cursor,ids=[]
 for(let n=0;n<8;n++){
  const r=await post('external_identity.list',{local_entity_kind:'customer',local_entity_id:c.id,limit:5,...(cursor?{after_id:cursor}:{})})
  check(r.status===200&&r.json.ok,'identity_individually_observed_external_identity.list');observed.add('external_identity.list')
  check(r.json.data.items.every(x=>x.local_entity_id===c.id&&x.source==='integration'),'identity_read_exact_scope_source')
  ids.push(...r.json.data.items.map(x=>x.id));cursor=r.json.data.next_id;if(!cursor)break
 }
 check(ids.length>=24&&new Set(ids).size===ids.length,'identity_full_server_keyset_no_duplicates')
 const registry=await post('external_identity.integration_list',{limit:20},'adminA');check(registry.status===200&&registry.json.data.items.some(x=>x.id===integration.id&&x.external_effect==='disabled'),'identity_individually_observed_external_identity.integration_list');observed.add('external_identity.integration_list')
 const retirement={command_id:randomUUID(),id:binding.id,expected_version:1},retired=await command('external_identity.retire',retirement)
 check(retired.version===2&&retired.status==='retired','identity_retire_cas')
 check((await post('external_identity.retire',{...retirement,command_id:randomUUID()})).status===409,'identity_stale_retire_rejected')
 const replays=await Promise.all(Array.from({length:20},()=>post('external_identity.retire',retirement)));check(replays.every(r=>r.status===200&&JSON.stringify(r.json.data)===JSON.stringify(retired)),'identity20_exact_receipt_replays')
 check(sql(`select count(*)from public.external_entity_identities where workspace_id='${wa}'and integration_id='${integration.id}'and external_id='SYNTHETIC-IDENTITY-RACE';`).trim()==='1','identity_durable_race_single_row')
 check(sql(`select not exists(select 1 from public.product_audit_events where workspace_id='${wa}'and to_jsonb(product_audit_events)::text like'%SYNTHETIC-IDENTITY-PRIVATE%');`).trim()==='t','identity_no_external_value_in_audit')
 for(const table of ['external_identity_integrations','external_entity_identities'])for(const name of ['ownerA','memberA','viewerA'])check((await http('/rest/v1/'+table+'?select=id',users[name].token)).status===403,'identity_direct_table_closed_'+table+'_'+name)
 const before=sql(`select jsonb_build_object('rows',(select count(*)from public.external_entity_identities where workspace_id='${wa}'),'commands',(select count(*)from public.product_commands where workspace_id='${wa}'));`).trim()
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}';`)
 try{
  check((await http('/auth/v1/user',users.ownerA.token)).status===200,'identity_revoked_jwt_still_valid')
  for(const[op,input]of saved)check((await post(op,input)).status===403,'identity_revoked_historical_replay_'+op)
  for(const[op,input]of [['external_identity.integration_list',{}],['external_identity.list',{local_entity_kind:'customer',local_entity_id:c.id}]])check((await post(op,input)).status===403,'identity_revoked_read_'+op)
  check(sql(`select jsonb_build_object('rows',(select count(*)from public.external_entity_identities where workspace_id='${wa}'),'commands',(select count(*)from public.product_commands where workspace_id='${wa}'));`).trim()===before,'identity_revoked_no_mutation')
 }finally{sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}';`)}
 return {w2_external_identity_operations_individually_observed:[...observed],w2_external_identities:'PASS_REGISTERED_DURABLE_SCOPE_CAS_REPLAY_KEYSET_REVOKED_JWT',w2_external_identity_provider_effect:'DISABLED_METADATA_ONLY'}
}
