-- Telecom domain v1, slice 5: opportunities, tasks, meetings and activity.
-- Raw relations remain closed; read DTOs are projected by server-owned readers.

begin;

create table public.opportunity_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  position integer not null check (position >= 0),
  outcome text check (outcome is null or outcome in ('won', 'lost')),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, code),
  unique (workspace_id, position) deferrable initially immediate
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid not null,
  stage_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'cancelled')),
  owner_user_id uuid references auth.users(id) on delete set null,
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  next_follow_up_at timestamptz,
  closed_at timestamptz,
  close_reason_code text check (close_reason_code is null or close_reason_code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  source text not null default 'manual' check (source in ('manual', 'import', 'integration')),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (id, workspace_id, customer_id),
  foreign key (customer_id, workspace_id) references public.customers(id, workspace_id) on delete restrict,
  foreign key (stage_id, workspace_id) references public.opportunity_stages(id, workspace_id) on delete restrict,
  check ((amount_minor is null) = (currency is null)),
  check ((status = 'open') = (closed_at is null)),
  check (status in ('lost', 'cancelled') or close_reason_code is null)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid,
  opportunity_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text check (priority is null or priority in ('low', 'normal', 'high')),
  due_at timestamptz,
  assigned_user_id uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (customer_id, workspace_id) references public.customers(id, workspace_id) on delete restrict,
  foreign key (opportunity_id, workspace_id, customer_id)
    references public.opportunities(id, workspace_id, customer_id) on delete restrict,
  check (opportunity_id is null or customer_id is not null),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid,
  opportunity_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  channel text not null default 'other' check (channel in ('in_person', 'phone', 'video', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  timezone text not null check (char_length(btrim(timezone)) between 1 and 64),
  assigned_user_id uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  no_show_at timestamptz,
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (customer_id, workspace_id) references public.customers(id, workspace_id) on delete restrict,
  foreign key (opportunity_id, workspace_id, customer_id)
    references public.opportunities(id, workspace_id, customer_id) on delete restrict,
  check (opportunity_id is null or customer_id is not null),
  check (ends_at is null or ends_at > starts_at),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check ((status = 'no_show') = (no_show_at is not null))
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  customer_id uuid,
  contract_id uuid,
  service_id uuid,
  opportunity_id uuid,
  task_id uuid,
  calendar_event_id uuid,
  activity_kind text not null check (activity_kind in ('created', 'updated', 'contacted', 'status_changed', 'system')),
  summary_code text not null check (summary_code in (
    'entity.created', 'entity.updated', 'entity.contacted',
    'entity.status_changed', 'system.imported', 'system.synchronized'
  )),
  actor_kind text not null default 'user' check (actor_kind in ('user', 'integration', 'system')),
  actor_user_id uuid,
  source text not null default 'manual' check (source in ('manual', 'import', 'integration', 'system')),
  source_event_ref text check (source_event_ref is null or source_event_ref ~ '^[A-Za-z0-9:_-]{8,160}$'),
  occurred_at timestamptz not null default now(),
  created_by_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (customer_id, workspace_id) references public.customers(id, workspace_id) on delete restrict,
  foreign key (contract_id, workspace_id) references public.telecom_contracts(id, workspace_id) on delete restrict,
  foreign key (service_id, workspace_id) references public.telecom_services(id, workspace_id) on delete restrict,
  foreign key (opportunity_id, workspace_id) references public.opportunities(id, workspace_id) on delete restrict,
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete restrict,
  foreign key (calendar_event_id, workspace_id) references public.calendar_events(id, workspace_id) on delete restrict,
  check ((source = 'manual') = (source_event_ref is null)),
  check (
    (source = 'manual' and actor_kind = 'user')
    or (source in ('import', 'integration') and actor_kind = 'integration')
    or (source = 'system' and actor_kind = 'system')
  ),
  check ((activity_kind = 'system') = (actor_kind = 'system')),
  check (
    (activity_kind = 'created' and summary_code = 'entity.created')
    or (activity_kind = 'updated' and summary_code = 'entity.updated')
    or (activity_kind = 'contacted' and summary_code = 'entity.contacted')
    or (activity_kind = 'status_changed' and summary_code = 'entity.status_changed')
    or (activity_kind = 'system' and summary_code in ('system.imported', 'system.synchronized'))
  ),
  check (source = 'system' or num_nonnulls(customer_id, contract_id, service_id, opportunity_id, task_id, calendar_event_id) > 0)
);

comment on column public.activities.summary_code is
  'Allowlisted event code rendered server-side. Raw PII, prompts, documents and before/after dumps are forbidden.';

create index opportunity_stages_workspace_status_idx
  on public.opportunity_stages (workspace_id, status, position);
create index opportunities_customer_status_idx
  on public.opportunities (workspace_id, customer_id, status, next_follow_up_at);
create index opportunities_owner_status_idx
  on public.opportunities (workspace_id, owner_user_id, status, next_follow_up_at)
  where owner_user_id is not null;
create index opportunities_stage_idx
  on public.opportunities (workspace_id, stage_id, status);
create index opportunities_dashboard_idx
  on public.opportunities (workspace_id, status, next_follow_up_at, id)
  where status = 'open';
create index tasks_due_idx
  on public.tasks (workspace_id, status, due_at, id)
  where status in ('pending', 'in_progress');
create index tasks_customer_idx
  on public.tasks (workspace_id, customer_id, status, due_at, id)
  where customer_id is not null;
create index tasks_assignee_idx
  on public.tasks (workspace_id, assigned_user_id, status, due_at, id)
  where assigned_user_id is not null;
create index tasks_opportunity_idx
  on public.tasks (workspace_id, opportunity_id)
  where opportunity_id is not null;
create index calendar_events_window_idx
  on public.calendar_events (workspace_id, status, starts_at, id);
create index calendar_events_customer_idx
  on public.calendar_events (workspace_id, customer_id, starts_at, id)
  where customer_id is not null;
create index calendar_events_assignee_idx
  on public.calendar_events (workspace_id, assigned_user_id, starts_at, id)
  where assigned_user_id is not null;
create index calendar_events_opportunity_idx
  on public.calendar_events (workspace_id, opportunity_id)
  where opportunity_id is not null;
create index activities_workspace_time_idx
  on public.activities (workspace_id, occurred_at desc, id desc);
create index activities_customer_time_idx
  on public.activities (workspace_id, customer_id, occurred_at desc, id desc)
  where customer_id is not null;
create unique index activities_source_event_uidx
  on public.activities (workspace_id, source, source_event_ref)
  where source_event_ref is not null;

create or replace function public.validate_opportunity_context()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_outcome text; stage_status text; requires_active boolean;
begin
  if tg_op = 'UPDATE' and new.customer_id is distinct from old.customer_id then
    raise exception using errcode = '55000', message = 'opportunity customer is immutable';
  end if;
  select os.outcome, os.status into stage_outcome, stage_status
    from public.opportunity_stages os
   where os.id = new.stage_id and os.workspace_id = new.workspace_id;
  requires_active := tg_op = 'INSERT';
  if tg_op = 'UPDATE' then
    requires_active := new.stage_id is distinct from old.stage_id or new.status is distinct from old.status;
  end if;
  if not found or (requires_active and stage_status <> 'active') or (new.status = 'open' and stage_outcome is not null)
    or (new.status = 'won' and stage_outcome is distinct from 'won')
    or (new.status = 'lost' and stage_outcome is distinct from 'lost') then
    raise exception using errcode = '23514', message = 'opportunity stage does not match lifecycle';
  end if;
  if new.owner_user_id is not null and not exists (
    select 1 from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id
     where wm.workspace_id = new.workspace_id and wm.user_id = new.owner_user_id
       and wm.status = 'active' and w.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'opportunity owner is not an active workspace member';
  end if;
  return new;
end;
$$;

create or replace function public.protect_operational_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id
    or new.id is distinct from old.id
    or new.created_by_user_id is distinct from old.created_by_user_id then
    raise exception using errcode = '55000', message = 'entity, workspace and creator are immutable';
  end if;
  return new;
end;
$$;

create or replace function public.protect_referenced_opportunity_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.outcome is distinct from old.outcome and exists (
    select 1 from public.opportunities o
     where o.workspace_id = old.workspace_id and o.stage_id = old.id
  ) then
    raise exception using errcode = '55000', message = 'referenced stage outcome is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.manage_task_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.version <> 1 then
      raise exception using errcode = '55000', message = 'task version must start at one';
    end if;
    return new;
  end if;
  if new.version is distinct from old.version then
    raise exception using errcode = '55000', message = 'task version is server-managed';
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function public.validate_work_item_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_user_id is not null and not exists (
    select 1 from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id
     where wm.workspace_id = new.workspace_id and wm.user_id = new.assigned_user_id
       and wm.status = 'active' and w.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'assignee is not an active workspace member';
  end if;
  return new;
end;
$$;

create or replace function public.validate_meeting_timezone()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using errcode = '23514', message = 'meeting timezone must be an IANA timezone';
  end if;
  return new;
end;
$$;

create or replace function public.validate_activity_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.occurred_at > now() + interval '5 minutes' then
    raise exception using errcode = '23514', message = 'activity occurrence cannot be in the future';
  end if;
  if new.actor_kind <> 'user' then
    if new.actor_user_id is not null then
      raise exception using errcode = '23514', message = 'non-user activity cannot impersonate a user';
    end if;
  elsif new.actor_user_id is null or new.actor_user_id is distinct from auth.uid() or not exists (
    select 1 from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id
     where wm.workspace_id = new.workspace_id and wm.user_id = new.actor_user_id
       and wm.status = 'active' and w.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'activity actor is not the active caller';
  end if;
  if new.contract_id is not null and (new.customer_id is null or not exists (
    select 1 from public.telecom_contracts c where c.id = new.contract_id
      and c.workspace_id = new.workspace_id and c.customer_id = new.customer_id
  )) then raise exception using errcode = '23514', message = 'activity contract scope mismatch'; end if;
  if new.service_id is not null and (new.customer_id is null or not exists (
    select 1 from public.telecom_services s where s.id = new.service_id
      and s.workspace_id = new.workspace_id and s.customer_id = new.customer_id
  )) then raise exception using errcode = '23514', message = 'activity service scope mismatch'; end if;
  if new.contract_id is not null and new.service_id is not null and not exists (
    select 1 from public.telecom_services s where s.id = new.service_id
      and s.workspace_id = new.workspace_id and s.contract_id = new.contract_id
  ) then raise exception using errcode = '23514', message = 'activity service contract mismatch'; end if;
  if new.opportunity_id is not null and not exists (
    select 1 from public.opportunities o where o.id = new.opportunity_id
      and o.workspace_id = new.workspace_id and o.customer_id is not distinct from new.customer_id
  ) then raise exception using errcode = '23514', message = 'activity opportunity scope mismatch'; end if;
  if new.task_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.task_id
      and t.workspace_id = new.workspace_id and t.customer_id is not distinct from new.customer_id
  ) then raise exception using errcode = '23514', message = 'activity task scope mismatch'; end if;
  if new.task_id is not null and new.opportunity_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.task_id
      and t.workspace_id = new.workspace_id and t.opportunity_id = new.opportunity_id
  ) then raise exception using errcode = '23514', message = 'activity task opportunity mismatch'; end if;
  if new.calendar_event_id is not null and not exists (
    select 1 from public.calendar_events e where e.id = new.calendar_event_id
      and e.workspace_id = new.workspace_id and e.customer_id is not distinct from new.customer_id
  ) then raise exception using errcode = '23514', message = 'activity event scope mismatch'; end if;
  if new.calendar_event_id is not null and new.opportunity_id is not null and not exists (
    select 1 from public.calendar_events e where e.id = new.calendar_event_id
      and e.workspace_id = new.workspace_id and e.opportunity_id = new.opportunity_id
  ) then raise exception using errcode = '23514', message = 'activity event opportunity mismatch'; end if;
  return new;
end;
$$;

create or replace function public.reject_activity_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'activities are append-only';
end;
$$;

revoke all on function public.validate_opportunity_context() from public, anon, authenticated;
revoke all on function public.protect_operational_identity() from public, anon, authenticated;
revoke all on function public.protect_referenced_opportunity_stage() from public, anon, authenticated;
revoke all on function public.manage_task_version() from public, anon, authenticated;
revoke all on function public.validate_work_item_assignment() from public, anon, authenticated;
revoke all on function public.validate_meeting_timezone() from public, anon, authenticated;
revoke all on function public.validate_activity_scope() from public, anon, authenticated;
revoke all on function public.reject_activity_mutation() from public, anon, authenticated;

create trigger opportunities_validate_context before insert or update of workspace_id, customer_id, stage_id, status, owner_user_id
  on public.opportunities for each row execute function public.validate_opportunity_context();
create trigger tasks_validate_assignment before insert or update of workspace_id, assigned_user_id
  on public.tasks for each row execute function public.validate_work_item_assignment();
create trigger calendar_events_validate_assignment before insert or update of workspace_id, assigned_user_id
  on public.calendar_events for each row execute function public.validate_work_item_assignment();
create trigger calendar_events_validate_timezone before insert or update of timezone
  on public.calendar_events for each row execute function public.validate_meeting_timezone();
create trigger activities_validate_scope before insert
  on public.activities for each row execute function public.validate_activity_scope();
create trigger activities_append_only before update or delete
  on public.activities for each row execute function public.reject_activity_mutation();

create trigger opportunity_stages_protect_identity before update on public.opportunity_stages
  for each row execute function public.protect_operational_identity();
create trigger opportunity_stages_protect_outcome before update of outcome on public.opportunity_stages
  for each row execute function public.protect_referenced_opportunity_stage();
create trigger opportunities_protect_identity before update on public.opportunities
  for each row execute function public.protect_operational_identity();
create trigger tasks_protect_identity before update on public.tasks
  for each row execute function public.protect_operational_identity();
create trigger tasks_manage_version before insert or update on public.tasks
  for each row execute function public.manage_task_version();
create trigger calendar_events_protect_identity before update on public.calendar_events
  for each row execute function public.protect_operational_identity();

create trigger opportunity_stages_set_updated_at before update on public.opportunity_stages
  for each row execute function public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger calendar_events_set_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.opportunity_stages enable row level security;
alter table public.opportunity_stages force row level security;
alter table public.opportunities enable row level security;
alter table public.opportunities force row level security;
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_events force row level security;
alter table public.activities enable row level security;
alter table public.activities force row level security;

create policy opportunity_stages_select_active_member on public.opportunity_stages for select to authenticated using (public.is_workspace_member(workspace_id));
create policy opportunity_stages_insert_owner_admin on public.opportunity_stages for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy opportunity_stages_update_owner_admin on public.opportunity_stages for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy opportunities_select_active_member on public.opportunities for select to authenticated using (public.is_workspace_member(workspace_id));
create policy opportunities_insert_owner_admin on public.opportunities for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy opportunities_update_owner_admin on public.opportunities for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy tasks_select_active_member on public.tasks for select to authenticated using (public.is_workspace_member(workspace_id));
create policy tasks_insert_owner_admin on public.tasks for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy tasks_update_owner_admin on public.tasks for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy calendar_events_select_active_member on public.calendar_events for select to authenticated using (public.is_workspace_member(workspace_id));
create policy calendar_events_insert_owner_admin on public.calendar_events for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]) and created_by_user_id = auth.uid());
create policy calendar_events_update_owner_admin on public.calendar_events for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::text[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::text[]));
create policy activities_select_active_member on public.activities for select to authenticated using (public.is_workspace_member(workspace_id));
create policy activities_insert_owner_admin on public.activities for insert to authenticated with check (
  public.has_workspace_role(workspace_id, array['owner','admin']::text[])
  and created_by_user_id = auth.uid()
  and source = 'manual'
  and actor_kind = 'user'
  and actor_user_id = auth.uid()
);

revoke all on table public.opportunity_stages from public, anon, authenticated;
revoke all on table public.opportunities from public, anon, authenticated;
revoke all on table public.tasks from public, anon, authenticated;
revoke all on table public.calendar_events from public, anon, authenticated;
revoke all on table public.activities from public, anon, authenticated;

commit;
