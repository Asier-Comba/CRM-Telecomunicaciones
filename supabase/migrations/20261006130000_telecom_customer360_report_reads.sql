-- Read-only exact commercial aggregates. Forward only; no table rewrite/backfill.
-- Applied once by ledger. Functions are new; no caller-defined SQL, grouping or fields.
begin;
create function public.telecom_reads_v1_validate(op text, inp jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare allowed text[]; required text[]; k text; v jsonb; s text; begin
 case op
 when 'customer360.summary' then allowed:=array['customer_id']::text[]; required:=array['customer_id']::text[];
 when 'report.operator_portfolio' then allowed:=array['customer_id','operator_id','after_id','limit']::text[]; required:=array[]::text[];
 when 'report.services_by_kind' then allowed:=array['customer_id','operator_id']::text[]; required:=array[]::text[];
 when 'report.lines_by_status' then allowed:=array['customer_id','operator_id']::text[]; required:=array[]::text[];
 when 'report.renewals_by_month' then allowed:=array['customer_id','from_month','to_month']::text[]; required:=array['from_month','to_month']::text[];
 when 'report.permanences_by_month' then allowed:=array['customer_id','from_month','to_month']::text[]; required:=array['from_month','to_month']::text[];
 when 'report.portabilities_by_status' then allowed:=array['customer_id']::text[]; required:=array[]::text[];
 when 'report.cases_by_priority_status' then allowed:=array['customer_id']::text[]; required:=array[]::text[];
 when 'report.pipeline_by_stage' then allowed:=array['customer_id','owner_user_id','stage_id','after_id','limit']::text[]; required:=array[]::text[];
 when 'report.commercial_owner_counts' then allowed:=array['customer_id','owner_user_id','after_id','limit']::text[]; required:=array[]::text[];
 else raise exception using errcode='22023',message='telecom_reads_invalid_operation'; end case;
 if inp is null or jsonb_typeof(inp)<>'object' or octet_length(inp::text)>4096
 or exists(select 1 from jsonb_object_keys(inp)x where not x=any(allowed))
 or exists(select 1 from unnest(required)x where not inp?x)
 then raise exception using errcode='22023',message='telecom_reads_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp) loop s:=inp->>k;
 if k='limit' then
 if jsonb_typeof(v)<>'number' or s!~'^[1-9][0-9]{0,2}$' or s::int>100 then raise exception using errcode='22023',message='telecom_reads_invalid_input';end if;
 elsif k like '%_id' then
 if jsonb_typeof(v)<>'string' or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='telecom_reads_invalid_input';end if;
 else
 if jsonb_typeof(v)<>'string' or s!~'^[0-9]{4}-[0-9]{2}-01$' or s::date not between date'2000-01-01' and date'2100-12-01' then raise exception using errcode='22023',message='telecom_reads_invalid_input';end if;
 end if;end loop;
 if inp?'from_month' and ((inp->>'to_month')::date<(inp->>'from_month')::date or (inp->>'to_month')::date>=((inp->>'from_month')::date+interval'24 months')) then raise exception using errcode='22023',message='telecom_reads_invalid_input';end if;
 exception when data_exception then raise exception using errcode='22023',message='telecom_reads_invalid_input';
end$$;
create function public.telecom_reads_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; privileged boolean; customer uuid; result jsonb; rows jsonb; next_id uuid; lim int; today date:=(statement_timestamp()at time zone'Europe/Madrid')::date; extra jsonb:='{}'::jsonb;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id,false);perform public.telecom_reads_v1_validate(p_operation,p_input);
 customer:=(p_input->>'customer_id')::uuid;lim:=coalesce((p_input->>'limit')::int,50);
 if customer is not null and not exists(select 1 from public.customers where workspace_id=p_workspace_id and id=customer)then raise exception using errcode='P0002',message='telecom_reads_customer_not_found';end if;
 select role in('owner','admin')into privileged from public.workspace_members where workspace_id=p_workspace_id and user_id=actor and status='active';
 if p_operation='customer360.summary' then
 select jsonb_build_object('customer_id',customer,
'contacts',(select count(*)from public.contacts where workspace_id=p_workspace_id and customer_id=customer),
'contracts',(select count(*)from public.telecom_contracts where workspace_id=p_workspace_id and customer_id=customer),
'services',(select count(*)from public.telecom_services where workspace_id=p_workspace_id and customer_id=customer),
'lines',(select count(*)from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id=p_workspace_id and s.customer_id=customer),
'renewals',(select count(*)from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and c.customer_id=customer),
'permanences',(select count(*)from public.telecom_commitments r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and c.customer_id=customer),
'opportunities',(select count(*)from public.opportunities where workspace_id=p_workspace_id and customer_id=customer),
'tasks',(select count(*)from public.tasks where workspace_id=p_workspace_id and customer_id=customer),
'meetings',(select count(*)from public.calendar_events where workspace_id=p_workspace_id and customer_id=customer),
'cases',(select count(*)from public.service_cases where workspace_id=p_workspace_id and customer_id=customer),
'documents',case when privileged then (select count(*)from public.documents d where workspace_id=p_workspace_id and (customer_id=customer or exists(select 1 from public.telecom_contracts c where c.workspace_id=d.workspace_id and c.id=d.contract_id and c.customer_id=customer)or exists(select 1 from public.telecom_services s where s.workspace_id=d.workspace_id and s.id=d.service_id and s.customer_id=customer)or exists(select 1 from public.telecom_lines l join public.telecom_services s on s.id=l.service_id and s.workspace_id=l.workspace_id where l.workspace_id=d.workspace_id and l.id=d.line_id and s.customer_id=customer)or exists(select 1 from public.service_cases c where c.workspace_id=d.workspace_id and c.id=d.service_case_id and c.customer_id=customer)or exists(select 1 from public.opportunities o where o.workspace_id=d.workspace_id and o.id=d.opportunity_id and o.customer_id=customer)))else null end,
'billing',case when privileged then (select count(*)from public.billing_invoices where workspace_id=p_workspace_id and customer_id=customer)else null end,
'activity',(select count(*)from public.activities where workspace_id=p_workspace_id and customer_id=customer),
'portabilities',(select count(*)from public.telecom_portabilities where workspace_id=p_workspace_id and customer_id=customer),
'sims',(select count(*)from public.telecom_sims where workspace_id=p_workspace_id and customer_id=customer))into result;
 return jsonb_build_object('contract_version','telecom.reads.v1','operation',p_operation,'as_of',today,'record',result);
elsif p_operation='report.operator_portfolio'then
select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(
 select o.id,
 (select count(distinct c.customer_id)from public.telecom_contracts c where c.workspace_id=o.workspace_id and c.operator_id=o.id and(customer is null or c.customer_id=customer))as customers,
 (select count(*)from public.telecom_contracts c where c.workspace_id=o.workspace_id and c.operator_id=o.id and(customer is null or c.customer_id=customer))as contracts,
 (select count(*)from public.telecom_services s where s.workspace_id=o.workspace_id and s.operator_id=o.id and(customer is null or s.customer_id=customer))as services,
 (select count(*)from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id=o.workspace_id and s.operator_id=o.id and(customer is null or s.customer_id=customer))as lines
 from public.telecom_operators o where o.workspace_id=p_workspace_id and(not p_input?'operator_id'or o.id=(p_input->>'operator_id')::uuid)and(not p_input?'after_id'or o.id>(p_input->>'after_id')::uuid)order by o.id limit lim+1)x;
elsif p_operation='report.services_by_kind'then
select coalesce(jsonb_agg(to_jsonb(x)order by service_kind),'[]'::jsonb)into rows from(select k.service_kind,count(s.id)filter(where s.status='pending')as pending,count(s.id)filter(where s.status='active')as active,count(s.id)filter(where s.status='suspended')as suspended,count(s.id)filter(where s.status='ended')as ended,count(s.id)filter(where s.status='cancelled')as cancelled from unnest(array['mobile','fiber','fixed_voice','data_connectivity','other'])k(service_kind)left join public.telecom_services s on s.workspace_id=p_workspace_id and s.service_kind=k.service_kind and(customer is null or s.customer_id=customer)and(not p_input?'operator_id'or s.operator_id=(p_input->>'operator_id')::uuid)group by k.service_kind)x;
elsif p_operation='report.lines_by_status'then
 select coalesce(jsonb_agg(to_jsonb(x)order by status),'[]'::jsonb)into rows from(select k.status,count(l.id)as count from unnest(array['pending','active','suspended','ended','cancelled'])k(status)left join(
 select l.id,l.status from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id=p_workspace_id and(customer is null or s.customer_id=customer)and(not p_input?'operator_id'or s.operator_id=(p_input->>'operator_id')::uuid))l on l.status=k.status group by k.status)x;
elsif p_operation='report.renewals_by_month'then
 select coalesce(jsonb_agg(to_jsonb(x)order by month),'[]'::jsonb)into rows from(select m.d::date as month,count(r.id)filter(where r.status='open')as open,count(r.id)filter(where r.status='completed')as completed,count(r.id)filter(where r.status='dismissed')as dismissed,count(r.id)filter(where r.status='not_applicable')as not_applicable from generate_series((p_input->>'from_month')::date::timestamp,(p_input->>'to_month')::date::timestamp,interval'1 month')m(d)left join(select r.*from public.telecom_renewals r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and(customer is null or c.customer_id=customer))r on r.target_on>=m.d::date and r.target_on<(m.d+interval'1 month')::date group by m.d)x;
elsif p_operation='report.permanences_by_month'then
 select coalesce(jsonb_agg(to_jsonb(x)order by month),'[]'::jsonb)into rows from(select m.d::date as month,count(r.id)filter(where r.administrative_status='open')as open,count(r.id)filter(where r.administrative_status='cancelled')as cancelled from generate_series((p_input->>'from_month')::date::timestamp,(p_input->>'to_month')::date::timestamp,interval'1 month')m(d)left join(select r.*from public.telecom_commitments r join public.telecom_contracts c on c.workspace_id=r.workspace_id and c.id=r.contract_id where r.workspace_id=p_workspace_id and(customer is null or c.customer_id=customer))r on r.ends_on>=m.d::date and r.ends_on<(m.d+interval'1 month')::date group by m.d)x;
elsif p_operation='report.portabilities_by_status'then
 select coalesce(jsonb_agg(to_jsonb(x)order by status),'[]'::jsonb)into rows from(select k.status,count(p.id)as count from unnest(array['draft','requested','scheduled','in_progress','completed','rejected','cancelled'])k(status)left join public.telecom_portabilities p on p.workspace_id=p_workspace_id and p.status=k.status and(customer is null or p.customer_id=customer)group by k.status)x;
 elsif p_operation='report.cases_by_priority_status'then
 select coalesce(jsonb_agg(to_jsonb(x)order by priority,status),'[]'::jsonb)into rows from(select k.priority,t.status,count(c.id)as count from unnest(array['low','normal','high','urgent'])k(priority)cross join unnest(array['open','in_progress','waiting_customer','waiting_operator','resolved','closed','cancelled'])t(status)left join public.service_cases c on c.workspace_id=p_workspace_id and c.priority=k.priority and c.status=t.status and(customer is null or c.customer_id=customer)group by k.priority,t.status)x;
 elsif p_operation='report.pipeline_by_stage'then
select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(select st.id,count(o.id)filter(where o.status='open')as open,count(o.id)filter(where o.status='won')as won,count(o.id)filter(where o.status='lost')as lost,count(o.id)filter(where o.status='cancelled')as cancelled from public.opportunity_stages st left join public.opportunities o on o.workspace_id=st.workspace_id and o.stage_id=st.id and(customer is null or o.customer_id=customer)and(not p_input?'owner_user_id'or o.owner_user_id=(p_input->>'owner_user_id')::uuid)where st.workspace_id=p_workspace_id and(not p_input?'stage_id'or st.id=(p_input->>'stage_id')::uuid)and(not p_input?'after_id'or st.id>(p_input->>'after_id')::uuid)group by st.id order by st.id limit lim+1)x;
elsif p_operation='report.commercial_owner_counts'then
with contracts_owners as(select assigned_user_id as id,count(*)as count from public.telecom_contracts where workspace_id=p_workspace_id and status in('draft','active') and(customer is null or customer_id=customer)group by assigned_user_id),opportunities_owners as(select owner_user_id as id,count(*)as count from public.opportunities where workspace_id=p_workspace_id and status='open' and(customer is null or customer_id=customer)group by owner_user_id),tasks_owners as(select assigned_user_id as id,count(*)as count from public.tasks where workspace_id=p_workspace_id and status in('pending','in_progress') and(customer is null or customer_id=customer)group by assigned_user_id),cases_owners as(select assigned_user_id as id,count(*)as count from public.service_cases where workspace_id=p_workspace_id and status in('open','in_progress','waiting_customer','waiting_operator') and(customer is null or customer_id=customer)group by assigned_user_id),owners as(select id from contracts_owners where id is not null union select id from opportunities_owners where id is not null union select id from tasks_owners where id is not null union select id from cases_owners where id is not null) select (select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)from(select o.id,coalesce((select count from contracts_owners where id=o.id),0)as contracts,coalesce((select count from opportunities_owners where id=o.id),0)as opportunities,coalesce((select count from tasks_owners where id=o.id),0)as tasks,coalesce((select count from cases_owners where id=o.id),0)as cases from owners o where(not p_input?'owner_user_id'or o.id=(p_input->>'owner_user_id')::uuid)and(not p_input?'after_id'or o.id>(p_input->>'after_id')::uuid)order by o.id limit lim+1)x),jsonb_build_object('unassigned_counts',jsonb_build_object('contracts',case when p_input?'owner_user_id'then 0 else coalesce((select count from contracts_owners where id is null),0)end,'opportunities',case when p_input?'owner_user_id'then 0 else coalesce((select count from opportunities_owners where id is null),0)end,'tasks',case when p_input?'owner_user_id'then 0 else coalesce((select count from tasks_owners where id is null),0)end,'cases',case when p_input?'owner_user_id'then 0 else coalesce((select count from cases_owners where id is null),0)end))into rows,extra;

end if;
 if p_operation in('report.operator_portfolio','report.pipeline_by_stage','report.commercial_owner_counts')and jsonb_array_length(rows)>lim then rows:=rows-lim;next_id:=(rows->(lim-1)->>'id')::uuid;end if;
 return jsonb_build_object('contract_version','telecom.reads.v1','operation',p_operation,'as_of',today,'items',rows,'next_id',next_id)||extra;
end$$;
revoke all on function public.telecom_reads_v1_validate(text,jsonb),public.telecom_reads_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.telecom_reads_v1_query(uuid,text,jsonb)to authenticated;
commit;
