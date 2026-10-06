-- Append synthetic_product.sql without final COMMIT; all data synthetic and rolled back.
create function pg_temp.assert_work_pages(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'work_collection_assertion';end if;end$$;
create function pg_temp.deny_work_pages(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'work_collection_expected_denial';end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare w uuid:=md5('density.workspace.1')::uuid;c uuid:=md5('density.customer.1.1')::uuid;a jsonb;b jsonb;r jsonb;i jsonb;op text;ids uuid[];x jsonb;begin
 a:=public.product_v1_task_create(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c,'title','Synthetic Undated Task'));
 b:=public.product_v1_task_create(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c,'title','Synthetic Completed Undated Task'));
 perform public.product_v1_task_complete(w,jsonb_build_object('command_id',gen_random_uuid(),'id',b->>'id','expected_version',1));
 r:=public.product_v1_meeting_create(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c,'title','Synthetic Past Meeting','starts_at',to_char((statement_timestamp()-interval'2 days')at time zone'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'timezone','Europe/Madrid'));
 perform public.product_v1_meeting_complete(w,jsonb_build_object('command_id',gen_random_uuid(),'id',r->>'id','expected_version',1));
 for op in select unnest(array['task.list','meeting.list'])loop
 ids:='{}';i:=jsonb_build_object('customer_id',c,'limit',1);
 loop
 r:=public.telecom_collection_v1_query(w,op,i);
 for x in select value from jsonb_array_elements(r->'items')loop ids:=array_append(ids,(x->>'id')::uuid);perform pg_temp.assert_work_pages(not x?'body'and not x?'canonical_value');end loop;
 exit when r->'next_id'='null'::jsonb;i:=i||jsonb_build_object('after_id',r->>'next_id');end loop;
 perform pg_temp.assert_work_pages(cardinality(ids)=case op when'task.list'then 8 else 4 end and(select count(distinct v)from unnest(ids)v)=cardinality(ids));
 end loop;
 r:=public.telecom_collection_v1_query(w,'task.list',jsonb_build_object('customer_id',c,'status','completed'));
 perform pg_temp.assert_work_pages((select bool_or(value->>'id'=b->>'id'and value->'due_at'='null'::jsonb)from jsonb_array_elements(r->'items')));
 r:=public.telecom_collection_v1_query(w,'task.list',jsonb_build_object('customer_id',c));perform pg_temp.assert_work_pages((select count(*)from jsonb_array_elements(r->'items')where value->'due_at'='null'::jsonb)=2);
 perform pg_temp.assert_work_pages(public.telecom_collection_v1_query(w,'task.list',jsonb_build_object('customer_id',md5('density.customer.2.1')::uuid))->'items'='[]'::jsonb);
 perform pg_temp.deny_work_pages(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'task.list','{"priority":"urgent"}'),'22023');
 perform pg_temp.deny_work_pages(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'meeting.list','{"date_from":"2026-10-01"}'),'22023');
end$$;
reset role;
update public.workspace_members set role='viewer'where user_id=md5('density.actor.1.3')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.3')::uuid::text,true);
select pg_temp.assert_work_pages(jsonb_array_length(public.telecom_collection_v1_query(md5('density.workspace.1')::uuid,'task.list',jsonb_build_object('customer_id',md5('density.customer.1.1')::uuid))->'items')=8);
select pg_temp.assert_work_pages(jsonb_array_length(public.telecom_collection_v1_query(md5('density.workspace.1')::uuid,'meeting.list',jsonb_build_object('customer_id',md5('density.customer.1.1')::uuid))->'items')=4);
reset role;
update public.workspace_members set status='suspended'where user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
select pg_temp.deny_work_pages(format('select public.telecom_collection_v1_query(%L,%L,%L)',md5('density.workspace.1')::uuid,'task.list','{}'),'42501');
select pg_temp.deny_work_pages(format('select public.telecom_collection_v1_query(%L,%L,%L)',md5('density.workspace.1')::uuid,'meeting.list','{}'),'42501');
reset role;rollback;
