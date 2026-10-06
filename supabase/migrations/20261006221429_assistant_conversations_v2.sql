-- Assistant history only. These rows never authorize a CRM read/write or prove
-- current CRM facts. No provider payload, reasoning, structured tool output or
-- raw context IDs are stored in message content.
begin;
create table public.assistant_conversations_v2 (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 title text not null check (char_length(btrim(title)) between 1 and 120 and octet_length(title)<=480 and title !~* '(Bearer[[:space:]]+[A-Za-z0-9._~-]{16,}|sk-(proj-|svcacct-)?[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)'),
 archived boolean not null default false,
 version bigint not null default 1 check(version between 1 and 9007199254740991),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(workspace_id,actor_id,id)
);
create index assistant_conversations_v2_owner_page on public.assistant_conversations_v2(workspace_id,actor_id,id) where not archived;
create table public.assistant_turns_v2 (
 id uuid primary key,
 workspace_id uuid not null,
 actor_id uuid not null,
 conversation_id uuid not null,
 status text not null check(status in ('running','completed','cancelled','failed')),
 started_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default (clock_timestamp()+interval '90 seconds'),
 finished_at timestamptz,
 failure_code text check(failure_code in ('unavailable','access_changed','invalid_plan','not_configured')),
 membership_version bigint not null check(membership_version>0),
 unique(workspace_id,actor_id,conversation_id,id),
 foreign key(workspace_id,actor_id,conversation_id) references public.assistant_conversations_v2(workspace_id,actor_id,id) on delete restrict,
 check((status='running' and finished_at is null and failure_code is null) or (status<>'running' and finished_at is not null)),
 check((status='failed' and failure_code is not null) or (status<>'failed' and failure_code is null))
 ,check(expires_at>started_at and expires_at<=started_at+interval '90 seconds')
);
create unique index assistant_turns_v2_one_running on public.assistant_turns_v2(workspace_id,actor_id,conversation_id) where status='running';
create table public.assistant_messages_v2 (
 id uuid primary key default gen_random_uuid(),
 ordinal bigint generated always as identity unique check(ordinal between 1 and 9007199254740991),
 workspace_id uuid not null,
 actor_id uuid not null,
 conversation_id uuid not null,
 turn_id uuid not null,
 role text not null check(role in ('user','assistant')),
 content text not null check(char_length(btrim(content)) between 1 and 4000 and octet_length(content)<=8000),
 created_at timestamptz not null default clock_timestamp(),
 unique(workspace_id,actor_id,conversation_id,turn_id,role),
 foreign key(workspace_id,actor_id,conversation_id,turn_id) references public.assistant_turns_v2(workspace_id,actor_id,conversation_id,id) on delete restrict,
 -- Defense in depth for common credential shapes. Application scanner is
 -- stricter; neither layer claims to recognize every possible secret.
 check(content !~* '(Bearer[[:space:]]+[A-Za-z0-9._~-]{16,}|sk-(proj-|svcacct-)?[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)')
);
create index assistant_messages_v2_owner_page on public.assistant_messages_v2(workspace_id,actor_id,conversation_id,ordinal);
alter table public.assistant_conversations_v2 enable row level security;
alter table public.assistant_conversations_v2 force row level security;
alter table public.assistant_turns_v2 enable row level security;
alter table public.assistant_turns_v2 force row level security;
alter table public.assistant_messages_v2 enable row level security;
alter table public.assistant_messages_v2 force row level security;
create policy assistant_conversations_v2_owned on public.assistant_conversations_v2 for all to authenticated
 using(actor_id=(select auth.uid()) and public.is_workspace_member(workspace_id))
 with check(actor_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
create policy assistant_turns_v2_owned on public.assistant_turns_v2 for all to authenticated
 using(actor_id=(select auth.uid()) and public.is_workspace_member(workspace_id))
 with check(actor_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
create policy assistant_messages_v2_owned on public.assistant_messages_v2 for all to authenticated
 using(actor_id=(select auth.uid()) and public.is_workspace_member(workspace_id))
 with check(actor_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
revoke all on public.assistant_conversations_v2,public.assistant_turns_v2,public.assistant_messages_v2 from public,anon,authenticated,service_role;
grant select,insert on public.assistant_conversations_v2,public.assistant_turns_v2,public.assistant_messages_v2 to authenticated;
grant update(title,archived,version,updated_at) on public.assistant_conversations_v2 to authenticated;
grant update(status,finished_at,failure_code) on public.assistant_turns_v2 to authenticated;
revoke all on sequence public.assistant_messages_v2_ordinal_seq from public,anon,authenticated,service_role;
grant usage on sequence public.assistant_messages_v2_ordinal_seq to authenticated;

create function public.assistant_turn_guard_v2() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.status<>'running' or new.membership_version is distinct from (select version from public.workspace_members where workspace_id=new.workspace_id and user_id=auth.uid() and status='active') or not exists(select 1 from public.assistant_conversations_v2 where id=new.conversation_id and workspace_id=new.workspace_id and actor_id=new.actor_id and not archived) then
   raise exception using errcode='42501',message='assistant_access_denied'; end if;
 else
  if old.status<>'running' or new.status not in ('completed','cancelled','failed') then
   raise exception using errcode='40001',message='assistant_transition_conflict'; end if;
  if new.status='completed' and (old.expires_at<=clock_timestamp() or old.membership_version is distinct from (select version from public.workspace_members where workspace_id=old.workspace_id and user_id=auth.uid() and status='active')) then
   raise exception using errcode='40001',message='assistant_transition_conflict'; end if;
 end if;
 return new;
end $$;
revoke all on function public.assistant_turn_guard_v2() from public,anon,authenticated,service_role;
create trigger assistant_turn_guard_v2 before insert or update on public.assistant_turns_v2 for each row execute function public.assistant_turn_guard_v2();
create function public.assistant_conversation_guard_v2() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.archived or new.version<>old.version+1 then raise exception using errcode='40001',message='assistant_version_conflict'; end if;
 if new.archived then
  update public.assistant_turns_v2 set status='cancelled',finished_at=clock_timestamp(),failure_code=null
   where workspace_id=old.workspace_id and actor_id=old.actor_id and conversation_id=old.id and status='running';
 end if;
 return new;
end $$;
revoke all on function public.assistant_conversation_guard_v2() from public,anon,authenticated,service_role;
create trigger assistant_conversation_guard_v2 before update on public.assistant_conversations_v2 for each row execute function public.assistant_conversation_guard_v2();
create function public.assistant_message_guard_v2() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.assistant_turns_v2 where workspace_id=new.workspace_id and actor_id=new.actor_id and conversation_id=new.conversation_id and id=new.turn_id
  and status=case when new.role='user' then 'running' else 'completed' end) then
  raise exception using errcode='40001',message='assistant_message_conflict'; end if;
 return new;
end $$;
revoke all on function public.assistant_message_guard_v2() from public,anon,authenticated,service_role;
create trigger assistant_message_guard_v2 before insert on public.assistant_messages_v2 for each row execute function public.assistant_message_guard_v2();

-- SECURITY INVOKER deliberately retains RLS. Identity columns cannot be updated
-- by authenticated clients. Historical messages are never trusted tool evidence.
create function public.assistant_thread_v2(p_workspace_id uuid,p_operation text,p_input jsonb)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 actor uuid:=auth.uid(); c public.assistant_conversations_v2%rowtype;
 t public.assistant_turns_v2%rowtype; v_member bigint; allowed text[];
 limit_n integer:=50; after_id uuid; after_sequence bigint:=0; thread_id uuid; turn_id uuid;
 items jsonb; next_id uuid; content_text text; result_status text; changed integer;
begin
 if actor is null or not public.is_workspace_member(p_workspace_id) then
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
  insert into public.assistant_turns_v2(id,workspace_id,actor_id,conversation_id,status,membership_version) values(turn_id,p_workspace_id,actor,c.id,'running',v_member) returning * into t;
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
