-- Preserve one document target; resolve same-workspace customer ancestry for coded activity.
-- Exclusive document lock precedes manifest shared locks to serialize independent verifiers.
begin;
create function public.document_v1_customer_ancestor(p_workspace_id uuid,p_doc public.documents)returns uuid language sql stable security definer set search_path=''as $$
 select coalesce((p_doc).customer_id,
 (select customer_id from public.telecom_contracts where workspace_id=p_workspace_id and id=(p_doc).contract_id),
 (select customer_id from public.telecom_services where workspace_id=p_workspace_id and id=(p_doc).service_id),
 (select s.customer_id from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id=p_workspace_id and l.id=(p_doc).line_id),
 (select customer_id from public.service_cases where workspace_id=p_workspace_id and id=(p_doc).service_case_id),
 (select customer_id from public.opportunities where workspace_id=p_workspace_id and id=(p_doc).opportunity_id))
 where(p_doc).workspace_id=p_workspace_id
$$;
revoke all on function public.document_v1_customer_ancestor(uuid,public.documents)from public,anon,authenticated,service_role;

create or replace function public.document_content_v1_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;prior jsonb;d public.documents%rowtype;ref uuid;expiry timestamptz;t uuid;md jsonb;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);perform public.document_content_v1_validate(p_op,p_input);
 -- Reauthorize before replay. Ticket consumption separately checks live status/expiry.
 prior:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if prior is not null then return prior;end if;
 if p_op='document.request_upload'then
  -- Closed relation registry; no caller SQL/name can enter the query.
  execute format('select id from public.%I where workspace_id=$1 and id=$2 for share',case p_input->>'target_kind'when 'customer'then 'customers'when 'contract'then 'telecom_contracts'when 'service'then 'telecom_services'when 'line'then 'telecom_lines'when 'service_case'then 'service_cases'else 'opportunities'end)into t using p_workspace_id,(p_input->>'target_id')::uuid;
  if t is null then raise exception using errcode='P0002',message='document_target_not_found';end if;
  ref:=gen_random_uuid();d.id:=gen_random_uuid();expiry:=statement_timestamp()+interval '10 minutes';
  insert into public.documents(id,workspace_id,created_by_user_id,customer_id,contract_id,service_id,line_id,service_case_id,opportunity_id,document_kind,file_name,media_type,size_bytes,storage_path,status)
  values(d.id,p_workspace_id,actor,case when p_input->>'target_kind'='customer'then t end,case when p_input->>'target_kind'='contract'then t end,case when p_input->>'target_kind'='service'then t end,case when p_input->>'target_kind'='line'then t end,case when p_input->>'target_kind'='service_case'then t end,case when p_input->>'target_kind'='opportunity'then t end,p_input->>'document_kind',p_input->>'file_name',p_input->>'media_type',(p_input->>'size_bytes')::bigint,p_workspace_id::text||'/documents/'||d.id::text||'/'||ref::text,'pending')returning *into d;
  insert into public.document_upload_intents(document_id,workspace_id,actor_id,object_ref,expires_at)values(d.id,p_workspace_id,actor,ref,expiry);
 else
  select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='document_not_found';end if;
  if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
  if p_op='document.finalize_upload'then
   if d.status<>'pending'or not public.document_content_v1_pending_object(d.storage_path)then raise exception using errcode='42501',message='document_upload_denied';end if;
   select metadata into md from storage.objects where bucket_id=d.storage_bucket and name=d.storage_path for share;
   if md is null or (md->>'size'~'^[0-9]+$')is distinct from true or(md->>'size')::bigint<>d.size_bytes or md->>'mimetype' is distinct from d.media_type then raise exception using errcode='22023',message='document_object_mismatch';end if;
   -- Metadata proves Storage existence/size/type, not antivirus or cryptographic content verification.
   update public.documents set status='active'where id=d.id returning *into d;
  elsif p_op='document.request_download'then
   if d.status<>'active'then raise exception using errcode='42501',message='document_download_denied';end if;
   expiry:=statement_timestamp()+interval '30 seconds';insert into public.document_download_tickets(document_id,workspace_id,actor_id,expires_at)values(d.id,p_workspace_id,actor,expiry)returning id into t;
  else raise exception using errcode='22023',message='document_invalid_input';end if;
 end if;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,d.id,d.version,d.status,public.document_v1_customer_ancestor(p_workspace_id,d));
 prior:=jsonb_set(prior,'{contract_version}','"document.content.v1"'::jsonb);
 if expiry is not null then prior:=prior||jsonb_build_object('expires_at',expiry);end if;
 if p_op='document.request_download'then prior:=prior||jsonb_build_object('ticket_id',t);end if;
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.document_content_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;

create or replace function public.document_integrity_v1_verify(p_workspace_id uuid,p_input jsonb,p_witness jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;d public.documents%rowtype;manifest jsonb;key bytea;payload text;prior jsonb;ts bigint;existing text;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);
 perform public.document_content_v1_validate('download_manifest',jsonb_build_object('id',p_input->'id','ticket_id',p_input->'ticket_id'));
 perform public.document_content_v1_validate('document.finalize_upload',p_input-'ticket_id');
 if p_witness is null or jsonb_typeof(p_witness)<>'object'or octet_length(p_witness::text)>4096 or(select array_agg(k order by k)from jsonb_object_keys(p_witness)k)is distinct from array['key_id','mac','measured_at','media_type','object_ref','scan_status','sha256','size_bytes']::text[]
 or jsonb_typeof(p_witness->'key_id')<>'string'or p_witness->>'key_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 or jsonb_typeof(p_witness->'object_ref')<>'string'or p_witness->>'object_ref'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 or jsonb_typeof(p_witness->'sha256')<>'string'or p_witness->>'sha256'!~'^[0-9a-f]{64}$'
 or jsonb_typeof(p_witness->'mac')<>'string'or p_witness->>'mac'!~'^[0-9a-f]{64}$'
 or jsonb_typeof(p_witness->'measured_at')<>'number'or p_witness->>'measured_at'!~'^[1-9][0-9]{12}$'
 or p_witness->>'scan_status' is distinct from 'not_scanned'then raise exception using errcode='22023',message='document_invalid_witness';end if;
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found or d.status<>'active'then raise exception using errcode='P0002',message='document_not_found';end if;
 manifest:=public.document_content_v1_manifest(p_workspace_id,jsonb_build_object('id',p_input->'id','ticket_id',p_input->'ticket_id'));
 if p_witness->'object_ref' is distinct from manifest->'object_ref'or p_witness->'size_bytes'is distinct from manifest->'size_bytes'or p_witness->'media_type'is distinct from manifest->'media_type'then raise exception using errcode='42501',message='document_witness_scope_denied';end if;
 ts:=(p_witness->>'measured_at')::bigint;
 if ts<floor(extract(epoch from statement_timestamp())*1000)::bigint-60000 or ts>floor(extract(epoch from statement_timestamp())*1000)::bigint+5000 then raise exception using errcode='42501',message='document_witness_expired';end if;
 select key_bytes into key from public.document_integrity_verifiers where key_id=(p_witness->>'key_id')::uuid and active and(expires_at is null or expires_at>statement_timestamp())for share;
 if key is null then raise exception using errcode='42501',message='document_verifier_unavailable';end if;
 -- Parentheses prevent JSON extraction/operator-precedence ambiguity.
 payload:='document.integrity.v1|'||p_workspace_id::text||'|'||actor::text||'|'||(p_input->>'command_id')||'|'||(p_input->>'id')||'|'||(p_input->>'expected_version')||'|'||(p_input->>'ticket_id')||'|'||(p_witness->>'object_ref')||'|'||(p_witness->>'size_bytes')||'|'||(p_witness->>'media_type')||'|'||(p_witness->>'sha256')||'|'||(p_witness->>'measured_at')||'|not_scanned';
 if encode(extensions.hmac(convert_to(payload,'UTF8'),key,'sha256'),'hex')<>p_witness->>'mac'then raise exception using errcode='42501',message='document_witness_denied';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,actor,'document.verify_content',p_input);if prior is not null then return prior;end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
 select sha256 into existing from public.document_content_integrity where document_id=d.id and workspace_id=p_workspace_id;
 if existing is not null and existing<>p_witness->>'sha256'then raise exception using errcode='40001',message='document_integrity_conflict';end if;
 update public.documents set status='active'where id=d.id returning *into d;
 insert into public.document_content_integrity(document_id,workspace_id,object_ref,sha256,size_bytes,media_type,verified_at,verified_version,scan_status)
 values(d.id,p_workspace_id,(p_witness->>'object_ref')::uuid,p_witness->>'sha256',d.size_bytes,d.media_type,to_timestamp(ts/1000.0),d.version,'not_scanned')on conflict(document_id,workspace_id)do nothing;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,'document.verify_content',p_input,d.id,d.version,d.status,public.document_v1_customer_ancestor(p_workspace_id,d));
 prior:=jsonb_set(prior,'{contract_version}','"document.integrity.v1"'::jsonb)||jsonb_build_object('integrity','verified_sha256','scan_status','not_scanned');
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.document_integrity_v1_verify(uuid,jsonb,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_integrity_v1_verify(uuid,jsonb,jsonb)to authenticated;


create or replace function public.document_cleanup_v1_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;d public.documents%rowtype;c public.document_cleanup_claims%rowtype;i public.document_upload_intents%rowtype;prior jsonb;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);perform public.document_content_v1_validate('document.finalize_upload',p_input);
 if p_op not in ('document.cleanup_claim','document.cleanup_finish')then raise exception using errcode='22023',message='document_invalid_input';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if prior is not null then return prior;end if;
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='document_not_found';end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
 select *into i from public.document_upload_intents where document_id=d.id and workspace_id=p_workspace_id for update;
 if d.status<>'pending'or i.document_id is null or i.expires_at>statement_timestamp()-interval '24 hours' or d.storage_bucket<>'telecom-documents'or d.storage_path<>p_workspace_id::text||'/documents/'||d.id::text||'/'||i.object_ref::text then raise exception using errcode='42501',message='document_cleanup_ineligible';end if;
 select *into c from public.document_cleanup_claims where document_id=d.id and workspace_id=p_workspace_id for update;
 if p_op='document.cleanup_claim'then
  if c.document_id is not null and c.expires_at>statement_timestamp()then raise exception using errcode='40001',message='document_cleanup_claimed';end if;
  update public.documents set status='pending'where id=d.id returning *into d;
  insert into public.document_cleanup_claims(document_id,workspace_id,actor_id,object_ref,document_version,expires_at)
  values(d.id,p_workspace_id,actor,i.object_ref,d.version,statement_timestamp()+interval '10 minutes')on conflict(document_id,workspace_id)do update set actor_id=excluded.actor_id,object_ref=excluded.object_ref,document_version=excluded.document_version,expires_at=excluded.expires_at;
 else
  if c.document_id is null or c.actor_id<>actor or c.expires_at<=statement_timestamp()or c.document_version<>d.version then raise exception using errcode='42501',message='document_cleanup_claim_denied';end if;
  if exists(select 1 from storage.objects where bucket_id=d.storage_bucket and name=d.storage_path)then raise exception using errcode='22023',message='document_cleanup_object_present';end if;
  update public.documents set status='archived',archived_at=statement_timestamp(),archived_by_user_id=actor where id=d.id returning *into d;
 end if;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,d.id,d.version,d.status,public.document_v1_customer_ancestor(p_workspace_id,d));
 prior:=jsonb_set(prior,'{contract_version}','"document.cleanup.v1"'::jsonb);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.document_cleanup_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;

commit;
