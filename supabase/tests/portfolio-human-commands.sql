begin;
do $$begin if current_setting('app.environment',true)is distinct from 'test'then raise exception 'test environment required';end if;end$$;
insert into auth.users(id,email)values('a7000000-0000-4000-8000-000000000001','portfolio-member@example.invalid'),('a7000000-0000-4000-8000-000000000002','portfolio-viewer@example.invalid'),('a7000000-0000-4000-8000-000000000003','portfolio-foreign@example.invalid');
insert into public.workspaces(id,name,slug)values('b7000000-0000-4000-8000-000000000001','Portfolio Synthetic','portfolio-synthetic'),('b7000000-0000-4000-8000-000000000002','Portfolio Foreign','portfolio-foreign');
insert into public.workspace_members(workspace_id,user_id,role)values('b7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','member'),('b7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000002','viewer'),('b7000000-0000-4000-8000-000000000002','a7000000-0000-4000-8000-000000000003','owner');
insert into public.customers(id,workspace_id,account_kind,legal_name)values('c7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','legal_entity','Portfolio Customer'),('c7000000-0000-4000-8000-000000000002','b7000000-0000-4000-8000-000000000002','legal_entity','Foreign Customer');
insert into public.telecom_operators(id,workspace_id,code,display_name)values('d7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','synthetic','Synthetic Operator');
insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,start_date,source)values('e7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','2026-01-01','import');
insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,service_kind,display_name)values('f7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','mobile','Imported Service');
insert into public.telecom_lines(id,workspace_id,service_id)values('f7000000-0000-4000-8000-000000000002','b7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001');
create function pg_temp.p_assert(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'portfolio assertion';end if;end$$;
create function pg_temp.p_deny(q text,c text)returns void language plpgsql as $$declare actual text;begin begin execute q;exception when others then actual:=sqlstate;end;if actual is distinct from c then raise exception 'portfolio expected %, got %',c,actual;end if;end$$;
create temp table p_saved(op text,inp jsonb,id uuid);grant all on p_saved to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
do $$declare w uuid:='b7000000-0000-4000-8000-000000000001';v jsonb;r jsonb;c uuid;s uuid;l uuid;begin
 v:=jsonb_build_object('command_id',gen_random_uuid(),'customer_id','c7000000-0000-4000-8000-000000000001','operator_id','d7000000-0000-4000-8000-000000000001','start_date','2026-01-01');
 r:=public.portfolio_v1_contract_create_manual(w,v);c:=(r->>'id')::uuid;
 perform pg_temp.p_assert(r=public.portfolio_v1_contract_create_manual(w,v)and r->>'version'='1'and r->>'source'='manual');
 insert into p_saved values('contract.create_manual',v,c);
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_create_manual(%L,%L)',w,(v||'{"start_date":"2026-01-02"}')::text),'40001');
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_create_manual(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'source','import'))::text),'22023');
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_create_manual(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'start_date','2026-02-30'))::text),'22023');
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_create_manual(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'customer_id','c7000000-0000-4000-8000-000000000002'))::text),'P0002');
 r:=public.portfolio_v1_contract_update_allowed_metadata(w,jsonb_build_object('command_id',gen_random_uuid(),'id',c,'expected_version',1,'assigned_user_id','a7000000-0000-4000-8000-000000000001'));perform pg_temp.p_assert(r->>'version'='2');
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_activate(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',c,'expected_version',1,'signed_date','2025-12-31')::text),'40001');
 perform public.portfolio_v1_contract_activate(w,jsonb_build_object('command_id',gen_random_uuid(),'id',c,'expected_version',2,'signed_date','2025-12-31'));
 v:=jsonb_build_object('command_id',gen_random_uuid(),'contract_id',c,'service_kind','mobile','display_name','Manual Service');r:=public.portfolio_v1_service_create_manual(w,v);s:=(r->>'id')::uuid;
 perform pg_temp.p_assert(r=public.portfolio_v1_service_create_manual(w,v)and r->>'source'='manual');insert into p_saved values('service.create_manual',v,s);
 v:=jsonb_build_object('command_id',gen_random_uuid(),'service_id',s,'display_name','Manual Line');r:=public.portfolio_v1_line_create_manual(w,v);l:=(r->>'id')::uuid;
 perform pg_temp.p_assert(r=public.portfolio_v1_line_create_manual(w,v));insert into p_saved values('line.create_manual',v,l);
 perform pg_temp.p_deny(format('select public.portfolio_v1_line_transition(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',1,'status','active','effective_on','2026-01-01')::text),'22023');
 perform public.portfolio_v1_service_transition(w,jsonb_build_object('command_id',gen_random_uuid(),'id',s,'expected_version',1,'status','active','effective_on','2026-01-01'));
 perform public.portfolio_v1_line_transition(w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',1,'status','active','effective_on','2026-01-01'));
 perform public.portfolio_v1_line_update_label(w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',2,'display_name','Line Renamed'));
 perform public.portfolio_v1_service_update_label(w,jsonb_build_object('command_id',gen_random_uuid(),'id',s,'expected_version',2,'display_name','Service Renamed'));
 perform pg_temp.p_deny(format('select public.portfolio_v1_service_transition(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',s,'expected_version',3,'status','ended','effective_on','2026-02-01')::text),'22023');
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_cancel(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',c,'expected_version',3)::text),'22023');
 perform public.portfolio_v1_line_transition(w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',3,'status','suspended','effective_on','2026-02-01'));
 perform public.portfolio_v1_line_transition(w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',4,'status','active','effective_on','2026-02-02'));
 perform pg_temp.p_deny(format('select public.portfolio_v1_line_transition(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',5,'status','ended','effective_on','2026-01-31')::text),'22023');
 perform public.portfolio_v1_line_transition(w,jsonb_build_object('command_id',gen_random_uuid(),'id',l,'expected_version',5,'status','ended','effective_on','2026-03-01'));
 perform pg_temp.p_deny(format('select public.portfolio_v1_service_transition(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',s,'expected_version',3,'status','ended','effective_on','2026-02-01')::text),'22023');
 perform public.portfolio_v1_service_transition(w,jsonb_build_object('command_id',gen_random_uuid(),'id',s,'expected_version',3,'status','ended','effective_on','2026-03-01'));
 perform pg_temp.p_assert(public.portfolio_v1_contract_cancel(w,jsonb_build_object('command_id',gen_random_uuid(),'id',c,'expected_version',3))->>'status'='cancelled');
 perform pg_temp.p_assert(public.portfolio_v1_get(w,jsonb_build_object('kind','line','id',l))->'record'->>'display_name'='Line Renamed');
 perform pg_temp.p_assert(public.portfolio_v1_get(w,jsonb_build_object('kind','service','id',s))->'record'->>'version'='4');
 perform pg_temp.p_assert(public.portfolio_v1_get(w,jsonb_build_object('kind','contract','id',c))->'record'->>'source'='manual');
 -- Imported facts permit labels/assignment only, including child provenance inherited at insert.
 perform pg_temp.p_assert(public.portfolio_v1_line_update_label(w,'{"command_id":"97000000-0000-4000-8000-000000000001","id":"f7000000-0000-4000-8000-000000000002","expected_version":1,"display_name":"Imported label"}')->>'source'='import');
 perform public.portfolio_v1_service_update_label(w,'{"command_id":"97000000-0000-4000-8000-000000000002","id":"f7000000-0000-4000-8000-000000000001","expected_version":1,"display_name":"Imported label"}');
 perform public.portfolio_v1_contract_update_allowed_metadata(w,'{"command_id":"97000000-0000-4000-8000-000000000003","id":"e7000000-0000-4000-8000-000000000001","expected_version":1,"assigned_user_id":null}');
 perform pg_temp.p_deny(format('select public.portfolio_v1_contract_activate(%L,%L)',w,'{"command_id":"97000000-0000-4000-8000-000000000004","id":"e7000000-0000-4000-8000-000000000001","expected_version":2,"signed_date":"2026-01-01"}'),'42501');
 perform pg_temp.p_deny(format('select public.portfolio_v1_service_create_manual(%L,%L)',w,'{"command_id":"97000000-0000-4000-8000-000000000005","contract_id":"e7000000-0000-4000-8000-000000000001","service_kind":"mobile","display_name":"Forgery"}'),'42501');
 perform pg_temp.p_deny(format('select public.portfolio_v1_line_transition(%L,%L)',w,'{"command_id":"97000000-0000-4000-8000-000000000006","id":"f7000000-0000-4000-8000-000000000002","expected_version":2,"status":"cancelled","effective_on":"2026-01-01"}'),'42501');
end$$;
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000002',true);
do $$declare saved record;begin
 for saved in select *from p_saved loop
  perform pg_temp.p_deny(format('select public.portfolio_v1_%s(%L,%L)',replace(saved.op,'.','_'),'b7000000-0000-4000-8000-000000000001',saved.inp::text),'42501');
 end loop;
 perform pg_temp.p_assert(public.portfolio_v1_get('b7000000-0000-4000-8000-000000000001','{"kind":"line","id":"f7000000-0000-4000-8000-000000000002"}')->'record'->>'source'='import');
end$$;
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000003',true);
select pg_temp.p_deny('select public.portfolio_v1_get(''b7000000-0000-4000-8000-000000000001'',''{"kind":"line","id":"f7000000-0000-4000-8000-000000000002"}'')','42501');
reset role;
-- Regression: explicit nonmanual child provenance must survive a manual ancestor.
-- These fixture inserts model trusted import/integration writers, never user grants.
insert into public.telecom_services(id,workspace_id,customer_id,operator_id,contract_id,service_kind,source)
select 'f7000000-0000-4000-8000-000000000010','b7000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001',id,'mobile','import'
from p_saved where op='contract.create_manual';
insert into public.telecom_lines(id,workspace_id,service_id,source)
select 'f7000000-0000-4000-8000-000000000011','b7000000-0000-4000-8000-000000000001',id,'integration'
from p_saved where op='service.create_manual';
insert into public.telecom_lines(id,workspace_id,service_id)
values('f7000000-0000-4000-8000-000000000012','b7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000010');
insert into public.telecom_lines(id,workspace_id,service_id,source)
values('f7000000-0000-4000-8000-000000000013','b7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','integration');
select pg_temp.p_assert((select source='import'from public.telecom_services where id='f7000000-0000-4000-8000-000000000010'));
select pg_temp.p_assert((select source='integration'from public.telecom_lines where id='f7000000-0000-4000-8000-000000000011'));
select pg_temp.p_assert((select source='import'from public.telecom_lines where id='f7000000-0000-4000-8000-000000000012'));
select pg_temp.p_assert((select source='integration'from public.telecom_lines where id='f7000000-0000-4000-8000-000000000013'));
select pg_temp.p_deny('update public.telecom_services set source=''manual''where id=''f7000000-0000-4000-8000-000000000010''','55000');
select pg_temp.p_deny('update public.telecom_lines set source=''manual''where id=''f7000000-0000-4000-8000-000000000011''','55000');
set local role authenticated;
select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
do $declare w uuid:='b7000000-0000-4000-8000-000000000001';target uuid;begin
 perform pg_temp.p_assert(public.portfolio_v1_service_update_label(w,jsonb_build_object('command_id',gen_random_uuid(),'id','f7000000-0000-4000-8000-000000000010','expected_version',1,'display_name','Import under manual'))->>'source'='import');
 perform pg_temp.p_deny(format('select public.portfolio_v1_service_transition(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id','f7000000-0000-4000-8000-000000000010','expected_version',2,'status','active','effective_on','2026-01-01')::text),'42501');
 perform pg_temp.p_deny(format('select public.portfolio_v1_line_create_manual(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'service_id','f7000000-0000-4000-8000-000000000010','display_name','Forbidden child')::text),'42501');
 for target in select unnest(array['f7000000-0000-4000-8000-000000000011','f7000000-0000-4000-8000-000000000012','f7000000-0000-4000-8000-000000000013']::uuid[])loop
  perform public.portfolio_v1_line_update_label(w,jsonb_build_object('command_id',gen_random_uuid(),'id',target,'expected_version',1,'display_name','Nonmanual label'));
  perform pg_temp.p_deny(format('select public.portfolio_v1_line_transition(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',target,'expected_version',2,'status','cancelled','effective_on','2026-01-01')::text),'42501');
 end loop;
 perform pg_temp.p_assert(public.portfolio_v1_get(w,'{"kind":"line","id":"f7000000-0000-4000-8000-000000000011"}')->'record'->>'source'='integration');
end$;
reset role;
update public.workspace_members set status='suspended'where user_id='a7000000-0000-4000-8000-000000000001';
set local role authenticated;select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
do $$declare saved record;begin
 for saved in select *from p_saved loop perform pg_temp.p_deny(format('select public.portfolio_v1_%s(%L,%L)',replace(saved.op,'.','_'),'b7000000-0000-4000-8000-000000000001',saved.inp::text),'42501');end loop;
end$$;
reset role;
update public.workspace_members set status='active'where user_id='a7000000-0000-4000-8000-000000000001';
select pg_temp.p_deny('update public.telecom_lines set source=''manual''where id=''f7000000-0000-4000-8000-000000000002''','55000');
-- Forced audit failure rolls back the entity and command reservation together.
create function pg_temp.p_break()returns trigger language plpgsql as $$begin raise exception using errcode='P0001',message='forced audit';end$$;
create trigger p_break before insert on public.product_audit_events for each row execute function pg_temp.p_break();
set local role authenticated;select set_config('request.jwt.claim.sub','a7000000-0000-4000-8000-000000000001',true);
select pg_temp.p_deny('select public.portfolio_v1_contract_create_manual(''b7000000-0000-4000-8000-000000000001'',''{"command_id":"97000000-0000-4000-8000-000000000099","customer_id":"c7000000-0000-4000-8000-000000000001","operator_id":"d7000000-0000-4000-8000-000000000001","start_date":"2026-01-01"}'')','P0001');
reset role;
select pg_temp.p_assert(not exists(select 1 from public.product_commands where command_id='97000000-0000-4000-8000-000000000099'));
select pg_temp.p_assert((select count(*)from public.telecom_contracts where workspace_id='b7000000-0000-4000-8000-000000000001')=2);
select pg_temp.p_assert((select count(*)from public.product_audit_events where command_id in ('97000000-0000-4000-8000-000000000004','97000000-0000-4000-8000-000000000005','97000000-0000-4000-8000-000000000006'))=0);
rollback;
