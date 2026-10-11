-- Disposable private audit worker protocol, no provider or business effects.
begin;
do $$begin
 if to_regprocedure('public.assistant_durable_v1_claim_audit(uuid,text,bigint,text,bigint)') is null
 or to_regprocedure('public.assistant_durable_v1_ack_audit(uuid,text,bigint,text,bigint,bigint,text,text)') is null then
  raise exception 'physical_audit_delivery_missing';end if;
end$$;
insert into public.assistant_registered_dispatchers values('fixture.audit','fixture.audit',1);
insert into public.workspace_members(id,workspace_id,user_id,role,status) values
 ('c3000000-0000-4000-8000-000000000006','b2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','owner','active');
insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values
 ('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_a','a1000000-0000-4000-8000-000000000001','fixture.audit',clock_timestamp()+interval '1 hour'),
 ('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b','a1000000-0000-4000-8000-000000000002','fixture.audit',clock_timestamp()+interval '1 hour');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function public.assistant_audit_fixture_fault() returns trigger language plpgsql as $$
begin if current_setting('test.assistant.audit.fail',true)='on' then raise exception 'synthetic_audit_delivery_rollback';end if;return NEW;end$$;
create trigger assistant_audit_fixture_rollback after update on public.assistant_audit_delivery_outbox
 for each row execute function public.assistant_audit_fixture_fault();
do $$declare c jsonb;r jsonb;op text;e text;claim_a jsonb;claim_b jsonb;original jsonb;before_delivery jsonb;denied boolean;
begin
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.audit',repeat('a',64));
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',c->>'confirmationRef','fixture.audit',repeat('a',64),
 'audit_delivery_idempotency','fixture.audit','audit_delivery_command_reference','audit_delivery_original_request');op:=r->>'operationRef';
 select event_ref,to_jsonb(i) into e,original from public.assistant_original_audit_intents i where i.operation_ref=op;
 select to_jsonb(v) into before_delivery from public.assistant_audit_delivery_outbox v where v.event_ref=e;
 r:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_unregistered_worker_reference',1,e,1);
 if r is distinct from jsonb_build_object('status','forbidden') then raise exception 'audit_unregistered_worker_accepted';end if;
 update public.assistant_registered_audit_workers set active=false,authority_version=2 where worker_ref='audit_fixture_worker_reference_a';
 r:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_a',1,e,1);
 if r is distinct from jsonb_build_object('status','forbidden') then raise exception 'audit_revoked_grant_accepted';end if;
 update public.assistant_registered_audit_workers set active=true,authority_version=3 where worker_ref='audit_fixture_worker_reference_a';
 denied:=false;begin delete from public.assistant_registered_audit_workers where worker_ref='audit_fixture_worker_reference_a';
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'audit_grant_delete_reset_accepted';end if;
 perform set_config('test.assistant.audit.fail','on',true);denied:=false;
 begin perform public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_a',3,e,1);
 exception when raise_exception then if SQLERRM<>'synthetic_audit_delivery_rollback' then raise;end if;denied:=true;end;
 perform set_config('test.assistant.audit.fail','off',true);
 if not denied or (select to_jsonb(v) from public.assistant_audit_delivery_outbox v where v.event_ref=e) is distinct from before_delivery then
  raise exception 'audit_claim_rollback_incomplete';end if;
 claim_a:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_a',3,e,1);
 if claim_a->>'status' is distinct from 'applied' or claim_a->>'version' is distinct from '2' or claim_a->>'fence' is distinct from '1'
 or claim_a->'event'->>'actorId' is distinct from original->>'actor_id' or claim_a->'event'->>'requestId' is distinct from 'audit_delivery_original_request'
 or claim_a->'event'->>'eventRef' is distinct from e then raise exception 'audit_claim_original_content_invalid';end if;
 r:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_a',3,e,2);
 if r is distinct from jsonb_build_object('status','invalid_transition') then raise exception 'audit_live_lease_reclaimed';end if;
 update public.assistant_audit_delivery_outbox set lease_expires_at=clock_timestamp()-interval '1 millisecond' where event_ref=e;
 update public.workspace_members set role='viewer' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
 claim_b:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,2);
 if claim_b->>'status' is distinct from 'applied' or claim_b->>'version' is distinct from '3' or claim_b->>'fence' is distinct from '2'
 or claim_b->'event' is distinct from claim_a->'event' or claim_b->>'claimRef'=claim_a->>'claimRef' then raise exception 'audit_reclaim_changed_original_or_fence';end if;
 update public.workspace_members set role='owner' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 select to_jsonb(v) into before_delivery from public.assistant_audit_delivery_outbox v where v.event_ref=e;
 -- Separate current worker identity; original event identity/content preserved.
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,3,1,claim_a->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','invalid_claim') then raise exception 'audit_stale_claim_accepted';end if;
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,3,3,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','invalid_claim') then raise exception 'audit_future_fence_accepted';end if;
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,4,2,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','version_conflict') then raise exception 'audit_wrong_version_accepted';end if;
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,3,2,repeat('b',64),'audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','invalid_claim') then raise exception 'audit_wrong_claim_proof_accepted';end if;
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_a',3,e,3,2,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','invalid_claim') then raise exception 'audit_wrong_worker_accepted';end if;
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
 insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values
 ('b2000000-0000-4000-8000-000000000002','audit_fixture_worker_reference_c','a1000000-0000-4000-8000-000000000002','fixture.audit',clock_timestamp()+interval '1 hour');
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000002','audit_fixture_worker_reference_c',1,e,3,2,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','not_found') then raise exception 'audit_foreign_workspace_accepted';end if;
 if (select to_jsonb(v) from public.assistant_audit_delivery_outbox v where v.event_ref=e) is distinct from before_delivery then
  raise exception 'audit_fence_denials_changed_persisted_delivery';end if;
 update public.assistant_audit_delivery_outbox set lease_expires_at=clock_timestamp()-interval '1 millisecond' where event_ref=e;
 select to_jsonb(v) into before_delivery from public.assistant_audit_delivery_outbox v where v.event_ref=e;
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,3,2,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','invalid_claim') then raise exception 'audit_expired_lease_accepted';end if;
 if (select to_jsonb(v) from public.assistant_audit_delivery_outbox v where v.event_ref=e) is distinct from before_delivery then
  raise exception 'audit_expiry_denial_changed_delivery';end if;
 -- Grant changes invalidate an old token even when the grant is re-enabled.
 update public.assistant_registered_audit_workers set active=false,authority_version=2 where worker_ref='audit_fixture_worker_reference_b';
 update public.assistant_registered_audit_workers set active=true,authority_version=3 where worker_ref='audit_fixture_worker_reference_b';
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',1,e,3,2,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','forbidden') then raise exception 'audit_reenabled_old_grant_token_accepted';end if;
 claim_b:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',3,e,3);
 if claim_b->>'status' is distinct from 'applied' or claim_b->>'version' is distinct from '4' or claim_b->>'fence' is distinct from '3' then
  raise exception 'audit_successor_claim_invalid';end if;
 select to_jsonb(v) into before_delivery from public.assistant_audit_delivery_outbox v where v.event_ref=e;
 perform set_config('test.assistant.audit.fail','on',true);denied:=false;
 begin perform public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',3,e,4,3,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 exception when raise_exception then if SQLERRM<>'synthetic_audit_delivery_rollback' then raise;end if;denied:=true;end;
 perform set_config('test.assistant.audit.fail','off',true);
 if not denied or (select to_jsonb(v) from public.assistant_audit_delivery_outbox v where v.event_ref=e) is distinct from before_delivery then
  raise exception 'audit_ack_rollback_incomplete';end if;
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',3,e,4,3,claim_b->>'claimRef','audit_fixture_sink_receipt_01');
 if r is distinct from jsonb_build_object('status','applied','version',5) then raise exception 'audit_ack_not_delivered';end if;
 r:=public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',3,e,4,3,claim_b->>'claimRef','audit_fixture_sink_receipt_02');
 if r is distinct from jsonb_build_object('status','version_conflict')
 or not exists(select 1 from public.assistant_audit_delivery_outbox where event_ref=e and state='delivered' and version=5 and fence=3
  and receipt_ref='audit_fixture_sink_receipt_01' and worker_ref is null and claim_ref is null and lease_expires_at is null)
 or (select to_jsonb(i) from public.assistant_original_audit_intents i where i.event_ref=e) is distinct from original then
  raise exception 'audit_lost_reply_rewrote_receipt_or_original';end if;
 update public.workspace_members set role='viewer' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000002';
 denied:=false;begin perform public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',3,e,5);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'audit_revoked_membership_accepted';end if;
 update public.workspace_members set role='owner' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000002';
 update public.assistant_registered_audit_workers set authority_version=4,expires_at=clock_timestamp()-interval '1 millisecond' where worker_ref='audit_fixture_worker_reference_b';
 r:=public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','audit_fixture_worker_reference_b',4,e,5);
 if r is distinct from jsonb_build_object('status','forbidden') then raise exception 'audit_expired_grant_accepted';end if;
end$$;
rollback;
