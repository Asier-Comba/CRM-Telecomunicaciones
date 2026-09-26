-- Canonical tenant and identity foundation for CRM Telecom.
--
-- Authorization source of truth:
--   public.workspace_members(role, status)
--
-- public.profiles intentionally has no role column. Its workspace_id is only a
-- default-workspace preference for compatible clients; every authorization
-- decision must re-resolve an active workspace_members row.

begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  vertical text not null default 'telecom' check (vertical = 'telecom'),
  status text not null default 'active' check (status in ('active', 'suspended')),
  branding jsonb not null default '{}'::jsonb check (jsonb_typeof(branding) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  email text,
  full_name text check (full_name is null or char_length(full_name) <= 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.workspace_id is
  'Non-authorizing default workspace preference. Validate workspace_members on every request.';

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index profiles_workspace_idx on public.profiles(workspace_id);
create index profiles_email_lower_idx on public.profiles(lower(email));
create index workspace_members_user_active_idx
  on public.workspace_members(user_id, workspace_id)
  where status = 'active';
create index workspace_members_workspace_role_idx
  on public.workspace_members(workspace_id, role)
  where status = 'active';

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

create or replace function public.current_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select wm.workspace_id
  from public.workspace_members as wm
  where wm.user_id = auth.uid()
    and wm.status = 'active'
$$;

create or replace function public.current_workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members as wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = auth.uid()
    and wm.status = 'active'
  limit 1
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
$$;

create or replace function public.has_workspace_role(
  p_workspace_id uuid,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = any(p_allowed_roles)
  )
$$;

create or replace function public.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as mine
    join public.workspace_members as theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = p_user_id
      and theirs.status = 'active'
  )
$$;

revoke all on function public.current_workspace_ids() from public, anon;
revoke all on function public.current_workspace_role(uuid) from public, anon;
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, text[]) from public, anon;
revoke all on function public.shares_workspace_with(uuid) from public, anon;

grant execute on function public.current_workspace_ids() to authenticated;
grant execute on function public.current_workspace_role(uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;

create policy workspaces_select_member
  on public.workspaces
  for select
  to authenticated
  using (public.is_workspace_member(id));

create policy profiles_select_shared_workspace
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.shares_workspace_with(id));

create policy profiles_insert_self
  on public.profiles
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and (workspace_id is null or public.is_workspace_member(workspace_id))
  );

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (workspace_id is null or public.is_workspace_member(workspace_id))
  );

create policy workspace_members_select_self_or_admin
  on public.workspace_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
  );

revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workspace_members from anon, authenticated;

grant select on table public.workspaces to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.workspace_members to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 160), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
