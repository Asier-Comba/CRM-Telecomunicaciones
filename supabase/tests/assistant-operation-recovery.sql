-- Disposable physical recovery admission, not effect verification or completion.
begin;
do $$begin
 if to_regprocedure('public.assistant_durable_v1_load_operation(uuid,text)') is null
 or to_regprocedure('public.assistant_durable_v1_require_reconciliation(uuid,text,text,text,bigint,text,text)') is null then
  raise exception 'physical_operation_recovery_missing';end if;
end$$;
insert into public.assistant_registered_dispatchers values('fixture.recovery','fixture.recovery',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function public.assistant_recovery_fixture_fault() returns trigger language plpgsql as $$
begin
 if NEW.event='assistant.operation.recovery_required' and current_setting('test.assistant.recovery.fail',true)='on' then
  raise exception 'synthetic_recovery_rollback';end if;return NEW;
end$$;
create trigger assistant_recovery_fixture_rollback after insert on public.assistant_original_audit_intents
 for each row execute function public.assistant_recovery_fixture_fault();
do $$declare c jsonb;r jsonb;op text;before_record jsonb;denied boolean;event_id text;
begin
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.recovery',repeat('a',64));
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',c->>'confirmationRef','fixture.recovery',repeat('a',64),
 'recovery_idempotency_key','fixture.recovery','recovery_command_reference','recovery_original_request');op:=r->>'operationRef';
 before_record:=public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001',op);
 if before_record<>r->'record' then raise exception 'authorized_recovery_projection_invalid';end if;
 if public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001',repeat('f',64)) is not null then
  raise exception 'invented_operation_materialized';end if;
 insert into public.workspace_members(id,workspace_id,user_id,role,status) values
 ('c3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','member','active');
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
 if public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001',op) is not null then raise exception 'cross_actor_operation_leaked';end if;
 if public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000002',op) is not null then raise exception 'cross_workspace_operation_leaked';end if;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),1,'internal_safe','recovery_original_request');
 if r<>jsonb_build_object('status','not_found') then raise exception 'cross_actor_recovery_accepted';end if;
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
 update public.workspace_members set role='viewer' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 denied:=false;begin perform public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001',op);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'revoked_operation_read_accepted';end if;
 denied:=false;begin perform public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),1,'internal_safe','recovery_original_request');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'revoked_operation_recovery_accepted';end if;
 update public.workspace_members set role='owner' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),1,'internal_safe','recovery_original_request');
 if r<>jsonb_build_object('status','invalid_transition') then raise exception 'reserved_operation_promoted_by_recovery';end if;
 -- Fixture-only state arrangement: no executor exists or is claimed by this test.
 update public.assistant_operations set state='executing',version=2 where workspace_id='b2000000-0000-4000-8000-000000000001' and operation_ref=op;
 update public.assistant_effect_outbox set state='dispatching',version=2,fence=1,worker_ref='synthetic_original_worker',lease_expires_at=clock_timestamp()+interval '5 minutes'
 where workspace_id='b2000000-0000-4000-8000-000000000001' and operation_ref=op;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('b',64),2,'internal_safe','recovery_original_request');
 if r<>jsonb_build_object('status','binding_mismatch') then raise exception 'recovery_changed_digest_accepted';end if;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),1,'internal_safe','recovery_original_request');
 if r<>jsonb_build_object('status','version_conflict') then raise exception 'recovery_stale_version_accepted';end if;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),2,'temporary_unavailable','recovery_original_request');
 if r<>jsonb_build_object('status','invalid_transition') then raise exception 'recovery_unexpired_lease_expired';end if;
 perform set_config('test.assistant.recovery.fail','on',true);denied:=false;
 begin perform public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),2,'internal_safe','recovery_original_request');
 exception when raise_exception then if SQLERRM<>'synthetic_recovery_rollback' then raise;end if;denied:=true;end;
 perform set_config('test.assistant.recovery.fail','off',true);
 if not denied or not exists(select 1 from public.assistant_operations where operation_ref=op and state='executing' and version=2)
 or not exists(select 1 from public.assistant_effect_outbox where operation_ref=op and state='dispatching' and version=2 and fence=1 and worker_ref='synthetic_original_worker')
 or (select count(*) from public.assistant_original_audit_intents where operation_ref=op)<>1
 or (select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.operation_ref=op)<>1 then
  raise exception 'recovery_rollback_incomplete';end if;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),2,'internal_safe','recovery_original_request');
 if r->>'status'<>'applied' or r->'record'->>'state'<>'reconciliation_required' or (r->'record'->>'version')::bigint<>3
 or r->'record'->>'failureCode'<>'internal_safe' or r->'record'->'binding'<>before_record->'binding' then raise exception 'recovery_transition_invalid';end if;
 if not exists(select 1 from public.assistant_effect_outbox where operation_ref=op and state='reconciliation_required' and version=3 and fence=2 and worker_ref is null)
 or (select count(*) from public.assistant_original_audit_intents where operation_ref=op)<>2
 or (select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.operation_ref=op)<>2 then
  raise exception 'recovery_atomic_audit_delivery_missing';end if;
 select event_ref into event_id from public.assistant_original_audit_intents where operation_ref=op and operation_version=3;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),2,'internal_safe','recovery_retry_request');
 if r<>jsonb_build_object('status','version_conflict') or not exists(select 1 from public.assistant_original_audit_intents where event_ref=event_id and request_ref='recovery_original_request') then
  raise exception 'recovery_retry_replaced_original_audit';end if;
 update public.assistant_operations set state='completed' where operation_ref=op;
 if public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001',op) is not null then raise exception 'unsupported_completed_result_materialized';end if;
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.recovery',repeat('a',64));
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',c->>'confirmationRef','fixture.recovery',repeat('a',64),
 'recovery_exhausted_key','fixture.recovery','recovery_exhausted_command_ref','recovery_original_request');op:=r->>'operationRef';
 update public.assistant_operations set state='executing',version=2 where operation_ref=op;
 update public.assistant_effect_outbox set fence=9007199254740991 where operation_ref=op;
 denied:=false;
 begin perform public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),2,'internal_safe','recovery_original_request');
 exception when invalid_parameter_value then if SQLERRM<>'assistant_version_exhausted' then raise;end if;denied:=true;end;
 if not denied or not exists(select 1 from public.assistant_operations where operation_ref=op and state='executing' and version=2)
 or (select count(*) from public.assistant_original_audit_intents where operation_ref=op)<>1 then raise exception 'recovery_exhausted_fence_changed_state';end if;
 update public.assistant_effect_outbox set fence=0 where operation_ref=op;
 update public.assistant_operations set created_at=clock_timestamp()-interval '6 minutes',lease_expires_at=clock_timestamp()-interval '1 millisecond',updated_at=clock_timestamp() where operation_ref=op;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001',op,'fixture.recovery',repeat('a',64),2,'temporary_unavailable','recovery_original_request');
 if r->>'status'<>'applied' or r->'record'->>'failureCode'<>'temporary_unavailable' then raise exception 'expired_execution_not_quarantined';end if;
 insert into public.assistant_operations(workspace_id,operation_ref,actor_id,capability,idempotency_key,arguments_digest,state)
 values('b2000000-0000-4000-8000-000000000001','legacy_unassociated_operation_ref','a1000000-0000-4000-8000-000000000001','fixture.recovery','legacy_unassociated_key',repeat('a',64),'executing');
 if public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001','legacy_unassociated_operation_ref') is not null then raise exception 'legacy_operation_admitted';end if;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001','legacy_unassociated_operation_ref','fixture.recovery',repeat('a',64),1,'internal_safe','recovery_original_request');
 if r<>jsonb_build_object('status','invalid_transition') then raise exception 'legacy_operation_promoted';end if;
 -- Metadata association alone cannot upgrade a pre-transaction legacy row.
 insert into public.assistant_registered_commands(workspace_id,command_ref,operation_ref,actor_id,capability,arguments_digest,dispatcher_key,schema_version,created_at)
 values('b2000000-0000-4000-8000-000000000001','legacy_associated_command_ref','legacy_unassociated_operation_ref','a1000000-0000-4000-8000-000000000001','fixture.recovery',repeat('a',64),'fixture.recovery',1,clock_timestamp());
 insert into public.assistant_effect_outbox(workspace_id,outbox_ref,operation_ref,actor_id,capability,arguments_digest,dispatcher_key,command_ref)
 values('b2000000-0000-4000-8000-000000000001','legacy_associated_outbox_ref','legacy_unassociated_operation_ref','a1000000-0000-4000-8000-000000000001','fixture.recovery',repeat('a',64),'fixture.recovery','legacy_associated_command_ref');
 if public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001','legacy_unassociated_operation_ref') is not null then raise exception 'metadata_only_legacy_operation_admitted';end if;
 r:=public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001','legacy_unassociated_operation_ref','fixture.recovery',repeat('a',64),1,'internal_safe','recovery_original_request');
 if r<>jsonb_build_object('status','invalid_transition') then raise exception 'metadata_only_legacy_operation_promoted';end if;
end$$;
rollback;
