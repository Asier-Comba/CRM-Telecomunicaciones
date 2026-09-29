-- Align the inert durable foundation with the current W3 database contract.
-- This migration does not enable assistant writes or grant table access.
begin;

alter table public.assistant_operations
  drop constraint assistant_operations_failure_code_check;

alter table public.assistant_operations
  add constraint assistant_operations_failure_code_check check (
    failure_code is null or failure_code in (
      'temporary_unavailable',
      'validation',
      'conflict',
      'access_revoked',
      'internal_safe',
      'effect_absence_verified_retryable',
      'effect_absence_verified_terminal'
    )
  );

-- Existing foundation rows were created before the port required a durable
-- timestamp for every operation. Backfill from immutable database timestamps;
-- do not synthesize a new lease whenever a record is read.
update public.assistant_operations
set lease_expires_at = created_at + interval '5 minutes'
where lease_expires_at is null;

alter table public.assistant_operations
  alter column lease_expires_at set default (statement_timestamp() + interval '5 minutes'),
  alter column lease_expires_at set not null;

comment on column public.assistant_operations.lease_expires_at is
  'Authoritative DB lease timestamp. Reserved state alone never authorizes an effect.';

commit;
