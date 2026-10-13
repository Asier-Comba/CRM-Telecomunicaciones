begin;
do $$begin if to_regprocedure('public.assistant_durable_v1_reserve_material(uuid,text,bigint,text,text,text,text,text,text,jsonb)') is null then raise exception 'physical_unconfirmed_reservation_missing';end if;end$$;
insert into public.assistant_registered_dispatchers values('fixture.unconfirmed','fixture.unconfirmed',1),('fixture.unconfirmed.absent','fixture.unconfirmed.absent',1);
insert into public.assistant_unconfirmed_policies values('fixture.unconfirmed','fixture.unconfirmed',1,'SAFE_WRITE','none');
insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at)
values('b2000000-0000-4000-8000-000000000001','unconfirmed_worker_reference_001','a1000000-0000-4000-8000-000000000001','fixture.unconfirmed','fixture.unconfirmed',1,clock_timestamp()+interval '1 hour'),
('b2000000-0000-4000-8000-000000000001','unconfirmed_absent_worker_ref','a1000000-0000-4000-8000-000000000001','fixture.unconfirmed.absent','fixture.unconfirmed.absent',1,clock_timestamp()+interval '1 hour');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function pg_temp.unconfirmed_fixture(suffix text) returns jsonb language plpgsql as $$
begin return public.assistant_durable_v1_reserve_material('b2000000-0000-4000-8000-000000000001','unconfirmed_worker_reference_001',1,
 'fixture.unconfirmed',encode(extensions.digest(convert_to('{}','UTF8'),'sha256'),'hex'),'unconfirmed_fixture_key_'||suffix,
 'fixture.unconfirmed','unconfirmed_command_reference_'||suffix,'unconfirmed_original_request',
 jsonb_build_object('schemaVersion',1,'digestAlgorithm','w3-canonical-json-localeCompare-sha256-v1','producerRuntime','node24_icu77','canonicalArguments','{}'));end$$;
create function pg_temp.unconfirmed_aggregate() returns jsonb language sql as $$select jsonb_build_object(
 'confirmations',(select jsonb_agg(to_jsonb(x) order by confirmation_ref) from public.assistant_confirmations x),
 'operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x),
 'commands',(select jsonb_agg(to_jsonb(x) order by command_ref) from public.assistant_registered_commands x),
 'materials',(select jsonb_agg(to_jsonb(x) order by command_ref) from public.assistant_command_material x),
 'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x),
 'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x),
 'deliveries',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_audit_delivery_outbox x))$$;
create function pg_temp.unconfirmed_cut() returns trigger language plpgsql as $$begin
 if current_setting('test.assistant.unconfirmed.cut',true)=TG_TABLE_NAME then raise exception 'synthetic_unconfirmed_cut';end if;return NEW;end$$;
create trigger unconfirmed_operation_cut after insert on public.assistant_operations for each row execute function pg_temp.unconfirmed_cut();
create trigger unconfirmed_command_cut after insert on public.assistant_registered_commands for each row execute function pg_temp.unconfirmed_cut();
create trigger unconfirmed_material_cut after insert on public.assistant_command_material for each row execute function pg_temp.unconfirmed_cut();
create trigger unconfirmed_outbox_cut after insert on public.assistant_effect_outbox for each row execute function pg_temp.unconfirmed_cut();
create trigger unconfirmed_audit_cut after insert on public.assistant_original_audit_intents for each row execute function pg_temp.unconfirmed_cut();
create trigger unconfirmed_delivery_cut after insert on public.assistant_audit_delivery_outbox for each row execute function pg_temp.unconfirmed_cut();
do $$declare r jsonb;before jsonb;cut text;denied boolean;d text:=encode(extensions.digest(convert_to('{}','UTF8'),'sha256'),'hex');m jsonb;
 w uuid:='b2000000-0000-4000-8000-000000000001';confirmation_count bigint;t timestamptz;
begin
 m:=jsonb_build_object('schemaVersion',1,'digestAlgorithm','w3-canonical-json-localeCompare-sha256-v1','producerRuntime','node24_icu77','canonicalArguments','{}');
 before:=pg_temp.unconfirmed_aggregate();
 foreach cut in array array['assistant_operations','assistant_registered_commands','assistant_command_material','assistant_effect_outbox','assistant_original_audit_intents','assistant_audit_delivery_outbox'] loop
  perform set_config('test.assistant.unconfirmed.cut',cut,true);denied:=false;
  begin perform pg_temp.unconfirmed_fixture('cut');exception when raise_exception then if sqlerrm='synthetic_unconfirmed_cut' then denied:=true;else raise;end if;end;
  perform set_config('test.assistant.unconfirmed.cut','',true);
  if not denied or pg_temp.unconfirmed_aggregate() is distinct from before then raise exception 'unconfirmed_atomic_rollback_incomplete';end if;
 end loop;
 foreach cut in array array['missing','null','digest','schema','runtime'] loop
  denied:=false;
  begin perform public.assistant_durable_v1_reserve_material(w,'unconfirmed_worker_reference_001',1,'fixture.unconfirmed',d,'unconfirmed_invalid_key_001','fixture.unconfirmed','unconfirmed_invalid_command_001','unconfirmed_original_request',
   case cut when 'missing' then m-'canonicalArguments' when 'null' then null when 'digest' then jsonb_set(m,'{canonicalArguments}','"{\"label\":\"changed\"}"') when 'schema' then jsonb_set(m,'{schemaVersion}','2') else jsonb_set(m,'{producerRuntime}','null') end);
  exception when invalid_parameter_value or insufficient_privilege then denied:=true;end;
  if not denied or pg_temp.unconfirmed_aggregate() is distinct from before then raise exception 'unconfirmed_invalid_material_accepted';end if;
 end loop;
 denied:=false;begin perform public.assistant_durable_v1_reserve_material(w,'unconfirmed_absent_worker_ref',1,'fixture.unconfirmed.absent',d,'unconfirmed_absent_key_001','fixture.unconfirmed.absent','unconfirmed_absent_command_001','unconfirmed_original_request',m);
 exception when insufficient_privilege then denied:=true;end;
 if not denied or pg_temp.unconfirmed_aggregate() is distinct from before then raise exception 'unconfirmed_unregistered_policy_accepted';end if;
 select expires_at into t from public.assistant_registered_effect_workers where worker_ref='unconfirmed_worker_reference_001';
 update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()-interval '1 second' where worker_ref='unconfirmed_worker_reference_001';
 denied:=false;begin perform public.assistant_durable_v1_reserve_material(w,'unconfirmed_worker_reference_001',2,'fixture.unconfirmed',d,'unconfirmed_expired_key_001','fixture.unconfirmed','unconfirmed_expired_command_001','unconfirmed_original_request',m);
 exception when insufficient_privilege then denied:=true;end;
 if not denied or pg_temp.unconfirmed_aggregate() is distinct from before then raise exception 'unconfirmed_expired_grant_accepted';end if;
 update public.assistant_registered_effect_workers set authority_version=3,expires_at=t where worker_ref='unconfirmed_worker_reference_001';
 -- Restore only this rolled-back fixture's grant to its current checked version.
 update public.assistant_registered_effect_workers set authority_version=4 where worker_ref='unconfirmed_worker_reference_001';
 -- The shared fixture helper pins version1, so success uses the actual version4.
 select count(*) into confirmation_count from public.assistant_confirmations;
 r:=public.assistant_durable_v1_reserve_material(w,'unconfirmed_worker_reference_001',4,'fixture.unconfirmed',d,'unconfirmed_original_key_001','fixture.unconfirmed','unconfirmed_original_command_001','unconfirmed_original_request',m);
 if r->>'status'<>'reserved' or r->'record'->>'state'<>'reserved' or (r->'record'->>'version')::int<>1 then raise exception 'unconfirmed_reservation_not_created';end if;
 if (select count(*) from public.assistant_confirmations)<>confirmation_count or exists(select 1 from public.assistant_operations where operation_ref=r->'record'->>'operationRef' and confirmation_ref is not null) then raise exception 'unconfirmed_fabricated_confirmation';end if;
 if (select canonical_arguments from public.assistant_command_material where command_ref='unconfirmed_original_command_001') is distinct from '{}' then raise exception 'unconfirmed_original_material_missing';end if;
 before:=pg_temp.unconfirmed_aggregate();
 r:=public.assistant_durable_v1_reserve_material(w,'unconfirmed_worker_reference_001',4,'fixture.unconfirmed',d,'unconfirmed_original_key_001','fixture.unconfirmed','unconfirmed_original_command_001','unconfirmed_replaced_retry_request',m);
 if r->>'status'<>'existing' or pg_temp.unconfirmed_aggregate() is distinct from before then raise exception 'unconfirmed_retry_replaced_original_ledger';end if;
 r:=public.assistant_durable_v1_reserve_material(w,'unconfirmed_worker_reference_001',4,'fixture.unconfirmed',d,'unconfirmed_original_key_001','fixture.unconfirmed','unconfirmed_changed_command_001','unconfirmed_replaced_retry_request',m);
 if r->>'status'<>'conflict' or pg_temp.unconfirmed_aggregate() is distinct from before then raise exception 'unconfirmed_command_conflict_accepted';end if;
 denied:=false;begin update public.assistant_unconfirmed_policies set confirmation_policy='none';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'unconfirmed_policy_mutable';end if;
end$$;
rollback;
