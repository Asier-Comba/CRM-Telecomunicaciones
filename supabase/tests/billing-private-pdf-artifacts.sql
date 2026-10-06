-- Synthetic exact money, actual roles, numbering/snapshots and audit rollback.
begin;
insert into auth.users(id,email) values ('81000000-0000-4000-8000-000000000001','billing-owner@example.invalid'),('81000000-0000-4000-8000-000000000002','billing-member@example.invalid');
insert into public.workspaces(id,name,slug) values ('82000000-0000-4000-8000-000000000001','Billing Synthetic','billing-synthetic'),('82000000-0000-4000-8000-000000000002','Billing Foreign','billing-foreign');
insert into public.workspace_members(workspace_id,user_id,role) values ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','owner'),('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','member');
insert into public.customers(id,workspace_id,account_kind,legal_name) values ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','legal_entity','Billing Synthetic'),('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','legal_entity','Foreign Synthetic');
create function pg_temp.assert_b(ok boolean) returns void language plpgsql as $$begin if ok is not true then raise exception 'billing assertion';end if;end$$;
create function pg_temp.deny_b(q text,c text) returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'expected billing denial %',c;end$$;
create function pg_temp.billing_counts() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_array((select count(*) from public.billing_invoices),(select count(*) from public.billing_invoice_lines),(select count(*) from public.billing_series),(select count(*) from public.product_commands),(select count(*) from public.product_audit_events))
$$;
create temp table billing_fixture(id uuid,version bigint,input jsonb,receipt jsonb);
grant all on billing_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
do $$declare w uuid:='82000000-0000-4000-8000-000000000001';c uuid:='83000000-0000-4000-8000-000000000001';p jsonb;r jsonb;id uuid;begin
 p:='{"legal_name":"Synthetic Fiscal","tax_id":"SYNTHETIC-NOT-VALID","address":"Synthetic Road 1","postal_code":"00000","city":"Synthetic","region":"Synthetic","country":"ES"}';
 perform public.billing_v1_issuer_set(w,jsonb_build_object('command_id',gen_random_uuid(),'expected_version',0,'profile',p,'currency','EUR','default_series','P'));
 perform public.billing_v1_customer_fiscal_set(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c,'expected_version',0,'profile',p));
 r:=public.billing_v1_invoice_create_draft(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c,'issue_on','2026-10-05','due_on',null,'series','P','currency','EUR','lines','[{"description":"Synthetic PDF","quantity_milli":1000,"unit_price_minor":100,"discount_bps":0,"tax_bps":0,"withholding_bps":0}]'::jsonb));id:=(r->>'id')::uuid;
 perform public.billing_v1_invoice_issue(w,jsonb_build_object('command_id',gen_random_uuid(),'id',id,'expected_version',1));
 insert into billing_fixture values(id,2,jsonb_build_object('command_id',gen_random_uuid(),'id',id,'expected_version',2,'expected_artifact_version',0),null);
end$$;
reset role;
select pg_temp.assert_b((select status='pending'from public.billing_private_pdf_jobs where invoice_id=(select id from billing_fixture)));
insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path) values
 ('84000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','billing','Synthetic PDF','application/pdf',100,'82000000-0000-4000-8000-000000000001/documents/84000000-0000-4000-8000-000000000001/85000000-0000-4000-8000-000000000001'),
 ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','billing','Synthetic PDF 2','application/pdf',100,'82000000-0000-4000-8000-000000000001/documents/84000000-0000-4000-8000-000000000002/85000000-0000-4000-8000-000000000002');
set local role authenticated;
do $$declare w uuid:='82000000-0000-4000-8000-000000000001';inp jsonb;r jsonb;begin
 select input into inp from billing_fixture;
 perform pg_temp.assert_b(public.billing_artifact_v1_replay(w,inp)is null);
 perform pg_temp.deny_b(format('select public.billing_artifact_v1_attach(%L,%L)',w,(inp||'{"document_id":"84000000-0000-4000-8000-000000000003"}')::text),'P0002');
 r:=public.billing_artifact_v1_attach(w,inp||'{"document_id":"84000000-0000-4000-8000-000000000001"}');
 perform pg_temp.assert_b(r->>'version'='1'and r->>'verification_required'='true');
 update billing_fixture set receipt=r;
 perform pg_temp.assert_b(r=public.billing_artifact_v1_replay(w,inp));
 perform pg_temp.assert_b(r=public.billing_artifact_v1_attach(w,inp||'{"document_id":"84000000-0000-4000-8000-000000000001"}'));
 perform pg_temp.deny_b(format('select public.billing_artifact_v1_replay(%L,%L)',w,(inp||'{"expected_artifact_version":1}')::text),'40001');
 perform public.billing_v1_invoice_mark_paid(w,jsonb_build_object('command_id',gen_random_uuid(),'id',inp->>'id','expected_version',2));
 perform pg_temp.assert_b(r=public.billing_artifact_v1_replay(w,inp));
 perform pg_temp.assert_b(public.billing_artifact_v1_get(w,jsonb_build_object('id',inp->>'id'))->>'version'='1');
 perform pg_temp.assert_b(public.billing_artifact_v1_get(w,'{"id":"83000000-0000-4000-8000-000000000002"}')is null);
 perform pg_temp.deny_b(format('select public.billing_artifact_v1_attach(%L,%L)',w,(inp||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',3,'document_id','84000000-0000-4000-8000-000000000002'))::text),'40001');
end$$;
reset role;
select pg_temp.assert_b((select status='stored_candidate'from public.billing_private_pdf_jobs where invoice_id=(select id from billing_fixture)));
select pg_temp.assert_b((select version=3 and status='paid'from public.billing_invoices where id=(select id from billing_fixture)));
select pg_temp.deny_b('update public.billing_private_pdf_artifacts set version=4','55000');
select pg_temp.deny_b('delete from public.billing_private_pdf_artifacts','55000');
create function pg_temp.fail_artifact_audit()returns trigger language plpgsql as $$begin raise exception 'Synthetic artifact cutpoint';end$$;
create trigger artifact_test_audit before insert on public.product_audit_events for each row execute function pg_temp.fail_artifact_audit();
set local role authenticated;
select pg_temp.deny_b(format('select public.billing_artifact_v1_attach(%L,%L)','82000000-0000-4000-8000-000000000001',((select input from billing_fixture)||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',3,'expected_artifact_version',1,'document_id','84000000-0000-4000-8000-000000000002'))::text),'P0001');
reset role;
select pg_temp.assert_b((select count(*)=1 from public.billing_private_pdf_artifacts));
drop trigger artifact_test_audit on public.product_audit_events;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
select pg_temp.deny_b('select public.billing_artifact_v1_get(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
update public.workspace_members set status='suspended'where user_id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
select pg_temp.deny_b('select public.billing_artifact_v1_replay(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
set local role anon;
select pg_temp.deny_b('select public.billing_artifact_v1_get(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
set local role service_role;
select pg_temp.deny_b('select public.billing_artifact_v1_get(''82000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
rollback;
