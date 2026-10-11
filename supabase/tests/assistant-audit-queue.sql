-- Exact scoped keyset discovery; this neither claims nor emits an event.
begin;
do $$begin if to_regprocedure('public.assistant_durable_v1_list_audit(uuid,text,bigint,text,text)') is null then
 raise exception 'physical_audit_queue_missing';end if;end$$;
insert into public.assistant_registered_dispatchers values('fixture.audit.queue','fixture.audit.queue',1);
insert into public.assistant_registered_dispatchers values('fixture.audit.other','fixture.audit.other',1);
insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values
 ('b2000000-0000-4000-8000-000000000001','audit_queue_worker_reference','a1000000-0000-4000-8000-000000000001','fixture.audit.queue',clock_timestamp()+interval '1 hour');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$declare c jsonb;r jsonb;first_page jsonb;second_page jsonb;before_rows jsonb;n integer;foreign_event text;
 baseline_time text;baseline_event text;
begin
 -- Native race fixtures may already have more than a page of other-capability
 -- events. Keep those rows intact and test this fixture's entire new interval.
 -- The deliberate capability-filter mutant must still disclose its new foreign
 -- event; bounded pagination must not make that negative depend on test order.
 select created_at::text,event_ref into baseline_time,baseline_event from public.assistant_original_audit_intents
 where workspace_id='b2000000-0000-4000-8000-000000000001' order by created_at desc,event_ref desc limit 1;
 if baseline_time is null then baseline_time:='';baseline_event:='';
 else baseline_time:=to_char(baseline_time::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');end if;
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.audit.other',repeat('a',64));
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',c->>'confirmationRef','fixture.audit.other',repeat('a',64),
 'audit_other_idempotency_key','fixture.audit.other','audit_other_command_reference','audit_other_original_request');
 select event_ref into foreign_event from public.assistant_original_audit_intents where operation_ref=r->>'operationRef';
 for n in 1..21 loop
  c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.audit.queue',repeat('a',64));
  r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',c->>'confirmationRef','fixture.audit.queue',repeat('a',64),
   'audit_queue_idempotency_'||n,'fixture.audit.queue','audit_queue_command_reference_'||n,'audit_queue_original_request');
  if r->>'status' is distinct from 'reserved' then raise exception 'audit_queue_fixture_reservation_failed';end if;
 end loop;
 select jsonb_agg(to_jsonb(d) order by d.event_ref) into before_rows from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='fixture.audit.queue';
 first_page:=public.assistant_durable_v1_list_audit('b2000000-0000-4000-8000-000000000001','audit_queue_worker_reference',1,baseline_time,baseline_event);
 if exists(select 1 from jsonb_array_elements(first_page->'items') x where x->>'eventRef'=foreign_event) then
  raise exception 'audit_queue_foreign_capability_disclosed';end if;
 if first_page->>'status' is distinct from 'applied' or jsonb_array_length(first_page->'items') is distinct from 20
 or first_page->'nextCursor'->>'eventRef' is distinct from first_page->'items'->19->>'eventRef' then raise exception 'audit_queue_first_page_invalid';end if;
 second_page:=public.assistant_durable_v1_list_audit('b2000000-0000-4000-8000-000000000001','audit_queue_worker_reference',1,
  first_page->'nextCursor'->>'createdAt',first_page->'nextCursor'->>'eventRef');
 if jsonb_array_length(second_page->'items') is distinct from 1 or second_page->'nextCursor' is distinct from 'null'::jsonb
 or (select count(distinct x->>'eventRef') from jsonb_array_elements((first_page->'items')||(second_page->'items')) x)<>21 then
  raise exception 'audit_queue_keyset_skipped_or_duplicated';end if;
 if (select jsonb_agg(to_jsonb(d) order by d.event_ref) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='fixture.audit.queue') is distinct from before_rows then raise exception 'audit_queue_read_claimed_delivery';end if;
 update public.assistant_audit_delivery_outbox set next_eligible_at=clock_timestamp()+interval '1 hour' where event_ref=first_page->'items'->0->>'eventRef';
 r:=public.assistant_durable_v1_list_audit('b2000000-0000-4000-8000-000000000001','audit_queue_worker_reference',1,'','');
 if exists(select 1 from jsonb_array_elements(r->'items') x where x->>'eventRef'=first_page->'items'->0->>'eventRef') then raise exception 'audit_queue_backoff_ignored';end if;
 update public.assistant_audit_delivery_outbox set version=9007199254740991 where event_ref=second_page->'items'->0->>'eventRef';
 r:=public.assistant_durable_v1_list_audit('b2000000-0000-4000-8000-000000000001','audit_queue_worker_reference',1,
  first_page->'nextCursor'->>'createdAt',first_page->'nextCursor'->>'eventRef');
 if r->'items'->0->>'version' is distinct from '9007199254740991' then raise exception 'audit_queue_exhausted_event_hidden';end if;
 update public.assistant_registered_audit_workers set active=false,authority_version=2 where worker_ref='audit_queue_worker_reference';
 r:=public.assistant_durable_v1_list_audit('b2000000-0000-4000-8000-000000000001','audit_queue_worker_reference',1,'','');
 if r is distinct from jsonb_build_object('status','forbidden') then raise exception 'audit_queue_revoked_worker_disclosed';end if;
end$$;
rollback;
