-- Telecom domain v1, slice 2: workspace-scoped operator and plan catalog.
-- No provider is hard-coded and plan revisions are immutable business facts.

begin;

create extension if not exists btree_gist with schema extensions;

create table public.telecom_operators (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'inactive')),
  source text not null default 'manual' check (source in ('manual', 'import', 'integration')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, code)
);

create table public.telecom_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  operator_id uuid not null,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_-]{0,95}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 200),
  service_kind text not null
    check (service_kind in ('mobile', 'fiber', 'fixed_voice', 'data_connectivity', 'other')),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, operator_id, code),
  foreign key (operator_id, workspace_id)
    references public.telecom_operators(id, workspace_id) on delete restrict
);

create table public.telecom_plan_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  plan_id uuid not null,
  version_number integer not null check (version_number > 0),
  valid_from date not null,
  valid_until date,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  recurring_amount_minor bigint check (recurring_amount_minor is null or recurring_amount_minor >= 0),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, plan_id, version_number),
  foreign key (plan_id, workspace_id)
    references public.telecom_plans(id, workspace_id) on delete restrict,
  check (valid_until is null or valid_until >= valid_from),
  exclude using gist (
    workspace_id with =,
    plan_id with =,
    daterange(valid_from, coalesce(valid_until, 'infinity'::date), '[]') with &&
  )
);

comment on table public.telecom_plan_versions is
  'Immutable commercial plan revisions; this is not a billing engine.';

create index telecom_operators_workspace_status_idx
  on public.telecom_operators (workspace_id, status, display_name);
create index telecom_plans_workspace_operator_status_idx
  on public.telecom_plans (workspace_id, operator_id, status, service_kind);
create index telecom_plan_versions_lookup_idx
  on public.telecom_plan_versions (workspace_id, plan_id, valid_from desc);

create trigger telecom_operators_set_updated_at
  before update on public.telecom_operators
  for each row execute function public.set_updated_at();
create trigger telecom_plans_set_updated_at
  before update on public.telecom_plans
  for each row execute function public.set_updated_at();

create or replace function public.reject_telecom_plan_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'telecom plan versions are immutable';
end;
$$;

revoke all on function public.reject_telecom_plan_version_mutation() from public, anon, authenticated;

create trigger telecom_plan_versions_immutable
  before update or delete on public.telecom_plan_versions
  for each row execute function public.reject_telecom_plan_version_mutation();

alter table public.telecom_operators enable row level security;
alter table public.telecom_operators force row level security;
alter table public.telecom_plans enable row level security;
alter table public.telecom_plans force row level security;
alter table public.telecom_plan_versions enable row level security;
alter table public.telecom_plan_versions force row level security;

create policy telecom_operators_select_active_member on public.telecom_operators
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_operators_insert_owner_admin on public.telecom_operators
  for insert to authenticated with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and created_by_user_id = auth.uid()
  );
create policy telecom_operators_update_owner_admin on public.telecom_operators
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]));

create policy telecom_plans_select_active_member on public.telecom_plans
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_plans_insert_owner_admin on public.telecom_plans
  for insert to authenticated with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and created_by_user_id = auth.uid()
  );
create policy telecom_plans_update_owner_admin on public.telecom_plans
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]));

create policy telecom_plan_versions_select_active_member on public.telecom_plan_versions
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_plan_versions_insert_owner_admin on public.telecom_plan_versions
  for insert to authenticated with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    and created_by_user_id = auth.uid()
  );

revoke all on table public.telecom_operators from public, anon, authenticated;
revoke all on table public.telecom_plans from public, anon, authenticated;
revoke all on table public.telecom_plan_versions from public, anon, authenticated;

commit;
