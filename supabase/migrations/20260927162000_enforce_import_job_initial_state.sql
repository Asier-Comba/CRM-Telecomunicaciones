-- A privileged repository command must not fabricate a terminal import or
-- progress counters at creation time. Every job enters through one closed state
-- and all progress then travels through validate_import_job_transition().

begin;

create or replace function public.validate_import_job_initial_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' or tg_table_name <> 'import_jobs' then
    raise exception using errcode = '0A000', message = 'unsupported import job creation trigger';
  end if;

  if new.status <> 'uploaded'
    or new.total_rows <> 0
    or new.valid_rows <> 0
    or new.invalid_rows <> 0
    or new.applied_rows <> 0
    or new.failed_rows <> 0
    or new.checkpoint_rows_processed is not null
    or new.failure_code is not null
    or new.completed_at is not null
    or new.cancelled_at is not null then
    raise exception using errcode = '55000', message = 'import job must enter in the initial uploaded state';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_import_job_initial_state() from public, anon, authenticated;

create trigger import_jobs_validate_initial_state
  before insert on public.import_jobs
  for each row execute function public.validate_import_job_initial_state();

commit;
