import {randomUUID} from 'node:crypto'
import {createServerClient} from '@supabase/ssr'
/** Extra B3/B5 execution on the existing isolated W1 platform and Next server. */
export async function workReadAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl}){
 const stage=sql(`select id from public.opportunity_stages where workspace_id='${wa}' and code='synthetic_open'`)
 check(/^[0-9a-f-]{36}$/.test(stage),'work_stage_catalog_setup')
 const payloads={task:{title:'B5 JWT Synthetic task',customer_id:ca,due_at:'2026-10-25T02:30:00+02:00'},meeting:{title:'B5 long overlap',customer_id:ca,starts_at:'2026-03-28T00:00:00Z',ends_at:'2026-03-31T00:00:00Z',timezone:'Europe/Madrid'},opportunity:{title:'B5 JWT opportunity',customer_id:ca,stage_id:stage,amount_minor:10000,currency:'EUR',expected_close_date:'2026-10-31'}}
 const key=()=>randomUUID()
 for(const [family,fields] of Object.entries(payloads)){
  const input={...fields,command_id:key()},args={p_workspace_id:wa,p_input:input}
  const attempts=await Promise.all(Array.from({length:20},()=>rpc('product_v1_'+family+'_create',args,users.memberA.token)))
  check(attempts.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(attempts[0].json)),'work_'+family+'_20_http_replays')
  const id=attempts[0].json.id
  const edits=await Promise.all(Array.from({length:20},()=>rpc('product_v1_'+family+'_update',{p_workspace_id:wa,p_input:{command_id:key(),id,expected_version:1,title:'B5 CAS winner'}},users.memberA.token)))
  check(edits.filter(r=>r.status===200).length===1&&edits.filter(r=>r.status===500&&r.json?.code==='40001').length===19,'work_'+family+'_20_http_CAS')
  check(Number(sql(`select count(*) from public.product_audit_events where entity_id='${id}'`))===2,'work_'+family+'_atomic_audits')
  for(const u of [users.viewerA,users.ownerB])check((await rpc('product_v1_'+family+'_create',{p_workspace_id:wa,p_input:{...input,command_id:key()}},u.token)).status>=400,'work_'+family+'_role_foreign_denied')
 }
 const calendar=await rpc('product_v1_calendar',{p_workspace_id:wa,p_input:{range_start:'2026-03-29T00:00:00Z',range_end:'2026-03-30T00:00:00Z',kind:'meeting'}},users.viewerA.token)
 check(calendar.status===200&&calendar.json?.items?.length===1,'work_long_event_overlap')
 check((await rpc('product_v1_dashboard_v2',{p_workspace_id:wa,p_input:{audience:'workspace',period:'quarter',anchor_date:'2026-10-25'}},users.ownerA.token)).status===200,'work_dashboard_owner_workspace')
 check((await rpc('product_v1_dashboard_v2',{p_workspace_id:wa,p_input:{audience:'workspace'}},users.memberA.token)).status===403,'work_dashboard_member_workspace_denied')
 check((await rpc('product_v1_dashboard_v2',{p_workspace_id:wa,p_input:{audience:'team'}},users.memberA.token)).status>=400,'work_dashboard_team_unavailable')
 check((await rpc('product_v1_global_search',{p_workspace_id:wa,p_input:{query:'contact@example.invalid'}},users.memberA.token)).json?.items?.length===0,'work_search_contact_email_absent')
 const foreign=await rpc('product_v1_global_search',{p_workspace_id:wb,p_input:{query:'Synthetic'}},users.memberA.token)
 check(foreign.status>=400,'work_search_foreign_workspace_denied')
 const cookies=[];const client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}})
 const auth=await client.auth.setSession({access_token:users.memberA.token,refresh_token:users.memberA.refresh})
 check(!auth.error&&cookies.length>0,'work_actual_cookie_session')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 async function query(operation,input){const r=await fetch(appUrl+'/api/product/v1/queries',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(15000)});return {status:r.status,json:await r.json()}}
 check((await query('dashboard.get',{audience:'my',period:'semester'})).json?.data?.contract_version==='product.dashboard.v2','work_next_dashboard_runtime')
 const search=await query('global.search',{query:'Synthetic',limit:10})
 check(search.status===200&&search.json?.data?.items?.length>0&&!JSON.stringify(search.json).includes('email'),'work_next_search_runtime')
 const overlap=await query('calendar.list',{range_start:'2026-03-29T00:00:00Z',range_end:'2026-03-30T00:00:00Z',kind:'meeting'})
 check(overlap.status===200&&overlap.json?.data?.items?.length===1,'work_next_overlap_runtime')
 // Same still-valid Auth JWT must deny every write family and both reads after
 // membership suspension. Restore only this disposable roster for W4 controls.
 sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.memberA.id}'`)
 check((await http('/auth/v1/user',users.memberA.token)).status===200,'work_suspended_member_auth_jwt_valid')
 for(const [family,fields] of Object.entries(payloads))check((await rpc('product_v1_'+family+'_create',{p_workspace_id:wa,p_input:{...fields,command_id:key()}},users.memberA.token)).status===403,'work_'+family+'_valid_jwt_revoked')
 check((await query('dashboard.get',{audience:'my'})).status===403,'work_next_dashboard_revoked')
 check((await query('global.search',{query:'Synthetic'})).status===403,'work_next_search_revoked')
 sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.memberA.id}'`)
 return {work_postgrest_20way_races:'PASS',work_revocation:'PASS',dashboard_v2:'PASS',global_search:'PASS',work_cookie_next_queries:'PASS'}
}
