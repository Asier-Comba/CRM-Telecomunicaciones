-- Fail closed when either the membership or its workspace is inactive.
-- This is a forward-only repair: previously published migrations remain
-- immutable and every authorization helper is replaced atomically here.

begin;

create or replace function public.current_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select wm.workspace_id
  from public.workspace_members as wm
  join public.workspaces as w on w.id = wm.workspace_id
  where wm.user_id = auth.uid()
    and wm.status = 'active'
    and w.status = 'active'
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
  join public.workspaces as w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id
    and wm.user_id = auth.uid()
    and wm.status = 'active'
    and w.status = 'active'
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
    join public.workspaces as w on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and w.status = 'active'
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
    join public.workspaces as w on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and w.status = 'active'
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
    join public.workspaces as w
      on w.id = mine.workspace_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = p_user_id
      and theirs.status = 'active'
      and w.status = 'active'
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

drop policy if exists workspace_members_select_self_or_admin on public.workspace_members;
create policy workspace_members_select_self_or_admin
  on public.workspace_members
  for select
  to authenticated
  using (
    (user_id = auth.uid() and public.is_workspace_member(workspace_id))
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
  );

create or replace function public.provision_workspace(
  p_name text,
  p_slug text
)
returns table (
  id uuid,
  name text,
  slug text,
  role text,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace public.workspaces%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select w.*
    into v_workspace
    from public.workspace_members as wm
    join public.workspaces as w on w.id = wm.workspace_id
   where wm.user_id = v_user_id
     and wm.status = 'active'
     and w.status = 'active'
   order by wm.created_at, wm.id
   limit 1;

  if found then
    return query
      select v_workspace.id, v_workspace.name, v_workspace.slug, wm.role, false
        from public.workspace_members as wm
       where wm.workspace_id = v_workspace.id
         and wm.user_id = v_user_id
         and wm.status = 'active'
       limit 1;
    return;
  end if;

  if exists (
    select 1
      from public.workspace_members as wm
      join public.workspaces as w on w.id = wm.workspace_id
     where wm.user_id = v_user_id
       and wm.status = 'active'
       and w.status <> 'active'
  ) then
    raise exception using errcode = '42501', message = 'workspace suspended';
  end if;

  if p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'invalid workspace name';
  end if;
  if p_slug is null or p_slug <> pg_catalog.lower(p_slug)
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or pg_catalog.char_length(p_slug) > 64 then
    raise exception using errcode = '22023', message = 'invalid workspace slug';
  end if;

  insert into public.workspaces (name, slug, status)
  values (pg_catalog.btrim(p_name), p_slug, 'active')
  returning * into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (v_workspace.id, v_user_id, 'owner', 'active');

  insert into public.profiles (id, workspace_id, email)
  select u.id, v_workspace.id, u.email
    from auth.users as u
   where u.id = v_user_id
  on conflict (id) do update
    set workspace_id = excluded.workspace_id,
        email = coalesce(public.profiles.email, excluded.email),
        updated_at = pg_catalog.now();

  return query
    select v_workspace.id, v_workspace.name, v_workspace.slug, 'owner'::text, true;
end;
$$;

revoke all on function public.provision_workspace(text, text) from public, anon;
grant execute on function public.provision_workspace(text, text) to authenticated;

commit;
