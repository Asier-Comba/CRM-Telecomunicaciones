begin;
create function public.assistant_cancel_fixture_fault() returns trigger language plpgsql as $$
begin
 if NEW.state='cancelled' and current_setting('test.assistant.cancel.fail',true)='on' then
  raise exception 'synthetic_cancel_rollback';end if;return NEW;
end$$;
create trigger assistant_cancel_fixture_rollback after update on public.assistant_confirmations
 for each row execute function public.assistant_cancel_fixture_fault();
insert into public.assistant_registered_dispatchers values('fixture.cancel','fixture.cancel',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$declare c jsonb;r jsonb;ref text;denied boolean;role_name text;
begin
 if to_regprocedure('public.assistant_durable_v1_cancel(uuid,text,text,text)') is null then
  raise exception 'physical_confirmation_cancel_missing';end if;
 foreach role_name in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(role_name,'public.assistant_durable_v1_cancel(uuid,text,text,text)','EXECUTE') then
   raise exception 'cancel_client_grant_exposed';end if;
 end loop;
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.cancel',repeat('a',64));ref:=c->>'confirmationRef';
 r:=public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('b',64));
 if r<>jsonb_build_object('status','binding_mismatch') then raise exception 'cancel_changed_digest_accepted';end if;
 update public.workspace_members set role='viewer' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 denied:=false;
 begin perform public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64));
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'revoked_writer_cancelled';end if;
 update public.workspace_members set role='owner' where workspace_id='b2000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000001';
 perform set_config('test.assistant.cancel.fail','on',true);denied:=false;
 begin perform public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64));
 exception when raise_exception then
  if SQLERRM<>'synthetic_cancel_rollback' then raise;end if;denied:=true;end;
 perform set_config('test.assistant.cancel.fail','off',true);
 if not denied or not exists(select 1 from public.assistant_confirmations where workspace_id='b2000000-0000-4000-8000-000000000001'
  and confirmation_ref=ref and state='issued' and version=1) then raise exception 'cancel_rollback_incomplete';end if;
 r:=public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64));
 if r->>'status'<>'applied' or r->'record'->>'operationRef'<>ref or r->'record'->>'state'<>'cancelled'
 or (r->'record'->>'version')::bigint<>2 or r->'record'->'binding'<>c->'record'->'binding'
 or r->'record'->>'issuedAt'<>c->'record'->>'issuedAt' or r->'record'->>'expiresAt'<>c->'record'->>'expiresAt' then
  raise exception 'cancel_projection_or_transition_invalid';end if;
 r:=public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64));
 if r<>jsonb_build_object('status','already_terminal') then raise exception 'cancel_replayed_mutation';end if;
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64),
  'cancelled_proof_reserve_key','fixture.cancel','cancelled_proof_command_ref','cancelled_proof_original_request');
 if r<>jsonb_build_object('status','invalid_confirmation') then raise exception 'cancelled_confirmation_reserved';end if;
 if exists(select 1 from public.assistant_operations where capability='fixture.cancel') then raise exception 'cancel_created_operation';end if;
 r:=public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',repeat('f',64),'fixture.cancel',repeat('a',64));
 if r<>jsonb_build_object('status','not_found') then raise exception 'cancel_invented_confirmation_inserted';end if;
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.cancel',repeat('a',64));ref:=c->>'confirmationRef';
 update public.assistant_confirmations set version=9007199254740991 where workspace_id='b2000000-0000-4000-8000-000000000001' and confirmation_ref=ref;
 denied:=false;
 begin perform public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64));
 exception when invalid_parameter_value then
  if SQLERRM<>'assistant_version_exhausted' then raise;end if;denied:=true;end;
 if not denied or not exists(select 1 from public.assistant_confirmations where workspace_id='b2000000-0000-4000-8000-000000000001'
  and confirmation_ref=ref and state='issued' and version=9007199254740991) then raise exception 'cancel_unsafe_successor';end if;
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.cancel',repeat('a',64));ref:=c->>'confirmationRef';
 update public.assistant_confirmations set issued_at=clock_timestamp()-interval '5 minutes',expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id='b2000000-0000-4000-8000-000000000001' and confirmation_ref=ref;
 r:=public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',ref,'fixture.cancel',repeat('a',64));
 if r<>jsonb_build_object('status','expired') or not exists(select 1 from public.assistant_confirmations where workspace_id='b2000000-0000-4000-8000-000000000001' and confirmation_ref=ref and state='expired' and version=2) then
  raise exception 'cancel_revived_expired_proof';end if;
end$$;
rollback;
