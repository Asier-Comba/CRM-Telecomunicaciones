import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
export async function inboxAcceptance({rpc,sql,check,users,wa,wb,ca,url,anon,appUrl}){
 const cookies={};for(const name of ['ownerA','adminA','memberA','viewerA','ownerB']){const u=users[name],values=[],s=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});await s.auth.setSession({access_token:u.token,refresh_token:u.refresh});cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(operation,input,name='ownerA')=>{const r=await fetch(appUrl+'/api/inbox/v1',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(15000)});return{status:r.status,json:await r.json()}}
 const observed=new Set(),inputs=[]
 async function apply(op,value,name='ownerA'){
  const input={command_id:randomUUID(),...value},r=await post(op,input,name);check(r.status===200&&r.json.receipt.operation===op,'inbox_positive_'+op);observed.add(op);inputs.push([op,input,name]);
  const replay=await post(op,input,name);check(replay.status===200&&JSON.stringify(replay.json)===JSON.stringify(r.json),'inbox_exact_replay_'+op)
  const changed='body'in input?{...input,body:'Changed synthetic intent'}:'expected_version'in input?{...input,expected_version:input.expected_version+1}:{...input,customer_id:ca};check((await post(op,changed,name)).status===409,'inbox_changed_replay_'+op)
  if('expected_version'in input)check((await post(op,{...input,command_id:randomUUID()},name)).status===409,'inbox_stale_CAS_'+op)
  check((await post(op,{...input,command_id:randomUUID()},'viewerA')).status===403,'inbox_viewer_'+op)
  const other=await post(op,{...input,command_id:randomUUID()},'ownerB');check(other.status===404||other.status===400,'inbox_foreign_'+op)
  check((await rpc('inbox_v1_'+op.replaceAll('.','_'),{p_workspace_id:wb,p_input:input},users[name].token)).status===403,'inbox_foreign_scope_'+op)
  return r.json.receipt
 }
 // Foreign create binds an A assignee so cannot create a conversation in B.
 const created=await apply('conversation.create_internal',{assigned_user_id:users.ownerA.id,customer_id:null,body:'Synthetic private note'}),id=created.id
 check((await post('inbox.get_thread',{id},'memberA')).status===404,'inbox_unassigned_hidden')
 await apply('conversation.assign',{id,expected_version:1,assigned_user_id:users.memberA.id})
 await apply('conversation.link_customer',{id,expected_version:2,customer_id:ca,contact_id:null})
 await apply('message.add_internal_note',{id,expected_version:3,body:'Synthetic second private note'},'memberA')
 const first=await post('inbox.get_thread',{id,limit:1},'memberA');check(first.status===200&&first.json.data.messages.length===1&&first.json.data.next_seq===1,'inbox_bounded_thread');observed.add('inbox.get_thread')
 const next=await post('inbox.get_thread',{id,after_seq:1,limit:1},'memberA');check(next.status===200&&next.json.data.messages[0].seq===2,'inbox_sequence_cursor')
 const listed=await post('inbox.list',{limit:1},'memberA');check(listed.status===200&&listed.json.data.items.length===1&&!JSON.stringify(listed.json).includes('body'),'inbox_metadata_only');observed.add('inbox.list')
 check((await post('inbox.list',{limit:1,after_id:id},'memberA')).json.data.items.length===0,'inbox_keyset_cursor')
 await apply('conversation.mark_read',{id,expected_version:0},'memberA')
 const unread=await post('inbox.unread_summary',{},'memberA');check(unread.status===200&&unread.json.data.unread_count===0,'inbox_self_read');observed.add('inbox.unread_summary')
 check((await post('inbox.unread_summary',{})).json.data.unread_count===1,'inbox_other_user_unread')
 await apply('conversation.mark_unread',{id,expected_version:1},'memberA')
 await apply('conversation.close',{id,expected_version:4},'memberA');await apply('conversation.reopen',{id,expected_version:5},'memberA');await apply('conversation.archive',{id,expected_version:6},'memberA')
 check((await post('inbox.unread_summary',{},'memberA')).json.data.unread_count===0,'inbox_archive_excluded');check((await post('inbox.list',{status:'archived'},'memberA')).json.data.items.some(x=>x.id===id),'inbox_archive_list')
 await apply('conversation.restore',{id,expected_version:7},'memberA')
 for(const op of ['inbox.list','inbox.get_thread','inbox.unread_summary']){const inp=op==='inbox.get_thread'?{id}:{};check((await post(op,inp,'viewerA')).status===403,'inbox_read_viewer_'+op);check((await rpc('inbox_v1_'+op.slice(6),{p_workspace_id:wb,p_input:inp},users.memberA.token)).status===403,'inbox_read_scope_'+op);const foreign=await post(op,inp,'ownerB');check(op==='inbox.get_thread'?foreign.status===404:foreign.status===200&&(op==='inbox.list'?foreign.json.data.items.length===0:foreign.json.data.unread_count===0),'inbox_read_foreign_'+op)}
 check((await post('conversation.assign',{command_id:randomUUID(),id,expected_version:8,assigned_user_id:users.viewerA.id})).status===400,'inbox_invalid_assignee')
 check((await post('conversation.assign',{command_id:randomUUID(),id,expected_version:8,assigned_user_id:users.memberA.id},'memberA')).status===403,'inbox_member_assign_denied')
 for(const [op,inp]of [['inbox.get_thread',{id,limit:51}],['inbox.list',{limit:101}],['inbox.get_thread',{id,provider_url:'https://example.invalid'}],['message.send',{}],['webhook.ingest',{}],['message.add_internal_note',{command_id:randomUUID(),id,expected_version:8,body:'x'.repeat(2001)}]])check((await post(op,inp)).status===400,'inbox_closed_input_'+op)
 const races=await Promise.all(Array.from({length:20},()=>post('message.add_internal_note',{command_id:randomUUID(),id,expected_version:8,body:'Synthetic race note'},'memberA')));check(races.filter(r=>r.status===200).length===1&&races.filter(r=>r.status===409).length===19,'inbox_twenty_CAS_notes')
 check(Number(sql(`select count(*)from public.inbox_messages where conversation_id='${id}'`))===3,'inbox_one_race_effect')
 const mark={command_id:randomUUID(),id,expected_version:2},replays=await Promise.all(Array.from({length:20},()=>post('conversation.mark_read',mark,'memberA')));check(replays.every(r=>r.status===200&&r.json.receipt.version===3&&JSON.stringify(r.json)===JSON.stringify(replays[0].json)),'inbox_twenty_marker_replays')
 check(!sql(`select coalesce(string_agg(row_to_json(e)::text,''),'')from public.product_audit_events e where entity_id='${id}'`).includes('Synthetic'),'inbox_audit_has_no_body')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 for(const [op,inp,name]of inputs){const u=users[name];sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${u.id}'`);check((await post(op,inp,name)).status===403,'inbox_revoked_replay_'+op);sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${u.id}'`)}
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 for(const op of ['inbox.list','inbox.get_thread','inbox.unread_summary'])check((await post(op,op==='inbox.get_thread'?{id}:{},'memberA')).status===403,'inbox_revoked_read_'+op)
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.memberA.id}'`)
 check((await post('conversation.assign',{command_id:randomUUID(),id,expected_version:9,assigned_user_id:users.ownerA.id})).status===200,'inbox_reassign')
 check((await post('inbox.get_thread',{id},'memberA')).status===404&&(await post('conversation.mark_read',mark,'memberA')).status===404,'inbox_reassigned_replay_hidden')
 check(observed.size===13,'inbox_every_operation_observed')
 return{inbox:'PASS',inbox_operations_individually_observed:[...observed].sort(),inbox_provider:'NOT_CONFIGURED',inbox_external_send:'NOT_IMPLEMENTED'}
}
