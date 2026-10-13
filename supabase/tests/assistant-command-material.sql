begin;
do $$begin if to_regprocedure('public.assistant_durable_v1_confirm_reserve_material(uuid,text,text,text,text,text,text,text,jsonb)') is null then
 raise exception 'physical_command_material_missing';end if;end$$;
insert into public.assistant_registered_dispatchers values('fixture.command.material','fixture.command.material',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function pg_temp.material_cut() returns trigger language plpgsql as $$
begin if current_setting('test.assistant.material.cut',true)='on' then raise exception 'synthetic_material_cutpoint';end if;return NEW;end$$;
create trigger material_cut after insert on public.assistant_command_material for each row execute function pg_temp.material_cut();
do $$declare w uuid:='b2000000-0000-4000-8000-000000000001';canonical text:='{"customerRef":"synthetic_customer_reference","label":"fixture"}';
 d text;m jsonb;c jsonb;r jsonb;before_confirmation jsonb;before_material jsonb;denied boolean;
begin
 d:=encode(extensions.digest(convert_to(canonical,'UTF8'),'sha256'),'hex');
 m:=jsonb_build_object('schemaVersion',1,'digestAlgorithm','w3-canonical-json-localeCompare-sha256-v1','producerRuntime','node24_icu77','canonicalArguments',canonical);
 c:=public.assistant_durable_v1_issue(w,'fixture.command.material',d);
 select to_jsonb(x) into before_confirmation from public.assistant_confirmations x where confirmation_ref=c->>'confirmationRef';
 perform set_config('test.assistant.material.cut','on',true);
 denied:=false;
 begin perform public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.command.material',d,
  'material_atomic_idempotency','fixture.command.material','material_atomic_command_reference','material_original_request',m);
 exception when raise_exception then if SQLERRM<>'synthetic_material_cutpoint' then raise;end if;denied:=true;end;
 if not denied then raise exception 'material_cutpoint_not_detected';end if;
 if (select to_jsonb(x) from public.assistant_confirmations x where confirmation_ref=c->>'confirmationRef') is distinct from before_confirmation
  or exists(select 1 from public.assistant_operations where capability='fixture.command.material')
  or exists(select 1 from public.assistant_registered_commands where capability='fixture.command.material')
  or exists(select 1 from public.assistant_effect_outbox where capability='fixture.command.material')
  or exists(select 1 from public.assistant_original_audit_intents where capability='fixture.command.material')
  or exists(select 1 from public.assistant_command_material where command_ref='material_atomic_command_reference') then
  raise exception 'material_failure_did_not_rollback_entire_reservation';end if;
 perform set_config('test.assistant.material.cut','off',true);
 r:=public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.command.material',d,
  'material_atomic_idempotency','fixture.command.material','material_atomic_command_reference','material_original_request',m);
 if r->>'status' is distinct from 'reserved' then raise exception 'material_reservation_failed';end if;
 select to_jsonb(x) into before_material from public.assistant_command_material x where command_ref='material_atomic_command_reference';
 if before_material->>'canonical_arguments' is distinct from canonical or before_material->'arguments' is distinct from canonical::jsonb
  or before_material->>'arguments_digest' is distinct from d
  or (select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.operation_ref=r->>'operationRef')<>1
  or r::text like '%canonicalArguments%' or r::text like '%synthetic_customer_reference%' then raise exception 'material_projection_or_atomic_delivery_invalid';end if;
 r:=public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.command.material',d,
  'material_atomic_idempotency','fixture.command.material','material_atomic_command_reference','material_retry_new_request',m||jsonb_build_object('producerRuntime','node24_icu78'));
 if r->>'status' is distinct from 'existing' or (select to_jsonb(x) from public.assistant_command_material x where command_ref='material_atomic_command_reference') is distinct from before_material then raise exception 'material_replay_overwrote_original';end if;
 denied:=false;begin update public.assistant_command_material set canonical_arguments='{}' where command_ref='material_atomic_command_reference';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'material_mutated';end if;
 denied:=false;begin delete from public.assistant_command_material where command_ref='material_atomic_command_reference';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'material_deleted';end if;
 denied:=false;begin perform public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.command.material',repeat('b',64),
  'material_atomic_idempotency','fixture.command.material','material_atomic_command_reference','material_original_request',m);exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'material_changed_digest_accepted';end if;
 denied:=false;begin perform public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.command.material',d,
  'material_atomic_idempotency','fixture.command.material','material_atomic_command_reference','material_original_request',m||jsonb_build_object('schemaVersion',2));exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'material_changed_schema_accepted';end if;
 c:=public.assistant_durable_v1_issue(w,'fixture.command.material',d);
 r:=public.assistant_durable_v1_confirm_reserve(w,c->>'confirmationRef','fixture.command.material',d,
  'material_legacy_idempotency','fixture.command.material','material_legacy_command_reference','material_original_request');
 denied:=false;begin perform public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.command.material',d,
  'material_legacy_idempotency','fixture.command.material','material_legacy_command_reference','material_original_request',m);
 exception when invalid_parameter_value then if SQLERRM<>'assistant_command_material_conflict' then raise;end if;denied:=true;end;
 if not denied or exists(select 1 from public.assistant_command_material where command_ref='material_legacy_command_reference') then raise exception 'material_legacy_silently_promoted';end if;
end$$;
rollback;
