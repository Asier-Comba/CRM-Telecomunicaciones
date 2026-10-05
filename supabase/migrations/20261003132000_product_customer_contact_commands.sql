-- Normal human application commands. auth.uid() is the actor; no service-role path.
-- Existing telecom.v1 and assistant grants/signatures are untouched.
begin;

alter table public.customers add column version bigint not null default 1 check (version > 0);
alter table public.contacts add column version bigint not null default 1 check (version > 0);
create trigger customers_manage_version before insert or update on public.customers
 for each row execute function public.manage_task_version();
create trigger contacts_manage_version before insert or update on public.contacts
 for each row execute function public.manage_task_version();
create trigger customers_protect_identity before update on public.customers
 for each row execute function public.protect_operational_identity();
create trigger contacts_protect_identity before update on public.contacts
 for each row execute function public.protect_operational_identity();

-- A DB-private keyed digest avoids persisting low-entropy contact PII hashes.
create table public.product_command_key (
 singleton boolean primary key default true check (singleton),
 key_bytes bytea not null check (octet_length(key_bytes) = 32)
);
insert into public.product_command_key(key_bytes) values(extensions.gen_random_bytes(32));
alter table public.product_command_key enable row level security;
alter table public.product_command_key force row level security;
revoke all on public.product_command_key from public, anon, authenticated, service_role;

create table public.product_commands (
 workspace_id uuid not null references public.workspaces(id),
 actor_id uuid not null references auth.users(id),
 command_id uuid not null,
 operation text not null check (operation in (
  'customer.create','customer.update','customer.archive','customer.restore',
  'contact.create','contact.update','contact.archive','contact.restore')),
 input_mac bytea not null check (octet_length(input_mac) = 32),
 receipt jsonb,
 created_at timestamptz not null default statement_timestamp(),
 primary key (workspace_id, actor_id, command_id)
);
alter table public.product_commands enable row level security;
alter table public.product_commands force row level security;
revoke all on public.product_commands from public, anon, authenticated, service_role;

create table public.product_audit_events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 actor_id uuid not null,
 command_id uuid not null,
 operation text not null,
 entity_id uuid not null,
 entity_version bigint not null check(entity_version > 0),
 occurred_at timestamptz not null default statement_timestamp(),
 foreign key(workspace_id,actor_id,command_id)
  references public.product_commands(workspace_id,actor_id,command_id),
 unique(workspace_id,actor_id,command_id)
);
alter table public.product_audit_events enable row level security;
alter table public.product_audit_events force row level security;
revoke all on public.product_audit_events from public, anon, authenticated, service_role;
create trigger product_audit_append_only before update or delete on public.product_audit_events
 for each row execute function public.reject_activity_mutation();

create function public.product_v1_assert_scope(p_workspace_id uuid, p_write boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); member_role text;
begin
 if actor is null or p_workspace_id is null then
  raise exception using errcode='42501', message='product_access_denied';
 end if;
 -- Hold authorization rows until commit, including idempotent replays.
 select wm.role into member_role from public.workspace_members wm
 join public.workspaces w on w.id=wm.workspace_id
 where wm.workspace_id=p_workspace_id and wm.user_id=actor
 and wm.status='active' and w.status='active'
 for share of wm,w;
 if not found or (p_write and member_role not in ('owner','admin')) then
  raise exception using errcode='42501', message='product_access_denied';
 end if;
 return actor;
end;
$$;
revoke all on function public.product_v1_assert_scope(uuid,boolean) from public,anon,authenticated,service_role;

create function public.product_v1_validate_input(p_input jsonb, p_required text[], p_optional text[])
returns void language plpgsql set search_path = '' as $$
declare k text; v jsonb; s text;
begin
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192
 or exists(select 1 from jsonb_object_keys(p_input) x where not x=any(p_required||p_optional))
 or exists(select 1 from unnest(p_required) x where not p_input ? x or p_input->x='null'::jsonb) then
  raise exception using errcode='22023',message='product_invalid_input';
 end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  if v='null'::jsonb then
   if not k=any(array['trade_name','assigned_user_id','job_title','email','phone']) then
    raise exception using errcode='22023',message='product_invalid_input';
   end if;
   continue;
  end if;
  s:=p_input->>k;
  if k in ('command_id','id','customer_id','assigned_user_id') then
   if jsonb_typeof(v)<>'string' or s !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using errcode='22023',message='product_invalid_input';
   end if;
  elsif k='expected_version' then
   if jsonb_typeof(v)<>'number' or s !~ '^[1-9][0-9]{0,14}$' then
    raise exception using errcode='22023',message='product_invalid_input';
   end if;
  elsif k='is_primary' then
   if jsonb_typeof(v)<>'boolean' then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k='account_kind' then
   if jsonb_typeof(v)<>'string' or s not in ('legal_entity','sole_trader') then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k='lifecycle' then
   if jsonb_typeof(v)<>'string' or s not in ('lead','prospect','customer','former_customer') then raise exception using errcode='22023',message='product_invalid_input'; end if;
  else
   if jsonb_typeof(v)<>'string' or char_length(btrim(s))<1 or s ~ '[[:cntrl:]]'
    or char_length(s)>(case when k='email' then 320 when k='phone' then 40 when k in ('display_name','job_title') then 160 else 200 end)
    or (k='email' and s !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (k='phone' and char_length(s)<3) then
    raise exception using errcode='22023',message='product_invalid_input';
   end if;
  end if;
 end loop;
end;
$$;
revoke all on function public.product_v1_validate_input(jsonb,text[],text[]) from public,anon,authenticated,service_role;

create function public.product_v1_begin_command(p_workspace_id uuid,p_actor uuid,p_operation text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare mac bytea; prior public.product_commands%rowtype; key bytea;
begin
 select key_bytes into key from public.product_command_key where singleton;
 mac:=extensions.hmac(convert_to(p_operation||':'||p_input::text,'UTF8'),key,'sha256');
 -- A duplicate waits for the entire transaction then sees the committed receipt.
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_actor::text||':'||(p_input->>'command_id'),0));
 select workspace_id,actor_id,command_id,operation,input_mac,receipt,created_at
 into prior from public.product_commands
 where workspace_id=p_workspace_id and actor_id=p_actor and command_id=(p_input->>'command_id')::uuid;
 if found then
  if prior.operation<>p_operation or prior.input_mac<>mac then
   raise exception using errcode='40001',message='product_conflict';
  end if;
  if prior.receipt is null then raise exception using errcode='55000',message='product_incomplete_command'; end if;
  return prior.receipt;
 end if;
 insert into public.product_commands(workspace_id,actor_id,command_id,operation,input_mac)
 values(p_workspace_id,p_actor,(p_input->>'command_id')::uuid,p_operation,mac);
 return null;
end;
$$;
revoke all on function public.product_v1_begin_command(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;

create function public.product_v1_finish_command(p_workspace_id uuid,p_actor uuid,p_operation text,
 p_input jsonb,p_entity uuid,p_version bigint,p_status text,p_customer uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 result:=jsonb_build_object('contract_version','product.v1','command_id',p_input->>'command_id',
  'operation',p_operation,'id',p_entity,'version',p_version,'status',p_status);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)
 values(p_workspace_id,p_actor,(p_input->>'command_id')::uuid,p_operation,p_entity,p_version);
 -- Existing telecom.v1 renderer remains compatible. Detailed closed operation
 -- identity is retained separately in the business audit, without PII blobs.
 insert into public.activities(workspace_id,customer_id,activity_kind,summary_code,actor_user_id,created_by_user_id)
 values(p_workspace_id,p_customer,
  case when p_operation like '%.create' then 'created' else 'updated' end,
  case when p_operation like '%.create' then 'entity.created' else 'entity.updated' end,p_actor,p_actor);
 update public.product_commands set receipt=result
 where workspace_id=p_workspace_id and actor_id=p_actor and command_id=(p_input->>'command_id')::uuid;
 return result;
end;
$$;
revoke all on function public.product_v1_finish_command(uuid,uuid,text,jsonb,uuid,bigint,text,uuid) from public,anon,authenticated,service_role;

create function public.product_v1_customer_create(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','account_kind','legal_name']::text[],array['trade_name','lifecycle','assigned_user_id']::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'customer.create',p_input);
 if replay is not null then return replay; end if;
 insert into public.customers(workspace_id,created_by_user_id,account_kind,legal_name,trade_name,lifecycle,assigned_user_id)
 values(p_workspace_id,actor,p_input->>'account_kind',btrim(p_input->>'legal_name'),btrim(p_input->>'trade_name'),coalesce(p_input->>'lifecycle','prospect'),(p_input->>'assigned_user_id')::uuid) returning id,version,status into entity_id,entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'customer.create',p_input,entity_id,entity_version,entity_status,entity_id);
end;
$$;
revoke all on function public.product_v1_customer_create(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_customer_create(uuid,jsonb) to authenticated;

create function public.product_v1_customer_update(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','id','expected_version']::text[],array['account_kind','legal_name','trade_name','lifecycle','assigned_user_id']::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'customer.update',p_input);
 if replay is not null then return replay; end if;
 select id,version,status,source into entity_id,entity_version,entity_status,entity_source
 from public.customers where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 if entity_version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if entity_source<>'manual' then raise exception using errcode='42501',message='product_provenance_controlled'; end if;
 if entity_status='archived' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
 update public.customers set account_kind=case when p_input ? 'account_kind' then btrim(p_input->>'account_kind') else account_kind end,
 legal_name=case when p_input ? 'legal_name' then btrim(p_input->>'legal_name') else legal_name end,
 trade_name=case when p_input ? 'trade_name' then btrim(p_input->>'trade_name') else trade_name end,
 lifecycle=case when p_input ? 'lifecycle' then btrim(p_input->>'lifecycle') else lifecycle end,
 assigned_user_id=case when p_input ? 'assigned_user_id' then (p_input->>'assigned_user_id')::uuid else assigned_user_id end where id=entity_id and workspace_id=p_workspace_id returning version,status into entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'customer.update',p_input,entity_id,entity_version,entity_status,entity_id);
end;
$$;
revoke all on function public.product_v1_customer_update(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_customer_update(uuid,jsonb) to authenticated;

create function public.product_v1_customer_archive(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','id','expected_version']::text[],array[]::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'customer.archive',p_input);
 if replay is not null then return replay; end if;
 select id,version,status,source into entity_id,entity_version,entity_status,entity_source
 from public.customers where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 if entity_version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if entity_source<>'manual' then raise exception using errcode='42501',message='product_provenance_controlled'; end if;
 if entity_status='archived' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
 update public.customers set status='archived',archived_at=clock_timestamp(),archived_by_user_id=actor where id=entity_id and workspace_id=p_workspace_id returning version,status into entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'customer.archive',p_input,entity_id,entity_version,entity_status,entity_id);
end;
$$;
revoke all on function public.product_v1_customer_archive(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_customer_archive(uuid,jsonb) to authenticated;

create function public.product_v1_customer_restore(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','id','expected_version']::text[],array[]::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'customer.restore',p_input);
 if replay is not null then return replay; end if;
 select id,version,status,source into entity_id,entity_version,entity_status,entity_source
 from public.customers where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 if entity_version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if entity_source<>'manual' then raise exception using errcode='42501',message='product_provenance_controlled'; end if;
 if entity_status<>'archived' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
 update public.customers set status='active',archived_at=null,archived_by_user_id=null where id=entity_id and workspace_id=p_workspace_id returning version,status into entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'customer.restore',p_input,entity_id,entity_version,entity_status,entity_id);
end;
$$;
revoke all on function public.product_v1_customer_restore(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_customer_restore(uuid,jsonb) to authenticated;

create function public.product_v1_contact_create(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','customer_id','display_name']::text[],array['job_title','email','phone','is_primary']::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'contact.create',p_input);
 if replay is not null then return replay; end if;
 customer_ref:=(p_input->>'customer_id')::uuid;
 select status into parent_status from public.customers where id=customer_ref and workspace_id=p_workspace_id for update;
 if not found or parent_status<>'active' then raise exception using errcode='P0002',message='product_not_found'; end if;
 if p_input->>'is_primary'='true' then
 update public.contacts set is_primary=false where workspace_id=p_workspace_id and customer_id=customer_ref and is_primary and (id is distinct from entity_id);
 end if;
 insert into public.contacts(workspace_id,created_by_user_id,customer_id,display_name,job_title,email,phone,is_primary)
 values(p_workspace_id,actor,customer_ref,btrim(p_input->>'display_name'),btrim(p_input->>'job_title'),btrim(p_input->>'email'),btrim(p_input->>'phone'),coalesce((p_input->>'is_primary')::boolean,false)) returning id,version,status into entity_id,entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'contact.create',p_input,entity_id,entity_version,entity_status,customer_ref);
end;
$$;
revoke all on function public.product_v1_contact_create(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_contact_create(uuid,jsonb) to authenticated;

create function public.product_v1_contact_update(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','id','expected_version']::text[],array['display_name','job_title','email','phone','is_primary']::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'contact.update',p_input);
 if replay is not null then return replay; end if;
 select customer_id into customer_ref from public.contacts where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;
 select status into parent_status from public.customers where id=customer_ref and workspace_id=p_workspace_id for update;
 if not found or parent_status<>'active' then raise exception using errcode='P0002',message='product_not_found'; end if;
 select id,version,status into entity_id,entity_version,entity_status
 from public.contacts where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 if entity_version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if entity_status='archived' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
 if p_input->>'is_primary'='true' then
 update public.contacts set is_primary=false where workspace_id=p_workspace_id and customer_id=customer_ref and is_primary and (id is distinct from entity_id);
 end if;
 update public.contacts set display_name=case when p_input ? 'display_name' then btrim(p_input->>'display_name') else display_name end,
 job_title=case when p_input ? 'job_title' then btrim(p_input->>'job_title') else job_title end,
 email=case when p_input ? 'email' then btrim(p_input->>'email') else email end,
 phone=case when p_input ? 'phone' then btrim(p_input->>'phone') else phone end,
 is_primary=case when p_input ? 'is_primary' then (p_input->>'is_primary')::boolean else is_primary end where id=entity_id and workspace_id=p_workspace_id returning version,status into entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'contact.update',p_input,entity_id,entity_version,entity_status,customer_ref);
end;
$$;
revoke all on function public.product_v1_contact_update(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_contact_update(uuid,jsonb) to authenticated;

create function public.product_v1_contact_archive(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','id','expected_version']::text[],array[]::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'contact.archive',p_input);
 if replay is not null then return replay; end if;
 select customer_id into customer_ref from public.contacts where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;
 select status into parent_status from public.customers where id=customer_ref and workspace_id=p_workspace_id for update;
 if not found or parent_status<>'active' then raise exception using errcode='P0002',message='product_not_found'; end if;
 select id,version,status into entity_id,entity_version,entity_status
 from public.contacts where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 if entity_version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if entity_status='archived' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
 update public.contacts set status='archived',archived_at=clock_timestamp(),archived_by_user_id=actor,is_primary=false where id=entity_id and workspace_id=p_workspace_id returning version,status into entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'contact.archive',p_input,entity_id,entity_version,entity_status,customer_ref);
end;
$$;
revoke all on function public.product_v1_contact_archive(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_contact_archive(uuid,jsonb) to authenticated;

create function public.product_v1_contact_restore(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; replay jsonb; entity_id uuid; entity_version bigint; entity_status text;
 customer_ref uuid; parent_status text; entity_source text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id);
 perform public.product_v1_validate_input(p_input,array['command_id','id','expected_version']::text[],array[]::text[]);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,'contact.restore',p_input);
 if replay is not null then return replay; end if;
 select customer_id into customer_ref from public.contacts where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;
 select status into parent_status from public.customers where id=customer_ref and workspace_id=p_workspace_id for update;
 if not found or parent_status<>'active' then raise exception using errcode='P0002',message='product_not_found'; end if;
 select id,version,status into entity_id,entity_version,entity_status
 from public.contacts where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 if entity_version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if entity_status<>'archived' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
 update public.contacts set status='active',archived_at=null,archived_by_user_id=null where id=entity_id and workspace_id=p_workspace_id returning version,status into entity_version,entity_status;
 return public.product_v1_finish_command(p_workspace_id,actor,'contact.restore',p_input,entity_id,entity_version,entity_status,customer_ref);
end;
$$;
revoke all on function public.product_v1_contact_restore(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_contact_restore(uuid,jsonb) to authenticated;

commit;
