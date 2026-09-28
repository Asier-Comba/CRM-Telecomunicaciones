-- Tighten document downloads to administrators until a per-document capability
-- service and audit path exists. Existing migration history remains immutable.
begin;
create or replace function public.telecom_v1_can_read_document_object(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.documents document
    join public.workspaces workspace on workspace.id=document.workspace_id
    join public.workspace_members member on member.workspace_id=document.workspace_id
    where document.storage_bucket='telecom-documents'
      and document.storage_path=p_path
      and document.status='active'
      and workspace.status='active'
      and member.user_id=auth.uid()
      and member.status='active'
      and member.role in ('owner','admin')
  )
$$;
commit;
