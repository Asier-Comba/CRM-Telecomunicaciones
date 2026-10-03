begin;
-- Editing projections are separate from generic telecom.v1 list DTOs.
-- Explicit PII boundary: active owner/admin user-JWT only; raw contacts closed.
create function public.product_v1_customer_editor(p_workspace_id uuid,p_customer_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 perform public.product_v1_assert_scope(p_workspace_id);
 if p_customer_id is null then raise exception using errcode='22023',message='product_invalid_input'; end if;
 select jsonb_build_object('contract_version','product.v1','id',id,'version',version,
  'account_kind',account_kind,'legal_name',legal_name,'trade_name',trade_name,
  'lifecycle',lifecycle,'status',status,'source',source,'assigned_user_id',assigned_user_id)
 into result from public.customers where id=p_customer_id and workspace_id=p_workspace_id;
 return result;
end;
$$;
revoke all on function public.product_v1_customer_editor(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_customer_editor(uuid,uuid) to authenticated;

create function public.product_v1_contact_editors(p_workspace_id uuid,p_customer_id uuid,
 p_limit integer default 20,p_after_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 perform public.product_v1_assert_scope(p_workspace_id);
 if p_customer_id is null or p_limit is null or p_limit not between 1 and 100 then
  raise exception using errcode='22023',message='product_invalid_input';
 end if;
 if not exists(select 1 from public.customers where id=p_customer_id and workspace_id=p_workspace_id) then
  return null;
 end if;
 with page as materialized (
  select id,version,display_name,job_title,email,phone,is_primary,status from public.contacts
  where workspace_id=p_workspace_id and customer_id=p_customer_id
  and (p_after_id is null or id>p_after_id) order by id limit p_limit+1
 ), visible as (select id,version,display_name,job_title,email,phone,is_primary,status from page order by id limit p_limit)
 select jsonb_build_object('contract_version','product.v1','customer_id',p_customer_id,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'version',version,'display_name',display_name,
  'job_title',job_title,'email',email,'phone',phone,'is_primary',is_primary,'status',status) order by id) from visible),'[]'::jsonb),
 'next_id',case when (select count(*) from page)>p_limit then (select id from visible order by id desc limit 1) else null end)
 into result;
 return result;
end;
$$;
revoke all on function public.product_v1_contact_editors(uuid,uuid,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.product_v1_contact_editors(uuid,uuid,integer,uuid) to authenticated;
commit;
