begin;
insert into auth.users(id,email)values('91000000-0000-4000-8000-000000000001','team-owner@example.invalid'),('91000000-0000-4000-8000-000000000002','team-admin@example.invalid'),('91000000-0000-4000-8000-000000000003','team-member@example.invalid'),('91000000-0000-4000-8000-000000000004','team-viewer@example.invalid');
insert into public.workspaces(id,name,slug)values('92000000-0000-4000-8000-000000000001','Team Synthetic','team-synthetic'),('92000000-0000-4000-8000-000000000002','Team Foreign','team-foreign');
insert into public.workspace_members(id,workspace_id,user_id,role)values
 ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','owner'),
 ('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','admin'),
 ('93000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','member'),
 ('93000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','viewer'),
 ('93000000-0000-4000-8000-000000000005','92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004','owner');
create function pg_temp.assert_t(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'team assertion';end if;end$$;
create function pg_temp.deny_t(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'expected team denial %',c;end$$;
create temp table team_fixture(id uuid,version bigint);
grant all on team_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare w uuid:='92000000-0000-4000-8000-000000000001';r jsonb;inp jsonb;page jsonb;begin
 page:=public.team_v1_member_list(w,'{"limit":2}');perform pg_temp.assert_t(jsonb_array_length(page->'items')=2 and page->>'next_id'='93000000-0000-4000-8000-000000000002' and not page->'items'->0?'email');
 page:=public.team_v1_member_list(w,'{"limit":2,"after_id":"93000000-0000-4000-8000-000000000002"}');perform pg_temp.assert_t(jsonb_array_length(page->'items')=2 and page->'items'->0->>'role'='member');
 perform pg_temp.deny_t(format('select public.team_v1_member_list(%L,%L)',w,'{"limit":101}'),'22023');
 inp:=jsonb_build_object('command_id',gen_random_uuid(),'email','synthetic-invite@example.invalid','role','member');
 r:=public.team_v1_member_invite_intent(w,inp);perform pg_temp.assert_t(r=public.team_v1_member_invite_intent(w,inp)and r->>'status'='pending'and not r?'email');
 insert into team_fixture values((r->>'id')::uuid,1);
 perform pg_temp.deny_t(format('select public.team_v1_member_invite_intent(%L,%L)',w,(inp||'{"email":"changed@example.invalid"}')::text),'40001');
 perform pg_temp.deny_t(format('select public.team_v1_member_invite_intent(%L,%L)',w,(inp||jsonb_build_object('command_id',gen_random_uuid()))::text),'23505');
 perform pg_temp.deny_t(format('select public.team_v1_member_role_change(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000001','expected_version',1,'role','member')::text),'42501');
 perform pg_temp.deny_t(format('select public.team_v1_member_role_change(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000005','expected_version',1,'role','member')::text),'P0002');
 inp:=jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000004','expected_version',1,'role','member');
 r:=public.team_v1_member_role_change(w,inp);perform pg_temp.assert_t(r->>'version'='2'and r=public.team_v1_member_role_change(w,inp));
 perform pg_temp.deny_t(format('select public.team_v1_member_role_change(%L,%L)',w,(inp||jsonb_build_object('command_id',gen_random_uuid(),'role','viewer'))::text),'40001');
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$declare w uuid:='92000000-0000-4000-8000-000000000001';begin
 perform pg_temp.deny_t(format('select public.team_v1_member_invite_intent(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'email','admin-intent@example.invalid','role','admin')::text),'42501');
 perform pg_temp.deny_t(format('select public.team_v1_member_role_change(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000004','expected_version',2,'role','admin')::text),'42501');
 perform pg_temp.deny_t(format('select public.team_v1_member_suspend(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000002','expected_version',1)::text),'42501');
 perform pg_temp.assert_t(public.team_v1_member_suspend(w,jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000003','expected_version',1))->>'status'='suspended');
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.deny_t('select public.team_v1_member_list(''92000000-0000-4000-8000-000000000001'',''{}'')','42501');
select pg_temp.deny_t('select public.product_v1_customer_create(''92000000-0000-4000-8000-000000000001'',''{"command_id":"94000000-0000-4000-8000-000000000001","account_kind":"legal_entity","legal_name":"Synthetic denied"}'')','42501');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare w uuid:='92000000-0000-4000-8000-000000000001';id uuid;r jsonb;inp jsonb;begin
 r:=public.team_v1_member_resume(w,'{"command_id":"94000000-0000-4000-8000-000000000002","id":"93000000-0000-4000-8000-000000000003","expected_version":2}');perform pg_temp.assert_t(r->>'version'='3'and r->>'status'='active');
 inp:='{"command_id":"94000000-0000-4000-8000-000000000003","id":"93000000-0000-4000-8000-000000000003","expected_version":3}';r:=public.team_v1_member_remove(w,inp);perform pg_temp.assert_t(r->>'version'='4'and r=public.team_v1_member_remove(w,inp));
 perform pg_temp.deny_t(format('select public.team_v1_member_resume(%L,%L)',w,jsonb_build_object('command_id',gen_random_uuid(),'id','93000000-0000-4000-8000-000000000003','expected_version',4)::text),'22023');
 select team_fixture.id into id from team_fixture;
 r:=public.team_v1_member_cancel_invite(w,jsonb_build_object('command_id',gen_random_uuid(),'id',id,'expected_version',1));perform pg_temp.assert_t(r->>'status'='cancelled'and r->>'version'='2');
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select pg_temp.deny_t('select public.product_v1_customer_create(''92000000-0000-4000-8000-000000000001'',''{"command_id":"94000000-0000-4000-8000-000000000001","account_kind":"legal_entity","legal_name":"Synthetic denied"}'')','42501');
reset role;
create function pg_temp.team_audit_fail()returns trigger language plpgsql as $$begin if new.operation='member.invite_intent'then raise exception using errcode='P0001',message='synthetic audit cut';end if;return new;end$$;
create trigger team_audit_cut before insert on public.product_audit_events for each row execute function pg_temp.team_audit_fail();
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.deny_t('select public.team_v1_member_invite_intent(''92000000-0000-4000-8000-000000000001'',''{"command_id":"94000000-0000-4000-8000-000000000004","email":"audit-cut@example.invalid","role":"member"}'')','P0001');
reset role;
select pg_temp.assert_t(not exists(select 1 from public.team_invite_intents where email='audit-cut@example.invalid')and not exists(select 1 from public.product_commands where command_id='94000000-0000-4000-8000-000000000004'));
set local role anon;
select pg_temp.deny_t('select public.team_v1_member_list(''92000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;set local role service_role;
select pg_temp.deny_t('select public.team_v1_member_list(''92000000-0000-4000-8000-000000000001'',''{}'')','42501');
reset role;
rollback;
