-- Real role calls on fresh AND restored disposable databases; rollback all data.
begin;
insert into public.assistant_registered_dispatchers values('fixture.role.boundary','fixture.role.boundary',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select set_config('test.assistant.confirmation',public.assistant_durable_v1_issue(
 'b2000000-0000-4000-8000-000000000001','fixture.role.boundary',repeat('a',64))->>'confirmationRef',true);
do $$declare r text;denied boolean;
begin
 foreach r in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(r,'public.assistant_durable_v1_issue(uuid,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_confirm_reserve(uuid,text,text,text,text,text,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_cancel(uuid,text,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_load_operation(uuid,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_require_reconciliation(uuid,text,text,text,bigint,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_start_execution(uuid,text,text,text,bigint)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_claim_audit(uuid,text,bigint,text,bigint)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_ack_audit(uuid,text,bigint,text,bigint,bigint,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_list_audit(uuid,text,bigint,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_confirm_reserve_material(uuid,text,text,text,text,text,text,text,jsonb)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_claim_effect(uuid,text,bigint,text,bigint)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_ack_effect(uuid,text,bigint,text,bigint,bigint,text,text,text)','EXECUTE')
   or has_function_privilege(r,'public.assistant_durable_v1_effect_projection(public.assistant_effect_outbox)','EXECUTE')
   or has_function_privilege(r,'public.assistant_effect_worker_grant_guard()','EXECUTE') then
   raise exception 'durable_inert_rpc_grant_lost';
  end if;
  execute format('set local role %I',r);
  denied:=false;
  begin
   perform public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.role.boundary',repeat('a',64));
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_issue_executed';end if;
  denied:=false;
  begin
   perform public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',
    current_setting('test.assistant.confirmation'),'fixture.role.boundary',repeat('a',64),
    'role_boundary_idempotency','fixture.role.boundary','role_boundary_command_reference','role_boundary_original_request');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_reservation_executed';end if;
  denied:=false;
  begin
   perform public.assistant_durable_v1_cancel('b2000000-0000-4000-8000-000000000001',
    current_setting('test.assistant.confirmation'),'fixture.role.boundary',repeat('a',64));
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_cancel_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_load_operation('b2000000-0000-4000-8000-000000000001','role_boundary_operation_ref');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_lookup_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_require_reconciliation('b2000000-0000-4000-8000-000000000001','role_boundary_operation_ref',
   'fixture.role.boundary',repeat('a',64),1,'internal_safe','role_boundary_original_request');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_recovery_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_start_execution('b2000000-0000-4000-8000-000000000001','role_boundary_operation_ref',
   'fixture.role.boundary',repeat('a',64),1);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_start_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_claim_audit('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,repeat('a',64),1);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_audit_claim_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_ack_audit('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,repeat('a',64),2,1,repeat('b',64),'role_boundary_sink_receipt_ref');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_audit_ack_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_list_audit('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'','');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_audit_queue_executed';end if;
  denied:=false;
  begin perform count(*) from public.assistant_registered_audit_workers;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_audit_worker_registry_read';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_confirm_reserve_material('b2000000-0000-4000-8000-000000000001',
   current_setting('test.assistant.confirmation'),'fixture.role.boundary',repeat('a',64),
   'role_boundary_idempotency','fixture.role.boundary','role_boundary_command_reference','role_boundary_original_request','{}'::jsonb);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_material_reservation_executed';end if;
  denied:=false;
  begin perform count(*) from public.assistant_command_material;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_command_material_read';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_claim_effect('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'role_boundary_outbox_reference',1);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_effect_claim_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_ack_effect('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'role_boundary_outbox_reference',2,1,repeat('b',64),'role_boundary_sink_receipt_ref','role_boundary_ack_request');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_effect_ack_executed';end if;
  denied:=false;
  begin perform count(*) from public.assistant_registered_effect_workers;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_effect_worker_registry_read';end if;
  denied:=false;
  begin perform count(*) from public.assistant_registered_result_schemas;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_result_schema_registry_read';end if;
  denied:=false;
  begin perform count(*) from public.assistant_safe_results;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_safe_result_read';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_complete('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'role_boundary_operation_reference',3,'role_boundary_original_receipt',1,repeat('a',64),'{}','{}',repeat('b',64));
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_safe_completion_executed';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_load_result('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'role_boundary_operation_reference');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_safe_replay_executed';end if;
  denied:=false;
  begin perform count(*) from public.assistant_unconfirmed_policies;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_unconfirmed_policy_read';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_reserve_material('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'fixture.role.boundary',repeat('a',64),'role_boundary_idempotency','fixture.role.boundary','role_boundary_command_reference','role_boundary_original_request','{}'::jsonb);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_unconfirmed_reservation_executed';end if;
  denied:=false;
  begin perform count(*) from public.assistant_reconciliation_policies;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_private_reconciliation_policy_read';end if;
  denied:=false;
  begin perform public.assistant_durable_v1_reconcile_completed('b2000000-0000-4000-8000-000000000001','role_boundary_worker_reference',1,'role_boundary_operation_reference',4,'role_boundary_original_receipt_reference',1,repeat('a',64),'{}','{}',repeat('b',64));
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'durable_inert_positive_reconciliation_executed';end if;
  reset role;
 end loop;
 if exists(select 1 from public.assistant_operations where capability='fixture.role.boundary') then
  raise exception 'denied_role_changed_durable_state';end if;
end$$;
rollback;
