-- Prefix search must not depend on the cluster collation ordering. The
-- previous range expression could omit a matching row under en_US.utf8.
-- Keep the existing server-only execute grants through CREATE OR REPLACE.

begin;

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
        starts_with(lower(btrim(c.legal_name)), normalized_query)
        or (c.trade_name is not null
          and starts_with(lower(btrim(c.trade_name)), normalized_query))
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

commit;
