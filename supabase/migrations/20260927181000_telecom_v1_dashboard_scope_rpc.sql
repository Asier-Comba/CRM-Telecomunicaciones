-- Dashboard scopes must be accepted in the database before broad reads.
begin;
create or replace function public.telecom_v1_dashboard_authorize(
  p_actor_id uuid,p_workspace_id uuid,p_audience text
) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  perform public.telecom_v1_assert_reader_scope(p_actor_id,p_workspace_id);
  if p_audience not in ('personal','workspace') or p_audience is null then
    raise exception using errcode='22023',message='unsupported dashboard audience';
  end if;
  if p_audience='workspace' and not exists (
    select 1 from public.workspace_members member
    where member.user_id=p_actor_id and member.workspace_id=p_workspace_id
      and member.status='active' and member.role in ('owner','admin')
  ) then
    raise exception using errcode='42501',message='dashboard audience not authorized';
  end if;
  return true;
end;
$$;
revoke all on function public.telecom_v1_dashboard_authorize(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.telecom_v1_dashboard_authorize(uuid,uuid,text) to service_role;
commit;
