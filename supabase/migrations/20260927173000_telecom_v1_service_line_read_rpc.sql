-- Server-only portfolio readers; source identifiers are never projected.
begin;

create index if not exists telecom_services_read_page_idx
  on public.telecom_services (workspace_id, created_at desc, id desc);
create index if not exists telecom_lines_read_page_idx
  on public.telecom_lines (workspace_id, created_at desc, id desc);

create or replace function public.telecom_v1_service_row(
  p_workspace_id uuid, p_service_id uuid, p_scope_epoch text
) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'contract_version', 'telecom.v1', 'scope_epoch', p_scope_epoch, 'id', s.id,
    'customer', jsonb_build_object('kind','customer','id',customer.id,
      'display_name',coalesce(nullif(btrim(customer.trade_name), ''),customer.legal_name)),
    'contract', jsonb_build_object('kind','contract','id',contract.id,'display_name','Contrato'),
    'operator', jsonb_build_object('kind','operator','id',op.id,'display_name',op.display_name),
    'plan', case when plan.id is null then null else jsonb_build_object(
      'kind','plan','id',plan.id,'display_name',plan.display_name) end,
    'service_kind',s.service_kind,'display_name',s.display_name,'status',s.status,
    'activated_on',s.activated_on,'ended_on',s.ended_on,'capabilities','[]'::jsonb)
  from public.telecom_services s
  join public.customers customer on customer.workspace_id=s.workspace_id and customer.id=s.customer_id
  join public.telecom_contracts contract on contract.workspace_id=s.workspace_id and contract.id=s.contract_id
  join public.telecom_operators op on op.workspace_id=s.workspace_id and op.id=s.operator_id
  left join public.telecom_plan_versions pv on pv.workspace_id=s.workspace_id and pv.id=s.plan_version_id
  left join public.telecom_plans plan on plan.workspace_id=pv.workspace_id and plan.id=pv.plan_id
  where s.workspace_id=p_workspace_id and s.id=p_service_id
$$;

create or replace function public.telecom_v1_line_row(
  p_workspace_id uuid, p_line_id uuid, p_scope_epoch text
) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'contract_version','telecom.v1','scope_epoch',p_scope_epoch,'id',line.id,
    'service',jsonb_build_object('kind','service','id',service.id,'display_name',service.display_name),
    'identifier',jsonb_build_object('field_class','line_identifier','visibility','not_available'),
    'status',line.status,'activated_on',line.activated_on,'ended_on',line.ended_on,
    'capabilities','[]'::jsonb)
  from public.telecom_lines line
  join public.telecom_services service on service.workspace_id=line.workspace_id and service.id=line.service_id
  where line.workspace_id=p_workspace_id and line.id=p_line_id
$$;

create or replace function public.telecom_v1_service_list(
  p_actor_id uuid, p_workspace_id uuid, p_scope_epoch text,
  p_customer_id uuid, p_contract_id uuid, p_operator_id uuid, p_status text,
  p_limit integer, p_after_created_at timestamptz, p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_scope_epoch is null or char_length(p_scope_epoch) not between 16 and 160
    or p_scope_epoch !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$'
    or p_limit not between 1 and 100
    or p_status is not null and p_status not in ('pending','active','suspended','ended','cancelled')
    or (p_after_created_at is null) <> (p_after_id is null) then
    raise exception using errcode='22023',message='invalid service list input';
  end if;
  with page as materialized (
    select s.id,s.created_at from public.telecom_services s
    where s.workspace_id=p_workspace_id
      and (p_customer_id is null or s.customer_id=p_customer_id)
      and (p_contract_id is null or s.contract_id=p_contract_id)
      and (p_operator_id is null or s.operator_id=p_operator_id)
      and (p_status is null or s.status=p_status)
      and (p_after_created_at is null or (s.created_at,s.id)<(p_after_created_at,p_after_id))
    order by s.created_at desc,s.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), cursor_row as (
    select created_at,id from visible order by created_at,id limit 1
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(public.telecom_v1_service_row(p_workspace_id,id,p_scope_epoch)
      order by created_at desc,id desc) from visible),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page),
    'next_created_at',case when (select count(*)>p_limit from page) then (select created_at from cursor_row) else null end,
    'next_id',case when (select count(*)>p_limit from page) then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

create or replace function public.telecom_v1_line_list(
  p_actor_id uuid, p_workspace_id uuid, p_scope_epoch text,
  p_customer_id uuid, p_service_id uuid, p_status text,
  p_limit integer, p_after_created_at timestamptz, p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_scope_epoch is null or char_length(p_scope_epoch) not between 16 and 160
    or p_scope_epoch !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$'
    or p_limit not between 1 and 100
    or p_status is not null and p_status not in ('pending','active','suspended','ended','cancelled')
    or (p_after_created_at is null) <> (p_after_id is null) then
    raise exception using errcode='22023',message='invalid line list input';
  end if;
  with page as materialized (
    select line.id,line.created_at from public.telecom_lines line
    join public.telecom_services s on s.workspace_id=line.workspace_id and s.id=line.service_id
    where line.workspace_id=p_workspace_id
      and (p_customer_id is null or s.customer_id=p_customer_id)
      and (p_service_id is null or line.service_id=p_service_id)
      and (p_status is null or line.status=p_status)
      and (p_after_created_at is null or (line.created_at,line.id)<(p_after_created_at,p_after_id))
    order by line.created_at desc,line.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), cursor_row as (
    select created_at,id from visible order by created_at,id limit 1
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(public.telecom_v1_line_row(p_workspace_id,id,p_scope_epoch)
      order by created_at desc,id desc) from visible),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page),
    'next_created_at',case when (select count(*)>p_limit from page) then (select created_at from cursor_row) else null end,
    'next_id',case when (select count(*)>p_limit from page) then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

revoke all on function public.telecom_v1_service_row(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.telecom_v1_line_row(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.telecom_v1_service_list(uuid,uuid,text,uuid,uuid,uuid,text,integer,timestamptz,uuid)
  from public,anon,authenticated;
revoke all on function public.telecom_v1_line_list(uuid,uuid,text,uuid,uuid,text,integer,timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.telecom_v1_service_list(uuid,uuid,text,uuid,uuid,uuid,text,integer,timestamptz,uuid)
  to service_role;
grant execute on function public.telecom_v1_line_list(uuid,uuid,text,uuid,uuid,text,integer,timestamptz,uuid)
  to service_role;
commit;
