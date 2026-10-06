import {randomUUID}from 'node:crypto'
export async function commercialCatalogAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const {createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of ['ownerA','adminA','memberA','viewerA','ownerB']){
  const values=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}})
  check(!(await client.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'catalog_real_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')
 }
 const post=async(operation,input,name='ownerA',path='/api/catalog/v1')=>{
  const r=await fetch(appUrl+path,{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)})
  check(r.headers.get('cache-control')==='no-store','catalog_no_store_'+operation);return{status:r.status,json:await r.json()}
 }
 const observed=[],replays=[]
 const command=async(op,input)=>{
  const r=await post(op,input);check(r.status===200,'catalog_individually_observed_'+op);observed.push(op);replays.push([op,input,r.json]);check(JSON.stringify((await post(op,input)).json)===JSON.stringify(r.json),'catalog_exact_receipt_'+op)
  if(op!=='operator.create')check((await post(op,input,'ownerB')).status===404,'catalog_foreign_target_'+op)
  check((await post(op,input,'memberA')).status===403,'catalog_member_cannot_manage_'+op);check((await post(op,input,'viewerA')).status===403,'catalog_viewer_cannot_manage_'+op);return r.json.data
 }
 let operator=await command('operator.create',{command_id:randomUUID(),code:'tel5_catalog_'+randomUUID().replaceAll('-',''),display_name:'TEL5 Synthetic Catalog Operator'})
 operator=await command('operator.update',{command_id:randomUUID(),id:operator.id,expected_version:1,display_name:'TEL5 Synthetic Catalog Revised'})
 operator=await command('operator.deactivate',{command_id:randomUUID(),id:operator.id,expected_version:2})
 operator=await command('operator.activate',{command_id:randomUUID(),id:operator.id,expected_version:3})
 let plan=await command('plan.create',{command_id:randomUUID(),operator_id:operator.id,code:'synthetic_convergent',display_name:'TEL5 Synthetic Mobile and Fiber',service_kind:'mobile'})
 plan=await command('plan.update_metadata',{command_id:randomUUID(),id:plan.id,expected_version:1,display_name:'TEL5 Synthetic Convergent Revised'})
 const components=[{component_kind:'base',service_kind:'mobile',addon_code:null,quantity:1},{component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1},{component_kind:'add_on',service_kind:'data_connectivity',addon_code:'static_ip',quantity:1}]
 const integer=(code,value,component_position=null)=>({code,component_position,integer_value:value,boolean_value:null,text_value:null})
 const boolean=(code,value,component_position=null)=>({code,component_position,integer_value:null,boolean_value:value,text_value:null})
 const text=(code,value,component_position=null)=>({code,component_position,integer_value:null,boolean_value:null,text_value:value})
 const entitlements=[integer('data_mib','51200',1),boolean('unlimited_data',false,1),boolean('unlimited_voice',true,1),integer('sms_count','1000',1),boolean('unlimited_sms',false,1),integer('download_mbps','600',2),integer('upload_mbps','600',2),text('access_technology','fiber_ftth',2),text('roaming_zone','eea',1),integer('commitment_months','24'),integer('promotion_months','6')]
 const versionInput={command_id:randomUUID(),plan_id:plan.id,expected_version:2,valid_from:'2026-01-01',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'9007199254740993',one_time_amount_minor:'9900',is_bundle:true,components,entitlements}
 const version=await command('plan_version.create',versionInput)
 check(version.parent_version===3&&version.version_number===1,'catalog_parent_cas_version_creation')
 const terms=await post('plan_version.terms_get',{id:version.id},'memberA');check(terms.status===200,'catalog_individually_observed_plan_version.terms_get');observed.push('plan_version.terms_get')
 check(terms.json.data.record.recurring_amount_minor===versionInput.recurring_amount_minor&&terms.json.data.record.one_time_amount_minor==='9900'&&terms.json.data.record.components.length===3&&terms.json.data.record.entitlements.length===11,'catalog_exact_money_typed_bundle_entitlements')
 check((await post('plan_version.terms_get',{id:version.id},'viewerA')).status===200,'catalog_viewer_consumes_terms')
 check((await post('plan_version.terms_get',{id:version.id},'ownerB')).status===404,'catalog_terms_foreign_hidden')
 const customer=randomUUID();sql(`insert into public.customers(id,workspace_id,account_kind,legal_name,created_by_user_id)values('${customer}','${wa}','legal_entity','TEL5 Synthetic Convergent Account','${users.memberA.id}');`)
 const contract=await rpc('portfolio_v1_contract_create_manual',{p_workspace_id:wa,p_input:{command_id:randomUUID(),customer_id:customer,operator_id:operator.id,plan_version_id:version.id,start_date:'2026-01-01'}},users.memberA.token)
 check(contract.status===200,'catalog_convergent_contract_real_rpc')
 for(const kind of ['mobile','fiber']){
  const attached=await rpc('portfolio_v1_service_create_manual',{p_workspace_id:wa,p_input:{command_id:randomUUID(),contract_id:contract.json.id,plan_version_id:version.id,service_kind:kind,display_name:'TEL5 Synthetic Convergent '+kind}},users.memberA.token)
  check(attached.status===200,'catalog_bundle_actual_service_'+kind)
 }
 const invalidBase=await rpc('portfolio_v1_service_create_manual',{p_workspace_id:wa,p_input:{command_id:randomUUID(),contract_id:contract.json.id,plan_version_id:version.id,service_kind:'data_connectivity',display_name:'TEL5 Synthetic Unsupported Base'}},users.memberA.token)
 check(invalidBase.status>=400,'catalog_addon_does_not_fabricate_base_service')
 const fiberVersions=await post('plan_version.list',{plan_id:plan.id,service_kind:'fiber',valid_on:'2026-11-05'},'memberA','/api/product/v1/queries')
 check(fiberVersions.status===200&&fiberVersions.json.data.items.some(x=>x.id===version.id),'catalog_bundle_component_kind_filter')
 const catalogue=await post('plan.get',{id:plan.id},'memberA','/api/product/v1/queries');check(catalogue.status===200&&catalogue.json.data.record.version===3,'catalog_normal_plan_read_cas_version')
 const races=await Promise.all(Array.from({length:10},()=>post('plan_version.create',{...versionInput,command_id:randomUUID(),expected_version:3,valid_from:'2027-01-01',valid_until:'2027-12-31'})))
 check(races.filter(x=>x.status===200).length===1&&races.filter(x=>x.status===409).length===9,'catalog_concurrent_version_creation_one_winner')
 check(JSON.stringify((await post('plan_version.terms_get',{id:version.id},'memberA')).json)===JSON.stringify(terms.json),'catalog_older_commercial_truth_unchanged')
 check((await post('plan_version.create',{...versionInput,command_id:randomUUID(),expected_version:4,valid_from:'2028-01-01',valid_until:'2028-12-31',entitlements:[{...entitlements[0],code:'arbitrary_feature'}]})).status===400,'catalog_unknown_feature_rejected')
 check((await post('plan_version.create',{...versionInput,command_id:randomUUID(),expected_version:4,valid_from:'2028-01-01',valid_until:'2028-12-31',entitlements:[boolean('unlimited_voice',true,1),integer('voice_minutes','600',1)]})).status===400,'catalog_conflicting_allowance_rejected')
 plan=await command('plan.change_status',{command_id:randomUUID(),id:plan.id,expected_version:4,status:'retired'})
 check((await post('plan.list',{operator_id:operator.id},'memberA','/api/product/v1/queries')).json.data.items.length===0,'catalog_retired_default_not_consumed')
 check((await post('plan_version.terms_get',{id:version.id},'memberA')).status===200,'catalog_retired_historical_terms_preserved')
 const admin=await post('operator.create',{command_id:randomUUID(),code:'tel5_admin_'+randomUUID().replaceAll('-',''),display_name:'TEL5 Synthetic Admin Catalog'},'adminA');check(admin.status===200,'catalog_admin_management_positive')
 const unknown=randomUUID();sql(`insert into public.telecom_plans(id,workspace_id,operator_id,code,display_name,service_kind,created_by_user_id)values('${unknown}','${wa}','${operator.id}','unknown_legacy','TEL5 Synthetic Legacy Origin Unknown','mobile','${users.ownerA.id}');`)
 check((await post('plan.update_metadata',{command_id:randomUUID(),id:unknown,expected_version:1,display_name:'Forbidden Legacy Relabel'})).status===403,'catalog_legacy_unknown_origin_read_only')
 const imported=randomUUID();sql(`insert into public.telecom_operators(id,workspace_id,code,display_name,source,created_by_user_id)values('${imported}','${wa}','tel5_import_${imported.replaceAll('-','')}','TEL5 Synthetic Imported Operator','integration','${users.ownerA.id}');`)
 check((await post('operator.update',{command_id:randomUUID(),id:imported,expected_version:1,display_name:'Forbidden Provider Rewrite'})).status===403,'catalog_provider_fact_read_only')
 check((await http('/rest/v1/telecom_plan_version_entitlements?select=*',users.ownerA.token)).status>=400,'catalog_raw_feature_relation_closed')
 check((await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'synthetic_denied',display_name:'Synthetic',source:'manual'}},users.ownerA.token)).status>=400,'catalog_direct_rpc_closed_input')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}';`)
 check((await http('/auth/v1/user',users.ownerA.token)).status===200,'catalog_revoked_owner_jwt_still_valid')
 for(const[op,input]of replays)check((await post(op,input)).status===403,'catalog_revoked_replay_'+op)
 check((await post('plan_version.terms_get',{id:version.id})).status===403,'catalog_revoked_read')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}';`)
 return{commercial_catalog_operations_individually_observed:observed,commercial_catalog:'PASS_OWNER_ADMIN_MANAGEMENT_MEMBER_VIEWER_CONSUMPTION',commercial_terms:'PASS_REGISTERED_TYPED_FROZEN_VERSION_FEATURES',commercial_bundles:'PASS_IMMUTABLE_BASE_AND_REGISTERED_ADDON_COMPONENTS',commercial_version_concurrency:'PASS_ONE_WINNER',commercial_service_addon_assignments:'NOT_IMPLEMENTED_SEPARATE_HISTORY_REQUIRED',commercial_legacy_plan_origin:'UNKNOWN_LEGACY_READ_ONLY_NO_RELABEL'}
}
