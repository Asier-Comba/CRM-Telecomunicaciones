-- Append to synthetic_product.sql without final COMMIT; rollback preserves fixture isolation.
create function pg_temp.assert_reads(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'telecom_reads_assertion';end if;end$$;
create function pg_temp.deny_reads(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'telecom_reads_expected_denial';end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare w uuid:=md5('density.workspace.1')::uuid;c uuid:=md5('density.customer.1.1')::uuid;r jsonb;first jsonb;cursor uuid;ids uuid[]:='{}';row jsonb;op text;i jsonb;begin
 r:=public.telecom_reads_v1_query(w,'customer360.summary',jsonb_build_object('customer_id',c));
 perform pg_temp.assert_reads(r->'record'=jsonb_build_object('customer_id',c,'contacts',2,'contracts',2,'services',2,'lines',16,'renewals',2,'permanences',2,'opportunities',4,'tasks',6,'meetings',3,'cases',0,'documents',0,'billing',0,'activity',1,'portabilities',0,'sims',0));
 perform pg_temp.assert_reads(r->'record'->>'documents'is not null and r->'record'->>'billing'is not null);
 perform pg_temp.deny_reads(format('select public.telecom_reads_v1_query(%L,%L,%L)',w,'customer360.summary',jsonb_build_object('customer_id',md5('density.customer.2.1')::uuid)::text),'P0002');
 for op,i in select *from(values('report.services_by_kind','{}'::jsonb),('report.lines_by_status','{}'::jsonb),('report.portabilities_by_status','{}'::jsonb),('report.cases_by_priority_status','{}'::jsonb),('report.renewals_by_month','{"from_month":"2026-01-01","to_month":"2026-12-01"}'::jsonb),('report.permanences_by_month','{"from_month":"2026-01-01","to_month":"2026-12-01"}'::jsonb))x(op,i)loop
 r:=public.telecom_reads_v1_query(w,op,i||jsonb_build_object('customer_id',c));
 perform pg_temp.assert_reads(r->>'operation'=op and r->'next_id'='null'::jsonb and jsonb_array_length(r->'items')=case op when'report.services_by_kind'then 5 when'report.lines_by_status'then 5 when'report.portabilities_by_status'then 7 when'report.cases_by_priority_status'then 28 else 12 end);
 end loop;
 loop
 r:=public.telecom_reads_v1_query(w,'report.operator_portfolio',jsonb_build_object('limit',1)||case when cursor is null then'{}'::jsonb else jsonb_build_object('after_id',cursor)end);
 for row in select value from jsonb_array_elements(r->'items')loop ids:=array_append(ids,(row->>'id')::uuid);end loop;
 cursor:=(r->>'next_id')::uuid;exit when cursor is null;end loop;
 perform pg_temp.assert_reads(cardinality(ids)=3 and(select count(distinct v)from unnest(ids)v)=3);
 r:=public.telecom_reads_v1_query(w,'report.pipeline_by_stage',jsonb_build_object('customer_id',c));perform pg_temp.assert_reads(jsonb_array_length(r->'items')=3);
 r:=public.telecom_reads_v1_query(w,'report.commercial_owner_counts',jsonb_build_object('customer_id',c));perform pg_temp.assert_reads(r?'unassigned_counts');
 perform pg_temp.deny_reads(format('select public.telecom_reads_v1_query(%L,%L,%L)',w,'report.renewals_by_month','{"from_month":"2026-01-01","to_month":"2028-01-01"}'),'22023');
 perform pg_temp.deny_reads(format('select public.telecom_reads_v1_query(%L,%L,%L)',w,'report.renewals_by_month','{"from_month":"2026-02-31","to_month":"2026-03-01"}'),'22023');
 perform pg_temp.deny_reads(format('select public.telecom_reads_v1_query(%L,%L,%L)',w,'report.lines_by_status','{"sql":"select *"}'),'22023');
end$$;
reset role;
update public.workspace_members set role='viewer'where user_id=md5('density.actor.1.3')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.3')::uuid::text,true);
select pg_temp.assert_reads(public.telecom_reads_v1_query(md5('density.workspace.1')::uuid,'customer360.summary',jsonb_build_object('customer_id',md5('density.customer.1.1')::uuid))->'record'->'documents'='null'::jsonb);
select pg_temp.assert_reads(public.telecom_reads_v1_query(md5('density.workspace.1')::uuid,'customer360.summary',jsonb_build_object('customer_id',md5('density.customer.1.1')::uuid))->'record'->'billing'='null'::jsonb);
reset role;
update public.workspace_members set status='suspended'where user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
select pg_temp.deny_reads(format('select public.telecom_reads_v1_query(%L,%L,%L)',md5('density.workspace.1')::uuid,'report.lines_by_status','{}'),'42501');
reset role;
rollback;
