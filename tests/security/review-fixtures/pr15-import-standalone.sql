-- Minimal independent synthetic reproduction against UNMODIFIED PR15 migrations.
begin;
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$begin if value is distinct from true then raise exception '%', message; end if; end$$;
insert into auth.users(id,email) values ('10000000-0000-0000-0000-000000000001','synthetic@example.invalid');
insert into public.workspaces(id,name,slug,status) values ('20000000-0000-0000-0000-000000000001','Synthetic','synthetic','active');
-- Disposable W4 reproduction. Inject before final ROLLBACK of telecom-domain-rls.sql.
-- Uses that harness's synthetic fixture IDs. No production execution.
reset role;
do $$ begin
  if current_setting('app.environment', true) is distinct from 'test' then
    raise exception 'W4 probe requires isolated test environment';
  end if;
end $$;

-- Expected secure result: reject INSERT of terminal state with fabricated totals.
-- Current reproduction expectation: insert succeeds although no staging/application rows exist.
insert into public.import_jobs (
  id, workspace_id, import_kind, source_file_ref_id, source_file_digest_hmac,
  digest_key_version, mapping_schema_version, idempotency_key_id,
  status, total_rows, valid_rows, applied_rows, checkpoint_rows_processed,
  completed_at, created_by_user_id
) values (
  '80000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000001',
  'customers', '86000000-0000-0000-0000-000000000099', repeat('a',64),
  1, 1, '89000000-0000-0000-0000-000000000099',
  'completed', 99, 99, 99, 99, now(), '10000000-0000-0000-0000-000000000001'
);
select pg_temp.assert_true(
  (select status = 'completed' and applied_rows = 99 from public.import_jobs
   where id = '80000000-0000-0000-0000-000000000099')
  and not exists (select 1 from public.import_staging_rows
    where import_job_id = '80000000-0000-0000-0000-000000000099'),
  'W4 reproduction changed: terminal insertion no longer bypasses durable counters'
);

rollback;
