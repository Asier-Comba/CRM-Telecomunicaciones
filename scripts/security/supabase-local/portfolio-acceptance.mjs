import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
/** Isolated synthetic telecom facts; no operator/provider connection. */
export async function portfolioAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl}){
 const invoke=(op,input,u=users.memberA,w=wa)=>rpc('portfolio_v1_'+op.replace('.','_'),{p_workspace_id:w,p_input:input},u.token)
 const operator=randomUUID(),imported=randomUUID(),importService=randomUUID(),importLine=randomUUID()
 sql(`insert into public.telecom_operators(id,workspace_id,code,display_name)values('${operator}','${wa}','portfolio-synthetic','Synthetic Operator');
 insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,start_date,source)values('${imported}','${wa}','${ca}','${operator}','2026-01-01','import');
 insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,service_kind,display_name)values('${importService}','${wa}','${ca}','${operator}','${imported}','mobile','Imported Synthetic');
 insert into public.telecom_lines(id,workspace_id,service_id)values('${importLine}','${wa}','${importService}');`)
 const command={command_id:randomUUID(),customer_id:ca,operator_id:operator,start_date:'2026-01-01'},saved=[]
 const createRace=async(kind,input)=>{
  const op=kind+'.create_manual',attempts=await Promise.all(Array.from({length:20},()=>invoke(op,input)))
  check(attempts.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(attempts[0].json)),'portfolio_'+kind+'_20_create_replays')
  const id=attempts[0].json.id;saved.push([op,input])
  check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===1,'portfolio_'+kind+'_one_create_audit')
  const update=kind==='contract'?'update_allowed_metadata':'update_label'
  const extra=kind==='contract'?{assigned_user_id:null}:{display_name:'Human Label'}
  const changes=await Promise.all(Array.from({length:20},()=>invoke(kind+'.'+update,{command_id:randomUUID(),id,expected_version:1,...extra})))
  check(changes.filter(r=>r.status===200).length===1&&changes.filter(r=>r.status===500&&r.json.code==='40001').length===19,'portfolio_'+kind+'_20_CAS_one_winner')
  check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===2,'portfolio_'+kind+'_two_total_audits')
  return id
 }
 for(const token of [anon]){
  const r=await rpc('portfolio_v1_contract_create_manual',{p_workspace_id:wa,p_input:command},token);check(r.status===401||r.status===403,'portfolio_anonymous_RPC_closed')
 }
 const c=await createRace('contract',command)
 const changed=await invoke('contract.create_manual',{...command,start_date:'2026-01-02'});check(changed.status===500&&changed.json.code==='40001','portfolio_changed_replay_conflict')
 check((await invoke('contract.activate',{command_id:randomUUID(),id:c,expected_version:2,signed_date:'2025-12-31'})).status===200,'portfolio_contract_activate')
 const s=await createRace('service',{command_id:randomUUID(),contract_id:c,service_kind:'mobile',display_name:'Synthetic Service'})
 const l=await createRace('line',{command_id:randomUUID(),service_id:s,display_name:'Synthetic Line'})
 check((await invoke('service.transition',{command_id:randomUUID(),id:s,expected_version:2,status:'active',effective_on:'2026-01-01'})).status===200,'portfolio_service_activate')
 check((await invoke('line.transition',{command_id:randomUUID(),id:l,expected_version:2,status:'active',effective_on:'2026-01-01'})).status===200,'portfolio_line_activate')
 check((await invoke('service.transition',{command_id:randomUUID(),id:s,expected_version:3,status:'ended',effective_on:'2026-03-01'})).status===400,'portfolio_live_child_end_denied')
 check((await invoke('line.transition',{command_id:randomUUID(),id:l,expected_version:3,status:'ended',effective_on:'2026-03-01'})).status===200,'portfolio_line_end')
 check((await invoke('service.transition',{command_id:randomUUID(),id:s,expected_version:3,status:'ended',effective_on:'2026-03-01'})).status===200,'portfolio_service_end')
 check((await invoke('contract.cancel',{command_id:randomUUID(),id:c,expected_version:3})).status===200,'portfolio_contract_cancel')
 for(const [kind,id]of [['contract',c],['service',s],['line',l]]){
  const get=await invoke('get',{kind,id},users.viewerA);check(get.status===200&&get.json.record.id===id,'portfolio_'+kind+'_safe_viewer_get')
  const foreignScoped=await rpc('portfolio_v1_get',{p_workspace_id:wb,p_input:{kind,id}},users.ownerB.token);check(foreignScoped.status===200&&foreignScoped.json===null,'portfolio_'+kind+'_foreign_entity_hidden')
  const foreign=await invoke('get',{kind,id},users.ownerB);check(foreign.status===403&&foreign.json.code==='42501','portfolio_'+kind+'_foreign_denied')
 }
 for(const [op,input]of saved)check((await invoke(op,input,users.viewerA)).status===403,'portfolio_viewer_write_denied')
 check((await invoke('get',{kind:'contract',id:c},users.ownerA,wb)).status===403,'portfolio_forged_workspace_denied')
 const label=await invoke('line.update_label',{command_id:randomUUID(),id:importLine,expected_version:1,display_name:'Imported human label'});check(label.status===200&&label.json.source==='import','portfolio_import_label_preserves_source')
 const deny=await invoke('line.transition',{command_id:randomUUID(),id:importLine,expected_version:2,status:'cancelled',effective_on:'2026-03-01'});check(deny.status===403&&deny.json.code==='42501','portfolio_import_status_denied')
 // Explicit imported/integration children under manual ancestors must retain their authority boundary.
 const explicitService=randomUUID(),explicitLine=randomUUID(),inheritedLine=randomUUID()
 sql(`insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,service_kind,display_name,source)values('${explicitService}','${wa}','${ca}','${operator}','${c}','mobile','Explicit imported synthetic','import');
 insert into public.telecom_lines(id,workspace_id,service_id,source)values('${explicitLine}','${wa}','${s}','integration');
 insert into public.telecom_lines(id,workspace_id,service_id)values('${inheritedLine}','${wa}','${explicitService}');`)
 for(const [kind,id,source]of [['service',explicitService,'import'],['line',explicitLine,'integration'],['line',inheritedLine,'import']]){
  const editor=await invoke('get',{kind,id},users.viewerA)
  check(editor.status===200&&editor.json.record.source===source,'portfolio_explicit_'+kind+'_'+source+'_preserved')
  const labelOp=kind+'.update_label',renamed=await invoke(labelOp,{command_id:randomUUID(),id,expected_version:1,display_name:'Provenance synthetic label'})
  check(renamed.status===200&&renamed.json.source===source,'portfolio_explicit_'+kind+'_'+source+'_label_allowed')
  const transition=await invoke(kind+'.transition',{command_id:randomUUID(),id,expected_version:2,status:'cancelled',effective_on:'2026-03-01'})
  check(transition.status===403&&transition.json.code==='42501','portfolio_explicit_'+kind+'_'+source+'_lifecycle_denied')
 }
 const descendant=await invoke('line.create_manual',{command_id:randomUUID(),service_id:explicitService,display_name:'Forbidden manual descendant'})
 check(descendant.status===403&&descendant.json.code==='42501','portfolio_explicit_import_manual_descendant_denied')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'portfolio_revoked_JWT_still_valid')
 for(const [op,input]of saved){const r=await invoke(op,input);check(r.status===403&&r.json.code==='42501','portfolio_each_family_revoked_replay')}
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 const cookies=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}})
 check(!(await client.auth.setSession({access_token:users.memberA.token,refresh_token:users.memberA.refresh})).error,'portfolio_real_cookie_session')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 const post=async(path,operation,input)=>{
  const r=await fetch(appUrl+'/api/portfolio/v1/'+path,{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(15000)})
  return {status:r.status,json:await r.json()}
 }
 const get=await post('queries','portfolio.get',{kind:'line',id:l});check(get.status===200&&get.json.data.record.source==='manual','portfolio_real_next_editor')
 const next=await post('commands','line.update_label',{command_id:randomUUID(),id:l,expected_version:4,display_name:'Next Synthetic Label'});check(next.status===200&&next.json.receipt.version===5,'portfolio_real_next_command')
 return{portfolio_provenance:'PASS',portfolio_families:'PASS',portfolio_http_races:'PASS',portfolio_revocation:'PASS',portfolio_transport:'PASS'}
}

export async function portfolioDeadlineAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl}){
 const invoke=(op,input,u=users.memberA)=>rpc('portfolio_v1_'+op.replace('.','_'),{p_workspace_id:wa,p_input:input},u.token)
 const operator=randomUUID();sql(`insert into public.telecom_operators(id,workspace_id,code,display_name)values('${operator}','${wa}','deadline-synthetic','Deadline Synthetic')`)
 const c=(await invoke('contract.create_manual',{command_id:randomUUID(),customer_id:ca,operator_id:operator,start_date:'2026-01-01'})).json.id,saved=[]
 const runRace=async(op,input,update,fields)=>{
  const creates=await Promise.all(Array.from({length:20},()=>invoke(op,input)))
  check(creates.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(creates[0].json)),'deadline_'+op+'_20_replays')
  const id=creates[0].json.id;saved.push([op,input])
  const edits=await Promise.all(Array.from({length:20},()=>invoke(update,{command_id:randomUUID(),id,expected_version:1,...fields})))
  check(edits.filter(r=>r.status===200).length===1&&edits.filter(r=>r.status===500&&r.json.code==='40001').length===19,'deadline_'+op+'_20_CAS')
  check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===2,'deadline_'+op+'_two_audits')
  return id
 }
 const renewal=await runRace('contract.record_renewal',{command_id:randomUUID(),contract_id:c,target_on:'2027-01-01',opens_on:'2026-12-01',closes_on:'2027-01-31'},'renewal.update',{target_on:'2027-02-01',opens_on:'2027-02-01',closes_on:'2027-02-28'})
 const collision=await invoke('contract.record_renewal',{command_id:randomUUID(),contract_id:c,target_on:'2027-02-02',opens_on:'2027-02-01',closes_on:'2027-02-28'});check(collision.status===400&&collision.json.code==='23P01','deadline_canonical_overlap_denied')
 check((await invoke('renewal.resolve',{command_id:randomUUID(),id:renewal,expected_version:2,reason_code:'human_resolved'})).json.status==='completed','deadline_resolve')
 const second=await invoke('contract.record_renewal',{command_id:randomUUID(),contract_id:c,target_on:'2027-04-01',opens_on:null,closes_on:null})
 check(second.status===200&&(await invoke('renewal.dismiss',{command_id:randomUUID(),id:second.json.id,expected_version:1,reason_code:'human_dismissed'})).json.status==='dismissed','deadline_dismiss')
 const permanence=await runRace('permanence.create_manual',{command_id:randomUUID(),contract_id:c,commitment_kind:'minimum_term',starts_on:'2026-01-01',ends_on:'2027-01-01',reason_code:'manual_term'},'permanence.update',{starts_on:'2026-01-01',ends_on:'2027-02-01',reason_code:'manual_amended'})
 check((await invoke('permanence.cancel',{command_id:randomUUID(),id:permanence,expected_version:2,reason_code:'human_cancelled'})).json.status==='cancelled','deadline_cancel')
 for(const [kind,id]of [['renewal',renewal],['permanence',permanence]]){
  const r=await invoke('get',{kind,id},users.viewerA);check(r.status===200&&r.json.record.version===3,'deadline_'+kind+'_safe_get')
  const hidden=await rpc('portfolio_v1_get',{p_workspace_id:wb,p_input:{kind,id}},users.ownerB.token);check(hidden.status===200&&hidden.json===null,'deadline_'+kind+'_foreign_entity_hidden')
  check((await invoke('get',{kind,id},users.ownerB)).status===403,'deadline_'+kind+'_foreign_denied')
 }
 for(const [op,input]of saved)check((await invoke(op,input,users.viewerA)).status===403,'deadline_viewer_write_denied')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'deadline_revoked_JWT_valid')
 for(const [op,input]of saved){const r=await invoke(op,input);check(r.status===403&&r.json.code==='42501','deadline_each_family_revoked_replay')}
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 const cookies=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}})
 check(!(await client.auth.setSession({access_token:users.memberA.token,refresh_token:users.memberA.refresh})).error,'deadline_real_cookie_session')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 const request=await fetch(appUrl+'/api/portfolio/v1/commands',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:'contract.record_renewal',input:{command_id:randomUUID(),contract_id:c,target_on:'2027-06-01',opens_on:null,closes_on:null}}),signal:AbortSignal.timeout(15000)})
 check(request.status===200&&(await request.json()).receipt.status==='open','deadline_real_next_record')
 return{portfolio_deadlines:'PASS',deadline_http_races:'PASS',deadline_revocation:'PASS',deadline_transport:'PASS'}
}
