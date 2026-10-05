-- Telecom domain v1, slices 3-4: contracts, services, lines,
-- commitments/permanence and renewal windows. Raw relations remain closed.

begin;

create table public.telecom_contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  operator_id uuid not null,
  plan_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended', 'cancelled')),
  start_date date not null,
  signed_date date,
  end_date date,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'import', 'integration')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (id, workspace_id, customer_id, operator_id),
  foreign key (customer_id, workspace_id) references public.customers(id, workspace_id) on delete restrict,
  foreign key (operator_id, workspace_id) references public.telecom_operators(id, workspace_id) on delete restrict,
  foreign key (plan_version_id, workspace_id) references public.telecom_plan_versions(id, workspace_id) on delete restrict,
  check (end_date is null or end_date >= start_date),
  check (status <> 'ended' or end_date is not null),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (status = 'cancelled' or cancelled_by_user_id is null)
);

create index telecom_contracts_customer_status_idx
  on public.telecom_contracts (workspace_id, customer_id, status, start_date desc);
create index telecom_contracts_operator_idx
  on public.telecom_contracts (workspace_id, operator_id, status);
create index telecom_contracts_plan_version_idx
  on public.telecom_contracts (workspace_id, plan_version_id)
  where plan_version_id is not null;
create index telecom_contracts_assigned_user_idx
  on public.telecom_contracts (workspace_id, assigned_user_id, status)
  where assigned_user_id is not null;

create table public.telecom_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  contract_id uuid not null,
  operator_id uuid not null,
  plan_version_id uuid,
  service_kind text not null check (service_kind in ('mobile', 'fiber', 'fixed_voice', 'data_connectivity', 'other')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'ended', 'cancelled')),
  activated_on date,
  ended_on date,
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (id, workspace_id, contract_id),
  foreign key (contract_id, workspace_id, customer_id, operator_id)
    references public.telecom_contracts(id, workspace_id, customer_id, operator_id) on delete restrict,
  foreign key (plan_version_id, workspace_id)
    references public.telecom_plan_versions(id, workspace_id) on delete restrict,
  check (ended_on is null or activated_on is null or ended_on >= activated_on),
  check (
    (status = 'pending' and activated_on is null and ended_on is null)
    or (status in ('active', 'suspended') and activated_on is not null and ended_on is null)
    or (status = 'ended' and activated_on is not null and ended_on is not null)
    or (status = 'cancelled' and ended_on is not null)
  )
);

create index telecom_services_customer_status_idx
  on public.telecom_services (workspace_id, customer_id, status, service_kind);
create index telecom_services_contract_idx
  on public.telecom_services (workspace_id, contract_id, status);
create index telecom_services_plan_version_idx
  on public.telecom_services (workspace_id, plan_version_id)
  where plan_version_id is not null;
create index telecom_services_operator_idx
  on public.telecom_services (workspace_id, operator_id, status);

create table public.telecom_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  service_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'ended', 'cancelled')),
  activated_on date,
  ended_on date,
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (service_id, workspace_id) references public.telecom_services(id, workspace_id) on delete restrict,
  check (ended_on is null or activated_on is null or ended_on >= activated_on),
  check (
    (status = 'pending' and activated_on is null and ended_on is null)
    or (status in ('active', 'suspended') and activated_on is not null and ended_on is null)
    or (status = 'ended' and activated_on is not null and ended_on is not null)
    or (status = 'cancelled' and ended_on is not null)
  )
);

comment on table public.telecom_lines is
  'Line resource only. Sensitive MSISDN/SIM/circuit identifiers are deferred until protected storage is defined.';
create index telecom_lines_service_status_idx
  on public.telecom_lines (workspace_id, service_id, status);

create table public.telecom_commitments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  contract_id uuid not null,
  service_id uuid,
  commitment_kind text not null check (commitment_kind in ('minimum_term', 'device', 'subsidy', 'discount', 'other')),
  starts_on date not null,
  ends_on date not null,
  reason_code text not null check (reason_code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  administrative_status text not null default 'open' check (administrative_status in ('open', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'import', 'integration')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (contract_id, workspace_id) references public.telecom_contracts(id, workspace_id) on delete restrict,
  foreign key (service_id, workspace_id, contract_id)
    references public.telecom_services(id, workspace_id, contract_id) on delete restrict,
  check (ends_on >= starts_on),
  check ((administrative_status = 'cancelled') = (cancelled_at is not null)),
  check (administrative_status = 'cancelled' or cancelled_by_user_id is null)
);

create index telecom_commitments_due_idx
  on public.telecom_commitments (workspace_id, ends_on)
  where administrative_status = 'open';
create index telecom_commitments_contract_idx
  on public.telecom_commitments (workspace_id, contract_id, administrative_status);
create index telecom_commitments_service_idx
  on public.telecom_commitments (workspace_id, service_id, contract_id)
  where service_id is not null;

create table public.telecom_renewals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  contract_id uuid not null,
  target_on date not null,
  opens_on date,
  closes_on date,
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed', 'not_applicable')),
  completed_at timestamptz,
  dismissed_at timestamptz,
  reason_code text check (reason_code is null or reason_code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, contract_id, target_on),
  foreign key (contract_id, workspace_id) references public.telecom_contracts(id, workspace_id) on delete restrict,
  check ((opens_on is null) = (closes_on is null)),
  check (closes_on is null or (closes_on >= opens_on and target_on between opens_on and closes_on)),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'dismissed') = (dismissed_at is not null)),
  exclude using gist (
    workspace_id with =,
    contract_id with =,
    daterange(opens_on, closes_on, '[]') with &&
  ) where (opens_on is not null and closes_on is not null and status <> 'not_applicable')
);

comment on table public.telecom_renewals is
  'Renewal windows. Upcoming/overdue is derived at read time from the window.';

create index telecom_renewals_window_idx
  on public.telecom_renewals (workspace_id, target_on, closes_on, status)
  where status = 'open';
create index telecom_renewals_contract_idx
  on public.telecom_renewals (workspace_id, contract_id, target_on);

create or replace function public.validate_telecom_plan_operator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.plan_version_id is not null then
    if tg_table_name = 'telecom_contracts' and not exists (
      select 1 from public.telecom_plan_versions pv
      join public.telecom_plans p on p.id = pv.plan_id and p.workspace_id = pv.workspace_id
      where pv.id = new.plan_version_id and pv.workspace_id = new.workspace_id
        and p.operator_id = new.operator_id
        and pv.valid_from <= new.start_date
        and (pv.valid_until is null or pv.valid_until >= new.start_date)
    ) then
      raise exception using errcode = '23514', message = 'plan version is invalid for contract';
    end if;
    if tg_table_name = 'telecom_services' and not exists (
      select 1 from public.telecom_plan_versions pv
      join public.telecom_plans p on p.id = pv.plan_id and p.workspace_id = pv.workspace_id
      where pv.id = new.plan_version_id and pv.workspace_id = new.workspace_id
        and p.operator_id = new.operator_id and p.service_kind = new.service_kind
        and (new.activated_on is null or (
          pv.valid_from <= new.activated_on
          and (pv.valid_until is null or pv.valid_until >= new.activated_on)
        ))
    ) then
      raise exception using errcode = '23514', message = 'plan version is invalid for service';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_referenced_telecom_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.operator_id, new.service_kind) is distinct from (old.operator_id, old.service_kind)
     and exists (
       select 1 from public.telecom_plan_versions pv
       where pv.workspace_id = old.workspace_id and pv.plan_id = old.id
     ) then
    raise exception using errcode = '55000', message = 'referenced plan identity is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.validate_telecom_contract_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_user_id is not null and not exists (
    select 1 from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = new.workspace_id and wm.user_id = new.assigned_user_id
      and wm.status = 'active' and w.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'assigned user is not an active workspace member';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_telecom_plan_operator() from public, anon, authenticated;
revoke all on function public.validate_telecom_contract_assignment() from public, anon, authenticated;
revoke all on function public.protect_referenced_telecom_plan() from public, anon, authenticated;

create trigger telecom_plans_protect_referenced_identity
  before update of operator_id, service_kind on public.telecom_plans
  for each row execute function public.protect_referenced_telecom_plan();

create trigger telecom_contracts_validate_plan before insert or update of workspace_id, operator_id, plan_version_id, start_date
  on public.telecom_contracts for each row execute function public.validate_telecom_plan_operator();
create trigger telecom_services_validate_plan before insert or update of workspace_id, operator_id, plan_version_id, service_kind, activated_on
  on public.telecom_services for each row execute function public.validate_telecom_plan_operator();
create trigger telecom_contracts_validate_assignment before insert or update of workspace_id, assigned_user_id
  on public.telecom_contracts for each row execute function public.validate_telecom_contract_assignment();

create trigger telecom_contracts_set_updated_at before update on public.telecom_contracts
  for each row execute function public.set_updated_at();
create trigger telecom_services_set_updated_at before update on public.telecom_services
  for each row execute function public.set_updated_at();
create trigger telecom_lines_set_updated_at before update on public.telecom_lines
  for each row execute function public.set_updated_at();
create trigger telecom_commitments_set_updated_at before update on public.telecom_commitments
  for each row execute function public.set_updated_at();
create trigger telecom_renewals_set_updated_at before update on public.telecom_renewals
  for each row execute function public.set_updated_at();

alter table public.telecom_contracts enable row level security;
alter table public.telecom_contracts force row level security;
alter table public.telecom_services enable row level security;
alter table public.telecom_services force row level security;
alter table public.telecom_lines enable row level security;
alter table public.telecom_lines force row level security;
alter table public.telecom_commitments enable row level security;
alter table public.telecom_commitments force row level security;
alter table public.telecom_renewals enable row level security;
alter table public.telecom_renewals force row level security;

create policy telecom_contracts_select_active_member on public.telecom_contracts for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_contracts_insert_owner_admin on public.telecom_contracts for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy telecom_contracts_update_owner_admin on public.telecom_contracts for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy telecom_services_select_active_member on public.telecom_services for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_services_insert_owner_admin on public.telecom_services for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy telecom_services_update_owner_admin on public.telecom_services for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy telecom_lines_select_active_member on public.telecom_lines for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_lines_insert_owner_admin on public.telecom_lines for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy telecom_lines_update_owner_admin on public.telecom_lines for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy telecom_commitments_select_active_member on public.telecom_commitments for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_commitments_insert_owner_admin on public.telecom_commitments for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy telecom_commitments_update_owner_admin on public.telecom_commitments for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy telecom_renewals_select_active_member on public.telecom_renewals for select to authenticated using (public.is_workspace_member(workspace_id));
create policy telecom_renewals_insert_owner_admin on public.telecom_renewals for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy telecom_renewals_update_owner_admin on public.telecom_renewals for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));

revoke all on table public.telecom_contracts from public, anon, authenticated;
revoke all on table public.telecom_services from public, anon, authenticated;
revoke all on table public.telecom_lines from public, anon, authenticated;
revoke all on table public.telecom_commitments from public, anon, authenticated;
revoke all on table public.telecom_renewals from public, anon, authenticated;

commit;
