-- W4 independent attacks injected before telecom-server-read-rpc.sql rollback.
reset role;
do $$
declare denied boolean;
begin
  update public.workspace_members set status='suspended'
   where workspace_id='20000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000001';
  denied:=false;
  set local role service_role;
  begin perform public.telecom_v1_customer_get_row('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001');
  exception when sqlstate '42501' then denied:=true; end;
  reset role;
  if not denied then raise exception 'service role bypassed suspended membership'; end if;
  update public.workspace_members set status='active'
   where workspace_id='20000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000001';

  update public.workspaces set status='suspended' where id='20000000-0000-0000-0000-000000000001';
  denied:=false;
  set local role service_role;
  begin perform public.telecom_v1_customer_summary('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','scope-epoch-0001');
  exception when sqlstate '42501' then denied:=true; end;
  reset role;
  if not denied then raise exception 'service role bypassed suspended workspace'; end if;
  update public.workspaces set status='active' where id='20000000-0000-0000-0000-000000000001';
end$$;

set local role anon;
do $$declare denied boolean:=false; begin
  begin perform public.telecom_v1_customer_get_row('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'anonymous role executed server reader'; end if;
end$$;
reset role;
