-- Disposable lifecycle admission only. No worker claim or business effect.
begin;
do $$begin
 if to_regprocedure('public.assistant_durable_v1_start_execution(uuid,text,text,text,bigint)') is null then
  raise exception 'physical_start_execution_missing';end if;
end$$;
insert into public.assistant_registered_dispatchers values('fixture.start','fixture.start',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function public.assistant_start_fixture_fault() returns trigger language plpgsql as $$
begin if NEW.state='executing' and current_setting('test.assistant.start.fail',true)='on' then
 raise exception 'synthetic_start_rollback';end if;return NEW;end$$;
create trigger assistant_start_fixture_rollback after update on public.assistant_operations
 for each row execute function public.assistant_start_fixture_fault();
do $$declare c jsonb;r jsonb;op text;before_record jsonb;audit_before jsonb;denied boolean;
begin
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.start',repeat('a',64));
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',c->>'confirmationRef','fixture.start',repeat('a',64),
 'start_idempotency_key','fixture.start','start_command_reference_01','start_original_request');op:=r->>'operationRef';before_record:=r->'record';
 select to_jsonb(i) into audit_before from public.assistant_original_audit_intents i where i.operation_ref=op;
 denied:=false;begin perform public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),9007199254740991);
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'start_exhausted_version_accepted';end if;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('b',64),1);
 if r is distinct from jsonb_build_object('status','binding_mismatch') then raise exception 'start_changed_digest_accepted';end if;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),2);
 if r is distinct from jsonb_build_object('status','version_conflict') then raise exception 'start_stale_version_accepted';end if;
 insert into public.workspace_members(id,workspace_id,user_id,role,status)
 values('c3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','owner','active');
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 if r is distinct from jsonb_build_object('status','not_found') then raise exception 'start_cross_actor_accepted';end if;
 perform set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
 insert into public.workspace_members(id,workspace_id,user_id,role,status)
 values('c3000000-0000-4000-8000-000000000005','b2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','owner','active');
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000002',op,'fixture.start',repeat('a',64),1);
 if r is distinct from jsonb_build_object('status','not_found') then raise exception 'start_cross_workspace_accepted';end if;
 update public.workspace_members set role='viewer' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 denied:=false;begin perform public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'start_revoked_permission_accepted';end if;
 update public.workspace_members set role='owner' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 perform set_config('test.assistant.start.fail','on',true);denied:=false;
 begin perform public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 exception when raise_exception then if SQLERRM is distinct from 'synthetic_start_rollback' then raise;end if;denied:=true;end;
 perform set_config('test.assistant.start.fail','off',true);
 if not denied or public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001',op) is distinct from before_record then
  raise exception 'start_rollback_incomplete';end if;
 update public.assistant_effect_outbox set state='dispatching',worker_ref='start_illegal_worker_reference',fence=1 where operation_ref=op;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 if r is distinct from jsonb_build_object('status','invalid_transition') then raise exception 'start_claimed_outbox_accepted';end if;
 update public.assistant_effect_outbox set state='pending',worker_ref=null,fence=0 where operation_ref=op;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 if r->>'status' is distinct from 'applied' or r->'record'->>'state' is distinct from 'executing' or r->'record'->>'version' is distinct from '2'
 or r->'record'->'binding' is distinct from before_record->'binding'
 or (r->'record'->>'leaseExpiresAt')::timestamptz-(r->'record'->>'updatedAt')::timestamptz is distinct from interval '5 minutes' then
  raise exception 'start_projection_invalid';end if;
 if not exists(select 1 from public.assistant_effect_outbox where operation_ref=op and state='pending' and version=1 and fence=0 and worker_ref is null and receipt_ref is null)
 or (select count(*) from public.assistant_original_audit_intents where operation_ref=op) is distinct from 1
 or (select count(*) from public.assistant_audit_delivery_outbox v join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.operation_ref=op) is distinct from 1 then
  raise exception 'start_modified_effect_or_original_audit';end if;
 if (select to_jsonb(i) from public.assistant_original_audit_intents i where i.operation_ref=op) is distinct from audit_before then
  raise exception 'start_rewrote_original_audit';end if;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 if r is distinct from jsonb_build_object('status','version_conflict') then raise exception 'start_lost_reply_reapplied';end if;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),2);
 if r is distinct from jsonb_build_object('status','invalid_transition') then raise exception 'start_executing_restarted';end if;
 update public.assistant_operations set state='reserved',version=1,created_at=clock_timestamp()-interval '6 minutes',lease_expires_at=clock_timestamp()-interval '1 millisecond' where operation_ref=op;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 if r is distinct from jsonb_build_object('status','invalid_transition') then raise exception 'start_expired_reservation_accepted';end if;
 -- An association without the original audited reservation is not authority.
 delete from public.assistant_audit_delivery_outbox where event_ref in(select event_ref from public.assistant_original_audit_intents where operation_ref=op);
 update public.assistant_operations set lease_expires_at=clock_timestamp()+interval '5 minutes' where operation_ref=op;
 r:=public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001',op,'fixture.start',repeat('a',64),1);
 if r is distinct from jsonb_build_object('status','invalid_transition') then raise exception 'start_unaudited_legacy_accepted';end if;
end$$;
rollback;
