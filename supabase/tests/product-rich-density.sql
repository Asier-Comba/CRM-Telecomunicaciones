-- Appended after synthetic_product.sql with its final COMMIT removed.
-- Reads exercise the same closed authenticated RPCs as product transport.
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$
declare w uuid:=md5('density.workspace.1')::uuid; data jsonb; page jsonb;
 cursor jsonb:='{}'; seen text[]:=array[]::text[]; token text; count_items int:=0;
begin
 data:=public.product_v1_dashboard_v2(w,'{"audience":"workspace","period":"month","anchor_date":"2026-10-04"}');
 if data->'snapshot_counts' <> '{"customers":24,"contracts":48,"services":48,"lines":384,"opportunities":96,"tasks":144,"meetings":72,"renewals":48,"permanences":48}'::jsonb then
  raise exception 'density dashboard exact counts mismatch: %',data->'snapshot_counts';
 end if;
 data:=public.product_v1_dashboard_v2(w,'{"audience":"my","period":"all"}');
 if (data->'snapshot_counts'->>'customers')::int<>8 or (data->'snapshot_counts'->>'lines')::int<>128 then
  raise exception 'density assignment scope mismatch';
 end if;
 if jsonb_array_length(data->'recent_activity')<>8 then raise exception 'density actor activity mismatch'; end if;
 data:=public.billing_v1_invoice_financial_summary(w,'{"period":"all"}');
 if data->'currencies' <> '[{"currency":"EUR","issued_count":72,"issued_minor":10944,"paid_count":24,"paid_minor":3648,"outstanding_count":48,"outstanding_minor":7296,"overdue_count":24,"overdue_minor":3648}]'::jsonb then
  raise exception 'density exact persisted financial totals mismatch: %',data->'currencies';
 end if;
 data:=public.billing_v1_invoice_list(w,'{"limit":100,"status":"draft"}');
 if jsonb_array_length(data->'items')<>24 then raise exception 'density draft invoices missing'; end if;
 data:=public.product_v1_global_search(w,'{"query":"Synthetic","limit":50}');
 if jsonb_array_length(data->'items')<>30 then raise exception 'density search kind caps mismatch'; end if;
 if data::text ~ '(example.invalid|tax_identifier|phone|email)' then raise exception 'density search sensitive field leak'; end if;
 data:=public.product_v1_global_search(w,'{"query":"SYNTHETIC-NOT-VALID","limit":50}');
 if jsonb_array_length(data->'items')<>0 then raise exception 'density fiscal data entered global search'; end if;
 data:=public.product_v1_global_search(w,'{"query":"Factura","limit":50}');
 if jsonb_array_length(data->'items')<>5 or exists(select 1 from jsonb_array_elements(data->'items')i where i->>'kind'<>'invoice' or i->>'customer_id'=md5('density.customer.2.1')::uuid::text)then raise exception 'density protected invoice search failed';end if;
 if data::text~'(SYNTHETIC-NOT-VALID|tax_id|issuer_snapshot|total_minor)'then raise exception 'invoice search exposed fiscal facts';end if;
 -- 144 tasks + 72 meetings + 48 renewal + 48 permanence = 312 unique items.
 -- Includes many equal instants across entity kinds to exercise compound keys.
 for iteration in 1..50 loop
  page:=public.product_v1_calendar(w,'{"range_start":"2026-09-01T00:00:00Z","range_end":"2026-12-01T00:00:00Z","limit":7}'::jsonb||cursor);
  if jsonb_array_length(page->'items')>7 then raise exception 'density calendar limit failed'; end if;
  for token in select value->>'kind'||':'||(value->>'id') from jsonb_array_elements(page->'items') loop
   if token=any(seen) then raise exception 'density calendar duplicate cursor row'; end if;
   seen:=array_append(seen,token);count_items:=count_items+1;
  end loop;
  exit when page->'next'='null'::jsonb;
  cursor:=page->'next';
 end loop;
 if count_items<>312 or page->'next'<>'null'::jsonb then raise exception 'density calendar incomplete pagination: %',count_items; end if;
 begin
  perform public.product_v1_global_search(md5('density.workspace.2')::uuid,'{"query":"Synthetic"}');
  raise exception 'density cross-tenant search allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',md5('density.actor.1.3')::uuid::text,true);
do $$begin if exists(select 1 from jsonb_array_elements(public.product_v1_global_search(md5('density.workspace.1')::uuid,'{"query":"Factura","limit":50}')->'items')x where x->>'kind'='invoice')then raise exception 'commercial invoice search leak';end if;end$$;
reset role;
do $$ begin
 if (select count(*) from public.billing_invoices where workspace_id=md5('density.workspace.1')::uuid)<>96 then raise exception 'density invoice cardinality mismatch'; end if;
 if (select count(distinct number_sequence) from public.billing_invoices where workspace_id=md5('density.workspace.1')::uuid)<>72 then raise exception 'density issued numbering collision'; end if;
end $$;
-- Transaction-level EXPLAIN prints aggregate timing/plan only, no PII or tokens.
explain (analyze,buffers,format json)
 select id from public.tasks where workspace_id=md5('density.workspace.1')::uuid
 and status in ('pending','in_progress') and due_at>='2026-10-01' and due_at<'2026-11-01'
 order by due_at,id limit 20;
explain (analyze,buffers,format json)
 select l.id from public.telecom_lines l join public.telecom_services s
 on s.workspace_id=l.workspace_id and s.id=l.service_id
 where l.workspace_id=md5('density.workspace.1')::uuid order by l.id limit 50;
explain (analyze,buffers,format json)
 select currency,count(*),sum(total_minor) from public.billing_invoices
 where workspace_id=md5('density.workspace.1')::uuid and status in ('issued','paid')
 group by currency;
rollback;
