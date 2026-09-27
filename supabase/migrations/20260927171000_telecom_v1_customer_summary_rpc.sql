-- Telecom v1 Customer 360 read model: Identity + Attention.
-- All source rows stay private; this server-only RPC returns the closed v1 DTO.

begin;

create or replace function public.telecom_v1_available_collection(
  p_scope_epoch text,
  p_items jsonb,
  p_has_more boolean,
  p_as_of timestamptz
)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'contract_version', 'telecom.v1',
    'scope_epoch', p_scope_epoch,
    'source_state', 'available',
    'permission', 'authorized',
    'items', coalesce(p_items, '[]'::jsonb),
    'completeness', case when p_has_more
      then jsonb_build_object('kind', 'partial', 'has_more', true)
      else jsonb_build_object('kind', 'complete') end,
    'continuation', null,
    'freshness', jsonb_build_object('kind', 'fresh', 'as_of', p_as_of),
    'error', null
  )
$$;

create or replace function public.telecom_v1_unsupported_collection(p_scope_epoch text)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'contract_version', 'telecom.v1',
    'scope_epoch', p_scope_epoch,
    'source_state', 'unsupported',
    'reason', 'contract_not_published',
    'permission', 'unknown',
    'items', null,
    'completeness', null,
    'continuation', null,
    'freshness', null,
    'error', null
  )
$$;

create or replace function public.telecom_v1_customer_summary(
  p_actor_id uuid,
  p_workspace_id uuid,
  p_customer_id uuid,
  p_scope_epoch text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  as_of timestamptz := statement_timestamp();
  today date := (statement_timestamp() at time zone 'UTC')::date;
  customer_data jsonb;
  customer_ref jsonb;
  contracts_data jsonb;
  contracts_more boolean;
  services_data jsonb;
  services_more boolean;
  lines_data jsonb;
  lines_more boolean;
  task_data jsonb;
  meeting_data jsonb;
  renewal_data jsonb;
  permanence_data jsonb;
  activity_data jsonb;
  activity_more boolean;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id, p_workspace_id);
  if p_customer_id is null
     or p_scope_epoch is null
     or char_length(p_scope_epoch) not between 16 and 160
     or p_scope_epoch !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' then
    raise exception using errcode = '22023', message = 'invalid customer summary input';
  end if;

  select jsonb_build_object(
    'contract_version', 'telecom.v1',
    'scope_epoch', p_scope_epoch,
    'id', c.id,
    'account_kind', c.account_kind,
    'legal_name', c.legal_name,
    'trade_name', c.trade_name,
    'tax_identifier', jsonb_build_object('field_class', 'tax_identifier', 'visibility', 'hidden'),
    'lifecycle', c.lifecycle,
    'status', c.status,
    'assigned_user', case when c.assigned_user_id is null then null else jsonb_build_object(
      'kind', 'user', 'id', c.assigned_user_id,
      'display_name', coalesce(nullif(btrim(ap.full_name), ''), 'Usuario asignado')
    ) end,
    'primary_contact', case when pc.id is null then null else jsonb_build_object(
      'kind', 'contact', 'id', pc.id, 'display_name', pc.display_name
    ) end,
    'capabilities', '[]'::jsonb
  ), jsonb_build_object(
    'kind', 'customer', 'id', c.id,
    'display_name', coalesce(nullif(btrim(c.trade_name), ''), c.legal_name)
  ) into customer_data, customer_ref
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
  where c.workspace_id = p_workspace_id and c.id = p_customer_id;

  if customer_data is null then return null; end if;

  with page as (
    select
      row_number() over (order by c.start_date desc, c.id desc) as position,
      c.start_date as sort_date,
      c.id as sort_id,
      jsonb_build_object(
        'contract_version', 'telecom.v1', 'scope_epoch', p_scope_epoch,
        'id', c.id,
        'customer', customer_ref,
        'operator', jsonb_build_object('kind', 'operator', 'id', op.id, 'display_name', op.display_name),
        'plan', case when plan.id is null then null else jsonb_build_object(
          'kind', 'plan', 'id', plan.id, 'display_name', plan.display_name
        ) end,
        'external_reference', jsonb_build_object('field_class', 'contract_reference', 'visibility', 'not_available'),
        'status', c.status,
        'start_date', c.start_date,
        'signed_date', c.signed_date,
        'end_date', c.end_date,
        'cancelled_at', c.cancelled_at,
        'assigned_user', case when c.assigned_user_id is null then null else jsonb_build_object(
          'kind', 'user', 'id', c.assigned_user_id,
          'display_name', coalesce(nullif(btrim(assigned.full_name), ''), 'Usuario asignado')
        ) end,
        'capabilities', '[]'::jsonb
      ) as item
    from public.telecom_contracts c
    join public.telecom_operators op on op.workspace_id = c.workspace_id and op.id = c.operator_id
    left join public.telecom_plan_versions pv on pv.workspace_id = c.workspace_id and pv.id = c.plan_version_id
    left join public.telecom_plans plan on plan.workspace_id = pv.workspace_id and plan.id = pv.plan_id
    left join public.profiles assigned on assigned.id = c.assigned_user_id
    where c.workspace_id = p_workspace_id and c.customer_id = p_customer_id
    order by c.start_date desc, c.id desc
    limit 101
  )
  select coalesce(jsonb_agg(item order by sort_date desc, sort_id desc)
    filter (where position <= 100), '[]'::jsonb), coalesce(max(position) > 100, false)
    into contracts_data, contracts_more from page;

  with page as (
    select
      row_number() over (order by s.status, s.display_name, s.id) as position,
      s.status as sort_status,
      s.display_name as sort_name,
      s.id as sort_id,
      jsonb_build_object(
        'contract_version', 'telecom.v1', 'scope_epoch', p_scope_epoch,
        'id', s.id,
        'customer', customer_ref,
        'contract', jsonb_build_object('kind', 'contract', 'id', c.id, 'display_name', 'Contrato'),
        'operator', jsonb_build_object('kind', 'operator', 'id', op.id, 'display_name', op.display_name),
        'plan', case when plan.id is null then null else jsonb_build_object(
          'kind', 'plan', 'id', plan.id, 'display_name', plan.display_name
        ) end,
        'service_kind', s.service_kind,
        'display_name', s.display_name,
        'status', s.status,
        'activated_on', s.activated_on,
        'ended_on', s.ended_on,
        'capabilities', '[]'::jsonb
      ) as item
    from public.telecom_services s
    join public.telecom_contracts c on c.workspace_id = s.workspace_id and c.id = s.contract_id
    join public.telecom_operators op on op.workspace_id = s.workspace_id and op.id = s.operator_id
    left join public.telecom_plan_versions pv on pv.workspace_id = s.workspace_id and pv.id = s.plan_version_id
    left join public.telecom_plans plan on plan.workspace_id = pv.workspace_id and plan.id = pv.plan_id
    where s.workspace_id = p_workspace_id and s.customer_id = p_customer_id
    order by s.status, s.display_name, s.id
    limit 101
  )
  select coalesce(jsonb_agg(item order by sort_status, sort_name, sort_id)
    filter (where position <= 100), '[]'::jsonb), coalesce(max(position) > 100, false)
    into services_data, services_more from page;

  with page as (
    select
      row_number() over (order by line.status, line.id) as position,
      line.status as sort_status,
      line.id as sort_id,
      jsonb_build_object(
        'contract_version', 'telecom.v1', 'scope_epoch', p_scope_epoch,
        'id', line.id,
        'service', jsonb_build_object('kind', 'service', 'id', service.id, 'display_name', service.display_name),
        'identifier', jsonb_build_object('field_class', 'line_identifier', 'visibility', 'not_available'),
        'status', line.status,
        'activated_on', line.activated_on,
        'ended_on', line.ended_on,
        'capabilities', '[]'::jsonb
      ) as item
    from public.telecom_lines line
    join public.telecom_services service on service.workspace_id = line.workspace_id and service.id = line.service_id
    where line.workspace_id = p_workspace_id and service.customer_id = p_customer_id
    order by line.status, line.id
    limit 101
  )
  select coalesce(jsonb_agg(item order by sort_status, sort_id)
    filter (where position <= 100), '[]'::jsonb), coalesce(max(position) > 100, false)
    into lines_data, lines_more from page;

  select coalesce(jsonb_agg(item order by due_at nulls last, sort_id), '[]'::jsonb)
    into task_data from (
      select task.due_at, task.id as sort_id, jsonb_build_object(
        'id', task.id, 'kind', 'task', 'customer', customer_ref,
        'title', task.title,
        'destination', jsonb_build_object('kind', 'task', 'task_id', task.id),
        'capabilities', '[]'::jsonb,
        'status', task.status, 'priority', task.priority, 'due_at', task.due_at,
        'assignee', case when task.assigned_user_id is null then null else jsonb_build_object(
          'kind', 'user', 'id', task.assigned_user_id,
          'display_name', coalesce(nullif(btrim(assigned.full_name), ''), 'Usuario asignado')
        ) end,
        'version', task.version
      ) as item
      from public.tasks task
      left join public.profiles assigned on assigned.id = task.assigned_user_id
      where task.workspace_id = p_workspace_id and task.customer_id = p_customer_id
        and task.status in ('pending', 'in_progress')
      order by task.due_at nulls last, task.id
      limit 1
    ) next_task;

  select coalesce(jsonb_agg(item order by starts_at, sort_id), '[]'::jsonb)
    into meeting_data from (
      select event.starts_at, event.id as sort_id, jsonb_build_object(
        'id', event.id, 'kind', 'meeting', 'customer', customer_ref,
        'title', event.title,
        'destination', jsonb_build_object('kind', 'meeting', 'meeting_id', event.id),
        'capabilities', '[]'::jsonb,
        'status', event.status, 'starts_at', event.starts_at, 'ends_at', event.ends_at,
        'all_day', event.all_day, 'timezone', event.timezone, 'channel', event.channel,
        'assignee', case when event.assigned_user_id is null then null else jsonb_build_object(
          'kind', 'user', 'id', event.assigned_user_id,
          'display_name', coalesce(nullif(btrim(assigned.full_name), ''), 'Usuario asignado')
        ) end
      ) as item
      from public.calendar_events event
      left join public.profiles assigned on assigned.id = event.assigned_user_id
      where event.workspace_id = p_workspace_id and event.customer_id = p_customer_id
        and event.status = 'scheduled' and event.starts_at >= as_of
      order by event.starts_at, event.id
      limit 1
    ) next_meeting;

  select coalesce(jsonb_agg(item order by target_on, sort_id), '[]'::jsonb)
    into renewal_data from (
      select renewal.target_on, renewal.id as sort_id, jsonb_build_object(
        'id', renewal.id, 'kind', 'renewal', 'customer', customer_ref,
        'title', 'Renovación ' || to_char(renewal.target_on, 'DD/MM/YYYY'),
        'destination', jsonb_build_object('kind', 'contract', 'contract_id', contract.id),
        'capabilities', '[]'::jsonb,
        'contract', jsonb_build_object('kind', 'contract', 'id', contract.id, 'display_name', 'Contrato'),
        'status', case when renewal.target_on < today then 'overdue' else 'upcoming' end,
        'target_on', renewal.target_on, 'opens_on', renewal.opens_on, 'closes_on', renewal.closes_on
      ) as item
      from public.telecom_renewals renewal
      join public.telecom_contracts contract on contract.workspace_id = renewal.workspace_id and contract.id = renewal.contract_id
      where renewal.workspace_id = p_workspace_id and contract.customer_id = p_customer_id
        and renewal.status = 'open'
      order by renewal.target_on, renewal.id
      limit 1
    ) nearest_renewal;

  select coalesce(jsonb_agg(item order by ends_on, sort_id), '[]'::jsonb)
    into permanence_data from (
      select commitment.ends_on, commitment.id as sort_id, jsonb_build_object(
        'id', commitment.id, 'kind', 'permanence', 'customer', customer_ref,
        'title', 'Permanencia ' || to_char(commitment.ends_on, 'DD/MM/YYYY'),
        'destination', jsonb_build_object('kind', 'contract', 'contract_id', contract.id),
        'capabilities', '[]'::jsonb,
        'contract', jsonb_build_object('kind', 'contract', 'id', contract.id, 'display_name', 'Contrato'),
        'service', case when service.id is null then null else jsonb_build_object(
          'kind', 'service', 'id', service.id, 'display_name', service.display_name
        ) end,
        'status', case when commitment.starts_on > today then 'upcoming'
          when commitment.ends_on < today then 'ended' else 'active' end,
        'starts_on', commitment.starts_on, 'ends_on', commitment.ends_on,
        'reason_code', commitment.commitment_kind
      ) as item
      from public.telecom_commitments commitment
      join public.telecom_contracts contract on contract.workspace_id = commitment.workspace_id and contract.id = commitment.contract_id
      left join public.telecom_services service on service.workspace_id = commitment.workspace_id and service.id = commitment.service_id
      where commitment.workspace_id = p_workspace_id and contract.customer_id = p_customer_id
        and commitment.administrative_status = 'open'
      order by commitment.ends_on, commitment.id
      limit 1
    ) nearest_permanence;

  with page as (
    select row_number() over (order by activity.occurred_at desc, activity.id desc) as position,
      activity.occurred_at as sort_time, activity.id as sort_id,
      jsonb_build_object(
        'id', activity.id, 'kind', 'activity', 'customer', customer_ref,
        'activity_kind', activity.activity_kind,
        'safe_summary', case activity.summary_code
          when 'entity.created' then 'Elemento creado'
          when 'entity.updated' then 'Elemento actualizado'
          when 'entity.contacted' then 'Contacto registrado'
          when 'entity.status_changed' then 'Estado actualizado'
          when 'system.imported' then 'Importación registrada'
          when 'system.synchronized' then 'Sincronización registrada'
          else 'Actividad registrada' end,
        'occurred_at', activity.occurred_at,
        'actor', case when activity.actor_user_id is null then null else jsonb_build_object(
          'kind', 'user', 'id', activity.actor_user_id,
          'display_name', coalesce(nullif(btrim(actor.full_name), ''), 'Usuario')
        ) end,
        'targets', '[]'::jsonb,
        'capabilities', '[]'::jsonb
      ) as item
    from public.activities activity
    left join public.profiles actor on actor.id = activity.actor_user_id
    where activity.workspace_id = p_workspace_id and activity.customer_id = p_customer_id
    order by activity.occurred_at desc, activity.id desc
    limit 21
  )
  select coalesce(jsonb_agg(item order by sort_time desc, sort_id desc)
    filter (where position <= 20), '[]'::jsonb), coalesce(max(position) > 20, false)
    into activity_data, activity_more from page;

  return jsonb_build_object(
    'contract_version', 'telecom.v1',
    'scope_epoch', p_scope_epoch,
    'customer', customer_data,
    'contracts', public.telecom_v1_available_collection(p_scope_epoch, contracts_data, contracts_more, as_of),
    'services', public.telecom_v1_available_collection(p_scope_epoch, services_data, services_more, as_of),
    'lines', public.telecom_v1_available_collection(p_scope_epoch, lines_data, lines_more, as_of),
    'attention', jsonb_build_object(
      'contract_version', 'telecom.v1', 'scope_epoch', p_scope_epoch,
      'customer_id', p_customer_id, 'generated_at', as_of,
      'next_task', public.telecom_v1_available_collection(p_scope_epoch, task_data, false, as_of),
      'next_meeting', public.telecom_v1_available_collection(p_scope_epoch, meeting_data, false, as_of),
      'nearest_renewal', public.telecom_v1_available_collection(p_scope_epoch, renewal_data, false, as_of),
      'nearest_permanence', public.telecom_v1_available_collection(p_scope_epoch, permanence_data, false, as_of),
      'alerts', public.telecom_v1_unsupported_collection(p_scope_epoch),
      'recent_activity', public.telecom_v1_available_collection(p_scope_epoch, activity_data, activity_more, as_of)
    )
  );
end;
$$;

revoke all on function public.telecom_v1_available_collection(text, jsonb, boolean, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.telecom_v1_unsupported_collection(text)
  from public, anon, authenticated, service_role;
revoke all on function public.telecom_v1_customer_summary(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.telecom_v1_customer_summary(uuid, uuid, uuid, text)
  to service_role;

commit;
