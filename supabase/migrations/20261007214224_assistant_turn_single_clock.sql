-- Native PostgreSQL exposed microsecond skew between two volatile defaults.
-- Preserve the <=90-second constraint; derive each RPC lease from one clock
-- sample after scoped locks, never two independently sampled defaults.
-- Stable defaults also protect privileged fixture/import inserts. No auth/ACL
-- or state transition changes; the complete registered RPC is versioned here.
begin;
alter table public.assistant_turns_v2 alter column started_at set default statement_timestamp();
alter table public.assistant_turns_v2 alter column expires_at set default (statement_timestamp()+interval '90 seconds');
create or replace function public.assistant_thread_v2(p_workspace_id uuid,p_operation text,p_input jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); c public.assistant_conversations_v2%rowtype;
 t public.assistant_turns_v2%rowtype; v_member bigint; allowed text[];
 limit_n integer:=50; after_id uuid; after_sequence bigint:=0; thread_id uuid; turn_id uuid;
 items jsonb; next_id uuid; content_text text; result_status text; changed integer; turn_started timestamptz;
begin
 -- Lock the exact actor membership and workspace through the transaction.
 -- Removal/reactivation or workspace suspension cannot interleave a completion.
 select m.version into v_member from public.workspace_members m
 join public.workspaces w on w.id=m.workspace_id
 where m.workspace_id=p_workspace_id and m.user_id=actor and m.status='active' and w.status='active'
 for share of m,w;
 if actor is null or v_member is null then
  raise exception using errcode='42501',message='assistant_access_denied';
 end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>20000 then
  raise exception using errcode='22023',message='assistant_invalid_input';
 end if;
 allowed:=case p_operation
  when 'thread.list' then array['limit','after_id']
  when 'thread.create' then array['id','title']
  when 'thread.get' then array['id']
  when 'thread.rename' then array['id','expected_version','title']
  when 'thread.archive' then array['id','expected_version']
  when 'message.page' then array['id','limit','after_sequence']
  when 'turn.start' then array['id','turn_id','text']
  when 'turn.finish' then array['id','turn_id','status','answer','failure_code']
  else null end;
 if allowed is null or exists(select 1 from jsonb_object_keys(p_input) k where not k=any(allowed)) then
  raise exception using errcode='22023',message='assistant_invalid_input';
 end if;
 if p_input?'limit' then
  if jsonb_typeof(p_input->'limit')<>'number' or p_input->>'limit' !~ '^[0-9]+$' then
   raise exception using errcode='22023',message='assistant_invalid_input'; end if;
  limit_n:=(p_input->>'limit')::integer;
 end if;
 if limit_n not between 1 and 50 then raise exception using errcode='22023',message='assistant_invalid_input'; end if;
 if p_input?'after_id' then
  if jsonb_typeof(p_input->'after_id')<>'string' then raise exception using errcode='22023',message='assistant_invalid_input'; end if;
  after_id:=(p_input->>'after_id')::uuid;
 end if;
 if p_input?'after_sequence' then
  if jsonb_typeof(p_input->'after_sequence')<>'number' or p_input->>'after_sequence' !~ '^[0-9]+$' or (p_input->>'after_sequence')::bigint not between 0 and 9007199254740991 then
   raise exception using errcode='22023',message='assistant_invalid_input'; end if;
  after_sequence:=(p_input->>'after_sequence')::bigint;
 end if;
 if p_operation='thread.list' then
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) into items from (
   select id,title,archived,version,created_at,updated_at from public.assistant_conversations_v2
   where workspace_id=p_workspace_id and actor_id=actor and not archived and (after_id is null or id>after_id)
   order by id limit limit_n+1) r;
  if jsonb_array_length(items)>limit_n then next_id:=(items->(limit_n-1)->>'id')::uuid; items:=items-(limit_n); end if;
  return jsonb_build_object('contract','assistant.threads.v2','items',items,'next_id',next_id);
 end if;
 if jsonb_typeof(p_input->'id') is distinct from 'string' then raise exception using errcode='22023',message='assistant_invalid_input'; end if;
 thread_id:=(p_input->>'id')::uuid;
 if p_operation='thread.create' then
  if jsonb_typeof(p_input->'title') is distinct from 'string' or char_length(btrim(p_input->>'title')) not between 1 and 120 then
   raise exception using errcode='22023',message='assistant_invalid_input'; end if;
  insert into public.assistant_conversations_v2(id,workspace_id,actor_id,title) values(thread_id,p_workspace_id,actor,p_input->>'title')
   on conflict(id) do nothing;
 end if;
 select * into c from public.assistant_conversations_v2 where workspace_id=p_workspace_id and actor_id=actor and id=thread_id for update;
 if not found then raise exception using errcode='42501',message='assistant_access_denied'; end if;
 if p_operation='thread.create' and c.title<>p_input->>'title' then raise exception using errcode='40001',message='assistant_identity_conflict'; end if;
 if p_operation in ('thread.rename','thread.archive') then
  if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or p_input->>'expected_version' !~ '^[1-9][0-9]*$' or (p_input->>'expected_version')::bigint<>c.version or c.archived then
   raise exception using errcode='40001',message='assistant_version_conflict'; end if;
  if p_operation='thread.rename' and (jsonb_typeof(p_input->'title') is distinct from 'string' or char_length(btrim(p_input->>'title')) not between 1 and 120) then
   raise exception using errcode='22023',message='assistant_invalid_input'; end if;
  if p_operation='thread.archive' then
   update public.assistant_turns_v2 set status='cancelled',finished_at=clock_timestamp() where workspace_id=p_workspace_id and actor_id=actor and conversation_id=c.id and status='running';
  end if;
  update public.assistant_conversations_v2 set title=case when p_operation='thread.rename' then p_input->>'title' else title end,
   archived=p_operation='thread.archive',version=version+1,updated_at=clock_timestamp() where id=c.id returning * into c;
 end if;
 if p_operation in ('thread.create','thread.get','thread.rename','thread.archive') then
  return jsonb_build_object('contract','assistant.thread.v2','record',jsonb_build_object('id',c.id,'title',c.title,'archived',c.archived,'version',c.version,'created_at',c.created_at,'updated_at',c.updated_at));
 end if;
 if p_operation='message.page' then
  select coalesce(jsonb_agg(to_jsonb(r) order by r.sequence),'[]'::jsonb) into items from (
   select id,ordinal as sequence,assistant_messages_v2.turn_id,role,content,created_at from public.assistant_messages_v2
   where workspace_id=p_workspace_id and actor_id=actor and conversation_id=c.id and ordinal>after_sequence
   order by ordinal limit limit_n+1) r;
  return jsonb_build_object('contract','assistant.messages.v2','items',case when jsonb_array_length(items)>limit_n then items-limit_n else items end,
   'next_sequence',case when jsonb_array_length(items)>limit_n then (items->(limit_n-1)->>'sequence')::bigint else null end,'historical',true);
 end if;
 if c.archived then raise exception using errcode='40001',message='assistant_archived'; end if;
 if jsonb_typeof(p_input->'turn_id') is distinct from 'string' then raise exception using errcode='22023',message='assistant_invalid_input'; end if;
 turn_id:=(p_input->>'turn_id')::uuid;
 select version into v_member from public.workspace_members where workspace_id=p_workspace_id and user_id=actor and status='active';
 if v_member is null then raise exception using errcode='42501',message='assistant_access_denied'; end if;
 if p_operation='turn.start' then
  if jsonb_typeof(p_input->'text') is distinct from 'string' then raise exception using errcode='22023',message='assistant_invalid_input'; end if;
  content_text:=p_input->>'text';
  select * into t from public.assistant_turns_v2 where workspace_id=p_workspace_id and actor_id=actor and conversation_id=c.id and id=turn_id;
  if found then
   if t.membership_version<>v_member or not exists(select 1 from public.assistant_messages_v2 where workspace_id=p_workspace_id and actor_id=actor and conversation_id=c.id and assistant_messages_v2.turn_id=t.id and role='user' and content=content_text) then
    raise exception using errcode='40001',message='assistant_identity_conflict'; end if;
   -- Replay reports identity; caller MUST NOT rerun an already running turn.
   return jsonb_build_object('contract','assistant.turn.v2','id',t.id,'status',t.status,'replay',true);
  end if;
  -- Read-only abandoned generation can expire. This does not retry a business
  -- write or assert absence of an external effect.
  update public.assistant_turns_v2 set status='failed',finished_at=clock_timestamp(),failure_code='unavailable'
   where workspace_id=p_workspace_id and actor_id=actor and conversation_id=c.id and status='running' and expires_at<=clock_timestamp();
  turn_started:=clock_timestamp();
  insert into public.assistant_turns_v2(id,workspace_id,actor_id,conversation_id,status,membership_version,started_at,expires_at) values(turn_id,p_workspace_id,actor,c.id,'running',v_member,turn_started,turn_started+interval '90 seconds') returning * into t;
  insert into public.assistant_messages_v2(workspace_id,actor_id,conversation_id,turn_id,role,content) values(p_workspace_id,actor,c.id,t.id,'user',content_text);
  return jsonb_build_object('contract','assistant.turn.v2','id',t.id,'status',t.status,'replay',false);
 end if;
 result_status:=p_input->>'status';
 if jsonb_typeof(p_input->'status') is distinct from 'string' or result_status not in ('completed','cancelled','failed') or
  (result_status='completed' and (jsonb_typeof(p_input->'answer') is distinct from 'string' or p_input?'failure_code')) or
  (result_status<>'completed' and p_input?'answer') or
  (result_status='failed' and (jsonb_typeof(p_input->'failure_code') is distinct from 'string' or p_input->>'failure_code' not in ('unavailable','access_changed','invalid_plan','not_configured'))) or
  (result_status<>'failed' and p_input?'failure_code') then
  raise exception using errcode='22023',message='assistant_invalid_input';
 end if;
 update public.assistant_turns_v2 set status=result_status,finished_at=clock_timestamp(),failure_code=p_input->>'failure_code'
  where workspace_id=p_workspace_id and actor_id=actor and conversation_id=c.id and id=turn_id and status='running' and (result_status='cancelled' or (membership_version=v_member and expires_at>clock_timestamp())) returning * into t;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception using errcode='40001',message='assistant_transition_conflict'; end if;
 if result_status='completed' then
  insert into public.assistant_messages_v2(workspace_id,actor_id,conversation_id,turn_id,role,content) values(p_workspace_id,actor,c.id,t.id,'assistant',p_input->>'answer');
 end if;
 return jsonb_build_object('contract','assistant.turn.v2','id',t.id,'status',t.status,'replay',false);
end $$;
revoke all on function public.assistant_thread_v2(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.assistant_thread_v2(uuid,text,jsonb) to authenticated;
commit;
