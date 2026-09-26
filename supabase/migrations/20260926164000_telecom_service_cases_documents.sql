-- Telecom domain v1, slice 6: service cases and document metadata.
-- Storage objects remain outside core tables; raw relations remain closed.

begin;

create table public.service_cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  contract_id uuid,
  service_id uuid,
  line_id uuid,
  case_type text not null check (case_type in (
    'activation', 'portability', 'technical', 'billing', 'renewal',
    'cancellation', 'documentation', 'other'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status text not null default 'open' check (status in (
    'open', 'in_progress', 'waiting_customer', 'waiting_operator',
    'resolved', 'closed', 'cancelled'
  )),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_on date,
  assigned_user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  closed_at timestamptz,
  source text not null default 'manual'
    check (source in ('manual', 'import', 'integration', 'system')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id) on delete restrict,
  foreign key (contract_id, workspace_id)
    references public.telecom_contracts(id, workspace_id) on delete restrict,
  foreign key (service_id, workspace_id)
    references public.telecom_services(id, workspace_id) on delete restrict,
  foreign key (line_id, workspace_id)
    references public.telecom_lines(id, workspace_id) on delete restrict,
  check (service_id is null or contract_id is not null),
  check (line_id is null or service_id is not null),
  check (
    (status = 'resolved' and resolved_at is not null and closed_at is null)
    or (status in ('closed', 'cancelled') and closed_at is not null)
    or (status in ('open', 'in_progress', 'waiting_customer', 'waiting_operator')
      and resolved_at is null and closed_at is null)
  ),
  check (resolved_at is null or resolved_at >= created_at),
  check (closed_at is null or closed_at >= created_at),
  check (closed_at is null or resolved_at is null or closed_at >= resolved_at)
);

comment on table public.service_cases is
  'Telecom service incidents and operational cases. Free-form internal notes are intentionally excluded.';
comment on column public.service_cases.closed_at is
  'Administrative terminal timestamp for closed/cancelled cases; it is not a resolution timestamp.';

create index service_cases_customer_status_idx
  on public.service_cases (workspace_id, customer_id, status, due_on, id);
create index service_cases_assignee_status_idx
  on public.service_cases (workspace_id, assigned_user_id, status, due_on)
  where assigned_user_id is not null;
create index service_cases_contract_idx
  on public.service_cases (workspace_id, contract_id, status)
  where contract_id is not null;
create index service_cases_service_idx
  on public.service_cases (workspace_id, service_id, status)
  where service_id is not null;
create index service_cases_line_idx
  on public.service_cases (workspace_id, line_id, status)
  where line_id is not null;
create index service_cases_open_due_idx
  on public.service_cases (workspace_id, due_on, priority)
  where status in ('open', 'in_progress', 'waiting_customer', 'waiting_operator');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid,
  contract_id uuid,
  service_id uuid,
  line_id uuid,
  service_case_id uuid,
  opportunity_id uuid,
  document_kind text not null check (document_kind in (
    'general', 'identity', 'contract', 'service', 'incident', 'billing', 'other'
  )),
  file_name text not null check (
    file_name = btrim(file_name)
    and char_length(file_name) between 1 and 255
    and file_name !~ '[[:cntrl:]/]'
    and position(chr(92) in file_name) = 0
  ),
  media_type text check (
    media_type is null or media_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}$'
  ),
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 1073741824),
  sha256_hex text check (sha256_hex is null or sha256_hex ~ '^[0-9a-f]{64}$'),
  storage_bucket text not null default 'telecom-documents'
    check (storage_bucket = 'telecom-documents'),
  storage_path text not null check (
    char_length(storage_path) between 1 and 1024
    and storage_path !~ '(^|/)\.\.(/|$)'
  ),
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  archived_by_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (storage_bucket, storage_path),
  foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id) on delete restrict,
  foreign key (contract_id, workspace_id)
    references public.telecom_contracts(id, workspace_id) on delete restrict,
  foreign key (service_id, workspace_id)
    references public.telecom_services(id, workspace_id) on delete restrict,
  foreign key (line_id, workspace_id)
    references public.telecom_lines(id, workspace_id) on delete restrict,
  foreign key (service_case_id, workspace_id)
    references public.service_cases(id, workspace_id) on delete restrict,
  foreign key (opportunity_id, workspace_id)
    references public.opportunities(id, workspace_id) on delete restrict,
  check (num_nonnulls(
    customer_id, contract_id, service_id, line_id, service_case_id, opportunity_id
  ) = 1),
  check ((status = 'archived') = (archived_at is not null)),
  check (archived_at is null or archived_at >= created_at)
);

comment on table public.documents is
  'Protected metadata with one FK target. The telecom-documents bucket and private object policies are a separate release gate.';
comment on column public.documents.file_name is
  'Potentially sensitive display metadata; reveal/copy/download requires a server-issued capability.';
comment on column public.documents.storage_path is
  'Server-generated only: <workspace>/documents/<document>/<opaque-object-uuid>.';

create index documents_customer_idx
  on public.documents (workspace_id, customer_id, status, created_at desc)
  where customer_id is not null;
create index documents_contract_idx
  on public.documents (workspace_id, contract_id, status, created_at desc)
  where contract_id is not null;
create index documents_service_idx
  on public.documents (workspace_id, service_id, status, created_at desc)
  where service_id is not null;
create index documents_line_idx
  on public.documents (workspace_id, line_id, status, created_at desc)
  where line_id is not null;
create index documents_case_idx
  on public.documents (workspace_id, service_case_id, status, created_at desc)
  where service_case_id is not null;
create index documents_opportunity_idx
  on public.documents (workspace_id, opportunity_id, status, created_at desc)
  where opportunity_id is not null;

create or replace function public.validate_service_case_context()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_user_id is not null and not exists (
    select 1 from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = new.workspace_id and wm.user_id = new.assigned_user_id
      and wm.status = 'active' and w.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'case assignee is not an active workspace member';
  end if;
  if new.contract_id is not null and not exists (
    select 1 from public.telecom_contracts c
    where c.id = new.contract_id and c.workspace_id = new.workspace_id
      and c.customer_id = new.customer_id
  ) then
    raise exception using errcode = '23514', message = 'case contract scope mismatch';
  end if;
  if new.service_id is not null and not exists (
    select 1 from public.telecom_services s
    where s.id = new.service_id and s.workspace_id = new.workspace_id
      and s.customer_id = new.customer_id and s.contract_id = new.contract_id
  ) then
    raise exception using errcode = '23514', message = 'case service scope mismatch';
  end if;
  if new.line_id is not null and not exists (
    select 1 from public.telecom_lines l
    where l.id = new.line_id and l.workspace_id = new.workspace_id
      and l.service_id = new.service_id
  ) then
    raise exception using errcode = '23514', message = 'case line scope mismatch';
  end if;
  return new;
end;
$$;

create or replace function public.validate_document_storage_path()
returns trigger language plpgsql set search_path = '' as $$
declare expected_prefix text; object_key text;
begin
  expected_prefix := new.workspace_id::text || '/documents/' || new.id::text || '/';
  object_key := substring(new.storage_path from char_length(expected_prefix) + 1);
  if position(expected_prefix in new.storage_path) <> 1
    or object_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using errcode = '23514', message = 'document path must use the server-generated workspace/document/object grammar';
  end if;
  return new;
end;
$$;

create or replace function public.protect_support_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.created_by_user_id is distinct from old.created_by_user_id then
    raise exception using errcode = '55000', message = 'entity, workspace and creator are immutable';
  end if;
  if tg_table_name = 'service_cases' and new.customer_id is distinct from old.customer_id then
    raise exception using errcode = '55000', message = 'case customer is immutable';
  end if;
  if tg_table_name = 'documents' and (
    new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or new.sha256_hex is distinct from old.sha256_hex
    or new.size_bytes is distinct from old.size_bytes
    or new.media_type is distinct from old.media_type
  ) then
    raise exception using errcode = '55000', message = 'document storage identity is immutable';
  end if;
  if tg_table_name = 'documents' and (
    new.customer_id is distinct from old.customer_id
    or new.contract_id is distinct from old.contract_id
    or new.service_id is distinct from old.service_id
    or new.line_id is distinct from old.line_id
    or new.service_case_id is distinct from old.service_case_id
    or new.opportunity_id is distinct from old.opportunity_id
  ) then
    raise exception using errcode = '55000', message = 'document target is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_service_case_context() from public, anon, authenticated;
revoke all on function public.validate_document_storage_path() from public, anon, authenticated;
revoke all on function public.protect_support_identity() from public, anon, authenticated;

create trigger service_cases_validate_context
  before insert or update of workspace_id, customer_id, contract_id, service_id, line_id, assigned_user_id
  on public.service_cases for each row execute function public.validate_service_case_context();
create trigger service_cases_protect_identity before update on public.service_cases
  for each row execute function public.protect_support_identity();
create trigger service_cases_set_updated_at before update on public.service_cases
  for each row execute function public.set_updated_at();

create trigger documents_validate_storage_path
  before insert or update of workspace_id, storage_path on public.documents
  for each row execute function public.validate_document_storage_path();
create trigger documents_protect_identity before update on public.documents
  for each row execute function public.protect_support_identity();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.service_cases enable row level security;
alter table public.service_cases force row level security;
alter table public.documents enable row level security;
alter table public.documents force row level security;

create policy service_cases_select_active_member on public.service_cases
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy service_cases_insert_owner_admin on public.service_cases
  for insert to authenticated with check (
    public.has_workspace_role(workspace_id, array['owner','admin']::text[])
    and created_by_user_id = auth.uid()
  );
create policy service_cases_update_owner_admin on public.service_cases
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));

create policy documents_select_active_member on public.documents
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy documents_insert_owner_admin on public.documents
  for insert to authenticated with check (
    public.has_workspace_role(workspace_id, array['owner','admin']::text[])
    and created_by_user_id = auth.uid()
  );
create policy documents_update_owner_admin on public.documents
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']::text[]))
  with check (
    public.has_workspace_role(workspace_id, array['owner','admin']::text[])
    and (archived_by_user_id is null or archived_by_user_id = auth.uid())
  );

revoke all on table public.service_cases from public, anon, authenticated;
revoke all on table public.documents from public, anon, authenticated;

commit;
