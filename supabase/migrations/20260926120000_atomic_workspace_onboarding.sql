-- Atomic, retry-safe onboarding for an authenticated user with no active
-- workspace membership. No service-role credential is involved.

begin;

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

  -- Serializes retries and concurrent onboarding attempts for this identity.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select w.*
    into v_workspace
    from public.workspace_members as wm
    join public.workspaces as w on w.id = wm.workspace_id
   where wm.user_id = v_user_id
     and wm.status = 'active'
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

  if p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'invalid workspace name';
  end if;
  if p_slug is null or p_slug <> pg_catalog.lower(p_slug)
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or pg_catalog.char_length(p_slug) > 64 then
    raise exception using errcode = '22023', message = 'invalid workspace slug';
  end if;

  insert into public.workspaces (name, slug)
  values (pg_catalog.btrim(p_name), p_slug)
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
