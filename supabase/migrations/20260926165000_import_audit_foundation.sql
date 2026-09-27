-- Telecom domain v1: encrypted import orchestration and append-only business audit.
-- No upload route, generic core-table writer, service principal or plaintext row payload is exposed.

begin;

alter table public.contacts
  add constraint contacts_id_workspace_key unique (id, workspace_id);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  import_kind text not null check (import_kind in (
    'customers', 'contacts', 'operators', 'plans', 'plan_versions',
    'contracts', 'services', 'lines'
  )),
  contract_version text not null default 'telecom.v1'
    check (contract_version = 'telecom.v1'),
  source_file_ref_id uuid not null,
  source_file_digest_hmac text not null check (source_file_digest_hmac ~ '^[0-9a-f]{64}$'),
  digest_key_version integer not null check (digest_key_version > 0),
  mapping_schema_version bigint not null check (mapping_schema_version > 0),
  idempotency_key_id uuid not null,
  status text not null default 'uploaded' check (status in (
    'uploaded', 'mapping', 'validating', 'ready', 'applying',
    'completed', 'failed', 'cancelled'
  )),
  total_rows bigint not null default 0 check (total_rows >= 0),
  valid_rows bigint not null default 0 check (valid_rows >= 0),
  invalid_rows bigint not null default 0 check (invalid_rows >= 0),
  applied_rows bigint not null default 0 check (applied_rows >= 0),
  failed_rows bigint not null default 0 check (failed_rows >= 0),
  checkpoint_rows_processed bigint check (checkpoint_rows_processed is null or checkpoint_rows_processed >= 0),
  failure_code text check (failure_code is null or failure_code in (
    'source_unavailable', 'integrity_mismatch', 'mapping_invalid',
    'validation_failed', 'application_failed', 'cancelled_by_policy', 'system_failure'
  )),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, idempotency_key_id),
  check (valid_rows + invalid_rows <= total_rows),
  check (applied_rows + failed_rows <= valid_rows),
  check (checkpoint_rows_processed is null or checkpoint_rows_processed <= total_rows),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((status = 'failed') = (failure_code is not null)),
  check (completed_at is null or completed_at >= created_at),
  check (cancelled_at is null or cancelled_at >= created_at),
  check (
    status <> 'completed' or (
      valid_rows + invalid_rows = total_rows
      and applied_rows + failed_rows = valid_rows
      and checkpoint_rows_processed is not null
      and checkpoint_rows_processed = total_rows
    )
  )
);

create index import_jobs_status_idx
  on public.import_jobs (workspace_id, status, updated_at, id);
create index import_jobs_creator_idx
  on public.import_jobs (workspace_id, created_by_user_id, created_at desc)
  where created_by_user_id is not null;

comment on column public.import_jobs.mapping_schema_version is
  'Version of the importer mapping contract, not a revision counter for editable field mappings.';
comment on column public.import_jobs.idempotency_key_id is
  'Server-validated random UUID. Replays return this job; terminal jobs are never resumed.';
comment on column public.import_jobs.digest_key_version is
  'Version of the retained HMAC key. Producers must domain-separate source-file and row digests and include workspace/job scope in the canonical input.';

create or replace function public.is_import_target_field_for_kind(import_kind text, value text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case import_kind
    when 'customers' then value = any (array[
      'account_kind','legal_name','trade_name','tax_identifier_kind','tax_identifier',
      'lifecycle','status','source','assigned_user_id'
    ]::text[])
    when 'contacts' then value = any (array[
      'customer_id','display_name','job_title','email','phone','is_primary','status'
    ]::text[])
    when 'operators' then value = any (array['code','display_name','status','source']::text[])
    when 'plans' then value = any (array[
      'operator_id','code','display_name','service_kind','status'
    ]::text[])
    when 'plan_versions' then value = any (array[
      'plan_id','version_number','valid_from','valid_until','currency','recurring_amount_minor'
    ]::text[])
    when 'contracts' then value = any (array[
      'customer_id','operator_id','plan_version_id','status','start_date','signed_date',
      'end_date','assigned_user_id','source'
    ]::text[])
    when 'services' then value = any (array[
      'customer_id','contract_id','operator_id','plan_version_id','service_kind',
      'display_name','status','activated_on','ended_on'
    ]::text[])
    when 'lines' then value = any (array['service_id','status','activated_on','ended_on']::text[])
    else false
  end
$$;

revoke all on function public.is_import_target_field_for_kind(text, text) from public, anon, authenticated;

create table public.import_field_mappings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  import_job_id uuid not null,
  source_column_ordinal integer not null check (source_column_ordinal >= 0),
  target_field_code text not null check (target_field_code in (
    'account_kind','legal_name','trade_name','tax_identifier_kind','tax_identifier',
    'lifecycle','status','source','assigned_user_id','display_name','job_title',
    'email','phone','is_primary','code','operator_id','service_kind','plan_id',
    'version_number','valid_from','valid_until','currency','recurring_amount_minor',
    'customer_id','plan_version_id','start_date','signed_date','end_date',
    'contract_id','activated_on','ended_on','service_id'
  )),
  transform_code text not null default 'identity' check (transform_code in (
    'identity', 'trim', 'uppercase', 'lowercase', 'normalize_phone_e164',
    'normalize_tax_identifier', 'parse_iso_date', 'parse_decimal_minor'
  )),
  required boolean not null default false,
  created_by_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, import_job_id, target_field_code),
  unique (workspace_id, import_job_id, source_column_ordinal),
  foreign key (import_job_id, workspace_id)
    references public.import_jobs(id, workspace_id) on delete restrict
);

create index import_field_mappings_job_idx
  on public.import_field_mappings (workspace_id, import_job_id, source_column_ordinal);

create table public.import_staging_rows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  import_job_id uuid not null,
  source_row_number bigint not null check (source_row_number > 0),
  row_digest_hmac text not null check (row_digest_hmac ~ '^[0-9a-f]{64}$'),
  encrypted_payload_ref_id uuid not null,
  validation_state text not null default 'pending'
    check (validation_state in ('pending', 'valid', 'invalid')),
  application_state text not null default 'pending'
    check (application_state in ('pending', 'applied', 'failed', 'skipped')),
  validated_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id, import_job_id),
  unique (workspace_id, import_job_id, source_row_number),
  unique (workspace_id, import_job_id, row_digest_hmac),
  foreign key (import_job_id, workspace_id)
    references public.import_jobs(id, workspace_id) on delete restrict,
  check ((validation_state = 'pending') = (validated_at is null)),
  check ((application_state = 'applied') = (applied_at is not null)),
  check (application_state = 'pending' or validation_state <> 'pending'),
  check (application_state <> 'applied' or validation_state = 'valid')
);

comment on table public.import_staging_rows is
  'Encrypted staging references only. row_digest_hmac must be a keyed HMAC-SHA-256 over a canonical row representation; an unkeyed PII hash is forbidden. Plaintext row JSON, raw PII and rejected values are forbidden.';

create index import_staging_rows_validation_idx
  on public.import_staging_rows (workspace_id, import_job_id, validation_state, source_row_number);
create index import_staging_rows_application_idx
  on public.import_staging_rows (workspace_id, import_job_id, application_state, source_row_number);

create table public.import_row_issues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  import_job_id uuid not null,
  staging_row_id uuid not null,
  severity text not null check (severity in ('warning', 'error')),
  issue_code text not null check (issue_code in (
    'required_missing', 'invalid_format', 'invalid_reference', 'duplicate_in_file',
    'duplicate_existing', 'unsupported_value', 'decrypt_unavailable', 'mapping_missing'
  )),
  field_code text check (field_code is null or field_code in (
    'account_kind','legal_name','trade_name','tax_identifier_kind','tax_identifier',
    'lifecycle','status','source','assigned_user_id','display_name','job_title',
    'email','phone','is_primary','code','operator_id','service_kind','plan_id',
    'version_number','valid_from','valid_until','currency','recurring_amount_minor',
    'customer_id','plan_version_id','start_date','signed_date','end_date',
    'contract_id','activated_on','ended_on','service_id'
  )),
  message_template_code text not null check (message_template_code in (
    'import.required_missing', 'import.invalid_format', 'import.invalid_reference',
    'import.duplicate_in_file', 'import.duplicate_existing', 'import.unsupported_value',
    'import.decrypt_unavailable', 'import.mapping_missing'
  )),
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (staging_row_id, workspace_id, import_job_id)
    references public.import_staging_rows(id, workspace_id, import_job_id) on delete restrict
);

comment on table public.import_row_issues is
  'Safe closed issue codes only. Raw rejected values and free-form error text are forbidden.';

create index import_row_issues_row_idx
  on public.import_row_issues (workspace_id, import_job_id, staging_row_id, severity);
create index import_row_issues_code_idx
  on public.import_row_issues (workspace_id, import_job_id, issue_code);

create table public.import_applications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  import_job_id uuid not null,
  staging_row_id uuid not null,
  customer_id uuid,
  contact_id uuid,
  operator_id uuid,
  plan_id uuid,
  plan_version_id uuid,
  contract_id uuid,
  service_id uuid,
  line_id uuid,
  operation_ref_id uuid not null,
  applied_at timestamptz not null default now(),
  applied_by_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  unique (id, workspace_id),
  unique (workspace_id, import_job_id, staging_row_id),
  unique (workspace_id, operation_ref_id),
  foreign key (staging_row_id, workspace_id, import_job_id)
    references public.import_staging_rows(id, workspace_id, import_job_id) on delete restrict,
  foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id) on delete restrict,
  foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id) on delete restrict,
  foreign key (operator_id, workspace_id)
    references public.telecom_operators(id, workspace_id) on delete restrict,
  foreign key (plan_id, workspace_id)
    references public.telecom_plans(id, workspace_id) on delete restrict,
  foreign key (plan_version_id, workspace_id)
    references public.telecom_plan_versions(id, workspace_id) on delete restrict,
  foreign key (contract_id, workspace_id)
    references public.telecom_contracts(id, workspace_id) on delete restrict,
  foreign key (service_id, workspace_id)
    references public.telecom_services(id, workspace_id) on delete restrict,
  foreign key (line_id, workspace_id)
    references public.telecom_lines(id, workspace_id) on delete restrict,
  check (num_nonnulls(
    customer_id, contact_id, operator_id, plan_id, plan_version_id,
    contract_id, service_id, line_id
  ) = 1)
);

create index import_applications_job_idx
  on public.import_applications (workspace_id, import_job_id, applied_at, id);
create index import_applications_customer_idx on public.import_applications (workspace_id, customer_id)
  where customer_id is not null;
create index import_applications_contact_idx on public.import_applications (workspace_id, contact_id)
  where contact_id is not null;
create index import_applications_operator_idx on public.import_applications (workspace_id, operator_id)
  where operator_id is not null;
create index import_applications_plan_idx on public.import_applications (workspace_id, plan_id)
  where plan_id is not null;
create index import_applications_plan_version_idx on public.import_applications (workspace_id, plan_version_id)
  where plan_version_id is not null;
create index import_applications_contract_idx on public.import_applications (workspace_id, contract_id)
  where contract_id is not null;
create index import_applications_service_idx on public.import_applications (workspace_id, service_id)
  where service_id is not null;
create index import_applications_line_idx on public.import_applications (workspace_id, line_id)
  where line_id is not null;

create table public.business_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('user', 'system', 'integration')),
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_ref_id uuid,
  action_code text not null,
  target_kind text not null check (target_kind in (
    'import_job', 'customer', 'contact', 'operator', 'plan', 'plan_version',
    'contract', 'service', 'line', 'commitment', 'renewal', 'opportunity',
    'task', 'meeting', 'activity', 'service_case', 'document'
  )),
  target_id uuid not null,
  outcome text not null check (outcome in ('succeeded', 'denied', 'failed', 'no_effect')),
  reason_code text check (reason_code is null or reason_code in (
    'authorization_denied', 'validation_failed', 'conflict', 'not_found',
    'rate_limited', 'dependency_unavailable', 'idempotent_replay', 'no_change',
    'cancelled_by_user', 'system_failure'
  )),
  request_ref_id uuid,
  correlation_ref_id uuid,
  prior_event_id uuid,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (prior_event_id, workspace_id)
    references public.business_audit_events(id, workspace_id) on delete restrict,
  check (
    (actor_kind = 'user' and actor_user_id is not null and actor_ref_id is null)
    or (actor_kind <> 'user' and actor_user_id is null and actor_ref_id is not null)
  ),
  check (
    split_part(action_code, '.', 1) = case target_kind
      when 'import_job' then 'import'
      when 'operator' then 'operator'
      when 'plan' then 'plan'
      when 'plan_version' then 'plan_version'
      when 'service_case' then 'service_case'
      else target_kind
    end
    and split_part(action_code, '.', 2) in (
      'created', 'updated', 'archived', 'deleted', 'status_changed',
      'assigned', 'unassigned', 'validated', 'applied', 'completed',
      'failed', 'cancelled', 'denied', 'revealed', 'copied', 'linked',
      'unlinked', 'opened', 'resolved', 'closed', 'scheduled', 'rescheduled'
    )
    and split_part(action_code, '.', 3) = 'v1'
    and array_length(string_to_array(action_code, '.'), 1) = 3
  ),
  check (recorded_at >= occurred_at - interval '5 minutes'),
  check (prior_event_id is null or prior_event_id <> id)
);

comment on table public.business_audit_events is
  'Append-only redacted business audit. No arbitrary metadata, PII, prompts, payloads or before/after dumps.';
comment on column public.business_audit_events.recorded_at is
  'Database-assigned ingestion time. Caller-supplied values are overwritten by the insert validator.';

create index business_audit_events_time_idx
  on public.business_audit_events (workspace_id, occurred_at desc, id desc);
create index business_audit_events_target_idx
  on public.business_audit_events (workspace_id, target_kind, target_id, occurred_at desc);
create index business_audit_events_correlation_idx
  on public.business_audit_events (workspace_id, correlation_ref_id)
  where correlation_ref_id is not null;

create or replace function public.protect_import_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'import identity and creator are immutable';
  end if;
  if tg_table_name = 'import_jobs' and (
    new.import_kind is distinct from old.import_kind
    or new.contract_version is distinct from old.contract_version
    or new.source_file_ref_id is distinct from old.source_file_ref_id
    or new.source_file_digest_hmac is distinct from old.source_file_digest_hmac
    or new.digest_key_version is distinct from old.digest_key_version
    or new.mapping_schema_version is distinct from old.mapping_schema_version
    or new.idempotency_key_id is distinct from old.idempotency_key_id
  ) then
    raise exception using errcode = '55000', message = 'import job binding is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.validate_import_job_transition()
returns trigger language plpgsql set search_path = '' as $$
declare
  actual_total bigint;
  actual_valid bigint;
  actual_invalid bigint;
  actual_applied bigint;
  actual_failed bigint;
  application_count bigint;
begin
  if new.total_rows < old.total_rows
    or new.valid_rows < old.valid_rows
    or new.invalid_rows < old.invalid_rows
    or new.applied_rows < old.applied_rows
    or new.failed_rows < old.failed_rows
    or (old.checkpoint_rows_processed is not null and (
      new.checkpoint_rows_processed is null or new.checkpoint_rows_processed < old.checkpoint_rows_processed
    )) then
    raise exception using errcode = '55000', message = 'import counters and checkpoint are monotonic';
  end if;
  if old.status not in ('uploaded', 'mapping')
    and new.total_rows is distinct from old.total_rows then
    raise exception using errcode = '55000', message = 'declared import total is immutable after validation starts';
  end if;
  if old.status in ('completed', 'failed', 'cancelled') and (
    new.status, new.total_rows, new.valid_rows, new.invalid_rows,
    new.applied_rows, new.failed_rows, new.checkpoint_rows_processed,
    new.failure_code, new.completed_at, new.cancelled_at, new.updated_at
  ) is distinct from (
    old.status, old.total_rows, old.valid_rows, old.invalid_rows,
    old.applied_rows, old.failed_rows, old.checkpoint_rows_processed,
    old.failure_code, old.completed_at, old.cancelled_at, old.updated_at
  ) then
    raise exception using errcode = '55000', message = 'terminal import job is immutable';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'uploaded' and new.status in ('mapping', 'failed', 'cancelled'))
    or (old.status = 'mapping' and new.status in ('validating', 'failed', 'cancelled'))
    or (old.status = 'validating' and new.status in ('ready', 'failed', 'cancelled'))
    or (old.status = 'ready' and new.status in ('applying', 'failed', 'cancelled'))
    or (old.status = 'applying' and new.status in ('completed', 'failed'))
  ) then
    raise exception using errcode = '55000', message = 'invalid or non-monotonic import transition';
  end if;
  if new.status in ('ready', 'completed', 'failed', 'cancelled') then
    select count(*),
           count(*) filter (where validation_state = 'valid'),
           count(*) filter (where validation_state = 'invalid'),
           count(*) filter (where application_state = 'applied'),
           count(*) filter (where application_state = 'failed')
      into actual_total, actual_valid, actual_invalid, actual_applied, actual_failed
      from public.import_staging_rows
     where workspace_id = new.workspace_id and import_job_id = new.id;
    select count(*) into application_count
      from public.import_applications
     where workspace_id = new.workspace_id and import_job_id = new.id;
    if (new.valid_rows, new.invalid_rows, new.applied_rows, new.failed_rows)
       is distinct from (actual_valid, actual_invalid, actual_applied, actual_failed)
       or application_count <> actual_applied
       or coalesce(new.checkpoint_rows_processed, 0) <> actual_valid + actual_invalid
       or actual_total > new.total_rows
       or (new.status = 'ready' and actual_valid + actual_invalid <> actual_total)
       or (new.status in ('ready', 'completed') and actual_total <> new.total_rows) then
      raise exception using errcode = '55000', message = 'import counters do not match durable rows';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_import_child_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.import_job_id is distinct from old.import_job_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'import child identity is immutable';
  end if;
  if tg_table_name = 'import_field_mappings'
    and new.created_by_user_id is distinct from old.created_by_user_id then
    raise exception using errcode = '55000', message = 'mapping creator is immutable';
  end if;
  if tg_table_name = 'import_staging_rows' and (
    new.source_row_number is distinct from old.source_row_number
    or new.row_digest_hmac is distinct from old.row_digest_hmac
    or new.encrypted_payload_ref_id is distinct from old.encrypted_payload_ref_id
  ) then
    raise exception using errcode = '55000', message = 'staging row binding is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.validate_import_mapping_state()
returns trigger language plpgsql security definer set search_path = '' as $$
declare job_workspace uuid; job_id uuid; job_status text; job_kind text;
begin
  if tg_op = 'DELETE' then
    job_workspace := old.workspace_id;
    job_id := old.import_job_id;
  else
    job_workspace := new.workspace_id;
    job_id := new.import_job_id;
  end if;
  select j.status, j.import_kind into job_status, job_kind from public.import_jobs j
   where j.id = job_id and j.workspace_id = job_workspace
   for update;
  if not found or job_status not in ('uploaded', 'mapping') then
    raise exception using errcode = '55000', message = 'mapping is immutable after validation starts';
  end if;
  if tg_op <> 'DELETE'
    and not public.is_import_target_field_for_kind(job_kind, new.target_field_code) then
    raise exception using errcode = '23514', message = 'mapping field does not belong to import kind';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.validate_import_staging_phase()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  job_status text;
  job_total_rows bigint;
begin
  select j.status, j.total_rows into job_status, job_total_rows
    from public.import_jobs j
   where j.id = new.import_job_id and j.workspace_id = new.workspace_id
   for update;
  if not found then
    raise exception using errcode = '23503', message = 'staging row import job does not exist';
  end if;
  if new.source_row_number > job_total_rows then
    raise exception using errcode = '23514', message = 'staging row number exceeds declared import total';
  end if;
  if tg_op = 'INSERT' and job_status <> 'validating' then
    raise exception using errcode = '55000', message = 'staging rows may only be inserted while validating';
  end if;
  if tg_op = 'INSERT' and (
    new.validation_state <> 'pending' or new.application_state <> 'pending'
    or new.validated_at is not null or new.applied_at is not null
  ) then
    raise exception using errcode = '55000', message = 'staging rows must enter in pending state';
  end if;
  if tg_op = 'UPDATE' then
    if new.validation_state is distinct from old.validation_state and job_status <> 'validating' then
      raise exception using errcode = '55000', message = 'staging validation may only change while validating';
    end if;
    if new.application_state is distinct from old.application_state and job_status <> 'applying' then
      raise exception using errcode = '55000', message = 'staging application may only change while applying';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_import_row_issue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_validation text;
  job_status text;
begin
  select r.validation_state into row_validation
    from public.import_staging_rows r
   where r.id = new.staging_row_id and r.workspace_id = new.workspace_id
     and r.import_job_id = new.import_job_id
   for update;
  if not found or row_validation = 'pending' then
    raise exception using errcode = '55000', message = 'import issue requires a validated staging row';
  end if;
  select j.status into job_status
    from public.import_jobs j
   where j.id = new.import_job_id and j.workspace_id = new.workspace_id
   for update;
  if not found or job_status <> 'validating' then
    raise exception using errcode = '55000', message = 'import issues may only be appended while validating';
  end if;
  return new;
end;
$$;

create or replace function public.validate_import_staging_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.validation_state is distinct from old.validation_state and not (
    old.validation_state = 'pending' and new.validation_state in ('valid', 'invalid')
  ) then
    raise exception using errcode = '55000', message = 'invalid staging validation transition';
  end if;
  if new.application_state is distinct from old.application_state and not (
    old.application_state = 'pending' and new.application_state in ('applied', 'failed', 'skipped')
  ) then
    raise exception using errcode = '55000', message = 'invalid staging application transition';
  end if;
  if new.validation_state is not distinct from old.validation_state
    and new.validated_at is distinct from old.validated_at then
    raise exception using errcode = '55000', message = 'staging validation timestamp is immutable outside its transition';
  end if;
  if new.application_state is not distinct from old.application_state
    and new.applied_at is distinct from old.applied_at then
    raise exception using errcode = '55000', message = 'staging application timestamp is immutable outside its transition';
  end if;
  if new.validated_at is not null and (
    new.validated_at < new.created_at or new.validated_at > now() + interval '5 minutes'
  ) then
    raise exception using errcode = '23514', message = 'staging validation timestamp is invalid';
  end if;
  if new.applied_at is not null and (
    new.validated_at is null or new.applied_at < new.validated_at
    or new.applied_at > now() + interval '5 minutes'
  ) then
    raise exception using errcode = '23514', message = 'staging application timestamp is invalid';
  end if;
  return new;
end;
$$;

create or replace function public.validate_import_application()
returns trigger language plpgsql security definer set search_path = '' as $$
declare job_kind text; job_status text; row_validation text; row_application text;
  row_created_at timestamptz; expected_target text;
begin
  new.applied_at := clock_timestamp();
  select r.validation_state, r.application_state, r.created_at
    into row_validation, row_application, row_created_at
    from public.import_staging_rows r
   where r.id = new.staging_row_id and r.workspace_id = new.workspace_id
     and r.import_job_id = new.import_job_id
   for update;
  if not found or row_validation <> 'valid' or row_application <> 'pending' then
    raise exception using errcode = '55000', message = 'import row is not ready for application';
  end if;
  select j.import_kind, j.status into job_kind, job_status
    from public.import_jobs j
   where j.id = new.import_job_id and j.workspace_id = new.workspace_id
   for update;
  if not found or job_status <> 'applying' then
    raise exception using errcode = '55000', message = 'import job is not applying';
  end if;
  expected_target := case
    when new.customer_id is not null then 'customers'
    when new.contact_id is not null then 'contacts'
    when new.operator_id is not null then 'operators'
    when new.plan_id is not null then 'plans'
    when new.plan_version_id is not null then 'plan_versions'
    when new.contract_id is not null then 'contracts'
    when new.service_id is not null then 'services'
    when new.line_id is not null then 'lines'
  end;
  if expected_target is distinct from job_kind then
    raise exception using errcode = '23514', message = 'import application target does not match job kind';
  end if;
  if new.applied_at < row_created_at or new.applied_at > now() + interval '5 minutes' then
    raise exception using errcode = '23514', message = 'import application timestamp is invalid';
  end if;
  return new;
end;
$$;

create or replace function public.mark_import_row_applied()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.import_staging_rows
     set application_state = 'applied', applied_at = new.applied_at
   where id = new.staging_row_id and workspace_id = new.workspace_id
     and import_job_id = new.import_job_id and application_state = 'pending';
  if not found then
    raise exception using errcode = '55000', message = 'import row application state changed concurrently';
  end if;
  return new;
end;
$$;

create or replace function public.reject_import_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'import ledger mutation is forbidden';
end;
$$;

create or replace function public.validate_business_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  prior_target_kind text;
  prior_target_id uuid;
  prior_action_code text;
  prior_occurred_at timestamptz;
  target_exists boolean;
begin
  new.recorded_at := clock_timestamp();
  if new.occurred_at > now() + interval '5 minutes' then
    raise exception using errcode = '23514', message = 'audit occurrence cannot be in the future';
  end if;
  if new.actor_kind = 'user' and (
    new.actor_user_id is distinct from auth.uid() or not exists (
      select 1 from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id
      where wm.workspace_id = new.workspace_id and wm.user_id = new.actor_user_id
        and wm.status = 'active' and w.status = 'active'
    )
  ) then
    raise exception using errcode = '23514', message = 'audit actor is not the active caller';
  end if;
  if new.outcome in ('succeeded', 'no_effect') then
    target_exists := case new.target_kind
      when 'import_job' then exists (select 1 from public.import_jobs where id = new.target_id and workspace_id = new.workspace_id)
      when 'customer' then exists (select 1 from public.customers where id = new.target_id and workspace_id = new.workspace_id)
      when 'contact' then exists (select 1 from public.contacts where id = new.target_id and workspace_id = new.workspace_id)
      when 'operator' then exists (select 1 from public.telecom_operators where id = new.target_id and workspace_id = new.workspace_id)
      when 'plan' then exists (select 1 from public.telecom_plans where id = new.target_id and workspace_id = new.workspace_id)
      when 'plan_version' then exists (select 1 from public.telecom_plan_versions where id = new.target_id and workspace_id = new.workspace_id)
      when 'contract' then exists (select 1 from public.telecom_contracts where id = new.target_id and workspace_id = new.workspace_id)
      when 'service' then exists (select 1 from public.telecom_services where id = new.target_id and workspace_id = new.workspace_id)
      when 'line' then exists (select 1 from public.telecom_lines where id = new.target_id and workspace_id = new.workspace_id)
      when 'commitment' then exists (select 1 from public.telecom_commitments where id = new.target_id and workspace_id = new.workspace_id)
      when 'renewal' then exists (select 1 from public.telecom_renewals where id = new.target_id and workspace_id = new.workspace_id)
      when 'opportunity' then exists (select 1 from public.opportunities where id = new.target_id and workspace_id = new.workspace_id)
      when 'task' then exists (select 1 from public.tasks where id = new.target_id and workspace_id = new.workspace_id)
      when 'meeting' then exists (select 1 from public.calendar_events where id = new.target_id and workspace_id = new.workspace_id)
      when 'activity' then exists (select 1 from public.activities where id = new.target_id and workspace_id = new.workspace_id)
      when 'service_case' then exists (select 1 from public.service_cases where id = new.target_id and workspace_id = new.workspace_id)
      when 'document' then exists (select 1 from public.documents where id = new.target_id and workspace_id = new.workspace_id)
      else false
    end;
    if not target_exists then
      raise exception using errcode = '23514', message = 'successful audit target does not exist in workspace';
    end if;
  end if;
  if new.prior_event_id is not null then
    select e.target_kind, e.target_id, e.action_code, e.occurred_at
      into prior_target_kind, prior_target_id, prior_action_code, prior_occurred_at
      from public.business_audit_events e
     where e.id = new.prior_event_id and e.workspace_id = new.workspace_id;
    if not found
      or (new.target_kind, new.target_id, new.action_code)
         is distinct from (prior_target_kind, prior_target_id, prior_action_code)
      or prior_occurred_at > new.occurred_at then
      raise exception using errcode = '23514', message = 'audit correction chain mismatch';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.reject_business_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'business audit is append-only';
end;
$$;

revoke all on function public.protect_import_identity() from public, anon, authenticated;
revoke all on function public.validate_import_job_transition() from public, anon, authenticated;
revoke all on function public.protect_import_child_identity() from public, anon, authenticated;
revoke all on function public.validate_import_mapping_state() from public, anon, authenticated;
revoke all on function public.validate_import_staging_phase() from public, anon, authenticated;
revoke all on function public.validate_import_staging_transition() from public, anon, authenticated;
revoke all on function public.validate_import_row_issue() from public, anon, authenticated;
revoke all on function public.validate_import_application() from public, anon, authenticated;
revoke all on function public.mark_import_row_applied() from public, anon, authenticated;
revoke all on function public.reject_import_ledger_mutation() from public, anon, authenticated;
revoke all on function public.validate_business_audit_event() from public, anon, authenticated;
revoke all on function public.reject_business_audit_mutation() from public, anon, authenticated;

create trigger import_jobs_protect_identity before update on public.import_jobs
  for each row execute function public.protect_import_identity();
create trigger import_jobs_validate_transition before update on public.import_jobs
  for each row execute function public.validate_import_job_transition();
create trigger import_jobs_set_updated_at before update on public.import_jobs
  for each row execute function public.set_updated_at();
create trigger import_jobs_no_delete before delete on public.import_jobs
  for each row execute function public.reject_import_ledger_mutation();
create trigger import_field_mappings_protect_identity before update on public.import_field_mappings
  for each row execute function public.protect_import_child_identity();
create trigger import_field_mappings_validate_state before insert or update or delete on public.import_field_mappings
  for each row execute function public.validate_import_mapping_state();
create trigger import_staging_rows_protect_identity before update on public.import_staging_rows
  for each row execute function public.protect_import_child_identity();
create trigger import_staging_rows_validate_phase before insert or update on public.import_staging_rows
  for each row execute function public.validate_import_staging_phase();
create trigger import_staging_rows_validate_transition before update on public.import_staging_rows
  for each row execute function public.validate_import_staging_transition();
create trigger import_staging_rows_no_delete before delete on public.import_staging_rows
  for each row execute function public.reject_import_ledger_mutation();
create trigger import_row_issues_validate before insert on public.import_row_issues
  for each row execute function public.validate_import_row_issue();
create trigger import_row_issues_append_only before update or delete on public.import_row_issues
  for each row execute function public.reject_import_ledger_mutation();
create trigger import_applications_validate before insert on public.import_applications
  for each row execute function public.validate_import_application();
create trigger import_applications_mark_row after insert on public.import_applications
  for each row execute function public.mark_import_row_applied();
create trigger import_applications_append_only before update or delete on public.import_applications
  for each row execute function public.reject_import_ledger_mutation();
create trigger business_audit_events_validate before insert on public.business_audit_events
  for each row execute function public.validate_business_audit_event();
create trigger business_audit_events_append_only before update or delete on public.business_audit_events
  for each row execute function public.reject_business_audit_mutation();

alter table public.import_jobs enable row level security;
alter table public.import_jobs force row level security;
alter table public.import_field_mappings enable row level security;
alter table public.import_field_mappings force row level security;
alter table public.import_staging_rows enable row level security;
alter table public.import_staging_rows force row level security;
alter table public.import_row_issues enable row level security;
alter table public.import_row_issues force row level security;
alter table public.import_applications enable row level security;
alter table public.import_applications force row level security;
alter table public.business_audit_events enable row level security;
alter table public.business_audit_events force row level security;

create policy import_jobs_select_owner_admin on public.import_jobs for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy import_jobs_insert_owner_admin on public.import_jobs for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy import_jobs_update_owner_admin on public.import_jobs for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));

create policy import_field_mappings_select_owner_admin on public.import_field_mappings for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy import_field_mappings_insert_owner_admin on public.import_field_mappings for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy import_field_mappings_update_owner_admin on public.import_field_mappings for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));

create policy import_staging_rows_select_owner_admin on public.import_staging_rows for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy import_staging_rows_insert_owner_admin on public.import_staging_rows for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy import_staging_rows_update_owner_admin on public.import_staging_rows for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));

create policy import_row_issues_select_owner_admin on public.import_row_issues for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy import_row_issues_insert_owner_admin on public.import_row_issues for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));

create policy import_applications_select_owner_admin on public.import_applications for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy import_applications_insert_owner_admin on public.import_applications for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and applied_by_user_id = auth.uid());

create policy business_audit_events_select_owner_admin on public.business_audit_events for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy business_audit_events_insert_active_member on public.business_audit_events for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and actor_kind = 'user'
    and actor_user_id = auth.uid()
  );

revoke all on table public.import_jobs from public, anon, authenticated;
revoke all on table public.import_field_mappings from public, anon, authenticated;
revoke all on table public.import_staging_rows from public, anon, authenticated;
revoke all on table public.import_row_issues from public, anon, authenticated;
revoke all on table public.import_applications from public, anon, authenticated;
revoke all on table public.business_audit_events from public, anon, authenticated;

commit;
