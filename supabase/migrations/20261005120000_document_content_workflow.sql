-- Human document content: scoped pending object insert and revocable proxy tickets.
-- No service-role product identity, caller path, upsert, delete or quarantine grant.
begin;
alter table public.documents drop constraint documents_status_check;
alter table public.documents add constraint documents_status_check check(status in ('pending','active','archived'));
create table public.document_upload_intents (
 document_id uuid primary key, workspace_id uuid not null, actor_id uuid not null references auth.users(id),
 object_ref uuid not null unique default gen_random_uuid(), expires_at timestamptz not null default (statement_timestamp()+interval '10 minutes'),
 foreign key(document_id,workspace_id) references public.documents(id,workspace_id),
 created_at timestamptz not null default statement_timestamp(), check(expires_at>created_at)
);
create table public.document_download_tickets (
 id uuid primary key default gen_random_uuid(), document_id uuid not null, workspace_id uuid not null,
 actor_id uuid not null references auth.users(id), expires_at timestamptz not null default(statement_timestamp()+interval '30 seconds'),
 foreign key(document_id,workspace_id) references public.documents(id,workspace_id)
);
alter table public.document_upload_intents enable row level security;
alter table public.document_upload_intents force row level security;
alter table public.document_download_tickets enable row level security;
alter table public.document_download_tickets force row level security;
revoke all on public.document_upload_intents,public.document_download_tickets from public,anon,authenticated,service_role;
create index document_download_tickets_expiry on public.document_download_tickets(expires_at);
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 if expr is null then raise exception 'command registry absent';end if;
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''document.request_upload'',''document.finalize_upload'',''document.request_download''))';
end$$;
create function public.document_content_v1_validate(p_op text,p_input jsonb)returns void language plpgsql set search_path=''as $$
declare required text[];k text;begin
 required:=case p_op when 'document.request_upload'then array['command_id','target_kind','target_id','document_kind','media_type','size_bytes','file_name'] when 'document.finalize_upload'then array['command_id','id','expected_version'] when 'document.request_download'then array['command_id','id','expected_version'] when 'upload_manifest'then array['id'] when 'download_manifest'then array['id','ticket_id'] else null end;
 if required is null or p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from(select array_agg(x order by x)from unnest(required)x)then raise exception using errcode='22023',message='document_invalid_input';end if;
 foreach k in array required loop
  if p_input->k='null'::jsonb then raise exception using errcode='22023',message='document_invalid_input';end if;
  if k in ('command_id','id','target_id','ticket_id')and(jsonb_typeof(p_input->k)<>'string'or p_input->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then raise exception using errcode='22023',message='document_invalid_input';end if;
 end loop;
 if p_input?'expected_version'and(jsonb_typeof(p_input->'expected_version')<>'number'or p_input->>'expected_version'!~'^[1-9][0-9]{0,14}$')then raise exception using errcode='22023',message='document_invalid_input';end if;
 if p_op='document.request_upload'and(jsonb_typeof(p_input->'target_kind')<>'string'or p_input->>'target_kind'not in ('customer','contract','service','line','service_case','opportunity')or jsonb_typeof(p_input->'document_kind')<>'string'or p_input->>'document_kind'not in ('general','identity','contract','service','incident','billing','other')or jsonb_typeof(p_input->'media_type')<>'string'or p_input->>'media_type'not in ('application/pdf','image/png','image/jpeg')or jsonb_typeof(p_input->'size_bytes')<>'number'or p_input->>'size_bytes'!~'^[1-9][0-9]{0,7}$'or(p_input->>'size_bytes')::bigint>10485760 or jsonb_typeof(p_input->'file_name')<>'string'or char_length(p_input->>'file_name')not between 1 and 255 or p_input->>'file_name'<>btrim(p_input->>'file_name')or p_input->>'file_name'~'[[:cntrl:]/]'or position(chr(92)in p_input->>'file_name')>0)then raise exception using errcode='22023',message='document_invalid_input';end if;
end$$;
revoke all on function public.document_content_v1_validate(text,jsonb)from public,anon,authenticated,service_role;
create function public.document_content_v1_pending_object(p_path text)returns boolean language plpgsql security definer set search_path=''as $$
declare w uuid;begin
 select i.workspace_id into w from public.document_upload_intents i join public.documents d on d.id=i.document_id and d.workspace_id=i.workspace_id
 where d.storage_path=p_path and d.storage_bucket='telecom-documents'and d.status='pending'and i.actor_id=auth.uid()and i.expires_at>statement_timestamp()for share of i,d;
 if w is null then return false;end if;
 perform public.document_v1_assert_scope(w);return true;
end$$;
revoke all on function public.document_content_v1_pending_object(text)from public,anon,authenticated,service_role;
grant execute on function public.document_content_v1_pending_object(text)to authenticated;
create policy document_content_v1_pending_insert on storage.objects for insert to authenticated with check(bucket_id='telecom-documents'and public.document_content_v1_pending_object(name));
-- Pending reads allow the uploader to verify retry bytes. No other pending objects are visible.
create policy document_content_v1_pending_read on storage.objects for select to authenticated using(bucket_id='telecom-documents'and public.document_content_v1_pending_object(name));
create function public.document_content_v1_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
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
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,d.id,d.version,d.status,d.customer_id);
 prior:=jsonb_set(prior,'{contract_version}','"document.content.v1"'::jsonb);
 if expiry is not null then prior:=prior||jsonb_build_object('expires_at',expiry);end if;
 if p_op='document.request_download'then prior:=prior||jsonb_build_object('ticket_id',t);end if;
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.document_content_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
create function public.document_content_v1_manifest(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
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
 return jsonb_build_object('id',d.id,'object_ref',split_part(d.storage_path,'/',4)::uuid,'media_type',d.media_type,'size_bytes',d.size_bytes,'expires_at',expiry);
end$$;
revoke all on function public.document_content_v1_manifest(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_content_v1_manifest(uuid,jsonb)to authenticated;
create function public.document_content_v1_request_upload(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_content_v1_command(p_workspace_id,'document.request_upload',p_input)$$;
revoke all on function public.document_content_v1_request_upload(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_content_v1_request_upload(uuid,jsonb)to authenticated;
create function public.document_content_v1_finalize_upload(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_content_v1_command(p_workspace_id,'document.finalize_upload',p_input)$$;
revoke all on function public.document_content_v1_finalize_upload(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_content_v1_finalize_upload(uuid,jsonb)to authenticated;
create function public.document_content_v1_request_download(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_content_v1_command(p_workspace_id,'document.request_download',p_input)$$;
revoke all on function public.document_content_v1_request_download(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_content_v1_request_download(uuid,jsonb)to authenticated;
create or replace function public.document_v1_safe_metadata(p_workspace_id uuid,p_id uuid)returns jsonb language sql security definer set search_path=''as $$
 select jsonb_build_object('id',id,'version',version,'status',status,'document_kind',document_kind,'media_type',media_type,'size_bytes',size_bytes,
 'target',jsonb_build_object('kind',case when customer_id is not null then 'customer'when contract_id is not null then 'contract'when service_id is not null then 'service'when line_id is not null then 'line'when service_case_id is not null then 'service_case'else 'opportunity'end,'id',coalesce(customer_id,contract_id,service_id,line_id,service_case_id,opportunity_id)))from public.documents where workspace_id=p_workspace_id and id=p_id and status in ('active','archived')
$$;
revoke all on function public.document_v1_safe_metadata(uuid,uuid)from public,anon,authenticated,service_role;
commit;
