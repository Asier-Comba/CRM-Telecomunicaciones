-- Serialize preparation with the winning metadata archive before inspecting its durable receipt.
begin;
create or replace function public.document_cleanup_v1_prepare_finish(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;key bytea;mac bytea;prior public.product_commands%rowtype;d public.documents%rowtype;c public.document_cleanup_claims%rowtype;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);perform public.document_content_v1_validate('document.finalize_upload',p_input);
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for share;
 if not found then raise exception using errcode='P0002',message='document_not_found';end if;
 select key_bytes into key from public.product_command_key where singleton;
 mac:=extensions.hmac(convert_to('document.cleanup_finish:'||p_input::text,'UTF8'),key,'sha256');
 select *into prior from public.product_commands where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 if found then
  if prior.operation<>'document.cleanup_finish'or prior.input_mac<>mac then raise exception using errcode='40001',message='document_conflict';end if;
  if prior.receipt is null then raise exception using errcode='55000',message='document_incomplete';end if;
  return jsonb_build_object('receipt',prior.receipt,'object_ref',null,'version',prior.receipt->'version');
 end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
 if not public.document_cleanup_v1_deletable(d.storage_path)then raise exception using errcode='42501',message='document_cleanup_claim_denied';end if;
 select *into c from public.document_cleanup_claims where document_id=d.id and workspace_id=p_workspace_id;
 return jsonb_build_object('receipt',null,'object_ref',c.object_ref,'version',d.version);
end$$;
revoke all on function public.document_cleanup_v1_prepare_finish(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_cleanup_v1_prepare_finish(uuid,jsonb)to authenticated;

commit;
