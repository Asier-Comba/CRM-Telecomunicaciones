import{randomUUID}from'node:crypto'
export async function telecomAttentionAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const{createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of['ownerA','memberA','viewerA','ownerB']){const values=[],c=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});check(!(await c.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'attention_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(input,name='memberA',op='telecom.attention',path='/api/telecom/attention/v1')=>{const r=await fetch(appUrl+path,{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)});check(r.headers.get('cache-control')==='no-store','attention_no_store');return{status:r.status,json:await r.json()}}
 const call=async(name,input)=>{const r=await rpc(name,{p_workspace_id:wa,p_input:input},users.memberA.token);check(r.status===200,'attention_parent_'+name);return r.json}
 const catalog=async()=>{const r=await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'attention_'+randomUUID().replaceAll('-',''),display_name:'Synthetic Attention Operator'}},users.ownerA.token);check(r.status===200,'attention_operator');return r.json.id}
 const operator=await catalog(),donor=await catalog()
 const customer=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic Attention Account'})
 const contract=await call('portfolio_v1_contract_create_manual',{command_id:randomUUID(),customer_id:customer.id,operator_id:operator,start_date:'2026-01-01',assigned_user_id:users.memberA.id})
 const service=await call('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,service_kind:'mobile',display_name:'Synthetic Attention Mobile'})
 const line=await call('portfolio_v1_line_create_manual',{command_id:randomUUID(),service_id:service.id,display_name:'Synthetic Attention Line'})
 const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));const today=[dateParts.year,dateParts.month,dateParts.day].join('-')
 const shift=n=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
 const ident=await rpc('identifier_v1_command',{p_workspace_id:wa,p_operation:'identifier.create_manual',p_input:{command_id:randomUUID(),entity_kind:'line',entity_id:line.id,identifier_kind:'msisdn',canonical_value:'+12025550187'}},users.memberA.token);check(ident.status===200,'attention_identifier')
 const port=await rpc('portability_v1_command',{p_workspace_id:wa,p_operation:'portability.create',p_input:{command_id:randomUUID(),line_id:line.id,number_identifier_id:ident.json.id,direction:'inbound',donor_operator_id:donor,target_operator_id:operator,requested_on:shift(-1),owner_user_id:users.memberA.id}},users.memberA.token);check(port.status===200,'attention_portability')
 const facts=Object.fromEntries(['renewal','permanence','case','task','meeting','opportunity'].map(k=>[k,randomUUID()]));facts.portability=port.json.id;const stage=randomUUID(),u=users.memberA.id,c=customer.id
 sql(`
 insert into public.telecom_renewals(id,workspace_id,contract_id,target_on,created_by_user_id)values('${facts.renewal}','${wa}','${contract.id}','${shift(10)}','${u}');
 insert into public.telecom_commitments(id,workspace_id,contract_id,service_id,commitment_kind,starts_on,ends_on,reason_code,created_by_user_id)values('${facts.permanence}','${wa}','${contract.id}','${service.id}','minimum_term','${shift(-20)}','${shift(20)}','synthetic_term','${u}');
 insert into public.service_cases(id,workspace_id,customer_id,contract_id,service_id,case_type,title,priority,assigned_user_id,created_by_user_id)values('${facts.case}','${wa}','${c}','${contract.id}','${service.id}','technical','Synthetic Attention Case','urgent','${u}','${u}');
 insert into public.tasks(id,workspace_id,customer_id,title,due_at,assigned_user_id,created_by_user_id)values('${facts.task}','${wa}','${c}','Synthetic Attention Task',statement_timestamp()-interval'1 day','${u}','${u}');
 insert into public.calendar_events(id,workspace_id,customer_id,title,starts_at,timezone,assigned_user_id,created_by_user_id)values('${facts.meeting}','${wa}','${c}','Synthetic Attention Meeting',statement_timestamp()+interval'1 day','Europe/Madrid','${u}','${u}');
 insert into public.opportunity_stages(id,workspace_id,code,display_name,position,created_by_user_id)values('${stage}','${wa}','attention_${stage.replaceAll('-','')}','Synthetic Attention Stage',45,'${u}');
 insert into public.opportunities(id,workspace_id,customer_id,stage_id,title,owner_user_id,created_by_user_id)values('${facts.opportunity}','${wa}','${c}','${stage}','Synthetic Attention Opportunity','${u}','${u}');
 `)
 const sentinel='Synthetic private attention note';check((await rpc('case_v1_command',{p_workspace_id:wa,p_operation:'case.note_create',p_input:{command_id:randomUUID(),id:facts.case,expected_version:1,body:sentinel}},users.memberA.token)).status===200,'attention_private_note')
 const input={customer_id:c,window_from:shift(-2),window_to:shift(31)},full=await post(input);check(full.status===200&&full.json.data.items.length===7,'attention_exact_seven_rules')
 check(!JSON.stringify(full.json).includes('+12025550187')&&!JSON.stringify(full.json).includes(sentinel),'attention_no_raw_number_note')
 for(const[k,id]of Object.entries(facts)){check(full.json.data.items.some(x=>x.kind===k&&x.id===id),'attention_exact_kind_'+k);const r=await post({...input,kind:k,owner_user_id:u});check(r.status===200&&r.json.data.items.length===1&&r.json.data.items[0].id===id,'attention_kind_owner_'+k)}
 check((await post(input,'viewerA')).status===200,'attention_viewer_safe');check((await post(input,'ownerB')).status===404,'attention_cross_tenant_customer')
 let cursor={},seen=[];for(let n=0;n<20;n++){const r=await post({...input,limit:1,...cursor});check(r.status===200,'attention_cursor_page');seen.push(...r.json.data.items.map(x=>x.id));if(r.json.data.next_cursor===null)break;cursor=r.json.data.next_cursor}
 check(seen.length===7&&new Set(seen).size===7,'attention_keyset_complete_no_duplicates')
 for(const invalid of[{...input,after_id:c},{...input,window_to:shift(367)},{...input,sql:'select private'}])check((await post(invalid)).status===400,'attention_closed_bounded_input')
 await call('product_v1_task_create',{command_id:randomUUID(),customer_id:c,opportunity_id:facts.opportunity,title:'Synthetic Attention Next Action'})
 const suppressed=await post({...input,kind:'opportunity'});check(suppressed.status===200&&suppressed.json.data.items.length===0,'attention_real_next_action_suppresses')
 const dense=await post({service_id:service.id},'viewerA','line.list','/api/product/v1/queries');check(dense.status===200&&dense.json.data.items[0].portability_id===port.json.id&&dense.json.data.items[0].open_commitment_count===1&&dense.json.data.items[0].next_commitment_ends_on===shift(20),'attention_dense_line_permanence_portability')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${u}';`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'attention_revoked_jwt_still_valid');check((await post(input)).status===403,'attention_same_cookie_revoked')
 check((await rpc('telecom_attention_v1_query',{p_workspace_id:wa,p_input:input},users.memberA.token)).status===403,'attention_same_jwt_rpc_revoked')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${u}';`)
 return{telecom_attention_operations_individually_observed:['telecom.attention'],telecom_attention:'PASS_SEVEN_DETERMINISTIC_RULES_KEYSET_PRIVACY_VALID_JWT_REVOCATION',dense_line_permanence_portability:'PASS'}
}
