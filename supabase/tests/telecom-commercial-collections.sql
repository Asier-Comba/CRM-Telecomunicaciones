-- Run after synthetic_product.sql with its final COMMIT omitted. Rolls back all density data.
create function pg_temp.assert_tel5(ok boolean) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'tel5_collection_assertion';end if;
end$$;
create function pg_temp.deny_tel5(statement text, expected text) returns void language plpgsql as $$ begin
 begin execute statement;exception when others then
  if sqlstate=expected then return;end if;raise;
 end;raise exception 'tel5_collection_expected_denial';
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$
declare op text; r jsonb; w uuid:=md5('density.workspace.1')::uuid; count_rows int; cursor_id uuid; ids uuid[]; expected uuid[]; page jsonb; item jsonb; entity uuid;
begin
 foreach op in array array['customer.list','contact.list','opportunity.list','activity.list','assignee.list','operator.list','plan.list','plan_version.list','contract.list','service.list','line.list','renewal.list','permanence.list'] loop
  r:=public.telecom_collection_v1_query(w,op,'{}');
  perform pg_temp.assert_tel5(r->>'operation'=op and r->>'contract_version'='telecom.collections.v1' and jsonb_array_length(r->'items')>0 and jsonb_array_length(r->'items')<=50);
  perform pg_temp.assert_tel5(not exists(select 1 from jsonb_array_elements(r->'items') x where x ?| array['email','phone','tax_identifier','tax_id','msisdn','iccid','eid','pin','puk','storage_path','source_event_ref','body','notes']));
 end loop;
 foreach op in array array['operator','plan','plan_version','renewal','permanence'] loop
  r:=public.telecom_collection_v1_query(w,op||'.list','{"limit":1}');entity:=(r->'items'->0->>'id')::uuid;
  r:=public.telecom_collection_v1_query(w,op||'.get',jsonb_build_object('id',entity));
  perform pg_temp.assert_tel5(r->'record'->>'id'=entity::text);
  perform pg_temp.assert_tel5(public.telecom_collection_v1_query(w,op||'.get','{"id":"00000000-0000-4000-8000-000000000001"}') is null);
 end loop;
 ids:=array[]::uuid[];
 loop
  page:=public.telecom_collection_v1_query(w,'line.list',jsonb_build_object('limit',7)||case when cursor_id is null then '{}'::jsonb else jsonb_build_object('after_id',cursor_id) end);
  for item in select value from jsonb_array_elements(page->'items') loop ids:=array_append(ids,(item->>'id')::uuid);end loop;
  exit when page->>'next_id' is null;cursor_id:=(page->>'next_id')::uuid;
 end loop;
 -- Count is a SQL fact from the stable dataset, not extrapolated from one page.
 select array_agg(id order by id) into expected from (
  select md5('density.line.1.'||company||'.'||bundle||'.'||line)::uuid id
  from generate_series(1,24) company cross join generate_series(1,2) bundle cross join generate_series(1,8) line
 ) synthetic_expected;
 perform pg_temp.assert_tel5(ids=expected and cardinality(ids)=384);
 r:=public.telecom_collection_v1_query(w,'line.list',jsonb_build_object('status','suspended','customer_id',md5('density.customer.1.1')::uuid));
 perform pg_temp.assert_tel5(jsonb_array_length(r->'items')=2 and not exists(select 1 from jsonb_array_elements(r->'items') x where x->>'status'<>'suspended' or x->>'customer_id'<>md5('density.customer.1.1')::uuid::text));
 r:=public.telecom_collection_v1_query(w,'contact.list',jsonb_build_object('customer_id',md5('density.customer.2.1')::uuid));perform pg_temp.assert_tel5(jsonb_array_length(r->'items')=0);
 r:=public.telecom_collection_v1_query(w,'plan_version.list','{"valid_on":"2000-01-01"}');perform pg_temp.assert_tel5(jsonb_array_length(r->'items')=0);
 perform pg_temp.assert_tel5(public.telecom_collection_v1_query(w,'plan_version.list','{}')->'items'->0->>'recurring_amount_minor' ~ '^[0-9]+$');
 perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',md5('density.workspace.2')::uuid,'line.list','{}'),'42501');
 perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'line.list','{"msisdn":"+12025550123"}'),'22023');
 perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'customer.list','{"status":"unknown"}'),'22023');
 perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'activity.list','{"entity_kind":"customer"}'),'22023');
 perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'renewal.list','{"window_from":"2026-01-01","window_to":"2028-01-01"}'),'22023');
 perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',w,'customer.list','{"limit":null}'),'22023');
end$$;
reset role;
update public.workspace_members set status='suspended' where workspace_id=md5('density.workspace.1')::uuid and user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
do $$ declare op text;begin
 foreach op in array array['customer.list','contact.list','opportunity.list','activity.list','assignee.list','operator.list','plan.list','plan_version.list','contract.list','service.list','line.list','renewal.list','permanence.list'] loop
  perform pg_temp.deny_tel5(format('select public.telecom_collection_v1_query(%L,%L,%L)',md5('density.workspace.1')::uuid,op,'{}'),'42501');
 end loop;
end$$;
reset role;
rollback;
