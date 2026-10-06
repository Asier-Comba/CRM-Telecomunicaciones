-- Extend safe search with canonical invoice labels; fiscal payloads never enter corpus.
begin;
create or replace function public.product_v1_global_search(p_workspace_id uuid,p_input jsonb)
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
  union all select 'invoice',i.id,i.customer_id,
   'Factura '||case when i.number_sequence is null then 'borrador '||i.series||' '||i.issue_on::text
    else i.series||'/'||i.number_year::text||'/'||lpad(i.number_sequence::text,greatest(6,length(i.number_sequence::text)),'0')end,i.status
   from public.billing_invoices i where i.workspace_id=p_workspace_id and i.status<>'trashed'
   and exists(select 1 from public.workspace_members m where m.workspace_id=p_workspace_id and m.user_id=actor and m.status='active'and m.role in ('owner','admin'))

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

commit;
