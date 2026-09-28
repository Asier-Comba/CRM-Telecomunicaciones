-- Private document bucket. Direct client uploads, replacements and deletes
-- remain denied; a future server adapter must check and audit every write.
begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('telecom-documents','telecom-documents',false,10485760,
  array['application/pdf','image/png','image/jpeg']::text[])
on conflict (id) do nothing;

-- Quarantine has no client read/write policies and no extraction adapter yet.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('telecom-import-quarantine','telecom-import-quarantine',false,10485760,
  array['application/zip']::text[])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.buckets bucket
    where bucket.id='telecom-documents' and bucket.public=false
      and bucket.file_size_limit <= 10485760
      and bucket.allowed_mime_types <@ array['application/pdf','image/png','image/jpeg']::text[]
  ) then
    raise exception using errcode='42501',message='document bucket settings are unsafe';
  end if;
  if not exists (
    select 1 from storage.buckets bucket
    where bucket.id='telecom-import-quarantine' and bucket.public=false
      and bucket.file_size_limit <= 10485760
      and bucket.allowed_mime_types <@ array['application/zip']::text[]
  ) then
    raise exception using errcode='42501',message='quarantine bucket settings are unsafe';
  end if;
end;
$$;

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
revoke all on function public.telecom_v1_can_read_document_object(text)
  from public,anon,authenticated,service_role;
grant execute on function public.telecom_v1_can_read_document_object(text) to authenticated;

create policy telecom_v1_document_object_read
  on storage.objects for select to authenticated
  using (bucket_id='telecom-documents'
    and public.telecom_v1_can_read_document_object(name));

commit;
