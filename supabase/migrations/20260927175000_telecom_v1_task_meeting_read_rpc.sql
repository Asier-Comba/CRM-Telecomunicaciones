-- Server-only commercial schedule reads, bounded and tenant scoped.
begin;

create index if not exists tasks_read_page_idx
  on public.tasks (workspace_id, created_at desc, id desc);
create index if not exists calendar_events_read_page_idx
  on public.calendar_events (workspace_id, created_at desc, id desc);

create or replace function public.telecom_v1_task_list(
  p_actor_id uuid,p_workspace_id uuid,p_customer_id uuid,p_from date,p_to date,
  p_assignee_id uuid,p_status text,p_limit integer,
  p_after_created_at timestamptz,p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_limit not between 1 and 100 or p_from>p_to
    or p_status is not null and p_status not in ('pending','in_progress','completed','cancelled')
    or (p_after_created_at is null)<>(p_after_id is null) then
    raise exception using errcode='22023',message='invalid task list input';
  end if;
  with page as materialized (
    select task.id,task.created_at from public.tasks task
    where task.workspace_id=p_workspace_id
      and (p_customer_id is null or task.customer_id=p_customer_id)
      and (p_assignee_id is null or task.assigned_user_id=p_assignee_id)
      and (p_status is null or task.status=p_status)
      and (p_from is null and p_to is null or task.due_at is not null
        and (p_from is null or task.due_at >= p_from::timestamp at time zone 'UTC')
        and (p_to is null or task.due_at < (p_to+1)::timestamp at time zone 'UTC'))
      and (p_after_created_at is null or (task.created_at,task.id)<(p_after_created_at,p_after_id))
    order by task.created_at desc,task.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), rows as (
    select visible.id,visible.created_at,jsonb_build_object(
      'id',task.id,'kind','task',
      'customer',case when customer.id is null then null else jsonb_build_object(
        'kind','customer','id',customer.id,
        'display_name',coalesce(nullif(btrim(customer.trade_name),''),customer.legal_name)) end,
      'title',task.title,
      'destination',jsonb_build_object('kind','task','task_id',task.id),
      'capabilities','[]'::jsonb,'status',task.status,'priority',task.priority,
      'due_at',task.due_at,
      'assignee',case when task.assigned_user_id is null then null else jsonb_build_object(
        'kind','user','id',task.assigned_user_id,
        'display_name',coalesce(nullif(btrim(assigned.full_name),''),'Usuario asignado')) end,
      'version',task.version) as item
    from visible
    join public.tasks task on task.workspace_id=p_workspace_id and task.id=visible.id
    left join public.customers customer on customer.workspace_id=task.workspace_id and customer.id=task.customer_id
    left join public.profiles assigned on assigned.id=task.assigned_user_id
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

create or replace function public.telecom_v1_meeting_list(
  p_actor_id uuid,p_workspace_id uuid,p_customer_id uuid,p_from date,p_to date,
  p_assignee_id uuid,p_status text,p_limit integer,
  p_after_created_at timestamptz,p_after_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_limit not between 1 and 100 or p_from>p_to
    or p_status is not null and p_status not in ('scheduled','completed','cancelled','no_show')
    or (p_after_created_at is null)<>(p_after_id is null) then
    raise exception using errcode='22023',message='invalid meeting list input';
  end if;
  with page as materialized (
    select event.id,event.created_at from public.calendar_events event
    where event.workspace_id=p_workspace_id
      and (p_customer_id is null or event.customer_id=p_customer_id)
      and (p_assignee_id is null or event.assigned_user_id=p_assignee_id)
      and (p_status is null or event.status=p_status)
      and (p_from is null or event.starts_at >= p_from::timestamp at time zone 'UTC')
      and (p_to is null or event.starts_at < (p_to+1)::timestamp at time zone 'UTC')
      and (p_after_created_at is null or (event.created_at,event.id)<(p_after_created_at,p_after_id))
    order by event.created_at desc,event.id desc limit p_limit+1
  ), visible as (
    select id,created_at from page order by created_at desc,id desc limit p_limit
  ), rows as (
    select visible.id,visible.created_at,jsonb_build_object(
      'id',event.id,'kind','meeting',
      'customer',case when customer.id is null then null else jsonb_build_object(
        'kind','customer','id',customer.id,
        'display_name',coalesce(nullif(btrim(customer.trade_name),''),customer.legal_name)) end,
      'title',event.title,
      'destination',jsonb_build_object('kind','meeting','meeting_id',event.id),
      'capabilities','[]'::jsonb,'status',event.status,
      'starts_at',event.starts_at,'ends_at',event.ends_at,'all_day',event.all_day,
      'timezone',event.timezone,'channel',event.channel,
      'assignee',case when event.assigned_user_id is null then null else jsonb_build_object(
        'kind','user','id',event.assigned_user_id,
        'display_name',coalesce(nullif(btrim(assigned.full_name),''),'Usuario asignado')) end) as item
    from visible
    join public.calendar_events event on event.workspace_id=p_workspace_id and event.id=visible.id
    left join public.customers customer on customer.workspace_id=event.workspace_id and customer.id=event.customer_id
    left join public.profiles assigned on assigned.id=event.assigned_user_id
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

revoke all on function public.telecom_v1_task_list(uuid,uuid,uuid,date,date,uuid,text,integer,timestamptz,uuid)
  from public,anon,authenticated;
revoke all on function public.telecom_v1_meeting_list(uuid,uuid,uuid,date,date,uuid,text,integer,timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.telecom_v1_task_list(uuid,uuid,uuid,date,date,uuid,text,integer,timestamptz,uuid)
  to service_role;
grant execute on function public.telecom_v1_meeting_list(uuid,uuid,uuid,date,date,uuid,text,integer,timestamptz,uuid)
  to service_role;
commit;
