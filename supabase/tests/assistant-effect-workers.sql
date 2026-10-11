begin;
do $$begin if to_regprocedure('public.assistant_durable_v1_claim_effect(uuid,text,bigint,text,bigint)') is null then raise exception 'physical_effect_claim_missing';end if;end$$;
insert into public.assistant_registered_dispatchers values('fixture.effect.worker','fixture.effect.worker',1);
insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at)
select 'b2000000-0000-4000-8000-000000000001',worker,'a1000000-0000-4000-8000-000000000001','fixture.effect.worker','fixture.effect.worker',1,clock_timestamp()+interval '1 hour'
from unnest(array['effect_fixture_worker_reference_A','effect_fixture_worker_reference_B']) worker;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function pg_temp.effect_fixture(suffix text) returns jsonb language plpgsql as $$
declare w uuid:='b2000000-0000-4000-8000-000000000001';d text:=encode(extensions.digest(convert_to('{}','UTF8'),'sha256'),'hex');c jsonb;r jsonb;b text;
begin
 c:=public.assistant_durable_v1_issue(w,'fixture.effect.worker',d);
 r:=public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.effect.worker',d,'effect_fixture_key_'||suffix,
 'fixture.effect.worker','effect_fixture_command_reference_'||suffix,'effect_original_reservation_request',
 jsonb_build_object('schemaVersion',1,'digestAlgorithm','w3-canonical-json-localeCompare-sha256-v1','producerRuntime','node24_icu77','canonicalArguments','{}'));
 if r->>'status'<>'reserved' then raise exception 'effect_fixture_reservation_failed';end if;
 r:=public.assistant_durable_v1_start_execution(w,r->>'operationRef','fixture.effect.worker',d,1);
 if r->>'status'<>'applied' then raise exception 'effect_fixture_start_failed';end if;
 select outbox_ref into b from public.assistant_effect_outbox where workspace_id=w and operation_ref=r->'record'->>'operationRef';
 return jsonb_build_object('operation',r->'record'->>'operationRef','outbox',b,'digest',d);
end$$;
create function pg_temp.effect_aggregate() returns jsonb language sql as $$select jsonb_build_object(
 'operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x where capability='fixture.effect.worker'),
 'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x where capability='fixture.effect.worker'),
 'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x where capability='fixture.effect.worker'),
 'deliveries',(select jsonb_agg(to_jsonb(x) order by x.event_ref) from public.assistant_audit_delivery_outbox x join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='fixture.effect.worker'))$$;
create function pg_temp.effect_cut() returns trigger language plpgsql as $$begin
 if current_setting('test.assistant.effect.cut',true)='on' then raise exception 'synthetic_effect_ack_cut';end if;return NEW;end$$;
create trigger effect_ack_cut after insert on public.assistant_audit_delivery_outbox for each row execute function pg_temp.effect_cut();
do $$declare w uuid:='b2000000-0000-4000-8000-000000000001';worker text:='effect_fixture_worker_reference_A';f jsonb;r jsonb;b jsonb;before jsonb;
 proof text;counter bigint;denied boolean;original_audit jsonb;delivery jsonb;expiry timestamptz;
begin
 f:=pg_temp.effect_fixture('original');
 select to_jsonb(d) into delivery from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref)
 where i.workspace_id=w and i.operation_ref=f->>'operation' and i.operation_version=1;
 delete from public.assistant_audit_delivery_outbox where workspace_id=w and event_ref=delivery->>'event_ref';
 r:=public.assistant_durable_v1_claim_effect(w,worker,1,f->>'outbox',1);
 if r->>'status'<>'invalid_transition' then raise exception 'effect_missing_original_delivery_claimed';end if;
 insert into public.assistant_audit_delivery_outbox select (jsonb_populate_record(null::public.assistant_audit_delivery_outbox,delivery)).*;
 r:=public.assistant_durable_v1_claim_effect(w,worker,1,f->>'outbox',1);
 if r->>'status'<>'applied' or r->'record'->>'state'<>'dispatching' or (r->'record'->>'version')::bigint<>2 then raise exception 'effect_claim_failed';end if;
 proof:=split_part(r->>'claimFence',':',3);counter:=split_part(r->>'claimFence',':',2)::bigint;
 if counter<>1 or proof !~ '^[0-9a-f]{64}$' or r::text like '%canonical_arguments%' then raise exception 'effect_claim_projection_invalid';end if;
 before:=pg_temp.effect_aggregate();
 delete from public.assistant_audit_delivery_outbox where workspace_id=w and event_ref=delivery->>'event_ref';
 r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 if r->>'status'<>'invalid_transition' then raise exception 'effect_missing_original_delivery_acked';end if;
 insert into public.assistant_audit_delivery_outbox select (jsonb_populate_record(null::public.assistant_audit_delivery_outbox,delivery)).*;
 if pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_missing_delivery_denial_mutated';end if;
 r:=public.assistant_durable_v1_claim_effect(w,worker,1,f->>'outbox',1);
 if r->>'status'<>'version_conflict' or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_duplicate_claim_mutated';end if;
 for counter in select unnest(array[0::bigint,-1::bigint,2::bigint]) loop
  denied:=false;begin r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,counter,proof,'effect_verified_receipt_reference','effect_original_ack_request');
   denied:=r->>'status'<>'applied';exception when invalid_parameter_value then denied:=true;end;
  if not denied or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_wrong_fence_accepted';end if;
 end loop;
 for proof in select unnest(array['malformed',repeat('b',64)]) loop
  denied:=false;begin r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
   denied:=r->>'status'<>'applied';exception when invalid_parameter_value then denied:=true;end;
  if not denied or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_wrong_proof_accepted';end if;
 end loop;
 select claim_ref,lease_expires_at into proof,expiry from public.assistant_effect_outbox where workspace_id=w and outbox_ref=f->>'outbox';
 r:=public.assistant_durable_v1_ack_effect(w,'effect_fixture_worker_reference_B',1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 if r->>'status'='applied' or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_other_worker_accepted';end if;
 r:=public.assistant_durable_v1_ack_effect(w,worker,1,'effect_nonexistent_outbox_reference',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 if r->>'status'<>'not_found' or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_nonexistent_outbox_accepted';end if;
 denied:=false;begin r:=public.assistant_durable_v1_ack_effect('b2000000-0000-4000-8000-000000000002',worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
  denied:=r->>'status'<>'applied';exception when insufficient_privilege then denied:=true;end;
 if not denied or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_other_workspace_accepted';end if;
 update public.assistant_effect_outbox set lease_expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id=w and outbox_ref=f->>'outbox';
 r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 if r->>'status'='applied' then raise exception 'effect_expired_lease_accepted';end if;
 r:=public.assistant_durable_v1_claim_effect(w,worker,1,f->>'outbox',2);
 if r->>'status'<>'invalid_transition' then raise exception 'effect_unknown_expired_claim_redispatched';end if;
 update public.assistant_effect_outbox set lease_expires_at=expiry where workspace_id=w and outbox_ref=f->>'outbox';
 if pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_denials_mutated';end if;
 begin
  update public.assistant_registered_effect_workers set active=false,authority_version=2 where workspace_id=w and worker_ref=worker;
  denied:=false;begin perform public.assistant_durable_v1_ack_effect(w,worker,2,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'effect_revoked_grant_accepted';end if;
  raise exception 'synthetic_effect_grant_rollback';
 exception when raise_exception then if SQLERRM<>'synthetic_effect_grant_rollback' then raise;end if;end;
 select to_jsonb(i) into original_audit from public.assistant_original_audit_intents i where workspace_id=w and operation_ref=f->>'operation' and operation_version=1;
 perform set_config('test.assistant.effect.cut','on',true);denied:=false;
 begin perform public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 exception when raise_exception then if SQLERRM<>'synthetic_effect_ack_cut' then raise;end if;denied:=true;end;
 if not denied or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_ack_atomic_rollback_incomplete';end if;
 perform set_config('test.assistant.effect.cut','off',true);
 r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 if r->>'status'<>'applied' or r->'record'->>'state'<>'delivered' or (r->'record'->>'version')::bigint<>3
 or r->'record'->>'receiptRef'<>'effect_verified_receipt_reference' or r->'record' ? 'leaseExpiresAt' then raise exception 'effect_ack_projection_invalid';end if;
 if not exists(select 1 from public.assistant_operations where workspace_id=w and operation_ref=f->>'operation' and state='effect_applied' and version=3 and receipt_ref='effect_verified_receipt_reference')
 or (select count(*) from public.assistant_original_audit_intents where workspace_id=w and operation_ref=f->>'operation')<>2
 or (select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.workspace_id=w and i.operation_ref=f->>'operation')<>2
 or (select to_jsonb(i) from public.assistant_original_audit_intents i where workspace_id=w and operation_ref=f->>'operation' and operation_version=1) is distinct from original_audit
 or not exists(select 1 from public.assistant_original_audit_intents where workspace_id=w and operation_ref=f->>'operation' and operation_version=3 and event='assistant.operation.effect_applied' and request_ref='effect_original_ack_request') then raise exception 'effect_ack_atomic_audit_missing';end if;
 before:=pg_temp.effect_aggregate();
 r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_different_receipt_reference','effect_new_retry_request');
 if r->>'status'<>'version_conflict' or pg_temp.effect_aggregate() is distinct from before then raise exception 'effect_ack_retry_replaced_original';end if;
 f:=pg_temp.effect_fixture('quarantine');r:=public.assistant_durable_v1_claim_effect(w,worker,1,f->>'outbox',1);
 proof:=split_part(r->>'claimFence',':',3);
 r:=public.assistant_durable_v1_require_reconciliation(w,f->>'operation','fixture.effect.worker',f->>'digest',2,'internal_safe','effect_uncertain_recovery_request');
 if r->>'status'<>'applied' then raise exception 'effect_claim_quarantine_failed';end if;
 r:=public.assistant_durable_v1_ack_effect(w,worker,1,f->>'outbox',2,1,proof,'effect_verified_receipt_reference','effect_original_ack_request');
 if r->>'status'<>'version_conflict' then raise exception 'effect_quarantined_claim_acked';end if;
 f:=pg_temp.effect_fixture('expiry');
 update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id=w and worker_ref=worker;
 denied:=false;begin perform public.assistant_durable_v1_claim_effect(w,worker,2,f->>'outbox',1);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'effect_expired_grant_accepted';end if;
end$$;
rollback;
