-- Disposable native restore data only; never used by application startup.
do $$
begin
  if current_setting('app.environment',true) is distinct from 'test' then
    raise exception using errcode='42501',message='durable seed requires disposable test database';
  end if;
end;
$$;
begin;
-- Metadata for an inert synthetic command only; no executable dispatcher.
insert into public.assistant_registered_dispatchers values('task.create','task.create',1);
insert into public.assistant_confirmations (
  workspace_id,confirmation_ref,actor_id,capability,arguments_digest,expires_at
) values (
  'b2000000-0000-4000-8000-000000000001','confirmationSyntheticRef00001',
  'a1000000-0000-4000-8000-000000000001','task.create',repeat('a',64),
  now()+interval '4 minutes');
insert into public.assistant_operations (
  workspace_id,operation_ref,actor_id,capability,idempotency_key,
  arguments_digest,confirmation_ref
) values (
  'b2000000-0000-4000-8000-000000000001','operationSyntheticRef0000001',
  'a1000000-0000-4000-8000-000000000001','task.create',
  'idempotencySynthetic0001',repeat('a',64),'confirmationSyntheticRef00001');
insert into public.assistant_registered_commands(
 workspace_id,command_ref,operation_ref,actor_id,capability,arguments_digest,
 dispatcher_key,schema_version,created_at
) values('b2000000-0000-4000-8000-000000000001','commandSyntheticRef00000001',
 'operationSyntheticRef0000001','a1000000-0000-4000-8000-000000000001',
 'task.create',repeat('a',64),'task.create',1,now());
insert into public.assistant_effect_outbox (
  workspace_id,outbox_ref,operation_ref,actor_id,capability,
  arguments_digest,dispatcher_key,command_ref
) values (
  'b2000000-0000-4000-8000-000000000001','outboxSyntheticRef000000001',
  'operationSyntheticRef0000001','a1000000-0000-4000-8000-000000000001',
  'task.create',repeat('a',64),'task.create','commandSyntheticRef00000001');
commit;
