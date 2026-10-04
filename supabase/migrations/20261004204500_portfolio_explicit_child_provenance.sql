-- Preserve explicit child provenance. An omitted/manual source still inherits its parent.
-- Existing overwritten provenance cannot be inferred and is deliberately not rewritten.
begin;
create or replace function public.portfolio_v1_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if tg_table_name='telecom_services' and new.source='manual' then select source into new.source from public.telecom_contracts where id=new.contract_id and workspace_id=new.workspace_id;
  elsif tg_table_name='telecom_lines' and new.source='manual' then select source into new.source from public.telecom_services where id=new.service_id and workspace_id=new.workspace_id;end if;
 elsif (to_jsonb(new)-array['version','updated_at','assigned_user_id','display_name','status','signed_date','cancelled_at','cancelled_by_user_id','activated_on','ended_on','status_effective_on']) is distinct from (to_jsonb(old)-array['version','updated_at','assigned_user_id','display_name','status','signed_date','cancelled_at','cancelled_by_user_id','activated_on','ended_on','status_effective_on']) then
  raise exception using errcode='55000',message='portfolio_identity_immutable';
 end if;
 return new;
end$$;
revoke all on function public.portfolio_v1_identity()from public,anon,authenticated,service_role;
commit;
