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
   or has_function_privilege(r,'public.assistant_durable_v1_require_reconciliation(uuid,text,text,text,bigint,text,text)','EXECUTE') then
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
  reset role;
 end loop;
 if exists(select 1 from public.assistant_operations where capability='fixture.role.boundary') then
  raise exception 'denied_role_changed_durable_state';end if;
end$$;
rollback;
