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
 data:=public.product_v1_global_search(w,'{"query":"Synthetic","limit":50}');
 if jsonb_array_length(data->'items')<>30 then raise exception 'density search kind caps mismatch'; end if;
 if data::text ~ '(example.invalid|tax_identifier|phone|email)' then raise exception 'density search sensitive field leak'; end if;
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
reset role;
-- Transaction-level EXPLAIN prints aggregate timing/plan only, no PII or tokens.
explain (analyze,buffers,format json)
 select id from public.tasks where workspace_id=md5('density.workspace.1')::uuid
 and status in ('pending','in_progress') and due_at>='2026-10-01' and due_at<'2026-11-01'
 order by due_at,id limit 20;
explain (analyze,buffers,format json)
 select l.id from public.telecom_lines l join public.telecom_services s
 on s.workspace_id=l.workspace_id and s.id=l.service_id
 where l.workspace_id=md5('density.workspace.1')::uuid order by l.id limit 50;
rollback;
