-- Explicit normal commercial identity capability; no fiscal/team grants.
begin;
create or replace function public.product_v1_assert_scope(p_workspace_id uuid, p_write boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); member_role text;
begin
 if actor is null or p_workspace_id is null then
  raise exception using errcode='42501', message='product_access_denied';
 end if;
 -- Hold authorization rows until commit, including idempotent replays.
 select wm.role into member_role from public.workspace_members wm
 join public.workspaces w on w.id=wm.workspace_id
 where wm.workspace_id=p_workspace_id and wm.user_id=actor
 and wm.status='active' and w.status='active'
 for share of wm,w;
 if not found or (p_write and member_role not in ('owner','admin','member')) then
  raise exception using errcode='42501', message='product_access_denied';
 end if;
 return actor;
end;
$$;
revoke all on function public.product_v1_assert_scope(uuid,boolean) from public,anon,authenticated,service_role;

commit;
