-- Telecom domain v1, slice 1: customer accounts and human contacts.
--
-- A customer is the commercial account. account_kind distinguishes a legal
-- entity from a sole trader without turning a human contact into the customer
-- record. Free-form notes are intentionally excluded from identity tables.

begin;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  account_kind text not null
    check (account_kind in ('legal_entity', 'sole_trader')),
  legal_name text not null
    check (char_length(btrim(legal_name)) between 1 and 200),
  trade_name text
    check (trade_name is null or char_length(btrim(trade_name)) between 1 and 200),
  tax_identifier_kind text
    check (tax_identifier_kind is null or tax_identifier_kind in ('CIF', 'NIF', 'VAT', 'OTHER')),
  tax_identifier text
    check (tax_identifier is null or char_length(btrim(tax_identifier)) between 3 and 64),
  lifecycle text not null default 'prospect'
    check (lifecycle in ('lead', 'prospect', 'customer', 'former_customer')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  source text not null default 'manual'
    check (source in ('manual', 'import', 'integration')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  check ((tax_identifier is null) = (tax_identifier_kind is null)),
  check ((status = 'archived') = (archived_at is not null)),
  check (archived_at is null or archived_at >= created_at)
);

comment on table public.customers is
  'Telecom commercial accounts. Human contact methods belong to public.contacts.';
comment on column public.customers.assigned_user_id is
  'Commercial owner. A trigger requires an active membership in the same workspace.';
comment on column public.customers.tax_identifier is
  'Sensitive business identifier. Read/copy/reveal authorization is a server capability.';

create unique index customers_workspace_tax_identifier_uidx
  on public.customers (
    workspace_id,
    tax_identifier_kind,
    upper(replace(replace(btrim(tax_identifier), ' ', ''), '-', ''))
  )
  where tax_identifier is not null;
create index customers_workspace_status_idx
  on public.customers (workspace_id, status, created_at desc);
create index customers_workspace_lifecycle_idx
  on public.customers (workspace_id, lifecycle, created_at desc)
  where status <> 'archived';
create index customers_workspace_legal_name_idx
  on public.customers (workspace_id, lower(btrim(legal_name)));
create index customers_workspace_trade_name_idx
  on public.customers (workspace_id, lower(btrim(trade_name)))
  where trade_name is not null;
create index customers_assigned_user_idx
  on public.customers (workspace_id, assigned_user_id)
  where assigned_user_id is not null and status <> 'archived';

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 160),
  job_title text
    check (job_title is null or char_length(btrim(job_title)) between 1 and 160),
  email text
    check (email is null or char_length(btrim(email)) between 3 and 320),
  phone text
    check (phone is null or char_length(btrim(phone)) between 3 and 40),
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id) on delete restrict,
  check ((status = 'archived') = (archived_at is not null)),
  check (archived_at is null or archived_at >= created_at),
  check (not is_primary or (status = 'active' and archived_at is null))
);

comment on table public.contacts is
  'Human contacts for one customer account; zero, one or many are valid.';
comment on column public.contacts.email is
  'Sensitive contact method. Read/copy/reveal authorization is a server capability.';
comment on column public.contacts.phone is
  'Sensitive contact method. Read/copy/reveal authorization is a server capability.';

create unique index contacts_one_active_primary_uidx
  on public.contacts (workspace_id, customer_id)
  where is_primary and status = 'active' and archived_at is null;
create index contacts_customer_status_idx
  on public.contacts (workspace_id, customer_id, status, created_at);
create index contacts_workspace_email_idx
  on public.contacts (workspace_id, lower(btrim(email)))
  where email is not null and status <> 'archived';
create index contacts_workspace_phone_idx
  on public.contacts (workspace_id, phone)
  where phone is not null and status <> 'archived';

create or replace function public.validate_customer_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_user_id is not null and not exists (
    select 1
      from public.workspace_members as wm
      join public.workspaces as w on w.id = wm.workspace_id
     where wm.workspace_id = new.workspace_id
       and wm.user_id = new.assigned_user_id
       and wm.status = 'active'
       and w.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'assigned user is not an active workspace member';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_customer_assignment() from public, anon, authenticated;

create trigger customers_validate_assignment
  before insert or update of workspace_id, assigned_user_id on public.customers
  for each row execute function public.validate_customer_assignment();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.contacts enable row level security;
alter table public.contacts force row level security;

create policy customers_select_active_member
  on public.customers
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy customers_insert_owner_admin
  on public.customers
  for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and created_by_user_id = auth.uid()
    and (archived_by_user_id is null or archived_by_user_id = auth.uid())
  );

create policy customers_update_owner_admin
  on public.customers
  for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]))
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and (archived_by_user_id is null or archived_by_user_id = auth.uid())
  );

create policy contacts_select_active_member
  on public.contacts
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy contacts_insert_owner_admin
  on public.contacts
  for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and created_by_user_id = auth.uid()
    and (archived_by_user_id is null or archived_by_user_id = auth.uid())
  );

create policy contacts_update_owner_admin
  on public.contacts
  for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]))
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and (archived_by_user_id is null or archived_by_user_id = auth.uid())
  );

revoke all on table public.customers from public, anon, authenticated;
revoke all on table public.contacts from public, anon, authenticated;

-- Raw tables intentionally receive no authenticated grant. Tax identifiers,
-- email and phone must be projected by a server-owned reader with field
-- capabilities; closed commands will later expose approved mutations. The RLS
-- policies remain defense in depth and define the intended actor matrix.

commit;
