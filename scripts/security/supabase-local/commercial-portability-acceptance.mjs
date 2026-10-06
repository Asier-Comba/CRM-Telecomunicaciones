import {randomUUID}from 'node:crypto'
// All business mutations below use real JWT RPC or application cookies; SQL is setup/revocation/inspection only.
export async function commercialPortabilityAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const {createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of ['ownerA','memberA','viewerA','ownerB']){const values=[],c=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});check(!(await c.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'commercial_port_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(op,input,name='memberA')=>{const r=await fetch(appUrl+'/api/portability/v1',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)});check(r.headers.get('cache-control')==='no-store','port_no_store_'+op);return{status:r.status,json:await r.json()}}
 const observed=new Set(),replays=[]
 const command=async(op,input)=>{const r=await post(op,input);check(r.status===200,'port_individually_observed_'+op);observed.add(op);replays.push([op,input,r.json]);check(JSON.stringify((await post(op,input)).json)===JSON.stringify(r.json),'port_exact_receipt_'+op);check((await post(op,input,'viewerA')).status===403,'port_viewer_denied_'+op);if(op!=='portability.create')check((await post(op,input,'ownerB')).status===404,'port_foreign_denied_'+op);return r.json.data}
 const call=async(name,input,actor='memberA')=>{const r=await rpc(name,{p_workspace_id:wa,p_input:input},users[actor].token);check(r.status===200,'port_parent_normal_'+name);return r.json}
 const operator=await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'port_target_'+randomUUID().replaceAll('-',''),display_name:'Synthetic Port Target'}},users.ownerA.token);check(operator.status===200,'port_target_operator')
 const donor=await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'port_donor_'+randomUUID().replaceAll('-',''),display_name:'Synthetic Port Donor'}},users.ownerA.token);check(donor.status===200,'port_donor_operator')
 const customer=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic Port Account'})
 const contract=await call('portfolio_v1_contract_create_manual',{command_id:randomUUID(),customer_id:customer.id,operator_id:operator.json.id,start_date:'2026-01-01'})
 await call('portfolio_v1_contract_activate',{command_id:randomUUID(),id:contract.id,expected_version:1,signed_date:'2026-01-01'})
 const service=await call('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,service_kind:'mobile',display_name:'Synthetic Port Service'})
 await call('portfolio_v1_service_transition',{command_id:randomUUID(),id:service.id,expected_version:1,status:'active',effective_on:'2026-01-01'})
 const line=await call('portfolio_v1_line_create_manual',{command_id:randomUUID(),service_id:service.id,display_name:'Synthetic Port Mobile'})
 const identifier=await rpc('identifier_v1_command',{p_workspace_id:wa,p_operation:'identifier.create_manual',p_input:{command_id:randomUUID(),entity_kind:'line',entity_id:line.id,identifier_kind:'msisdn',canonical_value:'+12025550181'}},users.memberA.token);check(identifier.status===200,'port_normal_protected_identifier')
 const create={command_id:randomUUID(),line_id:line.id,number_identifier_id:identifier.json.id,direction:'inbound',donor_operator_id:donor.json.id,target_operator_id:operator.json.id,requested_on:'2026-02-01',owner_user_id:null}
 let p=await command('portability.create',create)
 check((await post('portability.create',{...create,command_id:randomUUID()})).status===409,'port_unique_open_line')
 check((await post('portability.create',{...create,command_id:randomUUID()},'ownerB')).status===404,'port_foreign_line_create_hidden')
 p=await command('portability.update_draft',{command_id:randomUUID(),id:p.id,expected_version:1,donor_operator_id:donor.json.id,target_operator_id:operator.json.id,requested_on:'2026-02-02'})
 p=await command('portability.assign',{command_id:randomUUID(),id:p.id,expected_version:2,owner_user_id:users.memberA.id})
 const transition=(status,version,reason_code=null)=>({command_id:randomUUID(),id:p.id,expected_version:version,status,effective_on:'2026-02-03',reason_code,evidence_source:'manual'})
 const premature={command_id:randomUUID(),id:p.id,expected_version:3,completed_on:'2026-02-04',evidence_source:'manual',provider_outcome:'confirmed_completed',line_action:'none',expected_line_version:null}
 check((await post('portability.complete',premature)).status===400,'port_no_guessed_provider_success')
 const requested=transition('requested',3),races=await Promise.all(Array.from({length:10},()=>post('portability.transition',{...requested,command_id:randomUUID()})))
 check(races.filter(r=>r.status===200).length===1&&races.filter(r=>r.status===409).length===9,'port_transition_cas_one_winner');observed.add('portability.transition');p=races.find(r=>r.status===200).json.data
 p=await command('portability.transition',transition('scheduled',4));p=await command('portability.transition',transition('in_progress',5))
 const stale={...premature,command_id:randomUUID(),expected_version:6,line_action:'activate',expected_line_version:2}
 check((await post('portability.complete',stale)).status===409,'port_line_conflict_rolls_back_completion')
 let read=await post('portability.get',{id:p.id});check(read.status===200&&read.json.data.record.status==='in_progress','port_rollback_no_completion');observed.add('portability.get')
 p=await command('portability.complete',{...stale,expected_line_version:1});check(p.line_effect.status==='active'&&p.line_effect.version===2,'port_explicit_line_activation')
 read=await post('portability.get',{id:p.id},'viewerA');check(read.status===200&&read.json.data.record.masked_display==='••••181'&&!JSON.stringify(read.json).includes('+12025550181'),'port_viewer_mask_only')
 check((await post('portability.get',{id:p.id},'ownerB')).status===404,'port_get_foreign_hidden')
 const outbound={...create,command_id:randomUUID(),direction:'outbound',donor_operator_id:operator.json.id,target_operator_id:donor.json.id,requested_on:'2026-03-01'}
 let out=await command('portability.create',outbound)
 out=await command('portability.transition',{command_id:randomUUID(),id:out.id,expected_version:1,status:'cancelled',effective_on:'2026-03-01',reason_code:'customer_withdrew',evidence_source:'manual'})
 out=await command('portability.create',{...outbound,command_id:randomUUID()})
 out=await command('portability.transition',{command_id:randomUUID(),id:out.id,expected_version:1,status:'requested',effective_on:'2026-03-01',reason_code:null,evidence_source:'manual'})
 out=await command('portability.transition',{command_id:randomUUID(),id:out.id,expected_version:2,status:'rejected',effective_on:'2026-03-02',reason_code:'subscriber_mismatch',evidence_source:'manual'})
 out=await command('portability.create',{...outbound,command_id:randomUUID(),requested_on:'2026-04-01'})
 for(const status of ['requested','scheduled'])out=await command('portability.transition',{command_id:randomUUID(),id:out.id,expected_version:out.version,status,effective_on:'2026-04-02',reason_code:null,evidence_source:'manual'})
 out=await command('portability.complete',{command_id:randomUUID(),id:out.id,expected_version:3,completed_on:'2026-04-03',evidence_source:'manual',provider_outcome:'confirmed_completed',line_action:'end',expected_line_version:2})
 check(out.line_effect.status==='ended'&&out.line_effect.version===3,'port_explicit_outbound_line_end')
 let cursor;const ids=[];do{const r=await post('portability.list',{line_id:line.id,limit:1,...(cursor?{after_id:cursor}:{})},'viewerA');check(r.status===200,'port_individually_observed_portability.list');observed.add('portability.list');ids.push(...r.json.data.items.map(x=>x.id));cursor=r.json.data.next_id}while(cursor)
 check(ids.length===4&&new Set(ids).size===4,'port_history_keyset_no_duplicates')
 for(const[op,input,response]of replays)check(JSON.stringify((await post(op,input)).json)===JSON.stringify(response),'port_exact_old_receipt_after_lifecycle')
 check((await http('/rest/v1/telecom_portabilities?select=*',users.memberA.token)).status>=400,'port_raw_table_closed')
 check((await post('portability.list',{msisdn:'+12025550181'})).status===400,'port_no_raw_number_search')
 check(sql(`select count(*)from public.product_audit_events where operation like 'portability.%'and row_to_json(product_audit_events)::text like '%12025550181%';`).trim()==='0','port_value_free_audit')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}';`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'port_revoked_jwt_still_valid')
 for(const[op,input]of replays)check((await post(op,input)).status===403,'port_revoked_replay_'+op)
 check((await post('portability.list',{})).status===403,'port_revoked_read');check((await post('portability.get',{id:p.id})).status===403,'port_revoked_get')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}';`)
 return{commercial_portability_operations_individually_observed:[...observed],commercial_portability:'PASS_MANUAL_PROVIDER_TRUTH_CLOSED_LIFECYCLE_MASKED_HISTORY',commercial_portability_line_effect:'PASS_EXPLICIT_ATOMIC_CAS_INBOUND_ACTIVATION_OUTBOUND_END',commercial_portability_concurrency:'PASS_ONE_TRANSITION_WINNER',commercial_portability_revocation:'PASS_VALID_JWT_NO_READ_NO_REPLAY'}
}
