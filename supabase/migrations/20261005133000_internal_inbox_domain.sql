-- Provider-neutral internal inbox. No external ingress, send, webhook or executable provider config.
begin;
create table public.inbox_conversations(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),
 channel text not null default 'internal'check(channel='internal'),source text not null default 'manual_internal'check(source='manual_internal'),
 status text not null default 'open'check(status in('open','closed','archived')),archived_prior_status text check(archived_prior_status in('open','closed')),
 assigned_user_id uuid references auth.users(id),customer_id uuid,contact_id uuid,
 version bigint not null default 1 check(version>0 and version<1000000000000000),last_seq bigint not null default 0 check(last_seq>=0 and last_seq<1000000000000000),
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 unique(id,workspace_id),foreign key(customer_id,workspace_id)references public.customers(id,workspace_id),foreign key(contact_id,workspace_id)references public.contacts(id,workspace_id),
 check((status='archived')=(archived_prior_status is not null)),check(contact_id is null or customer_id is not null)
);
create index inbox_conversations_assignment on public.inbox_conversations(workspace_id,assigned_user_id,status,id);
create table public.inbox_messages(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,conversation_id uuid not null,seq bigint not null check(seq>0 and seq<1000000000000000),
 kind text not null default 'internal_note'check(kind='internal_note'),body text not null check(char_length(body)between 1 and 2000 and body=btrim(body)and body!~'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'),
 actor_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),unique(workspace_id,conversation_id,seq),foreign key(conversation_id,workspace_id)references public.inbox_conversations(id,workspace_id)
);
create table public.inbox_read_markers(
 workspace_id uuid not null,conversation_id uuid not null,user_id uuid not null references auth.users(id),
 version bigint not null default 1 check(version>0 and version<1000000000000000),last_read_seq bigint not null default 0 check(last_read_seq>=0),marked_unread boolean not null default false,
 primary key(workspace_id,conversation_id,user_id),foreign key(conversation_id,workspace_id)references public.inbox_conversations(id,workspace_id)
);
alter table public.inbox_conversations enable row level security;alter table public.inbox_conversations force row level security;
alter table public.inbox_messages enable row level security;alter table public.inbox_messages force row level security;
alter table public.inbox_read_markers enable row level security;alter table public.inbox_read_markers force row level security;
revoke all on public.inbox_conversations,public.inbox_messages,public.inbox_read_markers from public,anon,authenticated,service_role;
create trigger inbox_conversations_version before update on public.inbox_conversations for each row execute function public.manage_task_version();
create trigger inbox_conversations_identity before update on public.inbox_conversations for each row execute function public.protect_operational_identity();
create trigger inbox_messages_immutable before update or delete on public.inbox_messages for each row execute function public.reject_activity_mutation();
create trigger inbox_conversations_no_delete before delete on public.inbox_conversations for each row execute function public.reject_activity_mutation();
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''conversation.create_internal'',''message.add_internal_note'',''conversation.assign'',''conversation.link_customer'',''conversation.close'',''conversation.reopen'',''conversation.archive'',''conversation.restore'',''conversation.mark_read'',''conversation.mark_unread''))';end$$;
create function public.inbox_v1_assert_actor(w uuid)returns uuid language plpgsql security definer set search_path=''as $$declare a uuid;begin a:=public.product_v1_assert_scope(w,true);return a;end$$;
create function public.inbox_v1_can_access(w uuid,a uuid,assignee uuid)returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from public.workspace_members where workspace_id=w and user_id=a and status='active'and(role in('owner','admin')or(role='member'and user_id=assignee)))$$;
create function public.inbox_v1_metadata(c public.inbox_conversations,a uuid)returns jsonb language sql stable security definer set search_path=''as $$select jsonb_build_object('id',c.id,'version',c.version,'status',c.status,'channel',c.channel,'source',c.source,'assigned_user_id',c.assigned_user_id,'customer_id',c.customer_id,'contact_id',c.contact_id,'last_seq',c.last_seq,'created_at',c.created_at,'updated_at',c.updated_at,'read_version',coalesce(r.version,0),'unread',coalesce(r.marked_unread,false)or c.last_seq>coalesce(r.last_read_seq,0))from(select 1)x left join public.inbox_read_markers r on r.workspace_id=c.workspace_id and r.conversation_id=c.id and r.user_id=a$$;
create function public.inbox_v1_validate(op text,inp jsonb)returns void language plpgsql set search_path=''as $$declare required text[];optional text[]:=array[]::text[];k text;v jsonb;begin
 required:=case when op='conversation.create_internal'then array['command_id','assigned_user_id','customer_id','body']when op='conversation.assign'then array['command_id','id','expected_version','assigned_user_id']when op='conversation.link_customer'then array['command_id','id','expected_version','customer_id','contact_id']when op='message.add_internal_note'then array['command_id','id','expected_version','body']when op in('conversation.close','conversation.reopen','conversation.archive','conversation.restore','conversation.mark_read','conversation.mark_unread')then array['command_id','id','expected_version']when op='inbox.get_thread'then array['id']when op in('inbox.list','inbox.unread_summary')then array[]::text[]else null end;
 if required is null then raise exception using errcode='22023',message='inbox_invalid_input';end if;
 if op='inbox.get_thread'then optional:=array['limit','after_seq'];elsif op='inbox.list'then optional:=array['limit','after_id','status'];end if;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>12288 or exists(select 1 from unnest(required)x where not inp?x)or exists(select 1 from jsonb_object_keys(inp)x where not x=any(required||optional))then raise exception using errcode='22023',message='inbox_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop
  if k in('command_id','id','after_id','assigned_user_id','customer_id','contact_id')then
   if k in('assigned_user_id','customer_id','contact_id')and v='null'::jsonb then continue;end if;
   if jsonb_typeof(v)is distinct from 'string'or inp->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='inbox_invalid_input';end if;
  elsif k in('expected_version','after_seq')then
   if jsonb_typeof(v)is distinct from 'number'or inp->>k!~'^(0|[1-9][0-9]{0,14})$'or(k='expected_version'and op not in('conversation.mark_read','conversation.mark_unread')and(inp->>k)::bigint=0)then raise exception using errcode='22023',message='inbox_invalid_input';end if;
  elsif k='limit'then if jsonb_typeof(v)is distinct from 'number'or inp->>k!~'^[1-9][0-9]{0,2}$'or(inp->>k)::int>(case when op='inbox.get_thread'then 50 else 100 end)then raise exception using errcode='22023',message='inbox_invalid_input';end if;
  elsif k='status'then if jsonb_typeof(v)is distinct from 'string'or inp->>k not in('open','closed','archived')then raise exception using errcode='22023',message='inbox_invalid_input';end if;
  elsif k='body'then if jsonb_typeof(v)is distinct from 'string'or char_length(inp->>k)not between 1 and 2000 or inp->>k<>btrim(inp->>k)or inp->>k~'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'then raise exception using errcode='22023',message='inbox_invalid_input';end if;
  end if;
 end loop;end$$;
create function public.inbox_v1_command(w uuid,op text,inp jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare a uuid;role_name text;c public.inbox_conversations%rowtype;r public.inbox_read_markers%rowtype;prior jsonb;result_version bigint;result_status text;assignee uuid;customer uuid;contact uuid;begin
 a:=public.inbox_v1_assert_actor(w);perform public.inbox_v1_validate(op,inp);select role into role_name from public.workspace_members where workspace_id=w and user_id=a;
 if op not in('conversation.create_internal','message.add_internal_note','conversation.assign','conversation.link_customer','conversation.close','conversation.reopen','conversation.archive','conversation.restore','conversation.mark_read','conversation.mark_unread')then raise exception using errcode='22023',message='inbox_invalid_input';end if;
 if op<>'conversation.create_internal'then
  select *into c from public.inbox_conversations where workspace_id=w and id=(inp->>'id')::uuid for update;
  if not found or not public.inbox_v1_can_access(w,a,c.assigned_user_id)then raise exception using errcode='P0002',message='inbox_not_found';end if;
 end if;
 if op in('conversation.assign','conversation.link_customer')and role_name not in('owner','admin')then raise exception using errcode='42501',message='inbox_access_denied';end if;
 if op='conversation.create_internal'and role_name='member'and(inp->>'assigned_user_id')::uuid is distinct from a then raise exception using errcode='42501',message='inbox_access_denied';end if;
 prior:=public.product_v1_begin_command(w,a,op,inp);if prior is not null then
  if op='conversation.create_internal' then
   select *into c from public.inbox_conversations where workspace_id=w and id=(prior->>'id')::uuid for share;
   if not found or not public.inbox_v1_can_access(w,a,c.assigned_user_id)then raise exception using errcode='P0002',message='inbox_not_found';end if;
  end if;
  return prior;
 end if;
 if op in('conversation.create_internal','conversation.assign')then
  assignee:=(inp->>'assigned_user_id')::uuid;if assignee is not null then perform 1 from public.workspace_members where workspace_id=w and user_id=assignee and status='active'and role in('owner','admin','member')for share;if not found then raise exception using errcode='22023',message='inbox_invalid_assignee';end if;end if;
 end if;
 if op in('conversation.create_internal','conversation.link_customer')then
  customer:=(inp->>'customer_id')::uuid;contact:=(inp->>'contact_id')::uuid;
  if customer is not null then perform 1 from public.customers where workspace_id=w and id=customer and status='active'for share;if not found then raise exception using errcode='P0002',message='inbox_customer_not_found';end if;end if;
  if contact is not null then perform 1 from public.contacts where workspace_id=w and id=contact and customer_id=customer and status='active'for share;if not found then raise exception using errcode='P0002',message='inbox_contact_not_found';end if;end if;
 end if;
 if op='conversation.create_internal'then
  insert into public.inbox_conversations(workspace_id,assigned_user_id,customer_id,last_seq,created_by_user_id)values(w,assignee,customer,1,a)returning *into c;
  insert into public.inbox_messages(workspace_id,conversation_id,seq,body,actor_user_id)values(w,c.id,1,inp->>'body',a);result_version:=c.version;result_status:=c.status;
 elsif op in('conversation.mark_read','conversation.mark_unread')then
  select *into r from public.inbox_read_markers where workspace_id=w and conversation_id=c.id and user_id=a for update;
  if coalesce(r.version,0)<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='inbox_read_conflict';end if;
  insert into public.inbox_read_markers(workspace_id,conversation_id,user_id,version,last_read_seq,marked_unread)values(w,c.id,a,coalesce(r.version,0)+1,c.last_seq,op='conversation.mark_unread')on conflict(workspace_id,conversation_id,user_id)do update set version=excluded.version,last_read_seq=excluded.last_read_seq,marked_unread=excluded.marked_unread returning *into r;
  result_version:=r.version;result_status:=case when op='conversation.mark_read'then 'read'else 'unread'end;
 else
  if c.version<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='inbox_conflict';end if;
  if c.status='archived'and op<>'conversation.restore'or c.status<>'archived'and op='conversation.restore'or c.status<>'open'and op in('message.add_internal_note','conversation.close')or c.status<>'closed'and op='conversation.reopen'then raise exception using errcode='22023',message='inbox_invalid_transition';end if;
  if op='message.add_internal_note'then
   insert into public.inbox_messages(workspace_id,conversation_id,seq,body,actor_user_id)values(w,c.id,c.last_seq+1,inp->>'body',a);
   update public.inbox_conversations set last_seq=last_seq+1,updated_at=statement_timestamp()where id=c.id returning *into c;
  elsif op='conversation.assign'then update public.inbox_conversations set assigned_user_id=assignee,updated_at=statement_timestamp()where id=c.id returning *into c;
  elsif op='conversation.link_customer'then update public.inbox_conversations set customer_id=customer,contact_id=contact,updated_at=statement_timestamp()where id=c.id returning *into c;
  elsif op='conversation.close'then update public.inbox_conversations set status='closed',updated_at=statement_timestamp()where id=c.id returning *into c;
  elsif op='conversation.reopen'then update public.inbox_conversations set status='open',updated_at=statement_timestamp()where id=c.id returning *into c;
  elsif op='conversation.archive'then update public.inbox_conversations set archived_prior_status=status,status='archived',updated_at=statement_timestamp()where id=c.id returning *into c;
  elsif op='conversation.restore'then update public.inbox_conversations set status=archived_prior_status,archived_prior_status=null,updated_at=statement_timestamp()where id=c.id returning *into c;end if;
  result_version:=c.version;result_status:=c.status;
 end if;
 prior:=jsonb_build_object('contract_version','inbox.v1','operation',op,'command_id',inp->>'command_id','id',c.id,'version',result_version,'status',result_status);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(w,a,(inp->>'command_id')::uuid,op,c.id,result_version);
 update public.product_commands set receipt=prior where workspace_id=w and actor_id=a and command_id=(inp->>'command_id')::uuid;return prior;end$$;
create function public.inbox_v1_list(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;items jsonb;lim int;last_id uuid;begin
 a:=public.inbox_v1_assert_actor(p_workspace_id);perform public.inbox_v1_validate('inbox.list',p_input);lim:=coalesce((p_input->>'limit')::int,20);
 select coalesce(jsonb_agg(public.inbox_v1_metadata(q,a)order by q.id),'[]'::jsonb)into items from(select c.*from public.inbox_conversations c where c.workspace_id=p_workspace_id and public.inbox_v1_can_access(p_workspace_id,a,c.assigned_user_id)and c.status=coalesce(p_input->>'status','open')and(not p_input?'after_id'or c.id>(p_input->>'after_id')::uuid)order by c.id limit lim)q;
 if jsonb_array_length(items)=lim then last_id:=(items->(lim-1)->>'id')::uuid;end if;return jsonb_build_object('contract_version','inbox.v1','operation','inbox.list','items',items,'next_id',last_id);end$$;
create function public.inbox_v1_get_thread(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;c public.inbox_conversations%rowtype;items jsonb;lim int;next_seq bigint;begin
 a:=public.inbox_v1_assert_actor(p_workspace_id);perform public.inbox_v1_validate('inbox.get_thread',p_input);
 select *into c from public.inbox_conversations where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for share;
 if not found or not public.inbox_v1_can_access(p_workspace_id,a,c.assigned_user_id)then return null;end if;
 lim:=coalesce((p_input->>'limit')::int,20);
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'seq',q.seq,'kind',q.kind,'body',q.body,'actor_user_id',q.actor_user_id,'created_at',q.created_at)order by q.seq),'[]'::jsonb)into items from(select m.*from public.inbox_messages m where m.workspace_id=p_workspace_id and m.conversation_id=c.id and m.seq>coalesce((p_input->>'after_seq')::bigint,0)order by m.seq limit lim)q;
 if jsonb_array_length(items)=lim then next_seq:=(items->(lim-1)->>'seq')::bigint;end if;
 return jsonb_build_object('contract_version','inbox.v1','operation','inbox.get_thread','conversation',public.inbox_v1_metadata(c,a),'messages',items,'next_seq',next_seq,'provider_status','not_configured');end$$;
create function public.inbox_v1_unread_summary(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;n bigint;begin
 a:=public.inbox_v1_assert_actor(p_workspace_id);perform public.inbox_v1_validate('inbox.unread_summary',p_input);
 select count(*)into n from public.inbox_conversations c left join public.inbox_read_markers r on r.workspace_id=c.workspace_id and r.conversation_id=c.id and r.user_id=a where c.workspace_id=p_workspace_id and c.status<>'archived'and public.inbox_v1_can_access(p_workspace_id,a,c.assigned_user_id)and(coalesce(r.marked_unread,false)or c.last_seq>coalesce(r.last_read_seq,0));
 return jsonb_build_object('contract_version','inbox.v1','operation','inbox.unread_summary','unread_count',n);end$$;
create function public.inbox_v1_conversation_create_internal(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.create_internal',p_input)$$;
revoke all on function public.inbox_v1_conversation_create_internal(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_create_internal(uuid,jsonb)to authenticated;
create function public.inbox_v1_message_add_internal_note(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'message.add_internal_note',p_input)$$;
revoke all on function public.inbox_v1_message_add_internal_note(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_message_add_internal_note(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_assign(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.assign',p_input)$$;
revoke all on function public.inbox_v1_conversation_assign(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_assign(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_link_customer(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.link_customer',p_input)$$;
revoke all on function public.inbox_v1_conversation_link_customer(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_link_customer(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_close(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.close',p_input)$$;
revoke all on function public.inbox_v1_conversation_close(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_close(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_reopen(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.reopen',p_input)$$;
revoke all on function public.inbox_v1_conversation_reopen(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_reopen(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_archive(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.archive',p_input)$$;
revoke all on function public.inbox_v1_conversation_archive(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_archive(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_restore(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.restore',p_input)$$;
revoke all on function public.inbox_v1_conversation_restore(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_restore(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_mark_read(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.mark_read',p_input)$$;
revoke all on function public.inbox_v1_conversation_mark_read(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_mark_read(uuid,jsonb)to authenticated;
create function public.inbox_v1_conversation_mark_unread(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.inbox_v1_command(p_workspace_id,'conversation.mark_unread',p_input)$$;
revoke all on function public.inbox_v1_conversation_mark_unread(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_conversation_mark_unread(uuid,jsonb)to authenticated;
revoke all on function public.inbox_v1_assert_actor(uuid)from public,anon,authenticated,service_role;
revoke all on function public.inbox_v1_can_access(uuid,uuid,uuid)from public,anon,authenticated,service_role;
revoke all on function public.inbox_v1_metadata(public.inbox_conversations,uuid)from public,anon,authenticated,service_role;
revoke all on function public.inbox_v1_validate(text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.inbox_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.inbox_v1_list(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_list(uuid,jsonb)to authenticated;
revoke all on function public.inbox_v1_get_thread(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_get_thread(uuid,jsonb)to authenticated;
revoke all on function public.inbox_v1_unread_summary(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.inbox_v1_unread_summary(uuid,jsonb)to authenticated;
commit;
