-- Inject before the official domain fixture rollback, in disposable embedded DB only.
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare relation_name text; affected integer; denied boolean;
begin
 if current_setting('app.environment',true) is distinct from 'test' then raise exception 'test fixture only'; end if;
 foreach relation_name in array array['telecom_contracts','telecom_services','service_cases','documents'] loop
  execute format('update public.%I set id=id where workspace_id=$1',relation_name)
   using '20000000-0000-0000-0000-000000000001'::uuid;
  get diagnostics affected = row_count;
  if affected < 1 then raise exception 'missing synthetic trigger fixture: %',relation_name; end if;
  denied:=false;
  begin
   execute format('update public.%I set workspace_id=$1 where workspace_id=$2',relation_name)
    using '20000000-0000-0000-0000-000000000002'::uuid,'20000000-0000-0000-0000-000000000001'::uuid;
  exception when sqlstate '55000' or check_violation or foreign_key_violation then denied:=true;
  end;
  if not denied then raise exception 'scope rewrite accepted: %',relation_name; end if;
 end loop;
end$$;
