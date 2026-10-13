-- Disposable SQL regression, not the 23-scenario process driver or W4 approval.
begin;
do $$begin
 if to_regprocedure('public.assistant_durable_v1_issue(uuid,text,text)') is null
 or to_regprocedure('public.assistant_durable_v1_confirm_reserve(uuid,text,text,text,text,text,text,text)') is null then
  raise exception 'atomic_primitives_missing';
 end if;
end$$;
insert into public.assistant_registered_dispatchers values('fixture.atomic','fixture.atomic',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);

create function public.assistant_fixture_fault() returns trigger language plpgsql as $$
begin
 if current_setting('test.assistant.cutpoint',true)=TG_ARGV[0] then
  raise exception 'synthetic_atomic_cutpoint';
 end if;
 return NEW;
end$$;
create trigger fixture_lookup before update on public.assistant_confirmations for each row
 execute function public.assistant_fixture_fault('after_confirmation_lookup');
create trigger fixture_consume after update on public.assistant_confirmations for each row
 execute function public.assistant_fixture_fault('after_confirmation_consume');
create trigger fixture_operation after insert on public.assistant_operations for each row
 execute function public.assistant_fixture_fault('after_operation_insert');
create trigger fixture_command after insert on public.assistant_registered_commands for each row
 execute function public.assistant_fixture_fault('after_command_insert');
create trigger fixture_outbox after insert on public.assistant_effect_outbox for each row
 execute function public.assistant_fixture_fault('after_outbox_insert');
create trigger fixture_commit after insert on public.assistant_audit_delivery_outbox for each row
 execute function public.assistant_fixture_fault('before_commit');

do $$
declare w uuid:='b2000000-0000-4000-8000-000000000001';
 c jsonb; r jsonb; replay jsonb; ref text; point text; n integer:=0; denied boolean;
 key_value text; command_value text; original_request text; role_name text;
begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(role_name,'public.assistant_durable_v1_issue(uuid,text,text)','EXECUTE')
  or has_function_privilege(role_name,'public.assistant_durable_v1_confirm_reserve(uuid,text,text,text,text,text,text,text)','EXECUTE')
  or has_table_privilege(role_name,'public.assistant_registered_commands','INSERT')
  or has_table_privilege(role_name,'public.assistant_original_audit_intents','SELECT')
  or has_table_privilege(role_name,'public.assistant_audit_delivery_outbox','UPDATE') then
   raise exception 'inert_durable_boundary_exposed';
  end if;
 end loop;
 denied:=false;
 begin perform public.assistant_durable_v1_issue(w,'fixture.not.registered',repeat('a',64));
 exception when insufficient_privilege then denied:=true;end;
 -- No production or fixture registration exists for this capability.
 if not denied then raise exception 'unregistered_production_capability_issued';end if;
 c:=public.assistant_durable_v1_issue(w,'fixture.atomic',repeat('a',64));ref:=c->>'confirmationRef';
 if ref !~ '^[0-9a-f]{64}$' or (c->>'expiresAt')::timestamptz-(c->>'issuedAt')::timestamptz<>interval '5 minutes'
 then raise exception 'server_identity_or_ttl_invalid';end if;
 r:=public.assistant_durable_v1_confirm_reserve(w,repeat('f',64),'fixture.atomic',repeat('a',64),
  'atomic_invented_key','fixture.atomic','atomic_invented_command_ref','atomic_request_original');
 if r->>'status'<>'invalid_confirmation' then raise exception 'invented_confirmation_accepted';end if;
 r:=public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('b',64),
  'atomic_changed_digest','fixture.atomic','atomic_changed_command_ref','atomic_request_original');
 if r->>'status'<>'invalid_confirmation' then raise exception 'changed_digest_accepted';end if;
 if exists(select 1 from public.assistant_operations where capability='fixture.atomic') then
  raise exception 'denied_request_reserved_operation';end if;
 -- Role/membership/workspace authority is resolved from the current DB rows.
 update public.workspace_members set role='viewer' where workspace_id=w
  and user_id='a1000000-0000-4000-8000-000000000001';
 denied:=false;
 begin perform public.assistant_durable_v1_issue(w,'fixture.atomic',repeat('a',64));
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'viewer_issued_confirmation';end if;
 update public.workspace_members set role='owner' where workspace_id=w
  and user_id='a1000000-0000-4000-8000-000000000001';
 denied:=false;
 begin perform public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000002','fixture.atomic',repeat('a',64));
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'foreign_workspace_issued';end if;

 foreach point in array array['after_confirmation_lookup','after_confirmation_consume',
  'after_operation_insert','after_command_insert','after_outbox_insert','before_commit'] loop
  n:=n+1;key_value:='atomic_cutpoint_key_'||n;command_value:='atomic_cutpoint_command_ref_'||n;
  c:=public.assistant_durable_v1_issue(w,'fixture.atomic',repeat('a',64));ref:=c->>'confirmationRef';
  perform set_config('test.assistant.cutpoint',point,true);denied:=false;
  begin
   perform public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('a',64),
    key_value,'fixture.atomic',command_value,'atomic_request_original');
  exception when raise_exception then
   if SQLERRM<>'synthetic_atomic_cutpoint' then raise;end if;
   denied:=true;
  end;
  perform set_config('test.assistant.cutpoint','',true);
  if not denied or not exists(select 1 from public.assistant_confirmations
   where workspace_id=w and confirmation_ref=ref and state='issued' and version=1)
  or exists(select 1 from public.assistant_operations where workspace_id=w and idempotency_key=key_value)
  or exists(select 1 from public.assistant_registered_commands where workspace_id=w and command_ref=command_value)
  or exists(select 1 from public.assistant_effect_outbox where workspace_id=w and command_ref=command_value)
  or exists(select 1 from public.assistant_original_audit_intents where capability='fixture.atomic')
  or exists(select 1 from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i
    using(workspace_id,event_ref) where i.capability='fixture.atomic') then
   raise exception 'atomic_rollback_incomplete';
  end if;
 end loop;
 c:=public.assistant_durable_v1_issue(w,'fixture.atomic',repeat('a',64));ref:=c->>'confirmationRef';
 r:=public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('a',64),
  'atomic_success_key','fixture.atomic','atomic_success_command_ref','atomic_request_original');
 if r->>'status'<>'reserved' then raise exception 'positive_reservation_failed';end if;
 replay:=public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('a',64),
  'atomic_success_key','fixture.atomic','atomic_success_command_ref','atomic_request_new_retry');
 if replay->>'status'<>'existing' or replay->>'operationRef'<>r->>'operationRef' then
  raise exception 'exact_replay_failed';end if;
 select request_ref into original_request from public.assistant_original_audit_intents
 where workspace_id=w and operation_ref=r->>'operationRef';
 if original_request<>'atomic_request_original'
 or (select count(*) from public.assistant_effect_outbox where workspace_id=w and operation_ref=r->>'operationRef')<>1
 or (select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i
  using(workspace_id,event_ref) where i.workspace_id=w and i.operation_ref=r->>'operationRef')<>1 then
  raise exception 'original_intent_or_delivery_not_unique';end if;
 replay:=public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('b',64),
  'atomic_success_key','fixture.atomic','atomic_success_command_ref','atomic_request_new_retry');
 if replay->>'status'<>'conflict' then raise exception 'replay_binding_not_checked';end if;
 replay:=public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('a',64),
  'atomic_another_key','fixture.atomic','atomic_another_command_ref','atomic_request_new_retry');
 if replay->>'status'<>'invalid_confirmation' then raise exception 'confirmation_consumed_twice';end if;
 denied:=false;
 begin update public.assistant_original_audit_intents set request_ref='atomic_request_new_retry'
  where workspace_id=w and operation_ref=r->>'operationRef';
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'original_audit_overwritten';end if;
 -- Expiry is checked at exact equality or later, never from supplied client time.
 c:=public.assistant_durable_v1_issue(w,'fixture.atomic',repeat('a',64));ref:=c->>'confirmationRef';
 update public.assistant_confirmations set issued_at=clock_timestamp()-interval '5 minutes',
  expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id=w and confirmation_ref=ref;
 replay:=public.assistant_durable_v1_confirm_reserve(w,ref,'fixture.atomic',repeat('a',64),
  'atomic_expired_key','fixture.atomic','atomic_expired_command_ref','atomic_request_original');
 if replay->>'status'<>'invalid_confirmation' then raise exception 'expired_confirmation_accepted';end if;
end$$;
rollback;
