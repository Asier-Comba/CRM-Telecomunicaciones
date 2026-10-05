-- Renewal and permanence windows, server-only tenant scoped RPCs.
begin;

create index if not exists telecom_renewals_read_page_idx
  on public.telecom_renewals (workspace_id, created_at desc, id desc);
create index if not exists telecom_commitments_read_page_idx
  on public.telecom_commitments (workspace_id, created_at desc, id desc);

create or replace function public.telecom_v1_renewal_list(
  p_actor_id uuid,p_workspace_id uuid,p_customer_id uuid,p_from date,p_to date,
  p_limit integer,p_after_created_at timestamptz,p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date := (statement_timestamp() at time zone 'UTC')::date;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_limit not between 1 and 100 or p_from>p_to
    or (p_after_created_at is null)<>(p_after_id is null) then
    raise exception using errcode='22023',message='invalid renewal list input';
  end if;
  with page as materialized (
    select renewal.id,renewal.created_at from public.telecom_renewals renewal
    join public.telecom_contracts contract
      on contract.workspace_id=renewal.workspace_id and contract.id=renewal.contract_id
    where renewal.workspace_id=p_workspace_id
      and (p_customer_id is null or contract.customer_id=p_customer_id)
      and (p_from is null or renewal.target_on>=p_from)
      and (p_to is null or renewal.target_on<=p_to)
      and (p_after_created_at is null or (renewal.created_at,renewal.id)<(p_after_created_at,p_after_id))
    order by renewal.created_at desc,renewal.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), rows as (
    select visible.id,visible.created_at,jsonb_build_object(
      'id',renewal.id,'kind','renewal',
      'customer',jsonb_build_object('kind','customer','id',customer.id,
        'display_name',coalesce(nullif(btrim(customer.trade_name),''),customer.legal_name)),
      'title','Renovación ' || to_char(renewal.target_on,'DD/MM/YYYY'),
      'destination',jsonb_build_object('kind','contract','contract_id',contract.id),
      'capabilities','[]'::jsonb,
      'contract',jsonb_build_object('kind','contract','id',contract.id,'display_name','Contrato'),
      'status',case when renewal.status='open' and renewal.target_on<today then 'overdue'
        when renewal.status='open' then 'upcoming' else renewal.status end,
      'target_on',renewal.target_on,'opens_on',renewal.opens_on,'closes_on',renewal.closes_on) as item
    from visible
    join public.telecom_renewals renewal on renewal.workspace_id=p_workspace_id and renewal.id=visible.id
    join public.telecom_contracts contract on contract.workspace_id=renewal.workspace_id and contract.id=renewal.contract_id
    join public.customers customer on customer.workspace_id=contract.workspace_id and customer.id=contract.customer_id
  ), cursor_row as (
    select created_at,id from visible order by created_at,id limit 1
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(item order by created_at desc,id desc) from rows),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page),
    'next_created_at',case when (select count(*)>p_limit from page) then (select created_at from cursor_row) else null end,
    'next_id',case when (select count(*)>p_limit from page) then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

create or replace function public.telecom_v1_permanence_list(
  p_actor_id uuid,p_workspace_id uuid,p_customer_id uuid,p_from date,p_to date,
  p_limit integer,p_after_created_at timestamptz,p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date := (statement_timestamp() at time zone 'UTC')::date;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_limit not between 1 and 100 or p_from>p_to
    or (p_after_created_at is null)<>(p_after_id is null) then
    raise exception using errcode='22023',message='invalid permanence list input';
  end if;
  with page as materialized (
    select commitment.id,commitment.created_at from public.telecom_commitments commitment
    join public.telecom_contracts contract
      on contract.workspace_id=commitment.workspace_id and contract.id=commitment.contract_id
    where commitment.workspace_id=p_workspace_id
      and (p_customer_id is null or contract.customer_id=p_customer_id)
      and (p_from is null or commitment.ends_on>=p_from)
      and (p_to is null or commitment.ends_on<=p_to)
      and (p_after_created_at is null or (commitment.created_at,commitment.id)<(p_after_created_at,p_after_id))
    order by commitment.created_at desc,commitment.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), rows as (
    select visible.id,visible.created_at,jsonb_build_object(
      'id',commitment.id,'kind','permanence',
      'customer',jsonb_build_object('kind','customer','id',customer.id,
        'display_name',coalesce(nullif(btrim(customer.trade_name),''),customer.legal_name)),
      'title','Permanencia ' || to_char(commitment.ends_on,'DD/MM/YYYY'),
      'destination',jsonb_build_object('kind','contract','contract_id',contract.id),
      'capabilities','[]'::jsonb,
      'contract',jsonb_build_object('kind','contract','id',contract.id,'display_name','Contrato'),
      'service',case when service.id is null then null else jsonb_build_object(
        'kind','service','id',service.id,'display_name',service.display_name) end,
      'status',case when commitment.administrative_status='cancelled' then 'cancelled'
        when commitment.starts_on>today then 'upcoming'
        when commitment.ends_on<today then 'ended' else 'active' end,
      'starts_on',commitment.starts_on,'ends_on',commitment.ends_on,
      'reason_code',commitment.commitment_kind) as item
    from visible
    join public.telecom_commitments commitment on commitment.workspace_id=p_workspace_id and commitment.id=visible.id
    join public.telecom_contracts contract on contract.workspace_id=commitment.workspace_id and contract.id=commitment.contract_id
    join public.customers customer on customer.workspace_id=contract.workspace_id and customer.id=contract.customer_id
    left join public.telecom_services service on service.workspace_id=commitment.workspace_id and service.id=commitment.service_id
  ), cursor_row as (
    select created_at,id from visible order by created_at,id limit 1
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(item order by created_at desc,id desc) from rows),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page),
    'next_created_at',case when (select count(*)>p_limit from page) then (select created_at from cursor_row) else null end,
    'next_id',case when (select count(*)>p_limit from page) then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

revoke all on function public.telecom_v1_renewal_list(uuid,uuid,uuid,date,date,integer,timestamptz,uuid)
  from public,anon,authenticated;
revoke all on function public.telecom_v1_permanence_list(uuid,uuid,uuid,date,date,integer,timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.telecom_v1_renewal_list(uuid,uuid,uuid,date,date,integer,timestamptz,uuid)
  to service_role;
grant execute on function public.telecom_v1_permanence_list(uuid,uuid,uuid,date,date,integer,timestamptz,uuid)
  to service_role;
commit;
