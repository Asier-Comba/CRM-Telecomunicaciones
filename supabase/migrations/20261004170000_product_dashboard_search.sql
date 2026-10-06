-- B5 reads; telecom.v1 is preserved. No protected identifier search.
begin;
create function public.product_v1_global_search(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; q text; n int; rows jsonb;
begin
 actor:=public.product_v1_assert_work_scope(p_workspace_id,false);
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>2048 or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('query','limit')) or jsonb_typeof(p_input->'query') is distinct from 'string' then raise exception using errcode='22023',message='product_invalid_input'; end if;
 q:=lower(btrim(p_input->>'query'));
 if char_length(q)<2 or char_length(q)>100 or q ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='product_invalid_input'; end if;
 if p_input ? 'limit' and (jsonb_typeof(p_input->'limit')<>'number' or p_input->>'limit' !~ '^[1-9][0-9]?$') then raise exception using errcode='22023',message='product_invalid_input'; end if;
 n:=coalesce((p_input->>'limit')::int,20);
 if n<1 or n>50 then raise exception using errcode='22023',message='product_invalid_input'; end if;
 with candidates as (
  select 'customer'::text kind,c.id,c.id customer_id,coalesce(c.trade_name,c.legal_name) label,c.status from public.customers c where c.workspace_id=p_workspace_id and c.status<>'archived'
  union all select 'contact',c.id,c.customer_id,c.display_name,c.status from public.contacts c join public.customers p on p.workspace_id=c.workspace_id and p.id=c.customer_id where c.workspace_id=p_workspace_id and c.status<>'archived' and p.status<>'archived'
  union all select 'contract',c.id,c.customer_id,'Contrato '||o.display_name,c.status from public.telecom_contracts c join public.telecom_operators o on o.workspace_id=c.workspace_id and o.id=c.operator_id where c.workspace_id=p_workspace_id
  union all select 'service',s.id,s.customer_id,s.display_name,s.status from public.telecom_services s where s.workspace_id=p_workspace_id
  union all select 'line',l.id,s.customer_id,'Línea '||s.display_name,l.status from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id=p_workspace_id
  union all select 'opportunity',o.id,o.customer_id,o.title,o.status from public.opportunities o where o.workspace_id=p_workspace_id and o.status<>'cancelled'
 ), ranked as (
  select *,case when lower(label)=q then 0 when position(q in lower(label))=1 then 1 else 2 end ranking from candidates where position(q in lower(label))>0
 ), capped as (
  select *,row_number() over(partition by kind order by ranking,lower(label),id) within_kind from ranked
 ), selected as (
  select kind,id,customer_id,label,status,ranking from capped where within_kind<=5 order by ranking,kind,lower(label),id limit n
 ) select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',id,'customer_id',customer_id,'label',label,'status',status) order by ranking,kind,lower(label),id),'[]'::jsonb) into rows from selected;
 return jsonb_build_object('contract_version','product.v1','items',rows);
end $$;
revoke all on function public.product_v1_global_search(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_global_search(uuid,jsonb) to authenticated;

create function public.product_v1_dashboard_v2(p_workspace_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; audience text; period text; anchor date; first_day date; last_day date; mine boolean; counts jsonb; flow jsonb; activity jsonb;
begin
 actor:=public.product_v1_assert_work_scope(p_workspace_id,false);
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>2048 or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('audience','period','anchor_date')) then raise exception using errcode='22023',message='product_invalid_input'; end if;
 audience:=coalesce(p_input->>'audience','my');period:=coalesce(p_input->>'period','month');
 if (p_input ? 'audience' and jsonb_typeof(p_input->'audience')<>'string') or (p_input ? 'period' and jsonb_typeof(p_input->'period')<>'string') or audience not in ('my','workspace','team') or period not in ('month','quarter','semester','year','all') then raise exception using errcode='22023',message='product_invalid_input'; end if;
 if audience='team' then raise exception using errcode='0A000',message='product_team_unavailable'; end if;
 if audience='workspace' and not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=actor and status='active' and role in ('owner','admin')) then raise exception using errcode='42501',message='product_access_denied'; end if;
 mine:=audience='my';
 if p_input ? 'anchor_date' then
  perform public.product_v1_validate_work_input(jsonb_build_object('expected_close_date',p_input->'anchor_date'),array['expected_close_date'],array[]::text[]);
  anchor:=(p_input->>'anchor_date')::date;
 else anchor:=(statement_timestamp() at time zone 'Europe/Madrid')::date; end if;
 if period<>'all' then
  first_day:=case period when 'month' then date_trunc('month',anchor)::date when 'quarter' then date_trunc('quarter',anchor)::date when 'semester' then make_date(extract(year from anchor)::int,case when extract(month from anchor)<=6 then 1 else 7 end,1) else date_trunc('year',anchor)::date end;
  last_day:=(first_day+case period when 'month' then interval '1 month' when 'quarter' then interval '3 months' when 'semester' then interval '6 months' else interval '1 year' end)::date;
 end if;
 select jsonb_build_object(
  'customers',(select count(*) from public.customers where workspace_id=p_workspace_id and status<>'archived' and (not mine or assigned_user_id=actor)),
  'contracts',(select count(*) from public.telecom_contracts where workspace_id=p_workspace_id and (not mine or assigned_user_id=actor)),
  'services',(select count(*) from public.telecom_services s join public.telecom_contracts c on c.workspace_id=s.workspace_id and c.id=s.contract_id where s.workspace_id=p_workspace_id and (not mine or c.assigned_user_id=actor)),
  'lines',(select count(*) from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id join public.telecom_contracts c on c.workspace_id=s.workspace_id and c.id=s.contract_id where l.workspace_id=p_workspace_id and (not mine or c.assigned_user_id=actor)),
  'opportunities',(select count(*) from public.opportunities where workspace_id=p_workspace_id and status<>'cancelled' and (not mine or owner_user_id=actor)),
  'tasks',(select count(*) from public.tasks where workspace_id=p_workspace_id and (not mine or assigned_user_id=actor)),
  'meetings',(select count(*) from public.calendar_events where workspace_id=p_workspace_id and (not mine or assigned_user_id=actor)),
  'renewals',(select count(*) from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and (not mine or c.assigned_user_id=actor)),
  'permanences',(select count(*) from public.telecom_commitments r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and (not mine or c.assigned_user_id=actor))) into counts;
 select jsonb_build_object(
  'customers_created',(select count(*) from public.customers where workspace_id=p_workspace_id and (not mine or assigned_user_id=actor) and (first_day is null or (created_at>=first_day::timestamp at time zone 'Europe/Madrid' and created_at<last_day::timestamp at time zone 'Europe/Madrid'))),
  'tasks_due',(select count(*) from public.tasks where workspace_id=p_workspace_id and status in ('pending','in_progress') and (not mine or assigned_user_id=actor) and due_at is not null and (first_day is null or (due_at>=first_day::timestamp at time zone 'Europe/Madrid' and due_at<last_day::timestamp at time zone 'Europe/Madrid'))),
  'meetings_scheduled',(select count(*) from public.calendar_events where workspace_id=p_workspace_id and status='scheduled' and (not mine or assigned_user_id=actor) and (first_day is null or (starts_at>=first_day::timestamp at time zone 'Europe/Madrid' and starts_at<last_day::timestamp at time zone 'Europe/Madrid'))),
  'renewals_due',(select count(*) from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and r.status='open' and (not mine or c.assigned_user_id=actor) and (first_day is null or (r.target_on>=first_day and r.target_on<last_day))),
  'permanences_due',(select count(*) from public.telecom_commitments r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and r.administrative_status='open' and (not mine or c.assigned_user_id=actor) and (first_day is null or (r.ends_on>=first_day and r.ends_on<last_day))),
  'opportunities_closed',(select count(*) from public.opportunities where workspace_id=p_workspace_id and status in ('won','lost') and (not mine or owner_user_id=actor) and (first_day is null or (closed_at>=first_day::timestamp at time zone 'Europe/Madrid' and closed_at<last_day::timestamp at time zone 'Europe/Madrid')))) into flow;
 select coalesce(jsonb_agg(to_jsonb(a) order by occurred_at desc,id desc),'[]'::jsonb) into activity from
  (select id,activity_kind,summary_code,occurred_at,customer_id from public.activities where workspace_id=p_workspace_id and (not mine or actor_user_id=actor) order by occurred_at desc,id desc limit 20) a;
 return jsonb_build_object('contract_version','product.dashboard.v2','audience',audience,'period',jsonb_build_object('kind',period,'start',first_day,'end_exclusive',last_day),'snapshot_counts',counts,'period_counts',flow,'recent_activity',activity,'financial',null,'financial_status','unavailable');
end $$;
revoke all on function public.product_v1_dashboard_v2(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_dashboard_v2(uuid,jsonb) to authenticated;
commit;
