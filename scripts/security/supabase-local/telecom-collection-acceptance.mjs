import { randomUUID } from 'node:crypto'

// Real Auth/JWT/PostgREST/cookie transport; SQL is synthetic setup only.
export async function telecomCollectionAcceptance({ rpc, sql, check, http, users, wa, wb, url, anon, appUrl }) {
 const customer=randomUUID(), operator=randomUUID(), plan=randomUUID(), revision=randomUUID(), contract=randomUUID(), service=randomUUID(), line=randomUUID(), renewal=randomUUID(), permanence=randomUUID(), stage=randomUUID(), opportunity=randomUUID(), contact=randomUUID()
 sql(`select set_config('request.jwt.claim.sub','${users.memberA.id}',false);
 insert into public.customers(id,workspace_id,account_kind,legal_name,assigned_user_id,created_by_user_id) values('${customer}','${wa}','legal_entity','TEL5 Synthetic Account','${users.memberA.id}','${users.memberA.id}');
 insert into public.contacts(id,workspace_id,customer_id,display_name,email,phone,created_by_user_id) values('${contact}','${wa}','${customer}','TEL5 Synthetic Contact','tel5@example.invalid','+12025550123','${users.memberA.id}');
 insert into public.telecom_operators(id,workspace_id,code,display_name,created_by_user_id) values('${operator}','${wa}','tel5_${operator.replaceAll('-','')}','TEL5 Synthetic Operator','${users.ownerA.id}');
 insert into public.telecom_plans(id,workspace_id,operator_id,code,display_name,service_kind,created_by_user_id) values('${plan}','${wa}','${operator}','tel5_synthetic','TEL5 Synthetic Mobile','mobile','${users.ownerA.id}');
 insert into public.telecom_plan_versions(id,workspace_id,plan_id,version_number,valid_from,currency,recurring_amount_minor,created_by_user_id) values('${revision}','${wa}','${plan}',1,'2026-01-01','EUR',9007199254740993,'${users.ownerA.id}');
 insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,plan_version_id,start_date,assigned_user_id,created_by_user_id) values('${contract}','${wa}','${customer}','${operator}','${revision}','2026-01-01','${users.memberA.id}','${users.memberA.id}');
 insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,plan_version_id,service_kind,display_name,created_by_user_id) values('${service}','${wa}','${customer}','${operator}','${contract}','${revision}','mobile','TEL5 Synthetic Mobile Service','${users.memberA.id}');
 insert into public.telecom_lines(id,workspace_id,service_id,display_name,created_by_user_id) values('${line}','${wa}','${service}','TEL5 Synthetic Mobile Line','${users.memberA.id}');
 insert into public.telecom_renewals(id,workspace_id,contract_id,target_on,created_by_user_id) values('${renewal}','${wa}','${contract}','2026-11-05','${users.memberA.id}');
 insert into public.telecom_commitments(id,workspace_id,contract_id,service_id,commitment_kind,starts_on,ends_on,reason_code,created_by_user_id) values('${permanence}','${wa}','${contract}','${service}','minimum_term','2026-01-01','2026-11-05','synthetic_term','${users.memberA.id}');
 insert into public.opportunity_stages(id,workspace_id,code,display_name,position,created_by_user_id) select '${stage}','${wa}','tel5_${stage.replaceAll('-','')}','TEL5 Synthetic Stage',coalesce(max(position),-1)+1,'${users.ownerA.id}' from public.opportunity_stages where workspace_id='${wa}';
 insert into public.opportunities(id,workspace_id,customer_id,stage_id,title,owner_user_id,amount_minor,currency,expected_close_date,created_by_user_id) values('${opportunity}','${wa}','${customer}','${stage}','TEL5 Synthetic Opportunity','${users.memberA.id}',1200,'EUR','2026-11-05','${users.memberA.id}');
 insert into public.product_opportunity_links(workspace_id,opportunity_id,kind,target_id) values('${wa}','${opportunity}','service','${service}');
 insert into public.activities(workspace_id,customer_id,contract_id,service_id,activity_kind,summary_code,actor_user_id,created_by_user_id) values('${wa}','${customer}','${contract}','${service}','created','entity.created','${users.memberA.id}','${users.memberA.id}');`)
 const cases=[
  ['customer.list',{assigned_user_id:users.memberA.id,operator_id:operator,status:'active'},customer],
  ['contact.list',{customer_id:customer},contact],['opportunity.list',{customer_id:customer,owner_user_id:users.memberA.id,stage_id:stage,status:'open',currency:'EUR',expected_close_from:'2026-11-01',expected_close_to:'2026-11-30'},opportunity],
  ['activity.list',{customer_id:customer,entity_kind:'service',entity_id:service,kind:'created'},null],['assignee.list',{},users.memberA.id],
  ['operator.list',{},operator],['operator.get',{id:operator},operator],['plan.list',{operator_id:operator,service_kind:'mobile'},plan],['plan.get',{id:plan},plan],['plan_version.list',{plan_id:plan,valid_on:'2026-11-05'},revision],['plan_version.get',{id:revision},revision],
  ['contract.list',{customer_id:customer,operator_id:operator,plan_id:plan,assigned_user_id:users.memberA.id,status:'draft',source:'manual'},contract],
  ['service.list',{customer_id:customer,contract_id:contract,operator_id:operator,plan_id:plan,kind:'mobile',status:'pending',source:'manual'},service],
  ['line.list',{customer_id:customer,contract_id:contract,service_id:service,operator_id:operator,status:'pending',source:'manual'},line],
  ['renewal.list',{customer_id:customer,contract_id:contract,owner_user_id:users.memberA.id,status:'open',window_from:'2026-11-01',window_to:'2026-11-30'},renewal],['renewal.get',{id:renewal},renewal],
  ['permanence.list',{customer_id:customer,contract_id:contract,service_id:service,status:'open',window_from:'2026-11-01',window_to:'2026-11-30'},permanence],['permanence.get',{id:permanence},permanence]
 ]
 // The isolated schema harness captures setup before here and installs only PGlite.
 // Load application Auth dependencies only in the actual cookie transport suite.
 const {createServerClient}=await import('@supabase/ssr')
 const cookies={}
 for(const name of ['memberA','viewerA','ownerB']) {
  const values=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}})
  const auth=await client.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh});check(!auth.error,'tel5_actual_session_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')
 }
 const post=async(op,input,name='memberA')=>{
  const r=await fetch(appUrl+'/api/product/v1/queries',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)})
  check(r.headers.get('cache-control')==='no-store','tel5_no_store_'+op)
  return {status:r.status,json:await r.json()}
 }
 const observed=[]
 for(const [op,input,id] of cases) {
  for(const name of ['memberA','viewerA']) {
   const r=await post(op,input,name);check(r.status===200&&r.json.ok&&r.json.data.operation===op,'tel5_human_positive_'+name+'_'+op)
   const rows=op.endsWith('.get')?[r.json.data.record]:r.json.data.items
   check(rows.length>0&&(id===null||rows.some(x=>(x.id??x.user_id)===id)),'tel5_actual_record_'+name+'_'+op)
   const forbidden=['email','phone','tax_identifier','tax_id','msisdn','iccid','eid','pin','puk','body','notes','source_event_ref','storage_path']
   check(rows.every(x=>forbidden.every(k=>!Object.hasOwn(x,k))),'tel5_private_projection_'+op)
   if(op==='plan_version.get')check(r.json.data.record.recurring_amount_minor==='9007199254740993','tel5_bigint_exact')
   if(op==='opportunity.list')check(rows.some(x=>x.id===opportunity&&x.links.length===1&&x.links[0].kind==='service'&&x.links[0].id===service),'tel5_safe_opportunity_links')
  }
  const foreign=await rpc('telecom_collection_v1_query',{p_workspace_id:wa,p_operation:op,p_input:input},users.ownerB.token);check(foreign.status===403,'tel5_foreign_scope_'+op)
  const foreignHttp=await post(op,input,'ownerB');check(op.endsWith('.get')?foreignHttp.status===404:foreignHttp.status===200&&!foreignHttp.json.data.items.some(x=>(x.id??x.user_id)===id),'tel5_foreign_cookie_scope_'+op)
  check((await post(op,{...input,workspace_id:wb})).status===400,'tel5_authority_input_rejected_'+op)
  check((await rpc('telecom_collection_v1_query',{p_workspace_id:wa,p_operation:op,p_input:{...input,limit:null}},users.memberA.token)).status>=400,'tel5_direct_rpc_validation_'+op)
  observed.push(op)
 }
 const lineIds=[line,...Array.from({length:17},()=>randomUUID())].sort()
 for(const id of lineIds.filter(x=>x!==line))sql(`insert into public.telecom_lines(id,workspace_id,service_id,display_name,created_by_user_id)values('${id}','${wa}','${service}','TEL5 Synthetic Pagination','${users.memberA.id}');`)
 let after_id;const seen=[];let metadataChanged=false
 do {
  const r=await post('line.list',{service_id:service,limit:7,...(after_id?{after_id}:{})});check(r.status===200,'tel5_stable_cursor_positive');seen.push(...r.json.data.items.map(x=>x.id));after_id=r.json.data.next_id
  if(!metadataChanged){sql(`update public.telecom_lines set display_name='TEL5 Synthetic Concurrent Label' where workspace_id='${wa}' and id='${lineIds.at(-1)}';`);metadataChanged=true}
 }while(after_id)
 check(JSON.stringify(seen)===JSON.stringify(lineIds)&&new Set(seen).size===18,'tel5_keyset_complete_no_duplicate')
 sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.memberA.id}';`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'tel5_suspended_jwt_still_valid')
 for(const [op,input] of cases)check((await post(op,input)).status===403,'tel5_current_membership_revoked_'+op)
 sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.memberA.id}';`)
 return {telecom_collection_operations_individually_observed:observed,telecom_collections:'PASS_18_COOKIE_READS_FILTERS_KEYSET_PRIVACY_REVOCATION',telecom_catalog_prices:'PASS_EXACT_BIGINT_STRINGS',telecom_collections_backend_ready_for_w2:true,telecom_collections_ui_safe:false}
}
