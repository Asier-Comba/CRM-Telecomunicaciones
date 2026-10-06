-- Synthetic only; rolled back. This does not prove business-effect durability.
begin;
insert into auth.users(id,email) values
 ('91000000-0000-4000-8000-000000000001','assistant-owner@example.invalid'),
 ('91000000-0000-4000-8000-000000000002','assistant-other@example.invalid');
insert into public.workspaces(id,name,slug) values
 ('92000000-0000-4000-8000-000000000001','Assistant synthetic A','assistant-synthetic-a'),
 ('92000000-0000-4000-8000-000000000002','Assistant synthetic B','assistant-synthetic-b');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','owner'),
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','member');
create function pg_temp.assert_a(ok boolean) returns void language plpgsql as $$begin if ok is not true then raise exception 'assistant_assertion';end if;end$$;
create function pg_temp.deny_a(q text,c text) returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'expected_assistant_denial';end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$declare
 w uuid:='92000000-0000-4000-8000-000000000001'; c uuid:='93000000-0000-4000-8000-000000000001';t uuid:='94000000-0000-4000-8000-000000000001';r jsonb;i jsonb;
begin
 i:=jsonb_build_object('id',c,'title','Seguimiento sintético');r:=public.assistant_thread_v2(w,'thread.create',i);
 perform pg_temp.assert_a(r=public.assistant_thread_v2(w,'thread.create',i) and r->'record'->>'version'='1');
 perform pg_temp.deny_a(format('select public.assistant_thread_v2(%L,%L,%L)',w,'thread.create',(i||'{"title":"Cambió"}')::text),'40001');
 perform pg_temp.deny_a(format('select public.assistant_thread_v2(%L,%L,%L)',w,'thread.list','{"workspace_id":"forged"}'),'22023');
 perform pg_temp.assert_a(public.assistant_thread_v2(w,'thread.list','{}')->'items'->0->>'id'=c::text);
 i:=jsonb_build_object('id',c,'turn_id',t,'text','¿Qué tareas tengo hoy?');r:=public.assistant_thread_v2(w,'turn.start',i);
 perform pg_temp.assert_a(r->>'replay'='false' and public.assistant_thread_v2(w,'turn.start',i)->>'replay'='true');
 perform pg_temp.deny_a(format('select public.assistant_thread_v2(%L,%L,%L)',w,'turn.start',(i||'{"text":"Cambió"}')::text),'40001');
 perform pg_temp.deny_a(format('select public.assistant_thread_v2(%L,%L,%L)',w,'turn.start',(i||jsonb_build_object('turn_id',gen_random_uuid()))::text),'23505');
 -- Message constraint failure rolls back the prior transition in the same RPC.
 perform pg_temp.deny_a(format('select public.assistant_thread_v2(%L,%L,%L)',w,'turn.finish',jsonb_build_object('id',c,'turn_id',t,'status','completed','answer',repeat('x',8001))::text),'23514');
 perform pg_temp.assert_a((select status='running' from public.assistant_turns_v2 where id=t));
 r:=public.assistant_thread_v2(w,'turn.finish',jsonb_build_object('id',c,'turn_id',t,'status','completed','answer','Consulta autorizada terminada; recuperar datos para actualizarlos.'));
 perform pg_temp.assert_a(r->>'status'='completed');
 perform pg_temp.deny_a(format('select public.assistant_thread_v2(%L,%L,%L)',w,'turn.finish',jsonb_build_object('id',c,'turn_id',t,'status','cancelled')::text),'40001');
 perform pg_temp.deny_a(format('update public.assistant_turns_v2 set status=%L,finished_at=null where id=%L','running',t),'40001');
 r:=public.assistant_thread_v2(w,'message.page',jsonb_build_object('id',c,'limit',1));
 perform pg_temp.assert_a(r->>'historical'='true' and r->'items'->0->>'role'='user' and r->>'next_sequence' is not null);
 perform pg_temp.assert_a(public.assistant_thread_v2(w,'message.page',jsonb_build_object('id',c,'after_sequence',(r->>'next_sequence')::bigint))->'items'->0->>'role'='assistant');
end$$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_a(public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.list','{}')->'items'='[]'::jsonb);
select pg_temp.assert_a((select count(*)=0 from public.assistant_messages_v2));
select pg_temp.deny_a($q$select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.get','{"id":"93000000-0000-4000-8000-000000000001"}')$q$,'42501');
select pg_temp.deny_a($q$select public.assistant_thread_v2('92000000-0000-4000-8000-000000000002','thread.list','{}')$q$,'42501');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.rename','{"id":"93000000-0000-4000-8000-000000000001","expected_version":1,"title":"Renombrada"}');
select pg_temp.deny_a($q$select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.archive','{"id":"93000000-0000-4000-8000-000000000001","expected_version":1}')$q$,'40001');
select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','turn.start','{"id":"93000000-0000-4000-8000-000000000001","turn_id":"94000000-0000-4000-8000-000000000002","text":"Lectura interrumpida por revocación"}');
reset role;
update public.workspace_members set status='suspended' where user_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.assert_a((select count(*)=0 from public.assistant_conversations_v2));
select pg_temp.deny_a($q$select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.list','{}')$q$,'42501');
reset role;
update public.workspace_members set status='active' where user_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.deny_a($q$select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','turn.finish','{"id":"93000000-0000-4000-8000-000000000001","turn_id":"94000000-0000-4000-8000-000000000002","status":"completed","answer":"Vieja lectura"}')$q$,'40001');
select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','turn.finish','{"id":"93000000-0000-4000-8000-000000000001","turn_id":"94000000-0000-4000-8000-000000000002","status":"cancelled"}');
select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','turn.start','{"id":"93000000-0000-4000-8000-000000000001","turn_id":"94000000-0000-4000-8000-000000000003","text":"Lectura antes del archivo"}');
select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.archive','{"id":"93000000-0000-4000-8000-000000000001","expected_version":2}');
select pg_temp.assert_a((select status='cancelled' from public.assistant_turns_v2 where id='94000000-0000-4000-8000-000000000003'));
select pg_temp.assert_a(public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.list','{}')->'items'='[]'::jsonb);
select pg_temp.assert_a(jsonb_array_length(public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','message.page','{"id":"93000000-0000-4000-8000-000000000001"}')->'items')=4);
reset role;
set local role anon;
select pg_temp.deny_a($q$select * from public.assistant_conversations_v2$q$,'42501');
select pg_temp.deny_a($q$select public.assistant_thread_v2('92000000-0000-4000-8000-000000000001','thread.list','{}')$q$,'42501');
reset role;
set local role service_role;
select pg_temp.deny_a($q$select * from public.assistant_turns_v2$q$,'42501');
reset role;
rollback;
