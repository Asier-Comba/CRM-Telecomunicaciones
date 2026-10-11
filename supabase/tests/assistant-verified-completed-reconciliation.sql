begin;
do $$begin if to_regprocedure('public.assistant_durable_v1_reconcile_completed(uuid,text,bigint,text,bigint,text,integer,text,text,text,text)') is null then raise exception 'physical_positive_reconciliation_missing';end if;end$$;
do $$begin if to_regprocedure('public.assistant_durable_v1_complete(uuid,text,bigint,text,bigint,text,integer,text,text,text,text)') is null then raise exception 'physical_safe_completion_missing';end if;end$$;
insert into public.assistant_registered_dispatchers values('fixture.completion','fixture.completion',1);
insert into public.customers(id,workspace_id,account_kind,legal_name,lifecycle,status,source,created_by_user_id) values('d4000000-0000-4000-8000-000000000999','b2000000-0000-4000-8000-000000000001','legal_entity','Synthetic Completion Customer','customer','active','manual','a1000000-0000-4000-8000-000000000001');
insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at)
values('b2000000-0000-4000-8000-000000000001','completion_worker_reference_001','a1000000-0000-4000-8000-000000000001','fixture.completion','fixture.completion',1,clock_timestamp()+interval '1 hour');
insert into public.assistant_registered_result_schemas(dispatcher_key,capability,input_schema_version,output_schema_version,access_class,canonical_schema,schema_digest,field_policy)
select 'fixture.completion','fixture.completion',1,1,'SAFE_WRITE',s,encode(extensions.digest(convert_to(s,'UTF8'),'sha256'),'hex'),'{"customerRef":"customer","label":"scalar"}'::jsonb
from (select '{"type":"object","properties":{"customerRef":{"type":"string","maxLength":36},"label":{"type":"string","maxLength":120}},"required":["customerRef","label"],"additionalProperties":false}'::text s) q;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
create function pg_temp.completion_fixture(suffix text) returns jsonb language plpgsql as $$
declare w uuid:='b2000000-0000-4000-8000-000000000001';d text:=encode(extensions.digest(convert_to('{}','UTF8'),'sha256'),'hex');c jsonb;r jsonb;b text;f text;
begin
 c:=public.assistant_durable_v1_issue(w,'fixture.completion',d);
 r:=public.assistant_durable_v1_confirm_reserve_material(w,c->>'confirmationRef','fixture.completion',d,'completion_fixture_key_'||suffix,
 'fixture.completion','completion_command_reference_'||suffix,'completion_original_reservation',
 jsonb_build_object('schemaVersion',1,'digestAlgorithm','w3-canonical-json-localeCompare-sha256-v1','producerRuntime','node24_icu77','canonicalArguments','{}'));
 r:=public.assistant_durable_v1_start_execution(w,r->>'operationRef','fixture.completion',d,1);
 if r->>'status'<>'applied' then raise exception 'completion_fixture_start_failed';end if;
 select outbox_ref into b from public.assistant_effect_outbox where workspace_id=w and operation_ref=r->'record'->>'operationRef';
 c:=public.assistant_durable_v1_claim_effect(w,'completion_worker_reference_001',1,b,1);f:=c->>'claimFence';
 c:=public.assistant_durable_v1_ack_effect(w,'completion_worker_reference_001',1,b,2,split_part(f,':',2)::bigint,split_part(f,':',3),
 'completion_original_receipt_'||suffix,'completion_original_effect_ack');
 if c->>'status'<>'applied' then raise exception 'completion_fixture_ack_failed';end if;
 return jsonb_build_object('operation',r->'record'->>'operationRef','receipt','completion_original_receipt_'||suffix);
end$$;
create function pg_temp.completion_aggregate() returns jsonb language sql as $$select jsonb_build_object(
 'operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x where capability='fixture.completion'),
 'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x where capability='fixture.completion'),
 'results',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_safe_results x where capability='fixture.completion'),
 'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x where capability='fixture.completion'),
 'deliveries',(select jsonb_agg(to_jsonb(x) order by x.event_ref) from public.assistant_audit_delivery_outbox x join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='fixture.completion'))$$;
create function pg_temp.completion_cut() returns trigger language plpgsql as $$begin
 if current_setting('test.assistant.completion.cut',true)=TG_TABLE_NAME then raise exception 'synthetic_completion_cut';end if;return NEW;end$$;
create trigger completion_result_cut after insert on public.assistant_safe_results for each row execute function pg_temp.completion_cut();
create trigger completion_operation_cut after update on public.assistant_operations for each row execute function pg_temp.completion_cut();
create trigger completion_audit_cut after insert on public.assistant_original_audit_intents for each row execute function pg_temp.completion_cut();
create trigger completion_delivery_cut after insert on public.assistant_audit_delivery_outbox for each row execute function pg_temp.completion_cut();

create function pg_temp.reconciliation_aggregate() returns jsonb language sql as $$select jsonb_build_object(
 'confirmations',(select jsonb_agg(to_jsonb(x) order by confirmation_ref) from public.assistant_confirmations x),
 'operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x),
 'commands',(select jsonb_agg(to_jsonb(x) order by command_ref) from public.assistant_registered_commands x),
 'materials',(select jsonb_agg(to_jsonb(x) order by command_ref) from public.assistant_command_material x),
 'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x),
 'results',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_safe_results x),
 'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x),
 'deliveries',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_audit_delivery_outbox x))$$;
do $$declare w uuid:='b2000000-0000-4000-8000-000000000001';f jsonb;r jsonb;before jsonb;d text;payload jsonb;original jsonb;bad jsonb;denied boolean;
 audit_text text;result_text text;event_id text;cut text;receipt text;record_before jsonb;outbox_before jsonb;intent_before jsonb;
begin
 f:=pg_temp.completion_fixture('positive_reconcile');receipt:=f->>'receipt';
 update public.assistant_operations set lease_expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id=w and operation_ref=f->>'operation';
 r:=public.assistant_durable_v1_require_reconciliation(w,f->>'operation','fixture.completion',encode(extensions.digest(convert_to('{}','UTF8'),'sha256'),'hex'),3,'internal_safe','reconciliation_original_recovery');
 if r->>'status'<>'applied' or r->'record'->>'state'<>'reconciliation_required' or r->'record'->>'version'<>'4' then raise exception 'reconciliation_fixture_quarantine_failed';end if;
 select to_jsonb(x) into record_before from public.assistant_operations x where workspace_id=w and operation_ref=f->>'operation';
 select to_jsonb(x) into outbox_before from public.assistant_effect_outbox x where workspace_id=w and operation_ref=f->>'operation';
 select jsonb_agg(to_jsonb(x) order by operation_version) into intent_before from public.assistant_original_audit_intents x where workspace_id=w and operation_ref=f->>'operation';
 select schema_digest into d from public.assistant_registered_result_schemas where capability='fixture.completion';
 payload:=jsonb_build_object('status','SUCCESS','capability','fixture.completion','data',jsonb_build_object('customerRef','d4000000-0000-4000-8000-000000000999','label','Synthetic Reconciled'));
 original:=jsonb_build_object('event','assistant.operation.reconciliation','requestId','reconciliation_original_request','actorId','a1000000-0000-4000-8000-000000000001',
 'workspaceId',w,'operationRef',f->>'operation','requestedOutcome','completed','decision','completed','reasonCode','reconciliation_applied');
 result_text:=payload::text;audit_text:=original::text;event_id:=encode(extensions.digest(convert_to(format('["%s","%s",4]',w::text,f->>'operation'),'UTF8'),'sha256'),'hex');
 before:=pg_temp.reconciliation_aggregate();denied:=false;
 begin perform public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',1,f->>'operation',4,receipt,1,d,result_text,audit_text,event_id);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'reconciliation_unregistered_policy_accepted';end if;
 if before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_denial_changed_ledger';end if;
 insert into public.assistant_reconciliation_policies values('fixture.completion','fixture.completion',1,'completed');
 before:=pg_temp.reconciliation_aggregate();
 for bad in select unnest(array[original||'{"decision":"failed_terminal"}',original||'{"requestedOutcome":"failed_retryable"}',original||'{"reasonCode":"verified_effect_absence"}',original||'{"privateData":"invalid"}',original||'{"requestId":null}',original||'{"actorId":"a1000000-0000-4000-8000-000000000002"}']) loop
  denied:=false;
  begin perform public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',1,f->>'operation',4,receipt,1,d,result_text,bad::text,event_id);
  exception when invalid_parameter_value then denied:=true;end;
  if not denied then raise exception 'reconciliation_invalid_original_audit_accepted';end if;
  if before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_denial_changed_ledger';end if;
 end loop;
 denied:=false;
 begin perform public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',1,f->>'operation',4,receipt,1,d,result_text,audit_text,repeat('f',64));
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'reconciliation_wrong_event_identity_accepted';end if;
 for bad in select unnest(array[payload||'{"data":{"customerRef":"d4000000-0000-4000-8000-000000000002","label":"Foreign"}}',payload||'{"status":"EMPTY"}',payload||'{"replayed":true}']) loop
  denied:=false;
  begin perform public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',1,f->>'operation',4,receipt,1,d,bad::text,audit_text,event_id);
  exception when invalid_parameter_value then denied:=true;end;
  if not denied then raise exception 'reconciliation_invalid_result_accepted';end if;
 end loop;
 if before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_denial_changed_ledger';end if;
 for cut in select unnest(array['assistant_safe_results','assistant_operations','assistant_original_audit_intents','assistant_audit_delivery_outbox']) loop
  perform set_config('test.assistant.completion.cut',cut,true);denied:=false;
  begin perform public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',1,f->>'operation',4,receipt,1,d,result_text,audit_text,event_id);
  exception when raise_exception then if sqlerrm<>'synthetic_completion_cut' then raise;end if;denied:=true;end;
  if not denied or before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_atomic_rollback_incomplete';end if;
 end loop;
 perform set_config('test.assistant.completion.cut','',true);
 update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()-interval '1 millisecond' where worker_ref='completion_worker_reference_001';
 before:=pg_temp.reconciliation_aggregate();denied:=false;
 begin perform public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',2,f->>'operation',4,receipt,1,d,result_text,audit_text,event_id);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'reconciliation_expired_grant_accepted';end if;
 if before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_denial_changed_ledger';end if;
 update public.assistant_registered_effect_workers set authority_version=3,expires_at=clock_timestamp()+interval '1 hour' where worker_ref='completion_worker_reference_001';
 r:=public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',3,f->>'operation',4,receipt,1,d,result_text,audit_text,event_id);
 if r->>'status'<>'applied' or r->>'eventRef'<>event_id or r->'auditIntentPersisted'<>'true'::jsonb or r->'record'->>'state'<>'completed' or r->'record'->>'version'<>'5' or r->'record'->'result' is distinct from payload or r->'record' ? 'failureCode' then raise exception 'reconciliation_terminal_dto_incomplete';end if;
 if (select to_jsonb(x) from public.assistant_effect_outbox x where workspace_id=w and operation_ref=f->>'operation') is distinct from outbox_before then raise exception 'reconciliation_original_receipt_or_outbox_replaced';end if;
 if (select jsonb_agg(to_jsonb(x) order by operation_version) from public.assistant_original_audit_intents x where workspace_id=w and operation_ref=f->>'operation' and operation_version<5) is distinct from intent_before then raise exception 'reconciliation_original_audit_replaced';end if;
 if (select to_jsonb(x)-array['state','version','updated_at','failure_code'] from public.assistant_operations x where workspace_id=w and operation_ref=f->>'operation') is distinct from record_before-array['state','version','updated_at','failure_code'] then raise exception 'reconciliation_original_operation_changed';end if;
 if not exists(select 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox v using(workspace_id,event_ref) where i.workspace_id=w and i.event_ref=event_id and i.operation_version=5 and i.reconciliation_event=original and i.canonical_reconciliation_event=audit_text and i.capability_event is null and i.request_ref='reconciliation_original_request') then raise exception 'reconciliation_full_original_audit_missing';end if;
 before:=pg_temp.reconciliation_aggregate();
 r:=public.assistant_durable_v1_reconcile_completed(w,'completion_worker_reference_001',3,f->>'operation',4,receipt,1,d,result_text,audit_text,event_id);
 if r->>'status'<>'version_conflict' or before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_terminal_retry_changed_ledger';end if;
 r:=public.assistant_durable_v1_load_result(w,'completion_worker_reference_001',3,f->>'operation');
 if r->'record'->'result' is distinct from payload or r->'record'->>'effectReceiptRef'<>receipt or r->'record'->>'version'<>'5' or before is distinct from pg_temp.reconciliation_aggregate() then raise exception 'reconciliation_authorized_replay_incomplete';end if;
end$$;
rollback;
