import {randomUUID}from 'node:crypto'
export async function simEsimAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const {createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of ['ownerA','memberA','viewerA','ownerB']){const values=[],c=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});check(!(await c.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'sim_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(op,input,name='memberA',path='/api/sims/v1')=>{const r=await fetch(appUrl+path,{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)});check(r.headers.get('cache-control')==='no-store','sim_no_store_'+op);return{status:r.status,json:await r.json()}}
 const observed=new Set(),replays=[]
 const write=async(op,input)=>{const r=await post(op,input);check(r.status===200,'sim_individually_observed_'+op);observed.add(op);replays.push([op,input,r.json]);check(JSON.stringify((await post(op,input)).json)===JSON.stringify(r.json),'sim_exact_receipt_'+op);check((await post(op,input,'viewerA')).status===403,'sim_viewer_write_denied_'+op);check((await post(op,input,'ownerB')).status===404,'sim_foreign_target_denied_'+op);return r.json.data}
 const call=async(name,input)=>{const r=await rpc(name,{p_workspace_id:wa,p_input:input},users.memberA.token);check(r.status===200,'sim_parent_normal_'+name);return r.json}
 const op=await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'sim_op_'+randomUUID().replaceAll('-',''),display_name:'Synthetic SIM Operator'}},users.ownerA.token);check(op.status===200,'sim_operator_setup')
 const customer=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic SIM Account'})
 const contract=await call('portfolio_v1_contract_create_manual',{command_id:randomUUID(),customer_id:customer.id,operator_id:op.json.id,start_date:'2026-01-01'})
 const service=await call('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,service_kind:'mobile',display_name:'Synthetic SIM Mobile'})
 const line=await call('portfolio_v1_line_create_manual',{command_id:randomUUID(),service_id:service.id,display_name:'Synthetic SIM Line'})
 const create={command_id:randomUUID(),customer_id:customer.id,operator_id:op.json.id,kind:'physical',display_label:'Synthetic Physical SIM'}
 let old=await write('sim.create',create)
 check((await post('sim.assign',{command_id:randomUUID(),id:old.id,expected_version:1,line_id:line.id,expected_line_version:1})).status===400,'sim_assignment_requires_iccid')
 const identity=async(id,kind,value)=>{const r=await post('identifier.create_manual',{command_id:randomUUID(),entity_kind:'sim',entity_id:id,identifier_kind:kind,canonical_value:value},'memberA','/api/identifiers/v1');check(r.status===200,'sim_protected_'+kind+'_creation');return r.json.data}
 const iccid='8900000000000000190',ic=await identity(old.id,'iccid',iccid)
 const physicalEid=await post('identifier.create_manual',{command_id:randomUUID(),entity_kind:'sim',entity_id:old.id,identifier_kind:'eid',canonical_value:'89'+'0'.repeat(27)+'190'},'memberA','/api/identifiers/v1');check(physicalEid.status===404,'sim_physical_eid_not_allowed')
 old=await write('sim.assign',{command_id:randomUUID(),id:old.id,expected_version:1,line_id:line.id,expected_line_version:1})
 check((await post('identifier.retire',{command_id:randomUUID(),id:ic.id,expected_version:1},'memberA','/api/identifiers/v1')).status===403,'sim_assigned_identity_cannot_be_overwritten')
 old=await write('sim.activate',{command_id:randomUUID(),id:old.id,expected_version:2,expected_line_version:1,evidence_source:'manual',provider_confirmation:'confirmed_active'})
 let replacement=await write('sim.create',{...create,command_id:randomUUID(),kind:'esim',display_label:'Synthetic eSIM Replacement'})
 const replacementIccid='8900000000000000191',eid='89'+'0'.repeat(27)+'191';await identity(replacement.id,'iccid',replacementIccid);const eidRecord=await identity(replacement.id,'eid',eid)
 const idGet=await post('identifier.get',{id:eidRecord.id},'viewerA','/api/identifiers/v1');check(idGet.status===200&&idGet.json.data.record.entity_kind==='sim'&&idGet.json.data.record.masked_display==='••••191','sim_identifier_extension_masked_viewer_get')
 const idList=await post('identifier.list',{entity_kind:'sim',entity_id:replacement.id},'viewerA','/api/identifiers/v1');check(idList.status===200&&idList.json.data.items.length===2&&!JSON.stringify(idList.json).includes(eid),'sim_identifier_extension_list_no_raw')
 const revealInput={entity_kind:'telecom_identifier',entity_id:eidRecord.id,fields:['canonical_value']}
 const revealed=await post('sensitive.get',revealInput,'memberA','/api/sensitive/v1');check(revealed.status===200&&revealed.json.data.values.canonical_value===eid,'sim_explicit_human_eid_reveal')
 check((await post('sensitive.get',revealInput,'viewerA','/api/sensitive/v1')).status===403,'sim_viewer_eid_reveal_denied')
 const replace={command_id:randomUUID(),id:old.id,expected_version:3,replacement_sim_id:replacement.id,expected_replacement_version:1,expected_line_version:1,replacement_status:'active',evidence_source:'manual',provider_confirmation:'confirmed_active'}
 check((await post('sim.replace',{...replace,expected_line_version:2})).status===409,'sim_line_cas_replacement_rollback')
 const outcome=await write('sim.replace',replace);check(outcome.status==='replaced'&&outcome.replacement_status==='active'&&outcome.replacement_version===2,'sim_replace_preserves_old_and_activates_explicitly')
 const r=await post('sim.get',{id:replacement.id},'viewerA');check(r.status===200&&r.json.data.record.masked_iccid==='••••191'&&r.json.data.record.masked_eid==='••••191'&&r.json.data.record.assigned_line_id===line.id&&!JSON.stringify(r.json).includes(replacementIccid)&&!JSON.stringify(r.json).includes(eid),'sim_individually_observed_sim.get');observed.add('sim.get')
 check((await post('sim.get',{id:replacement.id},'ownerB')).status===404,'sim_get_foreign_hidden')
 replacement=await write('sim.deactivate',{command_id:randomUUID(),id:replacement.id,expected_version:2,expected_line_version:1,evidence_source:'manual'})
 let unused=await write('sim.create',{...create,command_id:randomUUID(),kind:'esim',display_label:'Synthetic Unused eSIM'})
 await identity(unused.id,'eid',eid);check((await post('identifier.create_manual',{command_id:randomUUID(),entity_kind:'sim',entity_id:unused.id,identifier_kind:'iccid',canonical_value:iccid},'memberA','/api/identifiers/v1')).status===409,'sim_iccid_not_reused_after_replacement')
 unused=await write('sim.cancel',{command_id:randomUUID(),id:unused.id,expected_version:1});check(unused.status==='cancelled','sim_prepared_cancelled')
 let cursor;const history=[];do{const r=await post('sim.history',{line_id:line.id,limit:1,...(cursor?{after_id:cursor}:{})},'viewerA');check(r.status===200,'sim_individually_observed_sim.history');observed.add('sim.history');history.push(...r.json.data.items);cursor=r.json.data.next_id}while(cursor)
 check(history.length===2&&new Set(history.map(x=>x.id)).size===2&&history.some(x=>x.status==='replaced'&&x.masked_iccid==='••••190')&&history.some(x=>x.status==='inactive'&&x.masked_iccid==='••••191'),'sim_historical_identities_masks_keyset_preserved')
 const list=await post('sim.list',{customer_id:customer.id},'viewerA');check(list.status===200&&list.json.data.items.length===3,'sim_individually_observed_sim.list');observed.add('sim.list')
 check((await post('sim.history',{line_id:line.id},'ownerB')).status===404,'sim_foreign_history_hidden')
 const racing=await write('sim.create',{...create,command_id:randomUUID(),display_label:'Synthetic Concurrent SIM'})
 const racers=await Promise.all(Array.from({length:10},()=>post('sim.cancel',{command_id:randomUUID(),id:racing.id,expected_version:1})))
 check(racers.filter(x=>x.status===200).length===1&&racers.filter(x=>x.status===409).length===9,'sim_resource_cas_one_winner')
 const imported=randomUUID();sql(`insert into public.telecom_sims(id,workspace_id,customer_id,operator_id,kind,display_label,source,created_by_user_id)values('${imported}','${wa}','${customer.id}','${op.json.id}','physical','Synthetic Integration SIM','integration','${users.memberA.id}');`)
 check((await post('sim.cancel',{command_id:randomUUID(),id:imported,expected_version:1})).status===403,'sim_imported_business_read_only')
 for(const[op,input,response]of replays)check(JSON.stringify((await post(op,input)).json)===JSON.stringify(response),'sim_old_receipts_after_replacement_deactivation')
 for(const table of ['telecom_sims','telecom_sim_associations'])check((await http('/rest/v1/'+table+'?select=*',users.memberA.token)).status>=400,'sim_raw_closed_'+table)
 check(sql(`select count(*)from public.product_audit_events where row_to_json(product_audit_events)::text like '%${iccid}%'or row_to_json(product_audit_events)::text like '%${eid}%';`).trim()==='0','sim_no_raw_audit_identity')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}';`);check((await http('/auth/v1/user',users.memberA.token)).status===200,'sim_revoked_jwt_valid')
 for(const[op,input]of replays)check((await post(op,input)).status===403,'sim_revoked_replay_'+op)
 for(const[op,input]of [['sim.list',{}],['sim.get',{id:old.id}],['sim.history',{line_id:line.id}]])check((await post(op,input)).status===403,'sim_revoked_read_'+op)
 check((await post('sensitive.get',revealInput,'memberA','/api/sensitive/v1')).status===403,'sim_revoked_eid_reveal')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}';`)
 return{sim_esim_operations_individually_observed:[...observed],sim_esim:'PASS_CUSTOMER_BOUND_RESOURCES_EXPLICIT_MANUAL_ACTIVATION',sim_replacement_history:'PASS_ATOMIC_REPLACEMENT_FROZEN_IDENTIFIER_POINTERS',sim_protected_identity:'PASS_ICCID_LIFETIME_UNIQUE_EID_SHARED_PROFILE_EXPLICIT_HUMAN_REVEAL',sim_revocation:'PASS_VALID_JWT_ALL_OPERATIONS_DENIED',sim_stock_erp:'NOT_MODELED_CUSTOMER_RESERVED_PREPARED_RESOURCE'}
}
