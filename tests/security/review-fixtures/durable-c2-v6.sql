-- Inject before the rollback in the product durable fixture, after test seed.
do $$
declare before_lease timestamptz; after_lease timestamptz; actual_code text;
begin
  select lease_expires_at into before_lease from public.assistant_operations
    where operation_ref='operationSyntheticRef0000001';
  if before_lease is null then raise exception 'lease absent'; end if;
  perform pg_sleep(0.01);
  select lease_expires_at into after_lease from public.assistant_operations
    where operation_ref='operationSyntheticRef0000001';
  if after_lease is distinct from before_lease then raise exception 'read synthesized lease'; end if;
  foreach actual_code in array array['effect_absence_verified_retryable','effect_absence_verified_terminal'] loop
    update public.assistant_operations set failure_code=actual_code
      where operation_ref='operationSyntheticRef0000001';
    if (select failure_code from public.assistant_operations
        where operation_ref='operationSyntheticRef0000001') is distinct from actual_code then
      raise exception 'failure code remapped';
    end if;
  end loop;
  begin
    update public.assistant_operations set lease_expires_at=null
      where operation_ref='operationSyntheticRef0000001';
    raise exception 'NULL lease accepted';
  exception when not_null_violation then null; end;
end;
$$;
