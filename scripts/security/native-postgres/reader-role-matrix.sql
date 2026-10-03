-- Actual calls under actual roles, fresh AND restored. Mutations rollback.
begin;
set local role anon;
do $$declare f record; calls integer:=0;
begin
 for f in select p.oid,n.nspname,p.proname,p.proargtypes from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'telecom_v1_%' and has_function_privilege('service_role',p.oid,'EXECUTE') loop
  if has_function_privilege(current_user,f.oid,'EXECUTE') then raise exception 'anon server RPC grant'; end if;
  begin
   execute format('select %I.%I(%s)',f.nspname,f.proname,(select string_agg('NULL::'||format_type(t,null),',') from unnest(f.proargtypes::oid[]) t));
   raise exception 'anon RPC executed';
  exception when insufficient_privilege then null; end;
  calls:=calls+1;
 end loop;
 if calls<>14 then raise exception 'incomplete anon reader matrix'; end if;
end$$;
reset role;
set local role authenticated;
do $$declare f record; calls integer:=0;
begin
 for f in select p.oid,n.nspname,p.proname,p.proargtypes from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'telecom_v1_%' and has_function_privilege('service_role',p.oid,'EXECUTE') loop
  if has_function_privilege(current_user,f.oid,'EXECUTE') then raise exception 'authenticated server RPC grant'; end if;
  begin
   execute format('select %I.%I(%s)',f.nspname,f.proname,(select string_agg('NULL::'||format_type(t,null),',') from unnest(f.proargtypes::oid[]) t));
   raise exception 'authenticated RPC executed';
  exception when insufficient_privilege then null; end;
  calls:=calls+1;
 end loop;
 if calls<>14 then raise exception 'incomplete authenticated reader matrix'; end if;
end$$;
reset role;
set local role service_role;
do $$begin
 if public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001') is null then raise exception 'scoped reader failed'; end if;
 if public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000002') is not null then raise exception 'foreign customer leaked'; end if;
 begin
  perform public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001');
  raise exception 'foreign actor accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000002');
  raise exception 'foreign workspace accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
update public.workspace_members set status='suspended' where user_id='a1000000-0000-4000-8000-000000000001';
set local role service_role;
do $$begin
 begin
  perform public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001');
  raise exception 'suspended membership accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
update public.workspace_members set status='active' where user_id='a1000000-0000-4000-8000-000000000001';
update public.workspaces set status='suspended' where id='b2000000-0000-4000-8000-000000000001';
set local role service_role;
do $$begin
 begin
  perform public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001');
  raise exception 'suspended workspace accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
update public.workspaces set status='active' where id='b2000000-0000-4000-8000-000000000001';
delete from public.workspace_members where user_id='a1000000-0000-4000-8000-000000000001';
set local role service_role;
do $$begin
 begin
  perform public.telecom_v1_customer_get_row('a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001');
  raise exception 'removed membership accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
rollback;
