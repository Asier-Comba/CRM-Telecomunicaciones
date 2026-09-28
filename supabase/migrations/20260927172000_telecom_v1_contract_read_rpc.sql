-- Server-only contract projections. The caller's workspace is resolved server-side;
-- this boundary repeats active membership checks before materializing any row.
begin;

create index if not exists telecom_contracts_read_page_idx
  on public.telecom_contracts (workspace_id, created_at desc, id desc);

create or replace function public.telecom_v1_contract_row(
  p_workspace_id uuid, p_contract_id uuid, p_scope_epoch text
) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'contract_version', 'telecom.v1', 'scope_epoch', p_scope_epoch,
    'id', c.id,
    'customer', jsonb_build_object('kind', 'customer', 'id', customer.id,
      'display_name', coalesce(nullif(btrim(customer.trade_name), ''), customer.legal_name)),
    'operator', jsonb_build_object('kind', 'operator', 'id', op.id, 'display_name', op.display_name),
    'plan', case when plan.id is null then null else jsonb_build_object(
      'kind', 'plan', 'id', plan.id, 'display_name', plan.display_name) end,
    'external_reference', jsonb_build_object('field_class', 'contract_reference', 'visibility', 'not_available'),
    'status', c.status, 'start_date', c.start_date, 'signed_date', c.signed_date,
    'end_date', c.end_date, 'cancelled_at', c.cancelled_at,
    'assigned_user', case when c.assigned_user_id is null then null else jsonb_build_object(
      'kind', 'user', 'id', c.assigned_user_id,
      'display_name', coalesce(nullif(btrim(assigned.full_name), ''), 'Usuario asignado')) end,
    'capabilities', '[]'::jsonb
  )
  from public.telecom_contracts c
  join public.customers customer on customer.workspace_id = c.workspace_id and customer.id = c.customer_id
  join public.telecom_operators op on op.workspace_id = c.workspace_id and op.id = c.operator_id
  left join public.telecom_plan_versions pv on pv.workspace_id = c.workspace_id and pv.id = c.plan_version_id
  left join public.telecom_plans plan on plan.workspace_id = pv.workspace_id and plan.id = pv.plan_id
  left join public.profiles assigned on assigned.id = c.assigned_user_id
  where c.workspace_id = p_workspace_id and c.id = p_contract_id
$$;

create or replace function public.telecom_v1_contract_get(
  p_actor_id uuid, p_workspace_id uuid, p_contract_id uuid, p_scope_epoch text
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id, p_workspace_id);
  if p_contract_id is null or p_scope_epoch is null
    or char_length(p_scope_epoch) not between 16 and 160
    or p_scope_epoch !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' then
    raise exception using errcode = '22023', message = 'invalid contract read input';
  end if;
  return public.telecom_v1_contract_row(p_workspace_id, p_contract_id, p_scope_epoch);
end;
$$;

create or replace function public.telecom_v1_contract_list(
  p_actor_id uuid, p_workspace_id uuid, p_scope_epoch text,
  p_customer_id uuid, p_operator_id uuid, p_assignee_id uuid, p_status text,
  p_commitment_from date, p_commitment_to date, p_limit integer,
  p_after_created_at timestamptz, p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id, p_workspace_id);
  if p_scope_epoch is null or char_length(p_scope_epoch) not between 16 and 160
    or p_scope_epoch !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$'
    or p_limit not between 1 and 100
    or p_status is not null and p_status not in ('draft','active','ended','cancelled')
    or p_commitment_from > p_commitment_to
    or (p_after_created_at is null) <> (p_after_id is null) then
    raise exception using errcode = '22023', message = 'invalid contract list input';
  end if;
  with page as materialized (
    select c.id, c.created_at
    from public.telecom_contracts c
    where c.workspace_id = p_workspace_id
      and (p_customer_id is null or c.customer_id = p_customer_id)
      and (p_operator_id is null or c.operator_id = p_operator_id)
      and (p_assignee_id is null or c.assigned_user_id = p_assignee_id)
      and (p_status is null or c.status = p_status)
      and (p_commitment_from is null and p_commitment_to is null or exists (
        select 1 from public.telecom_commitments commitment
        where commitment.workspace_id = c.workspace_id and commitment.contract_id = c.id
          and (p_commitment_from is null or commitment.ends_on >= p_commitment_from)
          and (p_commitment_to is null or commitment.ends_on <= p_commitment_to)))
      and (p_after_created_at is null or (c.created_at, c.id) < (p_after_created_at, p_after_id))
    order by c.created_at desc, c.id desc limit p_limit + 1
  ), visible as (
    select id, created_at from page order by created_at desc, id desc limit p_limit
  ), cursor_row as (
    select created_at, id from visible order by created_at, id limit 1
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(public.telecom_v1_contract_row(p_workspace_id, id, p_scope_epoch)
      order by created_at desc, id desc) from visible), '[]'::jsonb),
    'has_more', (select count(*) > p_limit from page),
    'next_created_at', case when (select count(*) > p_limit from page)
      then (select created_at from cursor_row) else null end,
    'next_id', case when (select count(*) > p_limit from page)
      then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

revoke all on function public.telecom_v1_contract_row(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.telecom_v1_contract_get(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.telecom_v1_contract_list(uuid,uuid,text,uuid,uuid,uuid,text,date,date,integer,timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.telecom_v1_contract_get(uuid,uuid,uuid,text) to service_role;
grant execute on function public.telecom_v1_contract_list(uuid,uuid,text,uuid,uuid,uuid,text,date,date,integer,timestamptz,uuid)
  to service_role;
commit;
