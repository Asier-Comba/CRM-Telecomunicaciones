begin;
create table public.document_integrity_verifiers(
 key_id uuid primary key,key_bytes bytea not null check(octet_length(key_bytes)=32),active boolean not null default true,expires_at timestamptz
);
create table public.document_content_integrity(
 document_id uuid not null,workspace_id uuid not null,object_ref uuid not null,sha256 text not null check(sha256~'^[0-9a-f]{64}$'),
 size_bytes bigint not null,media_type text not null,verified_at timestamptz not null,verified_version bigint not null,
 scan_status text not null check(scan_status='not_scanned'),primary key(document_id,workspace_id),
 foreign key(document_id,workspace_id)references public.documents(id,workspace_id)
);
create table public.document_cleanup_claims(
 document_id uuid not null,workspace_id uuid not null,actor_id uuid not null references auth.users(id),object_ref uuid not null,
 document_version bigint not null,expires_at timestamptz not null,primary key(document_id,workspace_id),
 foreign key(document_id,workspace_id)references public.documents(id,workspace_id)
);
alter table public.document_integrity_verifiers enable row level security;
alter table public.document_integrity_verifiers force row level security;
alter table public.document_content_integrity enable row level security;
alter table public.document_content_integrity force row level security;
alter table public.document_cleanup_claims enable row level security;
alter table public.document_cleanup_claims force row level security;
revoke all on public.document_integrity_verifiers,public.document_content_integrity,public.document_cleanup_claims from public,anon,authenticated,service_role;
create trigger document_integrity_append_only before update or delete on public.document_content_integrity for each row execute function public.reject_activity_mutation();
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''document.verify_content'',''document.cleanup_claim'',''document.cleanup_finish''))';
end$$;
create function public.document_integrity_v1_verify(p_workspace_id uuid,p_input jsonb,p_witness jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
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
 manifest:=public.document_content_v1_manifest(p_workspace_id,jsonb_build_object('id',p_input->'id','ticket_id',p_input->'ticket_id'));
 if p_witness->'object_ref' is distinct from manifest->'object_ref'or p_witness->'size_bytes'is distinct from manifest->'size_bytes'or p_witness->'media_type'is distinct from manifest->'media_type'then raise exception using errcode='42501',message='document_witness_scope_denied';end if;
 ts:=(p_witness->>'measured_at')::bigint;
 if ts<floor(extract(epoch from statement_timestamp())*1000)::bigint-60000 or ts>floor(extract(epoch from statement_timestamp())*1000)::bigint+5000 then raise exception using errcode='42501',message='document_witness_expired';end if;
 select key_bytes into key from public.document_integrity_verifiers where key_id=(p_witness->>'key_id')::uuid and active and(expires_at is null or expires_at>statement_timestamp())for share;
 if key is null then raise exception using errcode='42501',message='document_verifier_unavailable';end if;
 -- Parentheses prevent JSON extraction/operator-precedence ambiguity.
 payload:='document.integrity.v1|'||p_workspace_id::text||'|'||actor::text||'|'||(p_input->>'command_id')||'|'||(p_input->>'id')||'|'||(p_input->>'expected_version')||'|'||(p_input->>'ticket_id')||'|'||(p_witness->>'object_ref')||'|'||(p_witness->>'size_bytes')||'|'||(p_witness->>'media_type')||'|'||(p_witness->>'sha256')||'|'||(p_witness->>'measured_at')||'|not_scanned';
 if encode(extensions.hmac(convert_to(payload,'UTF8'),key,'sha256'),'hex')<>p_witness->>'mac'then raise exception using errcode='42501',message='document_witness_denied';end if;
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found or d.status<>'active'then raise exception using errcode='P0002',message='document_not_found';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,actor,'document.verify_content',p_input);if prior is not null then return prior;end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
 select sha256 into existing from public.document_content_integrity where document_id=d.id and workspace_id=p_workspace_id;
 if existing is not null and existing<>p_witness->>'sha256'then raise exception using errcode='40001',message='document_integrity_conflict';end if;
 update public.documents set status='active'where id=d.id returning *into d;
 insert into public.document_content_integrity(document_id,workspace_id,object_ref,sha256,size_bytes,media_type,verified_at,verified_version,scan_status)
 values(d.id,p_workspace_id,(p_witness->>'object_ref')::uuid,p_witness->>'sha256',d.size_bytes,d.media_type,to_timestamp(ts/1000.0),d.version,'not_scanned')on conflict(document_id,workspace_id)do nothing;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,'document.verify_content',p_input,d.id,d.version,d.status,d.customer_id);
 prior:=jsonb_set(prior,'{contract_version}','"document.integrity.v1"'::jsonb)||jsonb_build_object('integrity','verified_sha256','scan_status','not_scanned');
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.document_integrity_v1_verify(uuid,jsonb,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_integrity_v1_verify(uuid,jsonb,jsonb)to authenticated;

create function public.document_cleanup_v1_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
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
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,d.id,d.version,d.status,d.customer_id);
 prior:=jsonb_set(prior,'{contract_version}','"document.cleanup.v1"'::jsonb);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.document_cleanup_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
create function public.document_cleanup_v1_claim(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_cleanup_v1_command(p_workspace_id,'document.cleanup_claim',p_input)$$;
revoke all on function public.document_cleanup_v1_claim(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_cleanup_v1_claim(uuid,jsonb)to authenticated;
create function public.document_cleanup_v1_finish(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_cleanup_v1_command(p_workspace_id,'document.cleanup_finish',p_input)$$;
revoke all on function public.document_cleanup_v1_finish(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_cleanup_v1_finish(uuid,jsonb)to authenticated;
create function public.document_cleanup_v1_deletable(p_path text)returns boolean language plpgsql security definer set search_path=''as $$
declare w uuid;begin
 select d.workspace_id into w from public.documents d join public.document_upload_intents i on i.document_id=d.id and i.workspace_id=d.workspace_id join public.document_cleanup_claims c on c.document_id=d.id and c.workspace_id=d.workspace_id
 where d.storage_path=p_path and d.storage_bucket='telecom-documents'and d.status='pending'and i.expires_at<=statement_timestamp()-interval '24 hours'and c.actor_id=auth.uid()and c.expires_at>statement_timestamp()and c.object_ref=i.object_ref and c.document_version=d.version for share of d,i,c;
 if w is null then return false;end if;perform public.document_v1_assert_scope(w);return true;
end$$;
revoke all on function public.document_cleanup_v1_deletable(text)from public,anon,authenticated,service_role;
grant execute on function public.document_cleanup_v1_deletable(text)to authenticated;
create policy document_cleanup_exact_delete on storage.objects for delete to authenticated using(bucket_id='telecom-documents'and public.document_cleanup_v1_deletable(name));
create policy document_cleanup_exact_select on storage.objects for select to authenticated using(bucket_id='telecom-documents'and public.document_cleanup_v1_deletable(name));
create function public.document_cleanup_v1_prepare_finish(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;key bytea;mac bytea;prior public.product_commands%rowtype;d public.documents%rowtype;c public.document_cleanup_claims%rowtype;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);perform public.document_content_v1_validate('document.finalize_upload',p_input);
 select key_bytes into key from public.product_command_key where singleton;
 mac:=extensions.hmac(convert_to('document.cleanup_finish:'||p_input::text,'UTF8'),key,'sha256');
 select *into prior from public.product_commands where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 if found then
  if prior.operation<>'document.cleanup_finish'or prior.input_mac<>mac then raise exception using errcode='40001',message='document_conflict';end if;
  if prior.receipt is null then raise exception using errcode='55000',message='document_incomplete';end if;
  return jsonb_build_object('receipt',prior.receipt,'object_ref',null,'version',prior.receipt->'version');
 end if;
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for share;
 if not found then raise exception using errcode='P0002',message='document_not_found';end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
 if not public.document_cleanup_v1_deletable(d.storage_path)then raise exception using errcode='42501',message='document_cleanup_claim_denied';end if;
 select *into c from public.document_cleanup_claims where document_id=d.id and workspace_id=p_workspace_id;
 return jsonb_build_object('receipt',null,'object_ref',c.object_ref,'version',d.version);
end$$;
revoke all on function public.document_cleanup_v1_prepare_finish(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_cleanup_v1_prepare_finish(uuid,jsonb)to authenticated;
create function public.document_cleanup_v1_expired_list(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare lim integer;rows jsonb;next_id uuid;begin
 perform public.document_v1_assert_scope(p_workspace_id);perform public.team_v1_member_list(p_workspace_id,p_input);lim:=coalesce((p_input->>'limit')::integer,20);
 select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(
 select d.id,d.version from public.documents d join public.document_upload_intents i on i.document_id=d.id and i.workspace_id=d.workspace_id
 where d.workspace_id=p_workspace_id and d.status='pending'and i.expires_at<=statement_timestamp()-interval '24 hours'and(not p_input?'after_id'or d.id>(p_input->>'after_id')::uuid)order by d.id limit lim)x;
 next_id:=case when jsonb_array_length(rows)=lim then(rows->(lim-1)->>'id')::uuid else null end;
 return jsonb_build_object('contract_version','document.cleanup.v1','operation','document.expired_list','items',rows,'next_id',next_id);
end$$;
revoke all on function public.document_cleanup_v1_expired_list(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_cleanup_v1_expired_list(uuid,jsonb)to authenticated;
create or replace function public.document_content_v1_manifest(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;d public.documents%rowtype;expiry timestamptz;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);
 perform public.document_content_v1_validate(case when p_input?'ticket_id'then 'download_manifest'else 'upload_manifest'end,p_input);
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for share;
 if not found then raise exception using errcode='P0002',message='document_not_found';end if;
 if p_input?'ticket_id'then
  select expires_at into expiry from public.document_download_tickets where id=(p_input->>'ticket_id')::uuid and workspace_id=p_workspace_id and document_id=d.id and actor_id=actor and expires_at>statement_timestamp()for share;
  if expiry is null or d.status<>'active'then raise exception using errcode='42501',message='document_download_denied';end if;
 else
  select expires_at into expiry from public.document_upload_intents where document_id=d.id and workspace_id=p_workspace_id and actor_id=actor and expires_at>statement_timestamp()for share;
  if expiry is null or d.status<>'pending'then raise exception using errcode='42501',message='document_upload_denied';end if;
 end if;
 return jsonb_build_object('id',d.id,'object_ref',split_part(d.storage_path,'/',4)::uuid,'media_type',d.media_type,'size_bytes',d.size_bytes,'expires_at',expiry,'sha256',(select sha256 from public.document_content_integrity where workspace_id=p_workspace_id and document_id=d.id and object_ref=split_part(d.storage_path,'/',4)::uuid and size_bytes=d.size_bytes and media_type=d.media_type));
end$$;
revoke all on function public.document_content_v1_manifest(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_content_v1_manifest(uuid,jsonb)to authenticated;

commit;
