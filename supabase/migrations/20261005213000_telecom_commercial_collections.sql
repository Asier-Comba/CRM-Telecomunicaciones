-- TEL5 bounded commercial reads. Forward-only, transactional, no new raw grants.
-- Applies once through canonical migration tracking; not a repeatable seed.
begin;
create function public.telecom_collection_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; allowed text[]; k text; v jsonb; n int; rows jsonb; more boolean; get_one boolean; enums text[]; first_date date; last_date date;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id,false);
 if p_operation is null or p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096 then raise exception using errcode='22023',message='collection_invalid_input';end if;
 get_one:=p_operation like '%.get';
 case p_operation
 when 'customer.list' then allowed:=array['limit','after_id','sort','status','lifecycle','assigned_user_id','source','operator_id'];
 when 'contact.list' then allowed:=array['limit','after_id','sort','customer_id','status'];
 when 'opportunity.list' then allowed:=array['limit','after_id','sort','customer_id','owner_user_id','stage_id','status','currency','expected_close_from','expected_close_to'];
 when 'activity.list' then allowed:=array['limit','after_id','sort','customer_id','kind','entity_kind','entity_id','date_from','date_to'];
 when 'assignee.list' then allowed:=array['limit','after_id','sort','role'];
 when 'operator.list' then allowed:=array['limit','after_id','sort','status','source'];
 when 'operator.get' then allowed:=array['id'];
 when 'plan.list' then allowed:=array['limit','after_id','sort','operator_id','service_kind','status'];
 when 'plan.get' then allowed:=array['id'];
 when 'plan_version.list' then allowed:=array['limit','after_id','sort','plan_id','operator_id','service_kind','valid_on','status'];
 when 'plan_version.get' then allowed:=array['id'];
 when 'contract.list' then allowed:=array['limit','after_id','sort','customer_id','operator_id','plan_id','assigned_user_id','status','source'];
 when 'service.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','operator_id','plan_id','kind','status','source'];
 when 'line.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','service_id','operator_id','status','source'];
 when 'renewal.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','owner_user_id','status','window_from','window_to'];
 when 'renewal.get' then allowed:=array['id'];
 when 'permanence.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','service_id','status','window_from','window_to'];
 when 'permanence.get' then allowed:=array['id'];
 else raise exception using errcode='22023',message='collection_invalid_operation';end case;
 if exists(select 1 from jsonb_object_keys(p_input) f where not f=any(allowed)) or (get_one and not p_input ? 'id') then raise exception using errcode='22023',message='collection_invalid_input';end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  if v='null'::jsonb then raise exception using errcode='22023',message='collection_invalid_input';end if;
  if k='limit' then
   if jsonb_typeof(v)<>'number' or v::text !~ '^[1-9][0-9]{0,2}$' or (v::text)::int>100 then raise exception using errcode='22023',message='collection_invalid_limit';end if;
  else
   if jsonb_typeof(v)<>'string' or char_length(p_input->>k)>64 or (p_input->>k) ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='collection_invalid_input';end if;
   if (k='id' or k like '%\_id' escape '\') and p_input->>k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='collection_invalid_id';end if;
   if k='sort' and p_input->>k<>'id_asc' then raise exception using errcode='22023',message='collection_invalid_sort';end if;
   if k='currency' and p_input->>k !~ '^[A-Z]{3}$' then raise exception using errcode='22023',message='collection_invalid_currency';end if;
   if k in ('valid_on','expected_close_from','expected_close_to','date_from','date_to','window_from','window_to') then
    if p_input->>k !~ '^\d{4}-\d{2}-\d{2}$' or (p_input->>k)::date::text<>p_input->>k or (p_input->>k)::date not between date '1900-01-01' and date '2199-12-31' then raise exception using errcode='22023',message='collection_invalid_date';end if;
   end if;
   enums:=null;
   if p_operation='customer.list' and k='status' then enums:=array['active','inactive','archived'];end if;
   if p_operation='customer.list' and k='lifecycle' then enums:=array['lead','prospect','customer','former_customer'];end if;
   if p_operation='customer.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='contact.list' and k='status' then enums:=array['active','inactive','archived'];end if;
   if p_operation='opportunity.list' and k='status' then enums:=array['open','won','lost','cancelled'];end if;
   if p_operation='activity.list' and k='kind' then enums:=array['created','updated','contacted','status_changed','system'];end if;
   if p_operation='activity.list' and k='entity_kind' then enums:=array['customer','contract','service','opportunity','task','meeting'];end if;
   if p_operation='assignee.list' and k='role' then enums:=array['owner','admin','member'];end if;
   if p_operation='operator.list' and k='status' then enums:=array['active','inactive'];end if;
   if p_operation='operator.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='plan.list' and k='status' then enums:=array['active','retired'];end if;
   if p_operation='plan.list' and k='service_kind' then enums:=array['mobile','fiber','fixed_voice','data_connectivity','other'];end if;
   if p_operation='plan_version.list' and k='service_kind' then enums:=array['mobile','fiber','fixed_voice','data_connectivity','other'];end if;
   if p_operation='plan_version.list' and k='status' then enums:=array['active','retired'];end if;
   if p_operation='contract.list' and k='status' then enums:=array['draft','active','ended','cancelled'];end if;
   if p_operation='contract.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='service.list' and k='kind' then enums:=array['mobile','fiber','fixed_voice','data_connectivity','other'];end if;
   if p_operation='service.list' and k='status' then enums:=array['pending','active','suspended','ended','cancelled'];end if;
   if p_operation='service.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='line.list' and k='status' then enums:=array['pending','active','suspended','ended','cancelled'];end if;
   if p_operation='line.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='renewal.list' and k='status' then enums:=array['open','completed','dismissed','not_applicable'];end if;
   if p_operation='permanence.list' and k='status' then enums:=array['open','cancelled'];end if;
   if enums is not null and not (p_input->>k)=any(enums) then raise exception using errcode='22023',message='collection_invalid_filter';end if;
  end if;
 end loop;
 if (p_input ? 'entity_kind')<>(p_input ? 'entity_id') then raise exception using errcode='22023',message='collection_invalid_entity';end if;
 foreach k in array array['expected_close','date','window'] loop
  if (p_input ? (k||'_from'))<>(p_input ? (k||'_to')) then raise exception using errcode='22023',message='collection_invalid_range';end if;
  if p_input ? (k||'_from') then
   first_date:=(p_input->>(k||'_from'))::date;last_date:=(p_input->>(k||'_to'))::date;
   if last_date<first_date or last_date-first_date>366 then raise exception using errcode='22023',message='collection_invalid_range';end if;
  end if;
 end loop;
 n:=case when get_one then 1 else coalesce((p_input->>'limit')::int,50) end;
 case split_part(p_operation,'.',1)
 when 'customer' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'display_name',coalesce(nullif(btrim(x.trade_name),''),x.legal_name),'account_kind',x.account_kind,'lifecycle',x.lifecycle,'status',x.status,'source',x.source,'assigned_user_id',x.assigned_user_id) dto from public.customers x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'lifecycle' or (x.lifecycle=(p_input->>'lifecycle'))) and (not p_input ? 'assigned_user_id' or (x.assigned_user_id=(p_input->>'assigned_user_id')::uuid)) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) and (not p_input ? 'operator_id' or (exists(select 1 from public.telecom_contracts z where z.workspace_id=x.workspace_id and z.customer_id=x.id and z.operator_id=(p_input->>'operator_id')::uuid))) order by x.id limit n+1) page;
 when 'contact' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'display_name',x.display_name,'job_title',x.job_title,'status',x.status,'is_primary',x.is_primary,'has_email',x.email is not null,'has_phone',x.phone is not null) dto from public.contacts x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) order by x.id limit n+1) page;
 when 'opportunity' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'title',x.title,'status',x.status,'stage_id',x.stage_id,'owner_user_id',x.owner_user_id,'currency',x.currency,'amount_minor',x.amount_minor::text,'expected_close_date',x.expected_close_date,'next_follow_up_at',x.next_follow_up_at,'has_next_action',x.next_action is not null,'source',x.source,'links',coalesce((select jsonb_agg(jsonb_build_object('kind',l.kind,'id',l.target_id) order by l.kind) from public.product_opportunity_links l where l.workspace_id=x.workspace_id and l.opportunity_id=x.id),'[]'::jsonb)) dto from public.opportunities x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'owner_user_id' or (x.owner_user_id=(p_input->>'owner_user_id')::uuid)) and (not p_input ? 'stage_id' or (x.stage_id=(p_input->>'stage_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'currency' or (x.currency=(p_input->>'currency'))) and (not p_input ? 'expected_close_from' or (x.expected_close_date >= (p_input->>'expected_close_from')::date)) and (not p_input ? 'expected_close_to' or (x.expected_close_date <= (p_input->>'expected_close_to')::date)) order by x.id limit n+1) page;
 when 'activity' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'customer_id',x.customer_id,'activity_kind',x.activity_kind,'summary_code',x.summary_code,'occurred_at',x.occurred_at,'actor_user_id',x.actor_user_id,'contract_id',x.contract_id,'service_id',x.service_id,'opportunity_id',x.opportunity_id,'task_id',x.task_id,'meeting_id',x.calendar_event_id) dto from public.activities x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'kind' or (x.activity_kind=(p_input->>'kind'))) and (not p_input ? 'entity_kind' or (case p_input->>'entity_kind' when 'customer' then x.customer_id when 'contract' then x.contract_id when 'service' then x.service_id when 'opportunity' then x.opportunity_id when 'task' then x.task_id when 'meeting' then x.calendar_event_id end = (p_input->>'entity_id')::uuid)) and (not p_input ? 'entity_id' or (case p_input->>'entity_kind' when 'customer' then x.customer_id when 'contract' then x.contract_id when 'service' then x.service_id when 'opportunity' then x.opportunity_id when 'task' then x.task_id when 'meeting' then x.calendar_event_id end = (p_input->>'entity_id')::uuid)) and (not p_input ? 'date_from' or (x.occurred_at >= (p_input->>'date_from')::date::timestamp at time zone 'Europe/Madrid')) and (not p_input ? 'date_to' or (x.occurred_at < ((p_input->>'date_to')::date+1)::timestamp at time zone 'Europe/Madrid')) order by x.id limit n+1) page;
 when 'assignee' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.user_id id,jsonb_build_object('user_id',x.user_id,'display_name',coalesce(nullif(btrim(p.full_name),''),'Usuario'),'role',x.role) dto from public.workspace_members x left join public.profiles p on p.id=x.user_id where x.workspace_id=p_workspace_id and x.status='active' and x.role in ('owner','admin','member') and (not get_one or x.user_id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.user_id>(p_input->>'after_id')::uuid) and (not p_input ? 'role' or (x.role=(p_input->>'role'))) order by x.user_id limit n+1) page;
 when 'operator' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'code',x.code,'display_name',x.display_name,'status',x.status,'source',x.source) dto from public.telecom_operators x  where x.workspace_id=p_workspace_id and (p_operation<>'operator.list' or x.status=coalesce(p_input->>'status','active')) and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'plan' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'operator_id',x.operator_id,'code',x.code,'display_name',x.display_name,'service_kind',x.service_kind,'status',x.status) dto from public.telecom_plans x  where x.workspace_id=p_workspace_id and (p_operation<>'plan.list' or x.status=coalesce(p_input->>'status','active')) and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'operator_id' or (x.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'service_kind' or (x.service_kind=(p_input->>'service_kind'))) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) order by x.id limit n+1) page;
 when 'plan_version' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'plan_id',x.plan_id,'operator_id',p.operator_id,'service_kind',p.service_kind,'version_number',x.version_number,'valid_from',x.valid_from,'valid_until',x.valid_until,'currency',x.currency,'recurring_amount_minor',x.recurring_amount_minor::text,'plan_status',p.status) dto from public.telecom_plan_versions x join public.telecom_plans p on p.id=x.plan_id and p.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'plan_id' or (x.plan_id=(p_input->>'plan_id')::uuid)) and (not p_input ? 'operator_id' or (p.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'service_kind' or (p.service_kind=(p_input->>'service_kind'))) and (not p_input ? 'valid_on' or (x.valid_from <= (p_input->>'valid_on')::date and (x.valid_until is null or x.valid_until >= (p_input->>'valid_on')::date))) and (not p_input ? 'status' or (p.status=(p_input->>'status'))) order by x.id limit n+1) page;
 when 'contract' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'operator_id',x.operator_id,'plan_version_id',x.plan_version_id,'assigned_user_id',x.assigned_user_id,'status',x.status,'source',x.source,'start_date',x.start_date,'end_date',x.end_date) dto from public.telecom_contracts x left join public.telecom_plan_versions pv on pv.id=x.plan_version_id and pv.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'operator_id' or (x.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'plan_id' or (pv.plan_id=(p_input->>'plan_id')::uuid)) and (not p_input ? 'assigned_user_id' or (x.assigned_user_id=(p_input->>'assigned_user_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'service' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'contract_id',x.contract_id,'operator_id',x.operator_id,'plan_version_id',x.plan_version_id,'service_kind',x.service_kind,'display_name',x.display_name,'status',x.status,'source',x.source,'activated_on',x.activated_on,'ended_on',x.ended_on) dto from public.telecom_services x left join public.telecom_plan_versions pv on pv.id=x.plan_version_id and pv.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (x.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'operator_id' or (x.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'plan_id' or (pv.plan_id=(p_input->>'plan_id')::uuid)) and (not p_input ? 'kind' or (x.service_kind=(p_input->>'kind'))) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'line' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'service_id',x.service_id,'customer_id',s.customer_id,'contract_id',s.contract_id,'operator_id',s.operator_id,'plan_version_id',s.plan_version_id,'display_name',x.display_name,'status',x.status,'source',x.source,'activated_on',x.activated_on,'ended_on',x.ended_on) dto from public.telecom_lines x join public.telecom_services s on s.id=x.service_id and s.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (s.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (s.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'service_id' or (x.service_id=(p_input->>'service_id')::uuid)) and (not p_input ? 'operator_id' or (s.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'renewal' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'contract_id',x.contract_id,'customer_id',c.customer_id,'owner_user_id',c.assigned_user_id,'status',x.status,'source',x.source,'target_on',x.target_on,'opens_on',x.opens_on,'closes_on',x.closes_on,'attention_state',case when x.status<>'open' then x.status when x.target_on<(statement_timestamp() at time zone 'Europe/Madrid')::date then 'overdue' when x.target_on<=(statement_timestamp() at time zone 'Europe/Madrid')::date+30 then 'upcoming' else 'open' end) dto from public.telecom_renewals x join public.telecom_contracts c on c.id=x.contract_id and c.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (c.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (x.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'owner_user_id' or (c.assigned_user_id=(p_input->>'owner_user_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'window_from' or (x.target_on >= (p_input->>'window_from')::date)) and (not p_input ? 'window_to' or (x.target_on <= (p_input->>'window_to')::date)) order by x.id limit n+1) page;
 when 'permanence' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'contract_id',x.contract_id,'service_id',x.service_id,'customer_id',c.customer_id,'status',x.administrative_status,'source',x.source,'commitment_kind',x.commitment_kind,'starts_on',x.starts_on,'ends_on',x.ends_on,'days_remaining',x.ends_on - (statement_timestamp() at time zone 'Europe/Madrid')::date,'timing_state',case when x.administrative_status='cancelled' then 'cancelled' when x.ends_on<(statement_timestamp() at time zone 'Europe/Madrid')::date then 'expired' when x.ends_on<=(statement_timestamp() at time zone 'Europe/Madrid')::date+30 then 'upcoming' else 'current' end) dto from public.telecom_commitments x join public.telecom_contracts c on c.id=x.contract_id and c.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (c.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (x.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'service_id' or (x.service_id=(p_input->>'service_id')::uuid)) and (not p_input ? 'status' or (x.administrative_status=(p_input->>'status'))) and (not p_input ? 'window_from' or (x.ends_on >= (p_input->>'window_from')::date)) and (not p_input ? 'window_to' or (x.ends_on <= (p_input->>'window_to')::date)) order by x.id limit n+1) page;
 end case;
 if get_one then
  if jsonb_array_length(rows)=0 then return null;end if;
  return jsonb_build_object('contract_version','telecom.collections.v1','operation',p_operation,'record',rows->0);
 end if;
 more:=jsonb_array_length(rows)>n;
 if more then rows:=rows-n;end if;
 return jsonb_build_object('contract_version','telecom.collections.v1','operation',p_operation,'items',rows,'next_id',case when more then coalesce(rows->(n-1)->>'id',rows->(n-1)->>'user_id') end);
end$$;
revoke all on function public.telecom_collection_v1_query(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.telecom_collection_v1_query(uuid,text,jsonb) to authenticated;
create index if not exists customers_tel5_collection_page_idx on public.customers(workspace_id,id);
create index if not exists contacts_tel5_collection_page_idx on public.contacts(workspace_id,id);
create index if not exists opportunities_tel5_collection_page_idx on public.opportunities(workspace_id,id);
create index if not exists activities_tel5_collection_page_idx on public.activities(workspace_id,id);
create index if not exists workspace_members_tel5_collection_page_idx on public.workspace_members(workspace_id,user_id);
create index if not exists telecom_operators_tel5_collection_page_idx on public.telecom_operators(workspace_id,id);
create index if not exists telecom_plans_tel5_collection_page_idx on public.telecom_plans(workspace_id,id);
create index if not exists telecom_plan_versions_tel5_collection_page_idx on public.telecom_plan_versions(workspace_id,id);
create index if not exists telecom_contracts_tel5_collection_page_idx on public.telecom_contracts(workspace_id,id);
create index if not exists telecom_services_tel5_collection_page_idx on public.telecom_services(workspace_id,id);
create index if not exists telecom_lines_tel5_collection_page_idx on public.telecom_lines(workspace_id,id);
create index if not exists telecom_renewals_tel5_collection_page_idx on public.telecom_renewals(workspace_id,id);
create index if not exists telecom_commitments_tel5_collection_page_idx on public.telecom_commitments(workspace_id,id);
commit;
