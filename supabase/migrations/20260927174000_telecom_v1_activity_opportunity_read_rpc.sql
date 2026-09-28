-- Closed server-only activity and opportunity lists, with safe activity codes.
begin;

create index if not exists activities_read_page_idx
  on public.activities (workspace_id, occurred_at desc, id desc);
create index if not exists opportunities_read_page_idx
  on public.opportunities (workspace_id, created_at desc, id desc);

create or replace function public.telecom_v1_activity_row(p_workspace_id uuid,p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',a.id,'kind','activity',
    'customer',case when customer.id is null then null else jsonb_build_object(
      'kind','customer','id',customer.id,
      'display_name',coalesce(nullif(btrim(customer.trade_name),''),customer.legal_name)) end,
    'activity_kind',a.activity_kind,
    'safe_summary',case a.summary_code
      when 'entity.created' then 'Elemento creado'
      when 'entity.updated' then 'Elemento actualizado'
      when 'entity.contacted' then 'Contacto registrado'
      when 'entity.status_changed' then 'Estado actualizado'
      when 'system.imported' then 'Importación registrada'
      when 'system.synchronized' then 'Sincronización registrada'
      else 'Actividad registrada' end,
    'occurred_at',a.occurred_at,
    'actor',case when a.actor_user_id is null then null else jsonb_build_object(
      'kind','user','id',a.actor_user_id,
      'display_name',coalesce(nullif(btrim(actor.full_name),''),'Usuario')) end,
    'targets','[]'::jsonb,'capabilities','[]'::jsonb)
  from public.activities a
  left join public.customers customer on customer.workspace_id=a.workspace_id and customer.id=a.customer_id
  left join public.profiles actor on actor.id=a.actor_user_id
  where a.workspace_id=p_workspace_id and a.id=p_id
$$;

create or replace function public.telecom_v1_opportunity_row(
  p_workspace_id uuid,p_id uuid
) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',o.id,'kind','opportunity',
    'customer',jsonb_build_object('kind','customer','id',customer.id,
      'display_name',coalesce(nullif(btrim(customer.trade_name),''),customer.legal_name)),
    'title',o.title,
    'destination',jsonb_build_object('kind','opportunity','opportunity_id',o.id),
    'capabilities','[]'::jsonb,
    'stage',jsonb_build_object('kind','opportunity_stage','id',stage.id,'display_name',stage.display_name),
    'status',o.status,'next_follow_up_at',o.next_follow_up_at,
    'follow_up_state',case when o.status <> 'open' or o.next_follow_up_at is null then 'none'
      when o.next_follow_up_at < statement_timestamp() then 'overdue' else 'scheduled' end,
    'amount',case when o.amount_minor is null then null else jsonb_build_object(
      'minor_units',o.amount_minor,'currency',o.currency) end,
    'owner',case when o.owner_user_id is null then null else jsonb_build_object(
      'kind','user','id',o.owner_user_id,
      'display_name',coalesce(nullif(btrim(owner.full_name),''),'Usuario asignado')) end)
  from public.opportunities o
  join public.customers customer on customer.workspace_id=o.workspace_id and customer.id=o.customer_id
  join public.opportunity_stages stage on stage.workspace_id=o.workspace_id and stage.id=o.stage_id
  left join public.profiles owner on owner.id=o.owner_user_id
  where o.workspace_id=p_workspace_id and o.id=p_id
$$;

create or replace function public.telecom_v1_activity_list(
  p_actor_id uuid,p_workspace_id uuid,p_customer_id uuid,p_from date,p_to date,
  p_limit integer,p_after_occurred_at timestamptz,p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_limit not between 1 and 100 or p_from>p_to
    or (p_after_occurred_at is null)<>(p_after_id is null) then
    raise exception using errcode='22023',message='invalid activity list input';
  end if;
  with page as materialized (
    select a.id,a.occurred_at from public.activities a
    where a.workspace_id=p_workspace_id
      and (p_customer_id is null or a.customer_id=p_customer_id)
      and (p_from is null or a.occurred_at >= p_from::timestamp at time zone 'UTC')
      and (p_to is null or a.occurred_at < (p_to+1)::timestamp at time zone 'UTC')
      and (p_after_occurred_at is null or (a.occurred_at,a.id)<(p_after_occurred_at,p_after_id))
    order by a.occurred_at desc,a.id desc limit p_limit+1
  ), visible as (
    select id,occurred_at from page order by occurred_at desc,id desc limit p_limit
  ), cursor_row as (
    select occurred_at,id from visible order by occurred_at,id limit 1
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(public.telecom_v1_activity_row(p_workspace_id,id)
      order by occurred_at desc,id desc) from visible),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page),
    'next_created_at',case when (select count(*)>p_limit from page) then (select occurred_at from cursor_row) else null end,
    'next_id',case when (select count(*)>p_limit from page) then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

create or replace function public.telecom_v1_opportunity_list(
  p_actor_id uuid,p_workspace_id uuid,p_customer_id uuid,p_from date,p_to date,
  p_owner_id uuid,p_status text,p_limit integer,
  p_after_created_at timestamptz,p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_limit not between 1 and 100 or p_from>p_to
    or p_status is not null and p_status not in ('open','won','lost','cancelled')
    or (p_after_created_at is null)<>(p_after_id is null) then
    raise exception using errcode='22023',message='invalid opportunity list input';
  end if;
  with page as materialized (
    select o.id,o.created_at from public.opportunities o
    where o.workspace_id=p_workspace_id
      and (p_customer_id is null or o.customer_id=p_customer_id)
      and (p_owner_id is null or o.owner_user_id=p_owner_id)
      and (p_status is null or o.status=p_status)
      and (p_from is null and p_to is null or
        o.next_follow_up_at is not null
        and (p_from is null or o.next_follow_up_at >= p_from::timestamp at time zone 'UTC')
        and (p_to is null or o.next_follow_up_at < (p_to+1)::timestamp at time zone 'UTC'))
      and (p_after_created_at is null or (o.created_at,o.id)<(p_after_created_at,p_after_id))
    order by o.created_at desc,o.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), cursor_row as (
    select created_at,id from visible order by created_at,id limit 1
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(public.telecom_v1_opportunity_row(p_workspace_id,id)
      order by created_at desc,id desc) from visible),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page),
    'next_created_at',case when (select count(*)>p_limit from page) then (select created_at from cursor_row) else null end,
    'next_id',case when (select count(*)>p_limit from page) then (select id from cursor_row) else null end
  ) into result;
  return result;
end;
$$;

revoke all on function public.telecom_v1_activity_row(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.telecom_v1_opportunity_row(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.telecom_v1_activity_list(uuid,uuid,uuid,date,date,integer,timestamptz,uuid)
  from public,anon,authenticated;
revoke all on function public.telecom_v1_opportunity_list(uuid,uuid,uuid,date,date,uuid,text,integer,timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.telecom_v1_activity_list(uuid,uuid,uuid,date,date,integer,timestamptz,uuid)
  to service_role;
grant execute on function public.telecom_v1_opportunity_list(uuid,uuid,uuid,date,date,uuid,text,integer,timestamptz,uuid)
  to service_role;
commit;
