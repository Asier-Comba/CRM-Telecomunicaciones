-- Test-only relational invariants. No assistant effect is executed.
begin;
insert into public.assistant_confirmations (
  workspace_id,confirmation_ref,actor_id,capability,arguments_digest,expires_at
) values (
  'b2000000-0000-4000-8000-000000000001',
  'confirmationSyntheticRef00001',
  'a1000000-0000-4000-8000-000000000001','task.create',repeat('a',64),now()+interval '4 minutes');

insert into public.assistant_operations (
  workspace_id,operation_ref,actor_id,capability,idempotency_key,
  arguments_digest,confirmation_ref
) values (
  'b2000000-0000-4000-8000-000000000001',
  'operationSyntheticRef0000001',
  'a1000000-0000-4000-8000-000000000001','task.create',
  'idempotencySynthetic0001',repeat('a',64),'confirmationSyntheticRef00001');

insert into public.assistant_effect_outbox (
  workspace_id,outbox_ref,operation_ref,actor_id,capability,
  arguments_digest,dispatcher_key,command_ref
) values (
  'b2000000-0000-4000-8000-000000000001','outboxSyntheticRef000000001',
  'operationSyntheticRef0000001',
  'a1000000-0000-4000-8000-000000000001','task.create',repeat('a',64),
  'task.create','commandSyntheticRef00000001');

do $$
declare denied boolean := false;
begin
  if has_table_privilege('authenticated','public.assistant_operations','SELECT')
    or has_table_privilege('authenticated','public.assistant_confirmations','INSERT')
    or has_table_privilege('service_role','public.assistant_effect_outbox','INSERT') then
    raise exception 'durable tables exposed raw access';
  end if;
  begin
    insert into public.assistant_operations (
      workspace_id,operation_ref,actor_id,capability,idempotency_key,
      arguments_digest,confirmation_ref
    ) values (
      'b2000000-0000-4000-8000-000000000001','operationSyntheticRef0000002',
      'a1000000-0000-4000-8000-000000000001','task.create',
      'idempotencySynthetic0001',repeat('a',64),null);
  exception when unique_violation then denied := true;
  end;
  if not denied then raise exception 'idempotency uniqueness missing'; end if;
  denied := false;
  begin
    insert into public.assistant_operations (
      workspace_id,operation_ref,actor_id,capability,idempotency_key,
      arguments_digest,confirmation_ref
    ) values (
      'b2000000-0000-4000-8000-000000000002','operationSyntheticRef0000002',
      'a1000000-0000-4000-8000-000000000002','task.create',
      'idempotencySynthetic0002',repeat('a',64),'confirmationSyntheticRef00001');
  exception when foreign_key_violation then denied := true;
  end;
  if not denied then raise exception 'cross-workspace confirmation accepted'; end if;
  denied := false;
  begin
    insert into public.assistant_effect_outbox (
      workspace_id,outbox_ref,operation_ref,actor_id,capability,
      arguments_digest,dispatcher_key,command_ref
    ) values (
      'b2000000-0000-4000-8000-000000000002','outboxSyntheticRef000000002',
      'operationSyntheticRef0000001',
      'a1000000-0000-4000-8000-000000000001','task.create',repeat('b',64),
      'task.create','commandSyntheticRef00000002');
  exception when foreign_key_violation then denied := true;
  end;
  if not denied then raise exception 'outbox binding mismatch accepted'; end if;
end;
$$;
rollback;
