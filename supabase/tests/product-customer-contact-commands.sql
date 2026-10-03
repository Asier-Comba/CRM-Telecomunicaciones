-- Synthetic role and command tests; always rolled back, no real Auth/provider.
begin;
do $$ begin
 if current_setting('app.environment',true) is distinct from 'test' then raise exception 'refusing non-test environment'; end if;
end $$;
insert into auth.users(id,email) values
 ('61000000-0000-4000-8000-000000000001','owner-a@example.invalid'),
 ('61000000-0000-4000-8000-000000000002','owner-b@example.invalid'),
 ('61000000-0000-4000-8000-000000000003','member-a@example.invalid');
insert into public.workspaces(id,name,slug) values
 ('62000000-0000-4000-8000-000000000001','Synthetic Command A','synthetic-command-a'),
 ('62000000-0000-4000-8000-000000000002','Synthetic Command B','synthetic-command-b');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','owner'),
 ('62000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000002','admin'),
 ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','member');
create function pg_temp.product_assert(ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'product assertion failed'; end if; end $$;
create function pg_temp.product_denied(query text,code text) returns void language plpgsql as $$
declare actual text;
begin
 begin execute query; exception when others then get stacked diagnostics actual=returned_sqlstate; end;
 if actual is distinct from code then raise exception 'expected %, got %',code,actual; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
do $$
declare wa uuid:='62000000-0000-4000-8000-000000000001'; wb uuid:='62000000-0000-4000-8000-000000000002';
 input jsonb:=jsonb_build_object('command_id','63000000-0000-4000-8000-000000000001','account_kind','legal_entity','legal_name','Synthetic A');
 receipt jsonb; customer uuid; contact uuid; second_contact uuid; v jsonb;
begin
 receipt:=public.product_v1_customer_create(wa,input); customer:=(receipt->>'id')::uuid;
 perform pg_temp.product_assert(receipt=public.product_v1_customer_create(wa,input));

 perform pg_temp.product_assert(receipt->>'version'='1' and receipt->>'operation'='customer.create' and not receipt ? 'email' and not receipt ? 'workspace_id');
 perform pg_temp.product_denied(format('select public.product_v1_customer_create(%L,%L)',wa,(input||'{"legal_name":"Changed"}')::text),'40001');
 perform pg_temp.product_denied(format('select public.product_v1_customer_create(%L,%L)',wb,input::text),'42501');
 perform pg_temp.product_denied(format('select public.product_v1_customer_create(%L,%L)',wa,(input||'{"actor_id":"61000000-0000-4000-8000-000000000002"}')::text),'22023');
 perform pg_temp.product_denied(format('select public.product_v1_customer_create(%L,%L)',wa,(input||'{"command_id":"bad"}')::text),'22023');
 perform pg_temp.product_denied(format('select public.product_v1_customer_create(%L,%L)',wa,(input||jsonb_build_object('legal_name',repeat('x',201)))::text),'22023');
 v:=jsonb_build_object('command_id','63000000-0000-4000-8000-000000000002','id',customer,'expected_version',1,'trade_name','Synthetic New');
 receipt:=public.product_v1_customer_update(wa,v);
 perform pg_temp.product_assert(receipt->>'version'='2');
 perform pg_temp.product_assert(receipt=public.product_v1_customer_update(wa,v));
 perform pg_temp.product_denied(format('select public.product_v1_customer_update(%L,%L)',wa,(v||'{"command_id":"63000000-0000-4000-8000-000000000003"}')::text),'40001');
 perform pg_temp.product_denied(format('select public.product_v1_customer_update(%L,%L)',wa,(v||'{"command_id":"63000000-0000-4000-8000-000000000003","id":"62000000-0000-4000-8000-000000000002"}')::text),'P0002');
 v:=jsonb_build_object('command_id','63000000-0000-4000-8000-000000000004','customer_id',customer,'display_name','Synthetic Contact','email','contact@example.invalid','is_primary',true);
 receipt:=public.product_v1_contact_create(wa,v);contact:=(receipt->>'id')::uuid;
 perform pg_temp.product_assert(receipt=public.product_v1_contact_create(wa,v));
 perform pg_temp.product_assert(not receipt ? 'email');
 v:=v||'{"command_id":"63000000-0000-4000-8000-000000000005","display_name":"Second Synthetic Contact"}';
 receipt:=public.product_v1_contact_create(wa,v);second_contact:=(receipt->>'id')::uuid;
 perform pg_temp.product_denied(format('select public.product_v1_contact_create(%L,%L)',wa,(v||'{"command_id":"63000000-0000-4000-8000-000000000009","customer_id":"62000000-0000-4000-8000-000000000002"}')::text),'P0002');
 -- Primary promotion increments the demoted contact's version too.
 v:=jsonb_build_object('command_id','63000000-0000-4000-8000-000000000006','id',contact,'expected_version',1,'phone',null);
 perform pg_temp.product_denied(format('select public.product_v1_contact_update(%L,%L)',wa,v::text),'40001');
 receipt:=public.product_v1_contact_update(wa,v||'{"expected_version":2}');
 perform pg_temp.product_assert(receipt->>'version'='3');
 receipt:=public.product_v1_contact_archive(wa,jsonb_build_object('command_id','63000000-0000-4000-8000-000000000007','id',contact,'expected_version',3));
 perform pg_temp.product_assert(receipt->>'status'='archived');
 receipt:=public.product_v1_contact_restore(wa,jsonb_build_object('command_id','63000000-0000-4000-8000-000000000008','id',contact,'expected_version',4));
 perform pg_temp.product_assert(receipt->>'status'='active' and receipt->>'version'='5');
 receipt:=public.product_v1_customer_archive(wa,jsonb_build_object('command_id','63000000-0000-4000-8000-000000000010','id',customer,'expected_version',2));
 perform pg_temp.product_assert(receipt->>'status'='archived');
 perform pg_temp.product_denied(format('select public.product_v1_contact_create(%L,%L)',wa,jsonb_build_object('command_id','63000000-0000-4000-8000-000000000011','customer_id',customer,'display_name','Blocked')::text),'P0002');
 receipt:=public.product_v1_customer_restore(wa,jsonb_build_object('command_id','63000000-0000-4000-8000-000000000012','id',customer,'expected_version',3));
 perform pg_temp.product_assert(receipt->>'version'='4' and receipt->>'status'='active');
 perform pg_temp.product_assert(public.product_v1_customer_editor(wa,customer)->>'version'='4');
 perform pg_temp.product_assert(public.product_v1_customer_editor(wa,'62000000-0000-4000-8000-000000000002') is null);
 receipt:=public.product_v1_contact_editors(wa,customer,1,null);
 perform pg_temp.product_assert(jsonb_array_length(receipt->'items')=1 and receipt->>'next_id' is not null);
 perform pg_temp.product_assert(jsonb_array_length(public.product_v1_contact_editors(wa,customer,1,(receipt->>'next_id')::uuid)->'items')=1);
 perform pg_temp.product_denied(format('select public.product_v1_contact_editors(%L,%L,101,null)',wa,customer),'22023');


end $$;

select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000003',true);
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{"command_id":"63000000-0000-4000-8000-000000000020","account_kind":"legal_entity","legal_name":"Blocked"}')$q$,'42501');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{"command_id":"63000000-0000-4000-8000-000000000020","account_kind":"legal_entity","legal_name":"Blocked"}')$q$,'42501');
select pg_temp.product_denied('select key_bytes from public.product_command_key','42501');
select pg_temp.product_denied('select receipt from public.product_commands','42501');
select pg_temp.product_denied('select email from public.contacts','42501');
reset role;
select pg_temp.product_assert((select count(*)=9 from public.product_commands where workspace_id='62000000-0000-4000-8000-000000000001'));
select pg_temp.product_assert((select count(*)=9 from public.product_audit_events where workspace_id='62000000-0000-4000-8000-000000000001'));
select pg_temp.product_assert((select count(*)=9 from public.activities where workspace_id='62000000-0000-4000-8000-000000000001'));
select pg_temp.product_assert((select count(*)=1 from public.contacts where workspace_id='62000000-0000-4000-8000-000000000001' and is_primary));
update public.workspace_members set status='suspended' where workspace_id='62000000-0000-4000-8000-000000000001' and user_id='61000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
-- Even a successful old receipt cannot be replayed after revocation.
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{"command_id":"63000000-0000-4000-8000-000000000001","account_kind":"legal_entity","legal_name":"Synthetic A"}')$q$,'42501');
reset role;
update public.workspace_members set status='active' where workspace_id='62000000-0000-4000-8000-000000000001' and user_id='61000000-0000-4000-8000-000000000001';
update public.workspaces set status='suspended' where id='62000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{"command_id":"63000000-0000-4000-8000-000000000001","account_kind":"legal_entity","legal_name":"Synthetic A"}')$q$,'42501');
reset role;
update public.workspaces set status='active' where id='62000000-0000-4000-8000-000000000001';
delete from public.workspace_members where workspace_id='62000000-0000-4000-8000-000000000001' and user_id='61000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{"command_id":"63000000-0000-4000-8000-000000000001","account_kind":"legal_entity","legal_name":"Synthetic A"}')$q$,'42501');
reset role;
insert into public.workspace_members(workspace_id,user_id,role) values ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','owner');
-- Audit failure must roll back business state AND idempotency reservation.
create function pg_temp.product_fail_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic cutpoint'; end$$;
create trigger product_test_audit_failure before insert on public.product_audit_events for each row execute function pg_temp.product_fail_audit();
set local role authenticated;
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{"command_id":"63000000-0000-4000-8000-000000000030","account_kind":"legal_entity","legal_name":"Rollback Synthetic"}')$q$,'P0001');
reset role;
select pg_temp.product_assert(not exists(select 1 from public.customers where legal_name='Rollback Synthetic'));
select pg_temp.product_assert(not exists(select 1 from public.product_commands where command_id='63000000-0000-4000-8000-000000000030'));
set local role anon;
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{}')$q$,'42501');
reset role;
set local role service_role;
select pg_temp.product_denied($q$select public.product_v1_customer_create('62000000-0000-4000-8000-000000000001','{}')$q$,'42501');
reset role;
rollback;
