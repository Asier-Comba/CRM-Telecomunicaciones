begin;
create table public.notification_centers(workspace_id uuid not null references public.workspaces(id),user_id uuid not null references auth.users(id),version bigint not null default 0 check(version>=0 and version<1000000000000000),primary key(workspace_id,user_id));
create table public.internal_notifications(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),recipient_user_id uuid not null references auth.users(id),
 kind text not null check(kind in('task_overdue','customer_created')),target_kind text not null check(target_kind in('task','customer')),target_id uuid not null,
 source_key text not null check(length(source_key)between 1 and 200),created_at timestamptz not null default statement_timestamp(),read_at timestamptz,
 unique(workspace_id,recipient_user_id,kind,source_key),check((kind='task_overdue'and target_kind='task')or(kind='customer_created'and target_kind='customer'))
);
create index internal_notifications_recipient on public.internal_notifications(workspace_id,recipient_user_id,id);
alter table public.notification_centers enable row level security;alter table public.notification_centers force row level security;
alter table public.internal_notifications enable row level security;alter table public.internal_notifications force row level security;
revoke all on public.notification_centers,public.internal_notifications from public,anon,authenticated,service_role;
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''notification.refresh'',''notification.mark_read'',''notification.mark_all_read''))';end$$;
create function public.notification_v1_target_access(w uuid,a uuid,k text,p_target_id uuid)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from public.workspace_members m where m.workspace_id=w and m.user_id=a and m.status='active'and m.role in('owner','admin','member')and
 case k when 'task'then exists(select 1 from public.tasks t where t.workspace_id=w and t.id=p_target_id and (m.role in('owner','admin')or t.assigned_user_id=a))
 when 'customer'then exists(select 1 from public.customers c where c.workspace_id=w and c.id=p_target_id and c.status='active')else false end)
$$;
create function public.notification_v1_validate(op text,inp jsonb)returns void language plpgsql set search_path=''as $$declare required text[];optional text[]:=array[]::text[];k text;v jsonb;begin
 required:=case when op='notification.mark_read'then array['command_id','id','expected_version']when op in('notification.refresh','notification.mark_all_read')then array['command_id','expected_version']when op in('notification.list','notification.unread_count')then array[]::text[]else null end;
 if op='notification.list'then optional:=array['limit','after_id'];end if;
 if required is null or inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or exists(select 1 from unnest(required)x where not inp?x)or exists(select 1 from jsonb_object_keys(inp)x where not x=any(required||optional))then raise exception using errcode='22023',message='notification_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop
  if k in('command_id','id','after_id')then if jsonb_typeof(v)is distinct from 'string'or inp->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='notification_invalid_input';end if;
  elsif k='expected_version'then if jsonb_typeof(v)is distinct from 'number'or inp->>k!~'^(0|[1-9][0-9]{0,14})$'then raise exception using errcode='22023',message='notification_invalid_input';end if;
  elsif k='limit'then if jsonb_typeof(v)is distinct from 'number'or inp->>k!~'^[1-9][0-9]{0,2}$'or(inp->>k)::int>100 then raise exception using errcode='22023',message='notification_invalid_input';end if;end if;
 end loop;end$$;
-- Private adapter for registered internal actions. Never an authenticated arbitrary-recipient RPC.
create function public.notification_v1_emit(w uuid,u uuid,k text,target uuid,source text)returns uuid language plpgsql security definer set search_path=''as $$declare v_notification_id uuid;target_kind text;begin
 target_kind:=case k when 'task_overdue'then 'task'when 'customer_created'then 'customer'else null end;
 if target_kind is null or not public.notification_v1_target_access(w,u,target_kind,target)then raise exception using errcode='42501',message='notification_recipient_denied';end if;
 insert into public.notification_centers(workspace_id,user_id)values(w,u)on conflict do nothing;
 perform 1 from public.notification_centers where workspace_id=w and user_id=u for update;
 insert into public.internal_notifications(workspace_id,recipient_user_id,kind,target_kind,target_id,source_key)values(w,u,k,target_kind,target,source)on conflict(workspace_id,recipient_user_id,kind,source_key)do nothing returning internal_notifications.id into v_notification_id;
 if v_notification_id is not null then update public.notification_centers set version=version+1 where workspace_id=w and user_id=u;else select n.id into v_notification_id from public.internal_notifications n where workspace_id=w and recipient_user_id=u and kind=k and source_key=source;end if;return v_notification_id;end$$;
create function public.notification_v1_command(w uuid,op text,inp jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;v bigint;prior jsonb;affected int:=0;t record;v_notification_id uuid;has_more boolean:=false;begin
 a:=public.product_v1_assert_scope(w,true);perform public.notification_v1_validate(op,inp);
 prior:=public.product_v1_begin_command(w,a,op,inp);if prior is not null then return prior;end if;
 insert into public.notification_centers(workspace_id,user_id)values(w,a)on conflict do nothing;
 select version into v from public.notification_centers where workspace_id=w and user_id=a for update;
 if v<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='notification_conflict';end if;
 if op='notification.refresh'then
  for t in select x.id,x.due_at from public.tasks x where x.workspace_id=w and x.assigned_user_id=a and x.status in('pending','in_progress')and x.due_at<statement_timestamp()
   and not exists(select 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.kind='task_overdue'and n.source_key=x.id::text||':'||extract(epoch from x.due_at)::text)
   order by x.id limit 100 for share loop
   perform public.notification_v1_emit(w,a,'task_overdue',t.id,t.id::text||':'||extract(epoch from t.due_at)::text);affected:=affected+1;
  end loop;
 elsif op='notification.mark_read'then
  v_notification_id:=(inp->>'id')::uuid;
  perform 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.id=v_notification_id and public.notification_v1_target_access(w,a,n.target_kind,n.target_id)for update;
  if not found then raise exception using errcode='P0002',message='notification_not_found';end if;
  update public.internal_notifications set read_at=coalesce(read_at,statement_timestamp())where internal_notifications.id=v_notification_id;get diagnostics affected=row_count;
 elsif op='notification.mark_all_read'then
  -- Bounded logical batch. Repeat using the returned center version if >100 remain.
  update public.internal_notifications set read_at=statement_timestamp()where internal_notifications.id in(select n.id from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.read_at is null and public.notification_v1_target_access(w,a,n.target_kind,n.target_id)order by n.id limit 100);get diagnostics affected=row_count;
 else raise exception using errcode='22023',message='notification_invalid_input';end if;
 if op='notification.mark_all_read'then select exists(select 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.read_at is null and public.notification_v1_target_access(w,a,n.target_kind,n.target_id))into has_more;
 elsif op='notification.refresh'then select exists(select 1 from public.tasks x where x.workspace_id=w and x.assigned_user_id=a and x.status in('pending','in_progress')and x.due_at<statement_timestamp()and not exists(select 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.kind='task_overdue'and n.source_key=x.id::text||':'||extract(epoch from x.due_at)::text))into has_more;end if;
 -- Refresh emits can increment center multiple times; one command receipt uses the final authoritative center version.
 update public.notification_centers set version=version+1 where workspace_id=w and user_id=a returning version into v;
 prior:=jsonb_build_object('contract_version','notifications.v1','operation',op,'command_id',inp->>'command_id','version',v,'affected',affected,'has_more',has_more);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(w,a,(inp->>'command_id')::uuid,op,a,v);
 update public.product_commands set receipt=prior where workspace_id=w and actor_id=a and command_id=(inp->>'command_id')::uuid;return prior;end$$;
create function public.notification_v1_list(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;v bigint;items jsonb;lim int;next_id uuid;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.notification_v1_validate('notification.list',p_input);lim:=coalesce((p_input->>'limit')::int,20);
 select version into v from public.notification_centers where workspace_id=p_workspace_id and user_id=a for share;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'title',case q.kind when 'task_overdue'then 'Tarea vencida'else 'Nuevo cliente'end,'summary','Revise el registro autorizado.','target',jsonb_build_object('kind',q.target_kind,'id',q.target_id),'created_at',q.created_at,'read_at',q.read_at)order by q.id),'[]'::jsonb)into items from(select n.*from public.internal_notifications n where n.workspace_id=p_workspace_id and n.recipient_user_id=a and public.notification_v1_target_access(p_workspace_id,a,n.target_kind,n.target_id)and(not p_input?'after_id'or n.id>(p_input->>'after_id')::uuid)order by n.id limit lim)q;
 if jsonb_array_length(items)=lim then next_id:=(items->(lim-1)->>'id')::uuid;end if;return jsonb_build_object('contract_version','notifications.v1','operation','notification.list','version',coalesce(v,0),'items',items,'next_id',next_id);end$$;
create function public.notification_v1_unread_count(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;v bigint;n bigint;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.notification_v1_validate('notification.unread_count',p_input);
 select version into v from public.notification_centers where workspace_id=p_workspace_id and user_id=a for share;
 select count(*)into n from public.internal_notifications q where q.workspace_id=p_workspace_id and q.recipient_user_id=a and q.read_at is null and public.notification_v1_target_access(p_workspace_id,a,q.target_kind,q.target_id);
 return jsonb_build_object('contract_version','notifications.v1','operation','notification.unread_count','version',coalesce(v,0),'unread_count',n);end$$;
create function public.notification_v1_refresh(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.notification_v1_command(p_workspace_id,'notification.refresh',p_input)$$;
create function public.notification_v1_mark_read(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.notification_v1_command(p_workspace_id,'notification.mark_read',p_input)$$;
create function public.notification_v1_mark_all_read(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.notification_v1_command(p_workspace_id,'notification.mark_all_read',p_input)$$;
revoke all on function public.notification_v1_target_access(uuid,uuid,text,uuid),public.notification_v1_validate(text,jsonb),public.notification_v1_emit(uuid,uuid,text,uuid,text),public.notification_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.notification_v1_list(uuid,jsonb),public.notification_v1_unread_count(uuid,jsonb),public.notification_v1_refresh(uuid,jsonb),public.notification_v1_mark_read(uuid,jsonb),public.notification_v1_mark_all_read(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.notification_v1_list(uuid,jsonb),public.notification_v1_unread_count(uuid,jsonb),public.notification_v1_refresh(uuid,jsonb),public.notification_v1_mark_read(uuid,jsonb),public.notification_v1_mark_all_read(uuid,jsonb)to authenticated;
commit;
