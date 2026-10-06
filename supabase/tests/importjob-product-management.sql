-- Synthetic exact money, actual roles, numbering/snapshots and audit rollback.
begin;
insert into auth.users(id,email) values ('81000000-0000-4000-8000-000000000001','billing-owner@example.invalid'),('81000000-0000-4000-8000-000000000002','billing-member@example.invalid');
insert into public.workspaces(id,name,slug) values ('82000000-0000-4000-8000-000000000001','Billing Synthetic','billing-synthetic'),('82000000-0000-4000-8000-000000000002','Billing Foreign','billing-foreign');
insert into public.workspace_members(workspace_id,user_id,role) values ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','owner'),('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','member');
insert into public.customers(id,workspace_id,account_kind,legal_name) values ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','legal_entity','Billing Synthetic'),('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','legal_entity','Foreign Synthetic');
create function pg_temp.assert_b(ok boolean) returns void language plpgsql as $$begin if ok is not true then raise exception 'importjob assertion';end if;end$$;
create function pg_temp.deny_b(q text,c text) returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'expected importjob denial %',c;end$$;
create function pg_temp.billing_counts() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_array((select count(*) from public.billing_invoices),(select count(*) from public.billing_invoice_lines),(select count(*) from public.billing_series),(select count(*) from public.product_commands),(select count(*) from public.product_audit_events))
$$;
insert into public.import_jobs(id,workspace_id,import_kind,source_file_ref_id,source_file_digest_hmac,digest_key_version,mapping_schema_version,idempotency_key_id,created_by_user_id)values
('86000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','customers',gen_random_uuid(),repeat('a',64),1,1,gen_random_uuid(),'81000000-0000-4000-8000-000000000001'),
('86000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','customers',gen_random_uuid(),repeat('b',64),1,1,gen_random_uuid(),'81000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
do $$declare w uuid:='82000000-0000-4000-8000-000000000001';id uuid:='86000000-0000-4000-8000-000000000001';inp jsonb;r jsonb;begin
 r:=public.importjob_v1_get(w,jsonb_build_object('id',id));perform pg_temp.assert_b(r->'record'->>'processing_status'='blocked_encrypted_staging_adapter'and not(r->'record')?'source_file_ref_id'and not(r->'record')?'source_file_digest_hmac');
 r:=public.importjob_v1_list(w,'{"limit":1}');perform pg_temp.assert_b(jsonb_array_length(r->'items')=1 and r->>'next_id'=id::text);
 r:=public.importjob_v1_list(w,jsonb_build_object('limit',1,'after_id',id));perform pg_temp.assert_b(r->'items'->0->>'id'='86000000-0000-4000-8000-000000000002');
 perform pg_temp.assert_b(public.importjob_v1_get(w,'{"id":"83000000-0000-4000-8000-000000000002"}')is null);
 inp:=jsonb_build_object('command_id',gen_random_uuid(),'id',id,'expected_version',1);r:=public.importjob_v1_cancel(w,inp);
 perform pg_temp.assert_b(r->>'version'='2'and r->>'status'='cancelled'and r=public.importjob_v1_cancel(w,inp));
 perform pg_temp.deny_b(format('select public.importjob_v1_cancel(%L,%L)',w,(inp||'{"expected_version":2}')::text),'40001');
 perform pg_temp.deny_b(format('select public.importjob_v1_cancel(%L,%L)',w,(inp||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',2))::text),'22023');
 perform pg_temp.deny_b(format('select public.importjob_v1_list(%L,%L)',w,'{"limit":101}'),'22023');
 perform pg_temp.deny_b(format('select public.importjob_v1_get(%L,%L)',w,'{"id":"86000000-0000-4000-8000-000000000001","payload":{}}'),'22023');
end$$;
reset role;
create function pg_temp.fail_importjob_audit()returns trigger language plpgsql as $$begin raise exception 'Synthetic importjob cutpoint';end$$;
create trigger importjob_test_audit before insert on public.product_audit_events for each row execute function pg_temp.fail_importjob_audit();
set local role authenticated;
select pg_temp.deny_b(format('select public.importjob_v1_cancel(%L,%L)','82000000-0000-4000-8000-000000000001',jsonb_build_object('command_id',gen_random_uuid(),'id','86000000-0000-4000-8000-000000000002','expected_version',1)::text),'P0001');
reset role;
select pg_temp.assert_b((select status='uploaded'and version=1 from public.import_jobs where id='86000000-0000-4000-8000-000000000002'));
drop trigger importjob_test_audit on public.product_audit_events;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
select pg_temp.deny_b('select public.importjob_v1_list(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
update public.workspace_members set status='suspended'where user_id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
select pg_temp.deny_b('select public.importjob_v1_get(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
set local role anon;
select pg_temp.deny_b('select public.importjob_v1_list(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
set local role service_role;
select pg_temp.deny_b('select public.importjob_v1_list(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
rollback;
