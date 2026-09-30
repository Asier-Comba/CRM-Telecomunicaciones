-- Vulnerability MODEL, not a native pg_restore execution or acceptance test.
-- Inject after the product durable fixture/seed, before its rollback.
reset role;
do $$begin
 if has_function_privilege('anon','public.telecom_v1_customer_get_row(uuid,uuid,uuid)','EXECUTE') then
  raise exception 'pristine migration grants already unsafe';
 end if;
end$$;
-- Model the default PUBLIC function EXECUTE left when pg_restore --no-acl
-- omits the migration-authored REVOKE. Never use this on a deployed database.
grant execute on function public.telecom_v1_customer_get_row(uuid,uuid,uuid) to public;
set role anon;
select set_config('request.jwt.claim.sub','',false);
do $$begin
 if public.telecom_v1_customer_get_row(
   'a1000000-0000-4000-8000-000000000001',
   'b2000000-0000-4000-8000-000000000001',
   'd4000000-0000-4000-8000-000000000001') is null then
  raise exception 'ACL-loss model did not reproduce actor impersonation';
 end if;
end$$;
reset role;
