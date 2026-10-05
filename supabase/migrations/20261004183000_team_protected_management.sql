begin;
alter table public.workspace_members add column version bigint not null default 1 check(version>0 and version<1000000000000000);
alter table public.workspace_members drop constraint workspace_members_status_check;
alter table public.workspace_members add constraint workspace_members_status_check check(status in ('active','suspended','removed'));
create trigger workspace_members_product_version before update on public.workspace_members for each row execute function public.manage_task_version();
create table public.team_invite_intents(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),
 email text not null check(char_length(email) between 3 and 320 and email=lower(btrim(email)) and email!~'[[:cntrl:]]'),
 role text not null check(role in ('admin','member','viewer')),status text not null default 'pending' check(status in ('pending','cancelled')),
 version bigint not null default 1 check(version>0 and version<1000000000000000),created_by_user_id uuid not null references auth.users(id),
 created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 unique(id,workspace_id)
);
create unique index team_invite_pending_email_idx on public.team_invite_intents(workspace_id,email) where status='pending';
alter table public.team_invite_intents enable row level security;
alter table public.team_invite_intents force row level security;
revoke all on public.team_invite_intents from public,anon,authenticated,service_role;
create trigger team_invite_product_version before update on public.team_invite_intents for each row execute function public.manage_task_version();
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid) into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 if expr is null then raise exception 'published command registry absent';end if;
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check (('||expr||') or operation=any(array['||'''member.invite_intent'',''member.role_change'',''member.suspend'',''member.resume'',''member.remove'',''member.cancel_invite'''||']::text[]))';
end$$;
create function public.team_v1_assert_scope(p_workspace_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid;begin
 actor:=public.product_v1_assert_scope(p_workspace_id,false);
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=actor and status='active' and role in ('owner','admin'))then raise exception using errcode='42501',message='team_access_denied';end if;
 return actor;
end$$;
revoke all on function public.team_v1_assert_scope(uuid) from public,anon,authenticated,service_role;
create function public.team_v1_finish(p_workspace_id uuid,p_actor uuid,p_op text,p_input jsonb,p_id uuid,p_version bigint,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 result:=jsonb_build_object('contract_version','team.v1','operation',p_op,'command_id',p_input->>'command_id','id',p_id,'version',p_version,'status',p_status);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version) values(p_workspace_id,p_actor,(p_input->>'command_id')::uuid,p_op,p_id,p_version);
 update public.product_commands set receipt=result where workspace_id=p_workspace_id and actor_id=p_actor and command_id=(p_input->>'command_id')::uuid;
 return result;
end$$;
revoke all on function public.team_v1_finish(uuid,uuid,text,jsonb,uuid,bigint,text) from public,anon,authenticated,service_role;
create function public.team_v1_command(p_workspace_id uuid,p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;actor_role text;required text[];k text;v jsonb;prior jsonb;member public.workspace_members%rowtype;intent public.team_invite_intents%rowtype;new_status text;
begin
 actor:=public.team_v1_assert_scope(p_workspace_id);
 select role into actor_role from public.workspace_members where workspace_id=p_workspace_id and user_id=actor;
 if p_op not in ('member.invite_intent','member.role_change','member.suspend','member.resume','member.remove','member.cancel_invite') then raise exception using errcode='22023',message='team_invalid_input';end if;
 required:=case when p_op='member.invite_intent' then array['command_id','email','role'] when p_op='member.role_change' then array['command_id','id','expected_version','role'] else array['command_id','id','expected_version']end;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096 or (select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from (select array_agg(x order by x)from unnest(required)x) then raise exception using errcode='22023',message='team_invalid_input';end if;
 for k,v in select key,value from jsonb_each(p_input)loop
  if k in ('command_id','id')then
   if jsonb_typeof(v)<>'string' or p_input->>k !~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='team_invalid_input';end if;
  elsif k='expected_version'then
   if jsonb_typeof(v)<>'number' or p_input->>k !~'^[1-9][0-9]{0,14}$'then raise exception using errcode='22023',message='team_invalid_input';end if;
  elsif k='role'then
   if jsonb_typeof(v)<>'string' or p_input->>k not in ('admin','member','viewer')then raise exception using errcode='22023',message='team_invalid_input';end if;
   if p_input->>k='admin' and actor_role<>'owner'then raise exception using errcode='42501',message='team_access_denied';end if;
  elsif jsonb_typeof(v)<>'string' or char_length(p_input->>k)>320 or p_input->>k<>lower(btrim(p_input->>k)) or p_input->>k !~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or p_input->>k ~'[[:cntrl:]]'then raise exception using errcode='22023',message='team_invalid_input';end if;
 end loop;
 prior:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if prior is not null then return prior;end if;
 if p_op='member.invite_intent'then
  insert into public.team_invite_intents(workspace_id,email,role,created_by_user_id)values(p_workspace_id,p_input->>'email',p_input->>'role',actor)returning * into intent;
  return public.team_v1_finish(p_workspace_id,actor,p_op,p_input,intent.id,intent.version,intent.status);
 elsif p_op='member.cancel_invite'then
  select * into intent from public.team_invite_intents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='team_not_found';end if;
  if intent.role='admin' and actor_role<>'owner'then raise exception using errcode='42501',message='team_access_denied';end if;
  if intent.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='team_conflict';end if;
  if intent.status<>'pending'then raise exception using errcode='22023',message='team_invalid_transition';end if;
  update public.team_invite_intents set status='cancelled',updated_at=statement_timestamp()where id=intent.id returning * into intent;
  return public.team_v1_finish(p_workspace_id,actor,p_op,p_input,intent.id,intent.version,intent.status);
 end if;
 select * into member from public.workspace_members where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='team_not_found';end if;
 -- No owner mutation, self-demotion or self-revocation; admins cannot manage admins.
 if member.role='owner' or member.user_id=actor or member.role='admin' and actor_role<>'owner'then raise exception using errcode='42501',message='team_access_denied';end if;
 if member.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='team_conflict';end if;
 if member.status='removed'then raise exception using errcode='22023',message='team_invalid_transition';end if;
 if p_op='member.role_change'then
  if member.status<>'active' or member.role=p_input->>'role'then raise exception using errcode='22023',message='team_invalid_transition';end if;
  update public.workspace_members set role=p_input->>'role' where id=member.id returning * into member;
 else
  new_status:=case p_op when 'member.suspend'then 'suspended' when 'member.resume'then 'active' else 'removed'end;
  if (p_op='member.suspend' and member.status<>'active')or(p_op='member.resume' and member.status<>'suspended')then raise exception using errcode='22023',message='team_invalid_transition';end if;
  update public.workspace_members set status=new_status where id=member.id returning * into member;
 end if;
 return public.team_v1_finish(p_workspace_id,actor,p_op,p_input,member.id,member.version,member.status);
end$$;
revoke all on function public.team_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
create function public.team_v1_member_list(p_workspace_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare lim integer;rows jsonb;next_id uuid;begin
 perform public.team_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096 or exists(select 1 from jsonb_object_keys(p_input)x where x not in ('limit','after_id'))then raise exception using errcode='22023',message='team_invalid_input';end if;
 if p_input?'limit'and(jsonb_typeof(p_input->'limit')<>'number'or p_input->>'limit'!~'^[1-9][0-9]{0,2}$'or(p_input->>'limit')::integer>100)then raise exception using errcode='22023',message='team_invalid_input';end if;
 if p_input?'after_id'and(jsonb_typeof(p_input->'after_id')<>'string'or p_input->>'after_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then raise exception using errcode='22023',message='team_invalid_input';end if;
 lim:=coalesce((p_input->>'limit')::integer,20);
 select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(select id,user_id,role,status,version from public.workspace_members where workspace_id=p_workspace_id and(not p_input?'after_id'or id>(p_input->>'after_id')::uuid)order by id limit lim)x;
 next_id:=case when jsonb_array_length(rows)=lim then(rows->(lim-1)->>'id')::uuid else null end;
 return jsonb_build_object('contract_version','team.v1','operation','member.list','items',rows,'next_id',next_id);
end$$;
revoke all on function public.team_v1_member_list(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_list(uuid,jsonb)to authenticated;
create function public.team_v1_member_invite_intent(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.team_v1_command(p_workspace_id,'member.invite_intent',p_input)$$;
revoke all on function public.team_v1_member_invite_intent(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_invite_intent(uuid,jsonb)to authenticated;
create function public.team_v1_member_role_change(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.team_v1_command(p_workspace_id,'member.role_change',p_input)$$;
revoke all on function public.team_v1_member_role_change(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_role_change(uuid,jsonb)to authenticated;
create function public.team_v1_member_suspend(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.team_v1_command(p_workspace_id,'member.suspend',p_input)$$;
revoke all on function public.team_v1_member_suspend(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_suspend(uuid,jsonb)to authenticated;
create function public.team_v1_member_resume(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.team_v1_command(p_workspace_id,'member.resume',p_input)$$;
revoke all on function public.team_v1_member_resume(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_resume(uuid,jsonb)to authenticated;
create function public.team_v1_member_remove(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.team_v1_command(p_workspace_id,'member.remove',p_input)$$;
revoke all on function public.team_v1_member_remove(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_remove(uuid,jsonb)to authenticated;
create function public.team_v1_member_cancel_invite(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.team_v1_command(p_workspace_id,'member.cancel_invite',p_input)$$;
revoke all on function public.team_v1_member_cancel_invite(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_cancel_invite(uuid,jsonb)to authenticated;
commit;
