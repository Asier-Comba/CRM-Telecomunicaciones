-- Telecom v1 server-only customer readers.
--
-- These RPCs are not browser APIs. Only service_role may execute them, and the
-- resolved actor/workspace pair is rechecked against active tenant membership
-- inside the database. Raw PII is deliberately absent from every projection.

begin;

create or replace function public.telecom_v1_assert_reader_scope(
  p_actor_id uuid,
  p_workspace_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or p_workspace_id is null or not exists (
    select 1
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
     where wm.user_id = p_actor_id
       and wm.workspace_id = p_workspace_id
       and wm.status = 'active'
       and w.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'reader scope is not authorized';
  end if;
end;
$$;

create or replace function public.telecom_v1_customer_search_rows(
  p_actor_id uuid,
  p_workspace_id uuid,
  p_query text,
  p_status text default null,
  p_assigned_user_id uuid default null,
  p_limit integer default 20,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(p_query));
  result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id, p_workspace_id);
  if normalized_query is null
     or char_length(normalized_query) not between 1 and 200
     or normalized_query ~ '[[:cntrl:]]'
     or p_status is not null and p_status not in ('active', 'inactive', 'archived')
     or p_limit not between 1 and 100
     or (p_after_created_at is null) <> (p_after_id is null) then
    raise exception using errcode = '22023', message = 'invalid customer search input';
  end if;

  with page as materialized (
    select
      c.id,
      c.account_kind,
      c.legal_name,
      c.trade_name,
      c.lifecycle,
      c.status,
      c.assigned_user_id,
      case when c.assigned_user_id is null then null
           else coalesce(nullif(btrim(ap.full_name), ''), 'Usuario asignado') end as assigned_user_name,
      pc.id as primary_contact_id,
      pc.display_name as primary_contact_name,
      c.created_at
    from public.customers c
    left join public.profiles ap on ap.id = c.assigned_user_id
    left join lateral (
      select contact.id, contact.display_name
        from public.contacts contact
       where contact.workspace_id = c.workspace_id
         and contact.customer_id = c.id
         and contact.is_primary
         and contact.status = 'active'
       order by contact.created_at, contact.id
       limit 1
    ) pc on true
    where c.workspace_id = p_workspace_id
      and (p_status is null or c.status = p_status)
      and (p_assigned_user_id is null or c.assigned_user_id = p_assigned_user_id)
      and (
        (lower(btrim(c.legal_name)) >= normalized_query
          and lower(btrim(c.legal_name)) < normalized_query || U&'\FFFF')
        or (c.trade_name is not null
          and lower(btrim(c.trade_name)) >= normalized_query
          and lower(btrim(c.trade_name)) < normalized_query || U&'\FFFF')
      )
      and (
        p_after_created_at is null
        or (c.created_at, c.id) < (p_after_created_at, p_after_id)
      )
    order by c.created_at desc, c.id desc
    limit p_limit + 1
  ), visible as (
    select
      id, account_kind, legal_name, trade_name, lifecycle, status,
      assigned_user_id, assigned_user_name, primary_contact_id,
      primary_contact_name, created_at
    from page order by created_at desc, id desc limit p_limit
  ), cursor_row as (
    select created_at, id from visible order by created_at, id limit 1
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'account_kind', account_kind,
          'legal_name', legal_name,
          'trade_name', trade_name,
          'lifecycle', lifecycle,
          'status', status,
          'assigned_user_id', assigned_user_id,
          'assigned_user_name', assigned_user_name,
          'primary_contact_id', primary_contact_id,
          'primary_contact_name', primary_contact_name
        ) order by created_at desc, id desc
      ) from visible
    ), '[]'::jsonb),
    'has_more', (select count(*) > p_limit from page),
    'next_created_at', case when (select count(*) > p_limit from page)
      then (select created_at from cursor_row) else null end,
    'next_id', case when (select count(*) > p_limit from page)
      then (select id from cursor_row) else null end
  ) into result;

  return result;
end;
$$;

create or replace function public.telecom_v1_customer_get_row(
  p_actor_id uuid,
  p_workspace_id uuid,
  p_customer_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id, p_workspace_id);
  if p_customer_id is null then
    raise exception using errcode = '22023', message = 'invalid customer id';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'account_kind', c.account_kind,
    'legal_name', c.legal_name,
    'trade_name', c.trade_name,
    'lifecycle', c.lifecycle,
    'status', c.status,
    'assigned_user_id', c.assigned_user_id,
    'assigned_user_name', case when c.assigned_user_id is null then null
      else coalesce(nullif(btrim(ap.full_name), ''), 'Usuario asignado') end,
    'primary_contact_id', pc.id,
    'primary_contact_name', pc.display_name
  ) into result
  from public.customers c
  left join public.profiles ap on ap.id = c.assigned_user_id
  left join lateral (
    select contact.id, contact.display_name
      from public.contacts contact
     where contact.workspace_id = c.workspace_id
       and contact.customer_id = c.id
       and contact.is_primary
       and contact.status = 'active'
     order by contact.created_at, contact.id
     limit 1
  ) pc on true
  where c.workspace_id = p_workspace_id
    and c.id = p_customer_id;

  return result;
end;
$$;

revoke all on function public.telecom_v1_assert_reader_scope(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.telecom_v1_customer_search_rows(
  uuid, uuid, text, text, uuid, integer, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.telecom_v1_customer_get_row(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.telecom_v1_customer_search_rows(
  uuid, uuid, text, text, uuid, integer, timestamptz, uuid
) to service_role;
grant execute on function public.telecom_v1_customer_get_row(uuid, uuid, uuid)
  to service_role;

commit;
