begin;
create function public.product_v1_calendar(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; first_at timestamptz; last_at timestamptz; n int; r jsonb; rows jsonb; more boolean; after_stamp timestamptz;
begin
 a:=public.product_v1_assert_work_scope(p_workspace_id,false);
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096
 or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('range_start','range_end','kind','status','customer_id','assigned_user_id','limit','after_at','after_kind','after_id')) then raise exception using errcode='22023',message='product_invalid_input'; end if;
 perform public.product_v1_validate_work_input(p_input - array['kind','status','limit','after_at','after_kind','after_id'],array['range_start','range_end'],array['customer_id','assigned_user_id']);
 first_at:=(p_input->>'range_start')::timestamptz; last_at:=(p_input->>'range_end')::timestamptz;
 if last_at<=first_at or last_at-first_at>interval '93 days' then raise exception using errcode='22023',message='product_invalid_range'; end if;
 if p_input ? 'limit' and (jsonb_typeof(p_input->'limit')<>'number' or p_input->>'limit' !~ '^[1-9][0-9]{0,2}$') then raise exception using errcode='22023',message='product_invalid_input'; end if;
 n:=coalesce((p_input->>'limit')::int,50);
 if n>100 or n<1 or (p_input ? 'kind' and (jsonb_typeof(p_input->'kind')<>'string' or p_input->>'kind' not in ('task','meeting','renewal','permanence')))
 or (p_input ? 'status' and (jsonb_typeof(p_input->'status')<>'string' or p_input->>'status' not in ('pending','in_progress','completed','cancelled','scheduled','no_show','open','dismissed','not_applicable'))) then raise exception using errcode='22023',message='product_invalid_input'; end if;
 if (p_input ? 'after_at') or (p_input ? 'after_kind') or (p_input ? 'after_id') then
  if not (p_input ?& array['after_at','after_kind','after_id']) or jsonb_typeof(p_input->'after_kind')<>'string' or p_input->>'after_kind' not in ('task','meeting','renewal','permanence') then raise exception using errcode='22023',message='product_invalid_cursor'; end if;
  perform public.product_v1_validate_work_input(jsonb_build_object('range_start',p_input->'after_at','id',p_input->'after_id'),array['range_start','id'],array[]::text[]);
  after_stamp:=(p_input->>'after_at')::timestamptz;
 end if;
 with events as (
  select 'meeting'::text kind,id,version,title,status,customer_id,assigned_user_id,starts_at at,ends_at,all_day,null::date date
  from public.calendar_events where workspace_id=p_workspace_id and ((ends_at is null and starts_at>=first_at and starts_at<last_at) or (ends_at is not null and starts_at<last_at and ends_at>first_at))
  union all select 'task',id,version,title,status,customer_id,assigned_user_id,due_at,null,false,null from public.tasks where workspace_id=p_workspace_id and due_at>=first_at and due_at<last_at
  union all select 'renewal',x.id,null::bigint,'Renovación',x.status,c.customer_id,c.assigned_user_id,x.target_on::timestamp at time zone 'Europe/Madrid',null,true,x.target_on
   from public.telecom_renewals x join public.telecom_contracts c on c.workspace_id=x.workspace_id and c.id=x.contract_id where x.workspace_id=p_workspace_id
   and x.target_on::timestamp at time zone 'Europe/Madrid'>=first_at and x.target_on::timestamp at time zone 'Europe/Madrid'<last_at
  union all select 'permanence',x.id,null::bigint,'Permanencia',x.administrative_status,c.customer_id,c.assigned_user_id,x.ends_on::timestamp at time zone 'Europe/Madrid',null,true,x.ends_on
   from public.telecom_commitments x join public.telecom_contracts c on c.workspace_id=x.workspace_id and c.id=x.contract_id where x.workspace_id=p_workspace_id
   and x.ends_on::timestamp at time zone 'Europe/Madrid'>=first_at and x.ends_on::timestamp at time zone 'Europe/Madrid'<last_at
 ), selected as (
  select * from events where (not p_input ? 'kind' or kind=p_input->>'kind') and (not p_input ? 'status' or status=p_input->>'status')
  and (not p_input ? 'customer_id' or customer_id=(p_input->>'customer_id')::uuid)
  and (not p_input ? 'assigned_user_id' or assigned_user_id=(p_input->>'assigned_user_id')::uuid)
  and (after_stamp is null or (at,kind,id)>(after_stamp,p_input->>'after_kind',(p_input->>'after_id')::uuid)) order by at,kind,id limit n+1
 ) select coalesce(jsonb_agg(to_jsonb(selected) order by at,kind,id),'[]'::jsonb) into rows from selected;
 more:=jsonb_array_length(rows)>n;
 if more then rows:=rows - n; end if;
 r:=case when more then rows->(n-1) end;
 return jsonb_build_object('contract_version','product.v1','items',rows,'next',case when more then jsonb_build_object('after_at',r->'at','after_kind',r->'kind','after_id',r->'id') end);
end $$;
revoke all on function public.product_v1_calendar(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_calendar(uuid,jsonb) to authenticated;

create function public.product_v1_work_get(p_workspace_id uuid,p_kind text,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; a uuid; history jsonb; links jsonb;
begin
 a:=public.product_v1_assert_work_scope(p_workspace_id,false);
 if p_id is null or p_kind is null or p_kind not in ('task','meeting','opportunity') then raise exception using errcode='22023',message='product_invalid_input'; end if;
 if p_kind='task' then
  select jsonb_build_object('id',id,'version',version,'title',title,'status',status,'customer_id',customer_id,'opportunity_id',opportunity_id,'due_at',due_at,'priority',priority,'assigned_user_id',assigned_user_id) into r from public.tasks where workspace_id=p_workspace_id and id=p_id;
 elsif p_kind='meeting' then
  select jsonb_build_object('id',id,'version',version,'title',title,'status',status,'customer_id',customer_id,'opportunity_id',opportunity_id,'starts_at',starts_at,'ends_at',ends_at,'timezone',timezone,'all_day',all_day,'channel',channel,'assigned_user_id',assigned_user_id) into r from public.calendar_events where workspace_id=p_workspace_id and id=p_id;
 else
  select jsonb_build_object('id',id,'version',version,'title',title,'status',status,'customer_id',customer_id,'stage_id',stage_id,'owner_user_id',owner_user_id,'amount_minor',amount_minor,'currency',currency,'next_follow_up_at',next_follow_up_at,'expected_close_date',expected_close_date,'next_action',next_action,'source',source) into r from public.opportunities where workspace_id=p_workspace_id and id=p_id;
  if r is not null then
   select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',target_id) order by kind),'[]'::jsonb) into links from public.product_opportunity_links where workspace_id=p_workspace_id and opportunity_id=p_id;
   select coalesce(jsonb_agg(jsonb_build_object('version',version,'operation',operation,'occurred_at',occurred_at,'from_stage_id',from_stage_id,'to_stage_id',to_stage_id,'from_status',from_status,'to_status',to_status) order by version desc),'[]'::jsonb) into history from (select * from public.product_opportunity_history where workspace_id=p_workspace_id and opportunity_id=p_id order by version desc limit 50) h;
   r:=r||jsonb_build_object('links',links,'history',history,'history_partial',(select count(*)>50 from public.product_opportunity_history where workspace_id=p_workspace_id and opportunity_id=p_id));
  end if;
 end if;
 if r is null then return null; end if;
 return jsonb_build_object('contract_version','product.v1','kind',p_kind,'record',r);
end $$;
revoke all on function public.product_v1_work_get(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_work_get(uuid,text,uuid) to authenticated;

create function public.product_v1_stage_catalog(p_workspace_id uuid,p_after_id uuid default null,p_limit int default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; rows jsonb; last_id uuid; more boolean;
begin
 a:=public.product_v1_assert_work_scope(p_workspace_id,false);
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception using errcode='22023',message='product_invalid_input'; end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]'::jsonb) into rows from (select id,code,display_name,position,outcome,status from public.opportunity_stages where workspace_id=p_workspace_id and (p_after_id is null or id>p_after_id) order by id limit p_limit+1) s;
 more:=jsonb_array_length(rows)>p_limit;
 if more then rows:=rows-p_limit; last_id:=(rows->(p_limit-1)->>'id')::uuid; end if;
 return jsonb_build_object('contract_version','product.v1','items',rows,'next_id',last_id);
end $$;
revoke all on function public.product_v1_stage_catalog(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_stage_catalog(uuid,uuid,integer) to authenticated;
commit;
