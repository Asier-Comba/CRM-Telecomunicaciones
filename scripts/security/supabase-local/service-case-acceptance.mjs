import {randomUUID}from 'node:crypto'
export async function serviceCaseAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const {createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of ['ownerA','memberA','viewerA','ownerB']){const values=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});check(!(await client.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'case_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(op,input,name='memberA')=>{const r=await fetch(appUrl+'/api/cases/v1',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)});check(r.headers.get('cache-control')==='no-store','case_no_store_'+op);return{status:r.status,json:await r.json()}}
 const observed=new Set(),replays=[]
 const write=async(op,input)=>{const r=await post(op,input);check(r.status===200,'case_individually_observed_'+op);observed.add(op);replays.push([op,input,r.json]);check(JSON.stringify((await post(op,input)).json)===JSON.stringify(r.json),'case_exact_receipt_'+op);check((await post(op,input,'viewerA')).status===403,'case_viewer_write_denied_'+op);check((await post(op,input,'ownerB')).status===404,'case_foreign_target_denied_'+op);return r.json.data}
 const call=async(name,input)=>{const r=await rpc(name,{p_workspace_id:wa,p_input:input},users.memberA.token);check(r.status===200,'case_parent_normal_'+name);return r.json}
 const operator=await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'case_op_'+randomUUID().replaceAll('-',''),display_name:'Synthetic Case Operator'}},users.ownerA.token);check(operator.status===200,'case_operator_setup')
 const customer=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic Case Account'})
 const other=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic Other Case Account'})
 const contract=await call('portfolio_v1_contract_create_manual',{command_id:randomUUID(),customer_id:customer.id,operator_id:operator.json.id,start_date:'2026-01-01'})
 const service=await call('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,service_kind:'mobile',display_name:'Synthetic Case Mobile'})
 const line=await call('portfolio_v1_line_create_manual',{command_id:randomUUID(),service_id:service.id,display_name:'Synthetic Case Line'})
 const create={command_id:randomUUID(),customer_id:customer.id,contract_id:contract.id,service_id:service.id,line_id:line.id,case_type:'technical',title:'Synthetic Technical Incident',priority:'urgent',due_on:'2000-01-01',assigned_user_id:null}
 let c=await write('case.create',create)
 check((await post('case.create',{...create,command_id:randomUUID(),customer_id:other.id})).status===404,'case_same_tenant_wrong_customer_ancestry_denied')
 let get=await post('case.get',{id:c.id});check(get.status===200&&get.json.data.record.overdue===true,'case_individually_observed_case.get');observed.add('case.get')
 c=await write('case.update',{command_id:randomUUID(),id:c.id,expected_version:1,case_type:'technical',title:'Synthetic Technical Followup',priority:'high',due_on:null})
 c=await write('case.assign',{command_id:randomUUID(),id:c.id,expected_version:2,assigned_user_id:users.memberA.id})
 check((await post('case.assign',{command_id:randomUUID(),id:c.id,expected_version:3,assigned_user_id:users.viewerA.id})).status===403,'case_viewer_not_assignable')
 const sentinel='Synthetic private case note sentinel not audit',note={command_id:randomUUID(),id:c.id,expected_version:3,body:sentinel}
 c=await write('case.note_create',note);check(c.note_seq===1&&!JSON.stringify(c).includes(sentinel),'case_note_receipt_value_free')
 c=await write('case.note_create',{...note,command_id:randomUUID(),expected_version:4,body:'Synthetic second private note'})
 const notes=await post('case.note_list',{id:c.id,limit:1});check(notes.status===200&&notes.json.data.items[0].body===sentinel&&notes.json.data.next_seq===1,'case_individually_observed_case.note_list');observed.add('case.note_list')
 const more=await post('case.note_list',{id:c.id,limit:1,after_seq:1});check(more.status===200&&more.json.data.items.length===1&&more.json.data.items[0].seq===2&&more.json.data.next_seq===null,'case_note_history_seq_no_duplicates')
 check((await post('case.note_list',{id:c.id},'viewerA')).status===403,'case_private_notes_viewer_denied');check((await post('case.note_list',{id:c.id},'ownerB')).status===404,'case_private_notes_foreign_denied')
 check((await rpc('case_v1_query',{p_workspace_id:wa,p_operation:'case.note_list',p_input:{id:c.id}},users.viewerA.token)).status===403,'case_direct_rpc_private_note_viewer_denied')
 c=await write('case.change_status',{command_id:randomUUID(),id:c.id,expected_version:5,status:'waiting_operator'})
 c=await write('case.resolve',{command_id:randomUUID(),id:c.id,expected_version:6,resolution_code:'issue_fixed'})
 c=await write('case.reopen',{command_id:randomUUID(),id:c.id,expected_version:7})
 c=await write('case.resolve',{command_id:randomUUID(),id:c.id,expected_version:8,resolution_code:'customer_confirmed'})
 c=await write('case.close',{command_id:randomUUID(),id:c.id,expected_version:9})
 check((await post('case.reopen',{command_id:randomUUID(),id:c.id,expected_version:10})).status===400,'case_closed_terminal_not_reopen_alias')
 get=await post('case.get',{id:c.id},'viewerA');check(get.status===200&&get.json.data.record.status==='closed'&&get.json.data.record.internal_note_count===2&&!JSON.stringify(get.json).includes(sentinel),'case_normal_viewer_no_private_note_body')
 let cancelled=await write('case.create',{...create,command_id:randomUUID(),case_type:'billing',title:'Synthetic Billing Incident'})
 cancelled=await write('case.cancel',{command_id:randomUUID(),id:cancelled.id,expected_version:1,cancellation_code:'duplicate'});check(cancelled.status==='cancelled'&&cancelled.cancellation_code==='duplicate','case_cancel_coded_reason')
 let cursor;const ids=[];do{const r=await post('case.list',{customer_id:customer.id,limit:1,...(cursor?{after_id:cursor}:{})},'viewerA');check(r.status===200,'case_individually_observed_case.list');observed.add('case.list');ids.push(...r.json.data.items.map(x=>x.id));cursor=r.json.data.next_id}while(cursor)
 check(ids.length===2&&new Set(ids).size===2,'case_customer360_keyset_no_duplicates')
 for(const[op,input,response]of replays)check(JSON.stringify((await post(op,input)).json)===JSON.stringify(response),'case_original_receipts_after_lifecycle')
 const racing=await write('case.create',{...create,command_id:randomUUID(),case_type:'activation'})
 const races=await Promise.all(Array.from({length:10},()=>post('case.change_status',{command_id:randomUUID(),id:racing.id,expected_version:1,status:'in_progress'})))
 check(races.filter(r=>r.status===200).length===1&&races.filter(r=>r.status===409).length===9,'case_status_cas_one_winner')
 const imported=randomUUID();sql(`insert into public.service_cases(id,workspace_id,customer_id,case_type,title,source,created_by_user_id)values('${imported}','${wa}','${customer.id}','technical','Synthetic Integration Incident','integration','${users.memberA.id}');`)
 check((await post('case.update',{command_id:randomUUID(),id:imported,expected_version:1,case_type:'technical',title:'Forbidden Provider Rewrite',priority:'normal',due_on:null})).status===403,'case_imported_business_read_only')
 check((await post('case.assign',{command_id:randomUUID(),id:imported,expected_version:1,assigned_user_id:users.memberA.id})).status===200,'case_imported_explicit_local_assignment')
 for(const table of ['service_cases','service_case_internal_notes'])check((await http('/rest/v1/'+table+'?select=*',users.memberA.token)).status>=400,'case_raw_closed_'+table)
 check(sql(`select count(*)from public.product_audit_events where operation like 'case.%'and row_to_json(product_audit_events)::text like '%private case note sentinel%';`).trim()==='0','case_value_free_audit')
 check(sql(`select count(*)from public.product_commands where operation like 'case.%'and receipt::text like '%private case note sentinel%';`).trim()==='0','case_value_free_durable_receipts')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}';`);check((await http('/auth/v1/user',users.memberA.token)).status===200,'case_revoked_jwt_valid')
 for(const[op,input]of replays)check((await post(op,input)).status===403,'case_revoked_replay_'+op)
 for(const[op,input]of [['case.list',{}],['case.get',{id:c.id}],['case.note_list',{id:c.id}]])check((await post(op,input)).status===403,'case_revoked_read_'+op)
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}';`)
 return{service_case_operations_individually_observed:[...observed],service_cases:'PASS_CLOSED_LIFECYCLE_CAS_ANCESTRY_LOCAL_ASSIGNMENT',service_case_notes:'PASS_PRIVATE_APPEND_ONLY_BOUNDED_BODY_NO_AUDIT_VALUE',service_case_revocation:'PASS_VALID_JWT_ALL_OPERATIONS_DENIED',service_case_concurrency:'PASS_SINGLE_TRANSITION_WINNER'}
}
