import { randomUUID } from 'node:crypto'
import { createServerClient } from '@supabase/ssr'
/** Actual Auth tokens and PostgREST, plus actual Next route/cookie transport. */
export async function productAcceptance({rpc,sql,check,users,wa,wb,ca,url,anon,appUrl}) {
 const invoke=(name,input,u=users.memberA,w=wa)=>rpc('product_v1_'+name,{p_workspace_id:w,p_input:input},u.token)
 const base={command_id:randomUUID(),title:'Real JWT Synthetic task',customer_id:ca}
 const first=await invoke('task_create',base);check(first.status===200 && first.json?.version===1,'product_member_task_create')
 check(JSON.stringify((await invoke('task_create',base)).json)===JSON.stringify(first.json),'product_task_replay')
 check((await invoke('task_create',{...base,title:'Changed'})).status===409,'product_changed_input_conflict')
 const update={command_id:randomUUID(),id:first.json.id,expected_version:1,title:'Real JWT Synthetic edit'}
 check((await invoke('task_update',update)).json?.version===2,'product_task_update')
 check((await invoke('task_update',{...update,command_id:randomUUID()})).status===409,'product_stale_conflict')
 for(const u of [users.ownerA,users.adminA,users.memberA]) {
  const customer=await invoke('customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Real JWT Synthetic '+u.role},u)
  check(customer.status===200 && customer.json?.version===1,'product_customer_role_'+u.role)
  const contact=await invoke('contact_create',{command_id:randomUUID(),customer_id:customer.json.id,display_name:'Synthetic Contact',email:'contact@example.invalid'},u)
  check(contact.status===200,'product_contact_role_'+u.role)
  const editor=await rpc('product_v1_contact_editors',{p_workspace_id:wa,p_customer_id:customer.json.id,p_limit:20,p_after_id:null},u.token)
  check(editor.status===200 && editor.json?.items?.[0]?.email==='contact@example.invalid','product_authorized_editor_'+u.role)
 }
 for(const u of [users.viewerA,users.ownerB,users.memberB])check((await invoke('task_create',{...base,command_id:randomUUID()},u)).status>=400,'product_role_or_foreign_denied_'+u.role)
 check((await invoke('task_create',{...base,workspace_id:wb})).status===400,'product_authority_input_denied')
 check((await invoke('task_create',{...base,command_id:randomUUID(),customer_id:randomUUID()})).status>=400,'product_foreign_entity_not_found')
 const meeting={command_id:randomUUID(),title:'Synthetic DST meeting',starts_at:'2026-10-25T02:30:00+02:00',ends_at:'2026-10-25T02:30:00+01:00',timezone:'Europe/Madrid',customer_id:ca}
 check((await invoke('meeting_create',meeting)).status===200,'product_meeting_create')
 const page=await invoke('calendar',{range_start:'2026-10-25T01:00:00Z',range_end:'2026-10-25T02:00:00Z'},users.viewerA)
 check(page.status===200 && page.json.items.length===1,'product_viewer_overlap_read')
 const stage=randomUUID(),won=randomUUID()
 sql(`insert into public.opportunity_stages(id,workspace_id,code,display_name,position,outcome) values ('${stage}','${wa}','synthetic_open','Open',0,null),('${won}','${wa}','synthetic_won','Won',1,'won');`)
 const opportunity=await invoke('opportunity_create',{command_id:randomUUID(),customer_id:ca,stage_id:stage,title:'Synthetic opportunity',amount_minor:10000,currency:'EUR'})
 check(opportunity.status===200,'product_opportunity_create')
 check((await invoke('opportunity_win',{command_id:randomUUID(),id:opportunity.json.id,expected_version:1,stage_id:won})).json?.status==='won','product_opportunity_win')
 for(const token of [anon])check((await rpc('product_v1_task_create',{p_workspace_id:wa,p_input:base},token)).status>=400,'product_anon_denied')
 // Cookies are created by official SSR library; no hand-built/mock claims.
 const cookies=[]
 const ssr=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}})
 await ssr.auth.setSession({access_token:users.memberA.token,refresh_token:users.memberA.refresh})
 check(cookies.length>0,'product_actual_session_cookie')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 async function app(input,origin=appUrl) {
  const r=await fetch(appUrl+'/api/product/v1/commands',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(15000)})
  return {status:r.status,json:await r.json()}
 }
 const httpInput={operation:'task.create',input:{command_id:randomUUID(),title:'Next transport Synthetic'}}
 const next=await app(httpInput);check(next.status===200 && next.json?.receipt?.status==='pending','product_actual_next_cookie_user_jwt_transport')
 check(JSON.stringify((await app(httpInput)).json)===JSON.stringify(next.json),'product_actual_transport_replay')
 check((await app({...httpInput,actor_id:users.ownerA.id})).status===400,'product_actual_transport_authority_denied')
 check((await app(httpInput,'https://foreign.invalid')).status===403,'product_actual_transport_csrf')
 return {product_commands:'PASS',product_transport:'PASS',product_roles:'PASS',product_calendar_overlap:'PASS'}
}
