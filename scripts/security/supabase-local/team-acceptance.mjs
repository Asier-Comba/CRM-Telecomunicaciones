import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
/** Disposable roster only. Internal intents; never contacts an email/provider service. */
export async function teamAcceptance({rpc,sql,check,http,users,wa,wb,url,anon,appUrl}){
 const invoke=(op,input,u=users.ownerA,w=wa)=>rpc('team_v1_member_'+op,{p_workspace_id:w,p_input:input},u.token)
 const roster=await invoke('list',{limit:100});check(roster.status===200&&roster.json.items.length>=4&&!JSON.stringify(roster.json).includes('email'),'team_actual_bounded_roster')
 const target=roster.json.items.find(m=>m.user_id===users.memberA.id);check(!!target,'team_actual_target')
 const invitation={command_id:randomUUID(),email:'team-synthetic@example.invalid',role:'member'}
 const attempts=await Promise.all(Array.from({length:20},()=>invoke('invite_intent',invitation)))
 check(attempts.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(attempts[0].json)),'team_actual_20_intent_replays')
 check(Number(sql(`select count(*)from public.team_invite_intents where workspace_id='${wa}'and email='team-synthetic@example.invalid'`))===1,'team_actual_one_pending_intent')
 check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${attempts[0].json.id}'`))===1,'team_actual_one_audit')
 const changed=await invoke('invite_intent',{...invitation,email:'changed@example.invalid'});check(changed.status===500&&changed.json.code==='40001','team_actual_changed_replay_conflict')
 for(const u of [users.memberA,users.viewerA,users.ownerB])check((await invoke('list',{},u)).status===403,'team_actual_protected_roster_denied')
 check((await invoke('list',{},users.ownerA,wb)).status===403,'team_actual_foreign_workspace_denied')
 const owner=roster.json.items.find(m=>m.user_id===users.ownerA.id)
 check((await invoke('suspend',{command_id:randomUUID(),id:owner.id,expected_version:owner.version})).status===403,'team_actual_owner_preserved')
 const changes=await Promise.all(Array.from({length:20},()=>invoke('role_change',{command_id:randomUUID(),id:target.id,expected_version:target.version,role:'viewer'})))
 check(changes.filter(r=>r.status===200).length===1&&changes.filter(r=>r.status===500&&r.json.code==='40001').length===19,'team_actual_20_roster_CAS')
 check((await invoke('role_change',{command_id:randomUUID(),id:target.id,expected_version:target.version+1,role:'member'})).status===200,'team_actual_restore_commercial_role')
 const commercial={command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Team synthetic revocation control'}
 const command=(input)=>rpc('product_v1_customer_create',{p_workspace_id:wa,p_input:input},users.memberA.token)
 const prior=await command(commercial);check(prior.status===200,'team_actual_pre_revocation_allowed')
 check((await invoke('suspend',{command_id:randomUUID(),id:target.id,expected_version:target.version+2})).status===200,'team_actual_suspend')
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'team_actual_suspended_JWT_valid')
 const revoked=await command(commercial);check(revoked.status===403&&revoked.json.code==='42501','team_actual_suspended_command_replay_denied')
 check((await invoke('resume',{command_id:randomUUID(),id:target.id,expected_version:target.version+3})).status===200,'team_actual_resume')
 check(JSON.stringify((await command(commercial)).json)===JSON.stringify(prior.json),'team_actual_resumed_authorized_replay')
 const remove={command_id:randomUUID(),id:target.id,expected_version:target.version+4};const removed=await invoke('remove',remove)
 check(removed.status===200&&removed.json.status==='removed'&&JSON.stringify((await invoke('remove',remove)).json)===JSON.stringify(removed.json),'team_actual_removed_idempotent')
 check((await http('/auth/v1/user',users.memberA.token)).status===200&&(await command(commercial)).status===403,'team_actual_removed_valid_JWT_denied')
 // Restore only this disposable test roster for subsequent platform assertions.
 sql(`update public.workspace_members set status='active'where id='${target.id}'`)
 const cancel=await invoke('cancel_invite',{command_id:randomUUID(),id:attempts[0].json.id,expected_version:1});check(cancel.status===200&&cancel.json.status==='cancelled','team_actual_cancel_intent')
 const cookies=[];const client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}})
 const session=await client.auth.setSession({access_token:users.ownerA.token,refresh_token:users.ownerA.refresh});check(!session.error,'team_actual_cookie_session')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 const r=await fetch(appUrl+'/api/team/v1/queries',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:'member.list',input:{limit:100}}),signal:AbortSignal.timeout(15000)})
 check(r.status===200&&(await r.json()).data.items.some(m=>m.user_id===users.memberA.id),'team_actual_next_cookie_roster')
 const create=await fetch(appUrl+'/api/team/v1/commands',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:'member.invite_intent',input:{command_id:randomUUID(),email:'team-next@example.invalid',role:'viewer'}}),signal:AbortSignal.timeout(15000)})
 check(create.status===200&&(await create.json()).receipt.status==='pending','team_actual_next_internal_intent')
 return {team_internal:'PASS',team_cas_replay:'PASS',team_revocation:'PASS',team_transport:'PASS',team_email_send:'NOT_IMPLEMENTED'}
}
