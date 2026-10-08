begin;
do $$begin if current_setting('app.environment',true) is distinct from 'test' then raise exception 'non-test refused'; end if; end$$;
insert into auth.users(id,email) values
 ('81000000-0000-4000-8000-000000000001','b3-owner@example.invalid'),('81000000-0000-4000-8000-000000000002','b3-member@example.invalid'),
 ('81000000-0000-4000-8000-000000000003','b3-viewer@example.invalid'),('81000000-0000-4000-8000-000000000004','b3-foreign@example.invalid');
insert into public.workspaces(id,name,slug) values ('82000000-0000-4000-8000-000000000001','Synthetic B3','synthetic-b3'),('82000000-0000-4000-8000-000000000002','Foreign B3','foreign-b3');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','owner'),
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','member'),
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000003','viewer'),
 ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000004','owner');
insert into public.customers(id,workspace_id,account_kind,legal_name) values
 ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','legal_entity','B3 Synthetic Customer'),
 ('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','legal_entity','B3 Foreign Customer');
insert into public.opportunity_stages(id,workspace_id,code,display_name,position,outcome) values
 ('84000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','open','Abierta',0,null),
 ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','won','Ganada',1,'won'),
 ('84000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000001','lost','Perdida',2,'lost');
create function pg_temp.b3_assert(ok boolean) returns void language plpgsql as $$begin if ok is not true then raise exception 'B3 assertion'; end if; end$$;
create function pg_temp.b3_denied(q text,c text) returns void language plpgsql as $$declare actual text;begin begin execute q; exception when others then get stacked diagnostics actual=returned_sqlstate; end; if actual is distinct from c then raise exception 'B3 expected %, got %',c,actual; end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
do $$declare w uuid:='82000000-0000-4000-8000-000000000001'; customer uuid:='83000000-0000-4000-8000-000000000001';
 v jsonb; r jsonb; task uuid; meeting uuid; opportunity uuid; cursor jsonb; page jsonb;
begin
 v:=jsonb_build_object('command_id',gen_random_uuid(),'title','Synthetic task','due_at','2026-10-25T02:30:00+02:00','customer_id',customer,'priority','high');
 r:=public.product_v1_task_create(w,v);task:=(r->>'id')::uuid;
 perform pg_temp.b3_assert(r=public.product_v1_task_create(w,v) and r->>'status'='pending');
 perform pg_temp.b3_denied(format('select public.product_v1_task_create(%L,%L)',w,(v||'{"title":"Changed"}')::text),'40001');
 perform pg_temp.b3_denied(format('select public.product_v1_task_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'workspace_id',w))::text),'22023');
 perform pg_temp.b3_denied(format('select public.product_v1_task_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'customer_id','83000000-0000-4000-8000-000000000002'))::text),'P0002');
 perform pg_temp.b3_denied(format('select public.product_v1_task_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'assigned_user_id','81000000-0000-4000-8000-000000000004'))::text),'22023');
 perform pg_temp.b3_denied(format('select public.product_v1_task_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'due_at','2026-02-30T00:00:00Z'))::text),'22023');
 perform pg_temp.b3_denied(format('select public.product_v1_task_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'due_at','2026-10-25T02:30:00'))::text),'22023');
 v:=jsonb_build_object('command_id',gen_random_uuid(),'id',task,'expected_version',1);
 r:=public.product_v1_task_start(w,v);perform pg_temp.b3_assert(r->>'version'='2' and r->>'status'='in_progress');
 perform pg_temp.b3_denied(format('select public.product_v1_task_complete(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid()))::text),'40001');
 r:=public.product_v1_task_complete(w,v||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',2));
 perform pg_temp.b3_assert(r->>'status'='completed');
 perform pg_temp.b3_denied(format('select public.product_v1_task_update(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',3,'title','Closed'))::text),'22023');
 r:=public.product_v1_task_reopen(w,v||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',3));perform pg_temp.b3_assert(r->>'status'='pending');
 r:=public.product_v1_task_cancel(w,v||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',4));perform pg_temp.b3_assert(r->>'status'='cancelled');
 -- Standalone task/event still creates a properly linked coded activity.
 perform public.product_v1_task_create(w,jsonb_build_object('command_id',gen_random_uuid(),'title','Standalone task'));
 v:=jsonb_build_object('command_id',gen_random_uuid(),'title','Long meeting','starts_at','2026-03-28T00:00:00Z','ends_at','2026-03-31T00:00:00Z','timezone','Europe/Madrid','customer_id',customer);
 r:=public.product_v1_meeting_create(w,v);meeting:=(r->>'id')::uuid;perform pg_temp.b3_assert(r=public.product_v1_meeting_create(w,v));
 perform pg_temp.b3_denied(format('select public.product_v1_meeting_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'ends_at','2026-03-27T00:00:00Z'))::text),'23514');
 perform pg_temp.b3_denied(format('select public.product_v1_meeting_create(%L,%L)',w,(v||jsonb_build_object('command_id',gen_random_uuid(),'ends_at','2026-03-28T00:00:00Z'))::text),'23514');
 page:=public.product_v1_calendar(w,'{"range_start":"2026-03-29T00:00:00Z","range_end":"2026-03-30T00:00:00Z","kind":"meeting"}');
 perform pg_temp.b3_assert(jsonb_array_length(page->'items')=1); -- overlap, not just starts-in-range
 perform pg_temp.b3_assert(jsonb_array_length(public.product_v1_calendar(w,'{"range_start":"2026-03-31T00:00:00Z","range_end":"2026-04-01T00:00:00Z","kind":"meeting"}')->'items')=0);
 perform pg_temp.b3_denied(format('select public.product_v1_calendar(%L,%L)',w,'{"range_start":"2026-01-01T00:00:00Z","range_end":"2027-01-01T00:00:00Z"}'),'22023');
 r:=public.product_v1_meeting_reschedule(w,jsonb_build_object('command_id',gen_random_uuid(),'id',meeting,'expected_version',1,'starts_at','2026-10-25T02:30:00+02:00','ends_at','2026-10-25T02:30:00+01:00'));
 perform pg_temp.b3_assert(r->>'version'='2');
 r:=public.product_v1_meeting_complete(w,jsonb_build_object('command_id',gen_random_uuid(),'id',meeting,'expected_version',2));perform pg_temp.b3_assert(r->>'status'='completed');
 perform public.product_v1_meeting_create(w,jsonb_build_object('command_id',gen_random_uuid(),'title','Second DST meeting','starts_at','2026-10-25T02:30:00+02:00','timezone','Europe/Madrid'));
 page:=public.product_v1_calendar(w,'{"range_start":"2026-10-25T00:00:00Z","range_end":"2026-10-26T00:00:00Z","limit":1}');
 cursor:=page->'next';perform pg_temp.b3_assert(jsonb_array_length(page->'items')=1 and cursor<>'null'::jsonb);
 r:=public.product_v1_calendar(w,'{"range_start":"2026-10-25T00:00:00Z","range_end":"2026-10-26T00:00:00Z","limit":1}'::jsonb||cursor);
 perform pg_temp.b3_assert(r->'items'->0->'id'<>page->'items'->0->'id');
 v:=jsonb_build_object('command_id',gen_random_uuid(),'title','Telecom pipeline','customer_id',customer,'stage_id','84000000-0000-4000-8000-000000000001','amount_minor',10000,'currency','EUR','expected_close_date','2026-10-31','next_action','Llamar');
 r:=public.product_v1_opportunity_create(w,v);opportunity:=(r->>'id')::uuid;perform pg_temp.b3_assert(r=public.product_v1_opportunity_create(w,v));
 perform pg_temp.b3_denied(format('select public.product_v1_opportunity_update(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',opportunity,'expected_version',1,'service_id',customer)::text),'22023');
 perform pg_temp.b3_denied(format('select public.product_v1_opportunity_win(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id',opportunity,'expected_version',1,'stage_id','84000000-0000-4000-8000-000000000001')::text),'22023');
 r:=public.product_v1_opportunity_win(w,jsonb_build_object('command_id',gen_random_uuid(),'id',opportunity,'expected_version',1,'stage_id','84000000-0000-4000-8000-000000000002'));perform pg_temp.b3_assert(r->>'status'='won');
 r:=public.product_v1_opportunity_reopen(w,jsonb_build_object('command_id',gen_random_uuid(),'id',opportunity,'expected_version',2,'stage_id','84000000-0000-4000-8000-000000000001'));
 r:=public.product_v1_opportunity_lose(w,jsonb_build_object('command_id',gen_random_uuid(),'id',opportunity,'expected_version',3,'stage_id','84000000-0000-4000-8000-000000000003','close_reason_code','price'));
 perform pg_temp.b3_assert(r->>'status'='lost');
 page:=public.product_v1_work_get(w,'opportunity',opportunity);
 perform pg_temp.b3_assert(jsonb_array_length(page->'record'->'history')=4 and page->'record'->>'expected_close_date'='2026-10-31' and not page::text like '%actor_id%');
 perform pg_temp.b3_assert(public.product_v1_work_get(w,'task',customer) is null);
 perform pg_temp.b3_assert(jsonb_array_length(public.product_v1_stage_catalog(w)->'items')=3);
 perform pg_temp.b3_denied('select public.product_v1_work_command('''||w||''',''task.create'',''{}'')','42501');
end$$;
-- Viewer can read, never write. Foreign/anonymous/no-JWT/removed/suspended denied.
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000003',true);
select pg_temp.b3_assert(public.product_v1_calendar('82000000-0000-4000-8000-000000000001','{"range_start":"2026-10-25T00:00:00Z","range_end":"2026-10-26T00:00:00Z"}') is not null);
select pg_temp.b3_denied($q$select public.product_v1_task_create('82000000-0000-4000-8000-000000000001','{}')$q$,'42501');
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000004',true);
select pg_temp.b3_denied($q$select public.product_v1_meeting_create('82000000-0000-4000-8000-000000000001','{}')$q$,'42501');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.b3_denied($q$select public.product_v1_opportunity_create('82000000-0000-4000-8000-000000000001','{}')$q$,'42501');
reset role;
update public.workspace_members set status='suspended' where user_id='81000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
select pg_temp.b3_denied($q$select public.product_v1_task_create('82000000-0000-4000-8000-000000000001','{}')$q$,'42501');
reset role;
update public.workspace_members set status='active' where user_id='81000000-0000-4000-8000-000000000002';
create function pg_temp.b3_fail_audit() returns trigger language plpgsql as $$begin raise exception 'B3 cutpoint';end$$;
create trigger b3_audit_failure before insert on public.product_audit_events for each row execute function pg_temp.b3_fail_audit();
set local role authenticated;
select pg_temp.b3_denied($q$select public.product_v1_task_create('82000000-0000-4000-8000-000000000001','{"command_id":"85000000-0000-4000-8000-000000000099","title":"B3 Rollback"}')$q$,'P0001');
reset role;
select pg_temp.b3_assert(not exists(select 1 from public.tasks where title='B3 Rollback'));
select pg_temp.b3_assert(not exists(select 1 from public.product_commands where command_id='85000000-0000-4000-8000-000000000099'));
set local role anon;
select pg_temp.b3_denied($q$select public.product_v1_task_create('82000000-0000-4000-8000-000000000001','{}')$q$,'42501');
reset role;
set local role service_role;
select pg_temp.b3_denied($q$select public.product_v1_task_create('82000000-0000-4000-8000-000000000001','{}')$q$,'42501');
reset role;
rollback;
