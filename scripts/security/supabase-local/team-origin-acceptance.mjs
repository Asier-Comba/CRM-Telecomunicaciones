import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
export async function teamOriginAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl}){
 const cookies={};for(const name of ['ownerA','adminA','memberA','viewerA','ownerB']){const values=[],s=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});await s.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh});cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(path,operation,input,name='ownerA')=>{const r=await fetch(appUrl+path,{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)});return{status:r.status,json:await r.json()}}
 const cmd=(op,i,n)=>post('/api/team/v1/commands',op,i,n),list=(n)=>post('/api/team/v1/queries','member.invite_list',{limit:100},n),origin=(i,n)=>post('/api/provenance/v1','provenance.get',i,n)
 const invitation=await cmd('member.invite_intent',{command_id:randomUUID(),email:'expiry-synthetic@example.invalid',role:'member'});check(invitation.status===200,'team_expiry_real_create')
 const id=invitation.json.receipt.id;sql(`update public.team_invite_intents set created_at=statement_timestamp()-interval '8 days',expires_at=statement_timestamp()-interval '1 day'where id='${id}'`)
 const expired=await list();check(expired.status===200&&expired.json.data.items.find(i=>i.id===id)?.status==='expired','team_expiry_real_effective_expired_list')
 const input={command_id:randomUUID(),id,expected_version:2},twenty=await Promise.all(Array.from({length:20},()=>cmd('member.reissue_invite',input)));check(twenty.every(r=>r.status===200&&r.json.receipt.version===3&&JSON.stringify(r.json)===JSON.stringify(twenty[0].json)),'team_expiry_real_twenty_reissue_replays')
 check(Date.parse(twenty[0].json.receipt.expires_at)>Date.now()+6*86400000,'team_expiry_real_seven_days')
 check((await cmd('member.reissue_invite',{...input,expected_version:3})).status===409,'team_expiry_real_changed_replay_conflict');check((await cmd('member.reissue_invite',{...input,command_id:randomUUID()})).status===409,'team_expiry_real_stale_CAS');check((await cmd('member.reissue_invite',{...input,command_id:randomUUID(),expected_version:3})).status===400,'team_expiry_real_unexpired_reissue_denied')
 for(const name of ['memberA','viewerA','ownerB']){check((await cmd('member.reissue_invite',input,name)).status>=400,'team_expiry_real_role_or_foreign_'+name);const r=await list(name);check(name==='ownerB'?r.status===200&&!r.json.data.items.some(i=>i.id===id):r.status===403,'team_expiry_real_list_scope_'+name)}
 check((await rpc('team_v1_member_invite_list',{p_workspace_id:wb,p_input:{}},users.ownerA.token)).status===403,'team_expiry_real_explicit_foreign_scope')
 sql(`update public.team_invite_intents set expires_at=statement_timestamp()-interval '1 day'where id='${id}'`)
 const races=await Promise.all(Array.from({length:20},()=>cmd('member.reissue_invite',{command_id:randomUUID(),id,expected_version:4})));check(races.filter(r=>r.status===200).length===1&&races.filter(r=>r.status===409).length===19,'team_expiry_real_twenty_distinct_CAS')
 check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'and operation='member.reissue_invite'`))===2,'team_expiry_real_one_audit_each_effect')
 const legacy=await origin({kind:'customer',id:ca});check(legacy.status===200&&legacy.json.data.confidence==='declared_legacy_manual'&&legacy.json.data.verified_at===null,'manual_origin_real_no_legacy_certification')
 const created=await post('/api/product/v1/commands','customer.create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'New origin synthetic'});check(created.status===200,'manual_origin_real_canonical_create')
 const customer=created.json.receipt.id,verified=await origin({kind:'customer',id:customer});check(verified.status===200&&verified.json.data.confidence==='verified_new_manual'&&Number.isFinite(Date.parse(verified.json.data.verified_at)),'manual_origin_real_new_proof')
 check(!/actor|command_id|legal_name|email/.test(JSON.stringify(verified.json)),'manual_origin_real_minimized_read')
 check(Number(sql(`select count(*)from public.product_manual_origin_proofs where entity_id='${customer}'`))===1,'manual_origin_real_one_immutable_proof')
 for(const name of ['memberA','viewerA','ownerB'])check((await origin({kind:'customer',id:customer},name)).status>=400,'manual_origin_real_denied_'+name)
 check((await rpc('provenance_v1_get',{p_workspace_id:wb,p_input:{kind:'customer',id:customer}},users.ownerA.token)).status===403,'manual_origin_real_foreign_scope')
 check((await origin({kind:'arbitrary_table',id:customer})).status===400,'manual_origin_real_closed_registry')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 check((await http('/auth/v1/user',users.ownerA.token)).status===200,'team_origin_real_revoked_JWT_still_valid');check((await list()).status===403&&(await cmd('member.reissue_invite',input)).status===403&&(await origin({kind:'customer',id:customer})).status===403,'team_origin_real_revoked_all')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 return{team_invite_expiry:'PASS_INTERNAL_ONLY',team_invite_reissue:'PASS_CAS_REPLAY_CURRENT_SCOPE',verified_new_manual_origin:'PASS_NO_BACKFILL',team_origin_operations_individually_observed:['member.invite_list','member.reissue_invite','provenance.get']}
}
