begin;
create function public.billing_v1_read(p_workspace_id uuid,p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices%rowtype; rows jsonb; item jsonb; lim integer; next_id uuid; today date:=(statement_timestamp() at time zone 'Europe/Madrid')::date;
 period text;period_from date;period_to date;issuer jsonb;customer jsonb;lines jsonb;k text;v jsonb;s text;allowed text[];
begin
 perform public.billing_v1_assert_scope(p_workspace_id);
 if p_op not in ('invoice.get','invoice.list','invoice.summary','invoice.financial_summary','configuration.get') then raise exception using errcode='22023',message='billing_invalid_query';end if;
 allowed:=case when p_op in ('invoice.get','invoice.summary') then array['id'] when p_op='configuration.get' then array['customer_id'] when p_op='invoice.financial_summary' then array['period'] else array['customer_id','status','from','to','series','limit','after_id'] end;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192 or exists(select 1 from jsonb_object_keys(p_input) x where not x=any(allowed)) then raise exception using errcode='22023',message='billing_invalid_query';end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  s:=p_input->>k;
  if k='id' or k like '%\_id' escape '\' then
   if jsonb_typeof(v)<>'string' or s !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='billing_invalid_query';end if;
  elsif k='limit' then
   if jsonb_typeof(v)<>'number' or s !~ '^[0-9]{1,3}$' or s::integer not between 1 and 100 then raise exception using errcode='22023',message='billing_invalid_query';end if;
  elsif k in ('from','to') then
   if jsonb_typeof(v)<>'string' or s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or s::date not between date '2000-01-01' and date '2100-12-31' then raise exception using errcode='22023',message='billing_invalid_query';end if;
  elsif k='series' then
   if jsonb_typeof(v)<>'string' or s !~ '^[A-Z0-9-]{1,8}$' then raise exception using errcode='22023',message='billing_invalid_query';end if;
  elsif k='status' then
   if jsonb_typeof(v)<>'string' or s not in ('draft','trashed','issued','paid','overdue') then raise exception using errcode='22023',message='billing_invalid_query';end if;
  elsif k='period' then
   if jsonb_typeof(v)<>'string' or s not in ('month','quarter','semester','year','all') then raise exception using errcode='22023',message='billing_invalid_query';end if;
  end if;
 end loop;
 if p_op in ('invoice.get','invoice.summary') then
  if not p_input ? 'id' then raise exception using errcode='22023',message='billing_invalid_query';end if;
  select * into i from public.billing_invoices where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;
  if not found then return null;end if;
  item:=jsonb_build_object('id',i.id,'version',i.version,'status',i.status,'customer_id',i.customer_id,'issue_on',i.issue_on,'due_on',i.due_on,'series',i.series,'currency',i.currency,'number',case when i.number_sequence is null then null else jsonb_build_object('series',i.series,'year',i.number_year,'sequence',i.number_sequence) end,'totals',jsonb_build_object('subtotal_minor',i.subtotal_minor,'tax_minor',i.tax_minor,'withholding_minor',i.withholding_minor,'total_minor',i.total_minor),'overdue',i.status='issued' and coalesce(i.due_on<today,false));
  if p_op='invoice.get' then
   select coalesce(jsonb_agg(jsonb_build_object('description',description,'quantity_milli',quantity_milli,'unit_price_minor',unit_price_minor,'discount_bps',discount_bps,'tax_bps',tax_bps,'withholding_bps',withholding_bps) order by position),'[]'::jsonb) into lines from public.billing_invoice_lines where workspace_id=p_workspace_id and invoice_id=i.id;
   issuer:=i.issuer_snapshot;customer:=i.customer_snapshot;
   if i.status in ('draft','trashed') then
    select to_jsonb(x)-array['workspace_id','version','updated_at'] into issuer from public.billing_issuers x where workspace_id=p_workspace_id;
    select to_jsonb(x)-array['workspace_id','customer_id','version','updated_at'] into customer from public.billing_customer_profiles x where workspace_id=p_workspace_id and customer_id=i.customer_id;
   end if;
   item:=item||jsonb_build_object('lines',lines,'notes',i.notes,'contract_id',i.contract_id,'service_id',i.service_id,'opportunity_id',i.opportunity_id,'issuer',issuer,'customer_fiscal',customer,'issued_at',i.issued_at,'paid_at',i.paid_at,'fx',case when i.fx_rate_micros is null then null else jsonb_build_object('rate_micros',i.fx_rate_micros,'on',i.fx_on,'source',i.fx_source) end);
  end if;
  return jsonb_build_object('contract_version','billing.v1','operation',p_op,'invoice',item);
 elsif p_op='configuration.get' then
  select jsonb_build_object('version',version,'profile',to_jsonb(x)-array['workspace_id','version','updated_at','currency','default_series'],'currency',currency,'default_series',default_series) into issuer from public.billing_issuers x where workspace_id=p_workspace_id;
  if p_input ? 'customer_id' then
   select jsonb_build_object('version',version,'profile',to_jsonb(x)-array['workspace_id','customer_id','version','updated_at']) into customer from public.billing_customer_profiles x where workspace_id=p_workspace_id and customer_id=(p_input->>'customer_id')::uuid;
  end if;
  return jsonb_build_object('contract_version','billing.v1','operation',p_op,'issuer',issuer,'customer',customer);
 elsif p_op='invoice.financial_summary' then
  period:=coalesce(p_input->>'period','month');
  period_from:=case period when 'month' then date_trunc('month',today)::date when 'quarter' then date_trunc('quarter',today)::date when 'semester' then make_date(extract(year from today)::integer,case when extract(month from today)<7 then 1 else 7 end,1) when 'year' then date_trunc('year',today)::date else null end;
  period_to:=case period when 'month' then (period_from+interval '1 month')::date when 'quarter' then (period_from+interval '3 months')::date when 'semester' then (period_from+interval '6 months')::date when 'year' then (period_from+interval '1 year')::date else null end;
  select coalesce(jsonb_agg(to_jsonb(x) order by currency),'[]'::jsonb) into rows from (
   select currency,count(*)::bigint as issued_count,coalesce(sum(total_minor),0)::bigint as issued_minor,
    count(*) filter(where status='paid')::bigint as paid_count,coalesce(sum(total_minor) filter(where status='paid'),0)::bigint as paid_minor,
    count(*) filter(where status='issued')::bigint as outstanding_count,coalesce(sum(total_minor) filter(where status='issued'),0)::bigint as outstanding_minor,
    count(*) filter(where status='issued' and due_on<today)::bigint as overdue_count,coalesce(sum(total_minor) filter(where status='issued' and due_on<today),0)::bigint as overdue_minor
   from public.billing_invoices where workspace_id=p_workspace_id and status in ('issued','paid') and (period_from is null or issue_on>=period_from and issue_on<period_to) group by currency) x;
  return jsonb_build_object('contract_version','billing.v1','operation',p_op,'period',period,'from',period_from,'to',period_to,'as_of',today,'currencies',rows);
 else
  if (p_input ? 'from')<>(p_input ? 'to') or (p_input->>'to')::date<=(p_input->>'from')::date or (p_input->>'to')::date-(p_input->>'from')::date>366 then raise exception using errcode='22023',message='billing_invalid_query';end if;
  lim:=coalesce((p_input->>'limit')::integer,20);
  select coalesce(jsonb_agg(x.item order by x.id),'[]'::jsonb) into rows from (
   select id,jsonb_build_object('id',id,'version',version,'status',status,'customer_id',customer_id,'issue_on',issue_on,'due_on',due_on,'series',series,'currency',currency,'number',case when number_sequence is null then null else jsonb_build_object('series',series,'year',number_year,'sequence',number_sequence) end,'totals',jsonb_build_object('subtotal_minor',subtotal_minor,'tax_minor',tax_minor,'withholding_minor',withholding_minor,'total_minor',total_minor),'overdue',status='issued' and coalesce(due_on<today,false)) as item
   from public.billing_invoices where workspace_id=p_workspace_id
    and (not p_input ? 'customer_id' or customer_id=(p_input->>'customer_id')::uuid)
    and (not p_input ? 'after_id' or id>(p_input->>'after_id')::uuid)
    and (not p_input ? 'series' or series=p_input->>'series')
    and (not p_input ? 'status' or status=p_input->>'status' or p_input->>'status'='overdue' and status='issued' and due_on<today)
    and (not p_input ? 'from' or issue_on>=(p_input->>'from')::date and issue_on<(p_input->>'to')::date)
   order by id limit lim) x;
  next_id:=case when jsonb_array_length(rows)=lim then (rows->(lim-1)->>'id')::uuid else null end;
  return jsonb_build_object('contract_version','billing.v1','operation',p_op,'items',rows,'next_id',next_id);
 end if;
end $$;
revoke all on function public.billing_v1_read(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.billing_v1_invoice_get(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_read(p_workspace_id,'invoice.get',p_input)$$;
revoke all on function public.billing_v1_invoice_get(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_get(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_list(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_read(p_workspace_id,'invoice.list',p_input)$$;
revoke all on function public.billing_v1_invoice_list(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_list(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_summary(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_read(p_workspace_id,'invoice.summary',p_input)$$;
revoke all on function public.billing_v1_invoice_summary(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_summary(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_financial_summary(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_read(p_workspace_id,'invoice.financial_summary',p_input)$$;
revoke all on function public.billing_v1_invoice_financial_summary(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_financial_summary(uuid,jsonb) to authenticated;
create function public.billing_v1_configuration_get(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_read(p_workspace_id,'configuration.get',p_input)$$;
revoke all on function public.billing_v1_configuration_get(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_configuration_get(uuid,jsonb) to authenticated;
commit;
