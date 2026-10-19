-- P0 storage revocation (issue 67, 2026-10-19 hosted acceptance): a member
-- suspended or demoted after a successful read kept receiving the private
-- bytes with the same still-valid JWT and URL (cf-cache-status HIT) while the
-- row-level helper already returned false. Edge responses are not
-- re-authorized against current membership, so no user JWT may read document
-- bytes directly. The application proxy reauthorizes every request through
-- document_content_v1_manifest and fetches bytes server-side.
-- Upload (insert) and expired-object cleanup policies are unchanged.
begin;
drop policy if exists telecom_v1_document_object_read on storage.objects;
drop policy if exists document_content_v1_pending_read on storage.objects;
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and cmd='SELECT'
      and policyname in ('telecom_v1_document_object_read','document_content_v1_pending_read')
  ) then
    raise exception using errcode='42501',message='document direct read policy still present';
  end if;
end;
$$;
commit;
