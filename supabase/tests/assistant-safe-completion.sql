begin;
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
do $$declare w uuid:='b2000000-0000-4000-8000-000000000001';f jsonb;r jsonb;before jsonb;d text;payload jsonb;original jsonb;bad jsonb;denied boolean;
 audit_text text;result_text text;event_id text:=repeat('c',64);cut text;delivery jsonb;lease timestamptz;claims jsonb;
begin
 f:=pg_temp.completion_fixture('original');
 select schema_digest into d from public.assistant_registered_result_schemas where capability='fixture.completion';
 payload:=jsonb_build_object('status','SUCCESS','capability','fixture.completion','data',jsonb_build_object('customerRef','d4000000-0000-4000-8000-000000000999','label','Synthetic'));
 original:=jsonb_build_object('event','assistant.capability.completed','requestId','completion_original_capability_request','actorId','a1000000-0000-4000-8000-000000000001',
 'workspaceId',w,'capability','fixture.completion','accessClass','SAFE_WRITE','status','SUCCESS','reasonCode','capability_success','confirmationState','accepted','idempotencyState','reserved','durationMs',123);
 result_text:=payload::text;audit_text:=original::text;before:=pg_temp.completion_aggregate();
 for bad in select unnest(array[payload||'{"status":null}',payload||'{"status":"EMPTY"}',payload||'{"capability":"foreign.capability"}',payload||'{"replayed":true}',
 payload||'{"data":{"customerRef":"d4000000-0000-4000-8000-000000000002","label":"Foreign"}}',payload||'{"data":{"customerRef":"malformed","label":"Bad"}}',
 payload||'{"data":{"customerRef":"d4000000-0000-4000-8000-000000000999","label":null}}',payload||'{"data":{"customerRef":"d4000000-0000-4000-8000-000000000999","label":"Safe","workspaceId":"private"}}',
 jsonb_build_object('status','SUCCESS','capability','fixture.completion','data',jsonb_build_object('customerRef','d4000000-0000-4000-8000-000000000999','label',repeat('x',121)))]) loop
  denied:=false;begin perform public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,bad::text,audit_text,event_id);
  exception when invalid_parameter_value then denied:=true;end;
  if not denied or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_invalid_result_accepted';end if;
 end loop;
 for bad in select unnest(array[original-'durationMs',original||'{"durationMs":null}',original||'{"durationMs":-1}',original||'{"durationMs":1.5}',
 original||'{"actorId":null}',original||'{"workspaceId":"b2000000-0000-4000-8000-000000000002"}',original||'{"status":null}',original||'{"reasonCode":"retry_replaced"}',
 original||'{"accessClass":"READ"}',original||'{"confirmationState":"not_applicable"}',original||'{"idempotencyState":"replayed"}',original||'{"extra":"forbidden"}']) loop
  denied:=false;begin perform public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,result_text,bad::text,event_id);
  exception when invalid_parameter_value then denied:=true;end;
  if not denied or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_invalid_original_audit_accepted';end if;
 end loop;
 r:=public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,'completion_forged_receipt_reference',1,d,result_text,audit_text,event_id);
 if r->>'status'<>'invalid_transition' or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_wrong_receipt_accepted';end if;
 denied:=false;begin perform public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,repeat('b',64),result_text,audit_text,event_id);
 exception when insufficient_privilege then denied:=true;end;
 if not denied or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_unregistered_schema_accepted';end if;
 select to_jsonb(x) into delivery from public.assistant_audit_delivery_outbox x join public.assistant_original_audit_intents i using(workspace_id,event_ref)
 where i.workspace_id=w and i.operation_ref=f->>'operation' and i.event='assistant.operation.effect_applied';
 delete from public.assistant_audit_delivery_outbox where workspace_id=w and event_ref=delivery->>'event_ref';
 r:=public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,result_text,audit_text,event_id);
 if r->>'status'<>'invalid_transition' then raise exception 'completion_missing_original_delivery_accepted';end if;
 insert into public.assistant_audit_delivery_outbox select (jsonb_populate_record(null::public.assistant_audit_delivery_outbox,delivery)).*;
 if pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_missing_delivery_mutated';end if;
 for cut in select unnest(array['assistant_safe_results','assistant_operations','assistant_original_audit_intents','assistant_audit_delivery_outbox']) loop
  perform set_config('test.assistant.completion.cut',cut,true);denied:=false;
  begin perform public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,result_text,audit_text,event_id);
  exception when raise_exception then if SQLERRM<>'synthetic_completion_cut' then raise;end if;denied:=true;end;
  perform set_config('test.assistant.completion.cut','',true);
  if not denied or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_atomic_rollback_incomplete';end if;
 end loop;
 select lease_expires_at into lease from public.assistant_operations where workspace_id=w and operation_ref=f->>'operation';
 update public.assistant_operations set lease_expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id=w and operation_ref=f->>'operation';
 r:=public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,result_text,audit_text,event_id);
 if r->>'status'<>'invalid_transition' then raise exception 'completion_expired_operation_accepted';end if;
 update public.assistant_operations set lease_expires_at=lease where workspace_id=w and operation_ref=f->>'operation';
 if pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_expiry_denial_mutated';end if;
 begin
  update public.assistant_registered_effect_workers set active=false,authority_version=2 where workspace_id=w and worker_ref='completion_worker_reference_001';
  denied:=false;begin perform public.assistant_durable_v1_complete(w,'completion_worker_reference_001',2,f->>'operation',3,f->>'receipt',1,d,result_text,audit_text,event_id);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'completion_revoked_grant_accepted';end if;raise exception 'synthetic_grant_rollback';
 exception when raise_exception then if SQLERRM<>'synthetic_grant_rollback' then raise;end if;end;
 begin
  update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()-interval '1 millisecond' where workspace_id=w and worker_ref='completion_worker_reference_001';
  denied:=false;begin perform public.assistant_durable_v1_complete(w,'completion_worker_reference_001',2,f->>'operation',3,f->>'receipt',1,d,result_text,audit_text,event_id);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'completion_expired_grant_accepted';end if;raise exception 'synthetic_expired_grant_rollback';
 exception when raise_exception then if SQLERRM<>'synthetic_expired_grant_rollback' then raise;end if;end;
 r:=public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,result_text,audit_text,event_id);
 if r->>'status'<>'applied' or r->'record'->>'state'<>'completed' or (r->'record'->>'version')::bigint<>4 or r->'record'->'result' is distinct from payload
 or r->'record'->>'effectReceiptRef'<>f->>'receipt' then raise exception 'completion_projection_invalid';end if;
 if (select count(*) from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox v using(workspace_id,event_ref) where i.operation_ref=f->>'operation')<>3
 or (select canonical_result from public.assistant_safe_results where operation_ref=f->>'operation')<>result_text
 or (select canonical_capability_event from public.assistant_original_audit_intents where event_ref=event_id)<>audit_text
 or (select capability_event from public.assistant_original_audit_intents where event_ref=event_id) is distinct from original then raise exception 'completion_original_material_lost';end if;
 before:=pg_temp.completion_aggregate();
 r:=public.assistant_durable_v1_complete(w,'completion_worker_reference_001',1,f->>'operation',3,f->>'receipt',1,d,result_text,(original||'{"requestId":"completion_retry_replaced_request"}')::text,repeat('d',64));
 if r->>'status'<>'version_conflict' or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_postcommit_retry_mutated';end if;
 r:=public.assistant_durable_v1_load_result(w,'completion_worker_reference_001',1,f->>'operation');
 if r->'record'->'result' is distinct from payload or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_replay_changed_material';end if;
 begin
  delete from public.customers where id='d4000000-0000-4000-8000-000000000999';
  denied:=false;begin perform public.assistant_durable_v1_load_result(w,'completion_worker_reference_001',1,f->>'operation');exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'completion_replay_foreign_resource_exposed';end if;raise exception 'synthetic_resource_rollback';
 exception when raise_exception then if SQLERRM<>'synthetic_resource_rollback' then raise;end if;end;
 denied:=false;begin update public.assistant_safe_results set canonical_result='{}' where operation_ref=f->>'operation';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'completion_result_mutable';end if;
 denied:=false;begin update public.assistant_original_audit_intents set capability_event='{}' where event_ref=event_id;exception when insufficient_privilege then denied:=true;end;
 if not denied or pg_temp.completion_aggregate() is distinct from before then raise exception 'completion_original_audit_mutable';end if;
 insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at)
 values(w,'completion_audit_worker_reference','a1000000-0000-4000-8000-000000000001','fixture.completion',clock_timestamp()+interval '1 hour');
 claims:=public.assistant_durable_v1_claim_audit(w,'completion_audit_worker_reference',1,event_id,1);
 if claims->>'status'<>'applied' or claims->'event'->'capabilityEvent' is distinct from original then raise exception 'completion_original_audit_projection_lost';end if;
 raise notice 'SAFE COMPLETION SQL PASS;closed schema/customer authorization;four atomic cuts;original receipt/result/audit/replay;not full23';
end$$;
rollback;
