-- B3: normal human tasks, meetings and opportunities. No assistant execution grant.
begin;
alter table public.calendar_events add column version bigint not null default 1 check(version>0);
alter table public.opportunities add column version bigint not null default 1 check(version>0);
alter table public.opportunities add column expected_close_date date;
alter table public.opportunities add column next_action text check(next_action is null or (char_length(btrim(next_action)) between 1 and 200 and next_action !~ '[[:cntrl:]]'));
create trigger calendar_events_manage_version before insert or update on public.calendar_events for each row execute function public.manage_task_version();
create trigger opportunities_manage_version before insert or update on public.opportunities for each row execute function public.manage_task_version();
alter table public.product_commands drop constraint product_commands_operation_check;
alter table public.product_commands add constraint product_commands_operation_check check(operation in (
 'customer.create','customer.update','customer.archive','customer.restore','contact.create','contact.update','contact.archive','contact.restore',
 'task.create','task.update','task.start','task.complete','task.reopen','task.cancel',
 'meeting.create','meeting.update','meeting.reschedule','meeting.complete','meeting.cancel','meeting.no_show',
 'opportunity.create','opportunity.update','opportunity.change_stage','opportunity.assign','opportunity.win','opportunity.lose','opportunity.reopen','opportunity.archive'));

create table public.product_opportunity_history (
 workspace_id uuid not null, opportunity_id uuid not null, version bigint not null,
 operation text not null, actor_id uuid not null references auth.users(id), occurred_at timestamptz not null default statement_timestamp(),
 from_stage_id uuid, to_stage_id uuid, from_status text, to_status text,
 primary key(workspace_id,opportunity_id,version),
 foreign key(opportunity_id,workspace_id) references public.opportunities(id,workspace_id));
create table public.product_opportunity_links (
 workspace_id uuid not null, opportunity_id uuid not null, kind text not null check(kind in ('contract','service','plan')),
 target_id uuid not null,
 contract_id uuid generated always as (case when kind='contract' then target_id end) stored,
 service_id uuid generated always as (case when kind='service' then target_id end) stored,
 plan_id uuid generated always as (case when kind='plan' then target_id end) stored,
 primary key(workspace_id,opportunity_id,kind),
 foreign key(opportunity_id,workspace_id) references public.opportunities(id,workspace_id),
 foreign key(contract_id,workspace_id) references public.telecom_contracts(id,workspace_id),
 foreign key(service_id,workspace_id) references public.telecom_services(id,workspace_id),
 foreign key(plan_id,workspace_id) references public.telecom_plans(id,workspace_id));
alter table public.product_opportunity_history enable row level security;
alter table public.product_opportunity_history force row level security;
alter table public.product_opportunity_links enable row level security;
alter table public.product_opportunity_links force row level security;
revoke all on public.product_opportunity_history,public.product_opportunity_links from public,anon,authenticated,service_role;
create trigger product_opportunity_history_append_only before update or delete on public.product_opportunity_history for each row execute function public.reject_activity_mutation();

create function public.product_v1_assert_work_scope(p_workspace_id uuid,p_write boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r text;
begin
 if actor is null or p_workspace_id is null then raise exception using errcode='42501',message='product_access_denied'; end if;
 select wm.role into r from public.workspace_members wm join public.workspaces w on w.id=wm.workspace_id
 where wm.workspace_id=p_workspace_id and wm.user_id=actor and wm.status='active' and w.status='active' for share of wm,w;
 if not found or (p_write and r not in ('owner','admin','member')) then raise exception using errcode='42501',message='product_access_denied'; end if;
 return actor;
end $$;
revoke all on function public.product_v1_assert_work_scope(uuid,boolean) from public,anon,authenticated,service_role;

create function public.product_v1_validate_work_input(p_input jsonb,p_required text[],p_optional text[])
returns void language plpgsql set search_path='' as $$
declare k text; v jsonb; s text; stamp timestamptz; d date;
begin
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192
 or exists(select 1 from jsonb_object_keys(p_input) x where not x=any(p_required||p_optional))
 or exists(select 1 from unnest(p_required) x where not p_input ? x or p_input->x='null'::jsonb) then
 raise exception using errcode='22023',message='product_invalid_input'; end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  s:=p_input->>k;
  if v='null'::jsonb then
   if k=any(p_required) or not k=any(array['customer_id','opportunity_id','assigned_user_id','owner_user_id','priority','due_at','ends_at','amount_minor','currency','next_follow_up_at','expected_close_date','next_action','contract_id','service_id','plan_id']) then
    raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k like '%\_id' escape '\' or k='id' then
   if jsonb_typeof(v)<>'string' or s !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k in ('expected_version','amount_minor') then
   if jsonb_typeof(v)<>'number' or s !~ '^[0-9]{1,15}$' or s::numeric>=1000000000000000 or (k='expected_version' and s::numeric<1) then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k='all_day' then
   if jsonb_typeof(v)<>'boolean' then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k in ('due_at','starts_at','ends_at','next_follow_up_at','range_start','range_end') then
   if jsonb_typeof(v)<>'string' or s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,3})?(Z|[+-]((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$' then raise exception using errcode='22023',message='product_invalid_input'; end if;
   begin stamp:=s::timestamptz; exception when others then raise exception using errcode='22023',message='product_invalid_input'; end;
  elsif k='expected_close_date' then
   if jsonb_typeof(v)<>'string' or s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception using errcode='22023',message='product_invalid_input'; end if;
   begin d:=s::date; exception when others then raise exception using errcode='22023',message='product_invalid_input'; end;
  elsif k='priority' then
   if jsonb_typeof(v)<>'string' or s not in ('low','normal','high') then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k='channel' then
   if jsonb_typeof(v)<>'string' or s not in ('in_person','phone','video','other') then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k='currency' then
   if jsonb_typeof(v)<>'string' or s not in ('EUR','USD','GBP') then raise exception using errcode='22023',message='product_invalid_input'; end if;
  elsif k='close_reason_code' then
   if jsonb_typeof(v)<>'string' or s !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then raise exception using errcode='22023',message='product_invalid_input'; end if;
  else
   if jsonb_typeof(v)<>'string' or char_length(btrim(s))<1 or char_length(s)>(case when k='timezone' then 64 else 200 end) or s ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='product_invalid_input'; end if;
  end if;
 end loop;
end $$;
revoke all on function public.product_v1_validate_work_input(jsonb,text[],text[]) from public,anon,authenticated,service_role;

create function public.product_v1_work_command(p_workspace_id uuid,p_operation text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; replay jsonb; result jsonb; family text:=split_part(p_operation,'.',1); action text:=split_part(p_operation,'.',2);
 required text[]:=array['command_id']; optional text[]:=array[]::text[];
 entity uuid; ver bigint; state text; customer uuid; opp uuid; assigned uuid;
 t public.tasks%rowtype; e public.calendar_events%rowtype; o public.opportunities%rowtype;
 stage uuid; outcome text; prior_stage uuid; prior_state text; linkkind text; target uuid;
begin
 actor:=public.product_v1_assert_work_scope(p_workspace_id);
 if p_operation not in ('task.create','task.update','task.start','task.complete','task.reopen','task.cancel','meeting.create','meeting.update','meeting.reschedule','meeting.complete','meeting.cancel','meeting.no_show','opportunity.create','opportunity.update','opportunity.change_stage','opportunity.assign','opportunity.win','opportunity.lose','opportunity.reopen','opportunity.archive') then raise exception using errcode='22023',message='product_invalid_operation'; end if;
 if action='create' then required:=required||array['title']; optional:=optional||array['customer_id'];
 else required:=required||array['id','expected_version']; end if;
 if family='task' and action in ('create','update') then optional:=optional||array['title','due_at','priority','assigned_user_id']; end if;
 if family='task' and action='create' then optional:=optional||array['opportunity_id']; end if;
 if family='meeting' and action in ('create','update','reschedule') then optional:=optional||array['starts_at','ends_at','timezone','all_day']; end if;
 if family='meeting' and action in ('create','update') then optional:=optional||array['title','channel','assigned_user_id']; end if;
 if family='meeting' and action='create' then required:=required||array['starts_at','timezone']; optional:=optional||array['opportunity_id']; end if;
 if family='meeting' and action='reschedule' then required:=required||array['starts_at','ends_at']; end if;
 if family='opportunity' and action='create' then required:=required||array['customer_id','stage_id']; end if;
 if family='opportunity' and action in ('create','update') then optional:=optional||array['title','owner_user_id','amount_minor','currency','next_follow_up_at','expected_close_date','next_action','contract_id','service_id','plan_id']; end if;
 if family='opportunity' and action='assign' then required:=required||array['owner_user_id']; end if;
 if family='opportunity' and action in ('change_stage','win','lose','reopen') then required:=required||array['stage_id']; end if;
 if family='opportunity' and action='lose' then required:=required||array['close_reason_code']; end if;
 perform public.product_v1_validate_work_input(p_input,required,optional);
 if (p_input ? 'amount_minor') <> (p_input ? 'currency') or ((p_input ? 'amount_minor') and (p_input->'amount_minor'='null'::jsonb) <> (p_input->'currency'='null'::jsonb)) then raise exception using errcode='22023',message='product_invalid_input'; end if;
 if action='update' and not exists(select 1 from jsonb_object_keys(p_input) k where k=any(optional)) then raise exception using errcode='22023',message='product_empty_update'; end if;
 replay:=public.product_v1_begin_command(p_workspace_id,actor,p_operation,p_input);
 if replay is not null then return replay; end if;
 if action='create' then customer:=(p_input->>'customer_id')::uuid; opp:=(p_input->>'opportunity_id')::uuid;
 elsif family='task' then
  select * into t from public.tasks where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
  customer:=t.customer_id; opp:=t.opportunity_id; entity:=t.id; ver:=t.version; state:=t.status;
 elsif family='meeting' then
  select * into e from public.calendar_events where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
  customer:=e.customer_id; opp:=e.opportunity_id; entity:=e.id; ver:=e.version; state:=e.status;
 else
  select * into o from public.opportunities where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
  customer:=o.customer_id; entity:=o.id; ver:=o.version; state:=o.status; prior_state:=o.status; prior_stage:=o.stage_id;
  if o.source<>'manual' then raise exception using errcode='42501',message='product_provenance_controlled'; end if;
 end if;
 if action<>'create' and ver<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='product_conflict'; end if;
 if customer is not null then
  perform 1 from public.customers where id=customer and workspace_id=p_workspace_id and status<>'archived' for share;
  if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 end if;
 if opp is not null then
  perform 1 from public.opportunities where id=opp and workspace_id=p_workspace_id and customer_id=customer and status='open' for share;
  if not found then raise exception using errcode='P0002',message='product_not_found'; end if;
 end if;
 assigned:=coalesce((p_input->>'assigned_user_id')::uuid,(p_input->>'owner_user_id')::uuid);
 if assigned is not null then
  perform 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=assigned and status='active' for share;
  if not found then raise exception using errcode='22023',message='product_invalid_assignment'; end if;
 end if;
 if family='task' then
  if action='create' then
   insert into public.tasks(workspace_id,customer_id,opportunity_id,title,due_at,priority,assigned_user_id,created_by_user_id)
   values(p_workspace_id,customer,opp,btrim(p_input->>'title'),(p_input->>'due_at')::timestamptz,p_input->>'priority',assigned,actor) returning id,version,status into entity,ver,state;
  else
   if (action in ('update','start','complete','cancel') and state not in ('pending','in_progress')) or (action='reopen' and state not in ('completed','cancelled')) then raise exception using errcode='22023',message='product_invalid_transition'; end if;
   if action='start' and state<>'pending' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
   state:=case action when 'start' then 'in_progress' when 'complete' then 'completed' when 'cancel' then 'cancelled' when 'reopen' then 'pending' else state end;
   update public.tasks set title=case when p_input ? 'title' then btrim(p_input->>'title') else title end,
    due_at=case when p_input ? 'due_at' then (p_input->>'due_at')::timestamptz else due_at end,
    priority=case when p_input ? 'priority' then p_input->>'priority' else priority end,
    assigned_user_id=case when p_input ? 'assigned_user_id' then (p_input->>'assigned_user_id')::uuid else assigned_user_id end,
    status=state,completed_at=case when state='completed' then statement_timestamp() end,cancelled_at=case when state='cancelled' then statement_timestamp() end
    where id=entity and workspace_id=p_workspace_id returning version into ver;
  end if;
 elsif family='meeting' then
  if action='create' then
   insert into public.calendar_events(workspace_id,customer_id,opportunity_id,title,starts_at,ends_at,timezone,all_day,channel,assigned_user_id,created_by_user_id)
   values(p_workspace_id,customer,opp,btrim(p_input->>'title'),(p_input->>'starts_at')::timestamptz,(p_input->>'ends_at')::timestamptz,p_input->>'timezone',coalesce((p_input->>'all_day')::boolean,false),coalesce(p_input->>'channel','other'),assigned,actor) returning id,version,status into entity,ver,state;
  else
   if state<>'scheduled' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
   state:=case action when 'complete' then 'completed' when 'cancel' then 'cancelled' when 'no_show' then 'no_show' else state end;
   update public.calendar_events set title=case when p_input ? 'title' then btrim(p_input->>'title') else title end,
    starts_at=case when p_input ? 'starts_at' then (p_input->>'starts_at')::timestamptz else starts_at end,
    ends_at=case when p_input ? 'ends_at' then (p_input->>'ends_at')::timestamptz else ends_at end,
    timezone=case when p_input ? 'timezone' then p_input->>'timezone' else timezone end,
    all_day=case when p_input ? 'all_day' then (p_input->>'all_day')::boolean else all_day end,
    channel=case when p_input ? 'channel' then p_input->>'channel' else channel end,
    assigned_user_id=case when p_input ? 'assigned_user_id' then (p_input->>'assigned_user_id')::uuid else assigned_user_id end,
    status=state,completed_at=case when state='completed' then statement_timestamp() end,cancelled_at=case when state='cancelled' then statement_timestamp() end,no_show_at=case when state='no_show' then statement_timestamp() end
    where id=entity and workspace_id=p_workspace_id returning version into ver;
  end if;
 else
  stage:=case when p_input ? 'stage_id' then (p_input->>'stage_id')::uuid else o.stage_id end;
  select s.outcome into outcome from public.opportunity_stages s where s.workspace_id=p_workspace_id and s.id=stage and s.status='active' for share;
  if not found then raise exception using errcode='22023',message='product_invalid_stage'; end if;
  -- Registered lifecycle graph: open->open/won/lost/cancelled; won/lost->open.
  if action='create' then state:='open';
  elsif action='reopen' then
   if state not in ('won','lost') then raise exception using errcode='22023',message='product_invalid_transition'; end if; state:='open';
  else
   if state<>'open' then raise exception using errcode='22023',message='product_invalid_transition'; end if;
   state:=case action when 'win' then 'won' when 'lose' then 'lost' when 'archive' then 'cancelled' else 'open' end;
  end if;
  if (state='open' and outcome is not null) or (state in ('won','lost') and outcome is distinct from state) then raise exception using errcode='22023',message='product_invalid_stage'; end if;
  if action='create' then
   insert into public.opportunities(workspace_id,customer_id,stage_id,title,owner_user_id,amount_minor,currency,next_follow_up_at,expected_close_date,next_action,created_by_user_id)
    values(p_workspace_id,customer,stage,btrim(p_input->>'title'),assigned,(p_input->>'amount_minor')::bigint,p_input->>'currency',(p_input->>'next_follow_up_at')::timestamptz,(p_input->>'expected_close_date')::date,btrim(p_input->>'next_action'),actor) returning id,version,status into entity,ver,state;
  else
   update public.opportunities set stage_id=stage,title=case when p_input ? 'title' then btrim(p_input->>'title') else title end,
    owner_user_id=case when p_input ? 'owner_user_id' then (p_input->>'owner_user_id')::uuid else owner_user_id end,
    amount_minor=case when p_input ? 'amount_minor' then (p_input->>'amount_minor')::bigint else amount_minor end,
    currency=case when p_input ? 'currency' then p_input->>'currency' else currency end,
    next_follow_up_at=case when p_input ? 'next_follow_up_at' then (p_input->>'next_follow_up_at')::timestamptz else next_follow_up_at end,
    expected_close_date=case when p_input ? 'expected_close_date' then (p_input->>'expected_close_date')::date else expected_close_date end,
    next_action=case when p_input ? 'next_action' then btrim(p_input->>'next_action') else next_action end,
    status=state,closed_at=case when state<>'open' then statement_timestamp() end,
    close_reason_code=case when state='lost' then p_input->>'close_reason_code' when state='cancelled' then 'archived' end
    where id=entity and workspace_id=p_workspace_id returning version into ver;
  end if;
  for linkkind in select unnest(array['contract','service','plan']) loop
   if p_input ? (linkkind||'_id') then
    target:=(p_input->>(linkkind||'_id'))::uuid;
    if target is not null then
     if linkkind='contract' then perform 1 from public.telecom_contracts where workspace_id=p_workspace_id and id=target and customer_id=customer for share;
     elsif linkkind='service' then perform 1 from public.telecom_services where workspace_id=p_workspace_id and id=target and customer_id=customer for share;
     else perform 1 from public.telecom_plans where workspace_id=p_workspace_id and id=target and status='active' for share; end if;
     if not found then raise exception using errcode='22023',message='product_invalid_link'; end if;
    end if;
    delete from public.product_opportunity_links where workspace_id=p_workspace_id and opportunity_id=entity and kind=linkkind;
    if target is not null then insert into public.product_opportunity_links(workspace_id,opportunity_id,kind,target_id) values(p_workspace_id,entity,linkkind,target); end if;
   end if;
  end loop;
  if exists(select 1 from public.product_opportunity_links c join public.product_opportunity_links s using(workspace_id,opportunity_id)
   join public.telecom_services linked_service on linked_service.workspace_id=s.workspace_id and linked_service.id=s.target_id
   where c.workspace_id=p_workspace_id and c.opportunity_id=entity and c.kind='contract' and s.kind='service' and linked_service.contract_id<>c.target_id) then raise exception using errcode='22023',message='product_invalid_link'; end if;
  insert into public.product_opportunity_history(workspace_id,opportunity_id,version,operation,actor_id,from_stage_id,to_stage_id,from_status,to_status)
  values(p_workspace_id,entity,ver,p_operation,actor,prior_stage,stage,prior_state,state);
 end if;
 result:=jsonb_build_object('contract_version','product.v1','command_id',p_input->>'command_id','operation',p_operation,'id',entity,'version',ver,'status',state);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version) values(p_workspace_id,actor,(p_input->>'command_id')::uuid,p_operation,entity,ver);
 insert into public.activities(workspace_id,customer_id,task_id,calendar_event_id,opportunity_id,activity_kind,summary_code,actor_user_id,created_by_user_id)
 values(p_workspace_id,customer,case when family='task' then entity end,case when family='meeting' then entity end,case when family='opportunity' then entity end,
 case when action='create' then 'created' when action in ('update','reschedule','assign') then 'updated' else 'status_changed' end,
 case when action='create' then 'entity.created' when action in ('update','reschedule','assign') then 'entity.updated' else 'entity.status_changed' end,actor,actor);
 update public.product_commands set receipt=result where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 return result;
end $$;
revoke all on function public.product_v1_work_command(uuid,text,jsonb) from public,anon,authenticated,service_role;

create function public.product_v1_task_create(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'task.create',p_input)$$;
revoke all on function public.product_v1_task_create(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_task_create(uuid,jsonb) to authenticated;

create function public.product_v1_task_update(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'task.update',p_input)$$;
revoke all on function public.product_v1_task_update(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_task_update(uuid,jsonb) to authenticated;

create function public.product_v1_task_start(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'task.start',p_input)$$;
revoke all on function public.product_v1_task_start(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_task_start(uuid,jsonb) to authenticated;

create function public.product_v1_task_complete(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'task.complete',p_input)$$;
revoke all on function public.product_v1_task_complete(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_task_complete(uuid,jsonb) to authenticated;

create function public.product_v1_task_reopen(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'task.reopen',p_input)$$;
revoke all on function public.product_v1_task_reopen(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_task_reopen(uuid,jsonb) to authenticated;

create function public.product_v1_task_cancel(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'task.cancel',p_input)$$;
revoke all on function public.product_v1_task_cancel(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_task_cancel(uuid,jsonb) to authenticated;

create function public.product_v1_meeting_create(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'meeting.create',p_input)$$;
revoke all on function public.product_v1_meeting_create(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_meeting_create(uuid,jsonb) to authenticated;

create function public.product_v1_meeting_update(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'meeting.update',p_input)$$;
revoke all on function public.product_v1_meeting_update(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_meeting_update(uuid,jsonb) to authenticated;

create function public.product_v1_meeting_reschedule(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'meeting.reschedule',p_input)$$;
revoke all on function public.product_v1_meeting_reschedule(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_meeting_reschedule(uuid,jsonb) to authenticated;

create function public.product_v1_meeting_complete(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'meeting.complete',p_input)$$;
revoke all on function public.product_v1_meeting_complete(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_meeting_complete(uuid,jsonb) to authenticated;

create function public.product_v1_meeting_cancel(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'meeting.cancel',p_input)$$;
revoke all on function public.product_v1_meeting_cancel(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_meeting_cancel(uuid,jsonb) to authenticated;

create function public.product_v1_meeting_no_show(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'meeting.no_show',p_input)$$;
revoke all on function public.product_v1_meeting_no_show(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_meeting_no_show(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_create(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.create',p_input)$$;
revoke all on function public.product_v1_opportunity_create(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_create(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_update(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.update',p_input)$$;
revoke all on function public.product_v1_opportunity_update(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_update(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_change_stage(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.change_stage',p_input)$$;
revoke all on function public.product_v1_opportunity_change_stage(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_change_stage(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_assign(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.assign',p_input)$$;
revoke all on function public.product_v1_opportunity_assign(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_assign(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_win(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.win',p_input)$$;
revoke all on function public.product_v1_opportunity_win(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_win(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_lose(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.lose',p_input)$$;
revoke all on function public.product_v1_opportunity_lose(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_lose(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_reopen(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.reopen',p_input)$$;
revoke all on function public.product_v1_opportunity_reopen(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_reopen(uuid,jsonb) to authenticated;

create function public.product_v1_opportunity_archive(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.product_v1_work_command(p_workspace_id,'opportunity.archive',p_input)$$;
revoke all on function public.product_v1_opportunity_archive(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_opportunity_archive(uuid,jsonb) to authenticated;

commit;
