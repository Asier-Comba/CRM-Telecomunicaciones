-- Forward-only ledger application. Read current issue-date cohorts; not past balance/cashflow reconstruction.
begin;
create function public.billing_analytics_v1_validate(op text, inp jsonb)returns void
language plpgsql security definer set search_path=''as $$
declare k text;v jsonb;s text;allowed text[];begin
 if op not in('billing.monthly_series','billing.top_customers')then raise exception using errcode='22023',message='billing_analytics_invalid_operation';end if;
 allowed:=array['from_month','to_month','currency','customer_id'];if op='billing.top_customers'then allowed:=array_append(allowed,'limit');end if;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or not(inp?'from_month'and inp?'to_month'and inp?'currency')or exists(select 1 from jsonb_object_keys(inp)x where not x=any(allowed))then raise exception using errcode='22023',message='billing_analytics_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop s:=inp->>k;
 if k='currency'then
 if jsonb_typeof(v)<>'string'or s not in('EUR','USD','GBP')then raise exception using errcode='22023',message='billing_analytics_invalid_input';end if;
 elsif k='customer_id'then
 if jsonb_typeof(v)<>'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='billing_analytics_invalid_input';end if;
 elsif k='limit'then
 if jsonb_typeof(v)<>'number'or s!~'^[1-9][0-9]?$'or s::int>25 then raise exception using errcode='22023',message='billing_analytics_invalid_input';end if;
 else
 if jsonb_typeof(v)<>'string'or s!~'^[0-9]{4}-[0-9]{2}-01$'or s::date not between date'2000-01-01'and date'2100-12-01'then raise exception using errcode='22023',message='billing_analytics_invalid_input';end if;
 end if;end loop;
 if(inp->>'to_month')::date<(inp->>'from_month')::date or(inp->>'to_month')::date>=(inp->>'from_month')::date+interval'24 months'then raise exception using errcode='22023',message='billing_analytics_invalid_input';end if;
 exception when data_exception then raise exception using errcode='22023',message='billing_analytics_invalid_input';
end$$;
create function public.billing_analytics_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb
language plpgsql security definer set search_path=''as $$
declare customer uuid;curr text;lo date;hi date;today date:=(statement_timestamp()at time zone'Europe/Madrid')::date;rows jsonb;lim int;
begin
 perform public.billing_v1_assert_scope(p_workspace_id);perform public.billing_analytics_v1_validate(p_operation,p_input);
 customer:=(p_input->>'customer_id')::uuid;curr:=p_input->>'currency';lo:=(p_input->>'from_month')::date;hi:=((p_input->>'to_month')::date+interval'1 month')::date;lim:=coalesce((p_input->>'limit')::int,10);
 if customer is not null and not exists(select 1 from public.customers where workspace_id=p_workspace_id and id=customer)then raise exception using errcode='P0002',message='billing_analytics_customer_not_found';end if;
 if p_operation='billing.monthly_series'then
 select coalesce(jsonb_agg(to_jsonb(z)order by month),'[]'::jsonb)into rows from(
 select m.d::date as month,
 coalesce(sum(i.total_minor),0)::text as issued_minor,
 coalesce(sum(i.total_minor)filter(where i.status='paid'),0)::text as paid_minor,
 coalesce(sum(i.total_minor)filter(where i.status='issued'),0)::text as outstanding_minor,
 coalesce(sum(i.total_minor)filter(where i.status='issued'and i.due_on<today),0)::text as overdue_minor
 from generate_series(lo::timestamp,(hi-interval'1 month')::timestamp,interval'1 month')m(d)
 left join public.billing_invoices i on i.workspace_id=p_workspace_id and i.currency=curr and i.status in('issued','paid')and i.issue_on>=m.d::date and i.issue_on<(m.d+interval'1 month')::date and(customer is null or i.customer_id=customer)
 group by m.d)z;
 else
 select coalesce(jsonb_agg(to_jsonb(z)order by issued_sort desc,customer_id),'[]'::jsonb)into rows from(
 select customer_id,sum(total_minor)::text as issued_minor,
 coalesce(sum(total_minor)filter(where status='paid'),0)::text as paid_minor,
 coalesce(sum(total_minor)filter(where status='issued'),0)::text as outstanding_minor,
 coalesce(sum(total_minor)filter(where status='issued'and due_on<today),0)::text as overdue_minor,
 sum(total_minor)as issued_sort
 from public.billing_invoices where workspace_id=p_workspace_id and currency=curr and status in('issued','paid')and issue_on>=lo and issue_on<hi and(customer is null or customer_id=customer)
 group by customer_id order by sum(total_minor)desc,customer_id limit lim)z;
 select coalesce(jsonb_agg(value-'issued_sort'order by ordinality),'[]'::jsonb)into rows from jsonb_array_elements(rows)with ordinality;
 end if;
 return jsonb_build_object('contract_version','billing.analytics.v1','operation',p_operation,'basis','issue_month_cohort_current_status','as_of',today,'currency',curr,'from_month',lo,'to_month',(hi-interval'1 month')::date,'items',rows);
end$$;
revoke all on function public.billing_analytics_v1_validate(text,jsonb),public.billing_analytics_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.billing_analytics_v1_query(uuid,text,jsonb)to authenticated;
commit;
