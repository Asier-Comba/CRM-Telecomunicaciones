-- Optional private PDF artifact jobs. Financial issuance/snapshots stay immutable.
begin;
create table public.billing_private_pdf_jobs (
 workspace_id uuid not null,invoice_id uuid primary key,status text not null default 'pending'check(status in ('pending','stored_candidate')),
 created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 foreign key(invoice_id,workspace_id)references public.billing_invoices(id,workspace_id)
);
create table public.billing_private_pdf_artifacts (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,invoice_id uuid not null,document_id uuid not null,
 version bigint not null check(version>0 and version<1000000000000000),renderer_version text not null check(renderer_version='billing.snapshot.pdf.v1'),
 issued_at timestamptz not null,created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),
 unique(workspace_id,invoice_id,version),unique(document_id),foreign key(invoice_id,workspace_id)references public.billing_invoices(id,workspace_id),foreign key(document_id,workspace_id)references public.documents(id,workspace_id)
);
alter table public.billing_private_pdf_jobs enable row level security;alter table public.billing_private_pdf_jobs force row level security;
alter table public.billing_private_pdf_artifacts enable row level security;alter table public.billing_private_pdf_artifacts force row level security;
revoke all on public.billing_private_pdf_jobs,public.billing_private_pdf_artifacts from public,anon,authenticated,service_role;
create trigger billing_private_pdf_artifacts_immutable before update or delete on public.billing_private_pdf_artifacts for each row execute function public.reject_activity_mutation();
create function public.billing_artifact_v1_schedule()returns trigger language plpgsql security definer set search_path=''as $$
begin
 if new.status in ('issued','paid')then insert into public.billing_private_pdf_jobs(workspace_id,invoice_id)values(new.workspace_id,new.id)on conflict(invoice_id)do nothing;end if;return new;
end$$;
revoke all on function public.billing_artifact_v1_schedule()from public,anon,authenticated,service_role;
create trigger billing_private_pdf_schedule after insert or update of status on public.billing_invoices for each row execute function public.billing_artifact_v1_schedule();
insert into public.billing_private_pdf_jobs(workspace_id,invoice_id)select workspace_id,id from public.billing_invoices where status in ('issued','paid');
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 if expr is null then raise exception 'command registry absent';end if;alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation=''invoice.persist_private_pdf'')';
end$$;
create function public.billing_artifact_v1_validate(p_input jsonb,p_with_document boolean)returns void language plpgsql set search_path=''as $$
declare required text[];k text;begin
 required:=array['command_id','id','expected_version','expected_artifact_version']::text[];if p_with_document then required:=required||array['document_id'];end if;
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from(select array_agg(x order by x)from unnest(required)x)then raise exception using errcode='22023',message='artifact_invalid_input';end if;
 foreach k in array required loop
  if k in ('id','command_id','document_id')and(jsonb_typeof(p_input->k)is distinct from 'string'or p_input->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then raise exception using errcode='22023',message='artifact_invalid_input';end if;
 end loop;
 if jsonb_typeof(p_input->'expected_version')is distinct from 'number'or p_input->>'expected_version'!~'^[1-9][0-9]{0,14}$'or jsonb_typeof(p_input->'expected_artifact_version')is distinct from 'number'or p_input->>'expected_artifact_version'!~'^(0|[1-9][0-9]{0,14})$'then raise exception using errcode='22023',message='artifact_invalid_input';end if;
end$$;
revoke all on function public.billing_artifact_v1_validate(jsonb,boolean)from public,anon,authenticated,service_role;
create function public.billing_artifact_v1_replay(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;prior public.product_commands%rowtype;key bytea;mac bytea;full_input jsonb;begin
 actor:=public.billing_v1_assert_scope(p_workspace_id);perform public.billing_artifact_v1_validate(p_input,false);
 select *into prior from public.product_commands where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 if not found then return null;end if;
 if prior.operation<>'invoice.persist_private_pdf'or prior.receipt is null or not prior.receipt?'document_id'then raise exception using errcode='40001',message='artifact_conflict';end if;
 full_input:=p_input||jsonb_build_object('document_id',prior.receipt->>'document_id');select key_bytes into key from public.product_command_key where singleton;
 mac:=extensions.hmac(convert_to('invoice.persist_private_pdf:'||full_input::text,'UTF8'),key,'sha256');
 if prior.input_mac<>mac then raise exception using errcode='40001',message='artifact_conflict';end if;return prior.receipt;
end$$;
revoke all on function public.billing_artifact_v1_replay(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.billing_artifact_v1_replay(uuid,jsonb)to authenticated;
create function public.billing_artifact_v1_attach(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;prior jsonb;i public.billing_invoices%rowtype;d public.documents%rowtype;a public.billing_private_pdf_artifacts%rowtype;latest bigint;begin
 actor:=public.billing_v1_assert_scope(p_workspace_id);perform public.billing_artifact_v1_validate(p_input,true);
 prior:=public.product_v1_begin_command(p_workspace_id,actor,'invoice.persist_private_pdf',p_input);if prior is not null then return prior;end if;
 select *into i from public.billing_invoices where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='artifact_invoice_not_found';end if;
 if i.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='artifact_conflict';end if;
 if i.status not in ('issued','paid')then raise exception using errcode='22023',message='artifact_unissued_invoice';end if;
 select coalesce(max(version),0)into latest from public.billing_private_pdf_artifacts where workspace_id=p_workspace_id and invoice_id=i.id;
 if latest<>(p_input->>'expected_artifact_version')::bigint then raise exception using errcode='40001',message='artifact_conflict';end if;
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'document_id')::uuid for share;
 if not found then raise exception using errcode='P0002',message='artifact_document_not_found';end if;
 if d.status<>'active'or d.document_kind<>'billing'or d.customer_id is distinct from i.customer_id or d.media_type is distinct from 'application/pdf'or d.size_bytes is null or d.size_bytes not between 1 and 10485760 then raise exception using errcode='22023',message='artifact_document_mismatch';end if;
 insert into public.billing_private_pdf_artifacts(workspace_id,invoice_id,document_id,version,renderer_version,issued_at,created_by_user_id)values(p_workspace_id,i.id,d.id,latest+1,'billing.snapshot.pdf.v1',i.issued_at,actor)returning *into a;
 update public.billing_private_pdf_jobs set status='stored_candidate',updated_at=statement_timestamp()where invoice_id=i.id and workspace_id=p_workspace_id;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,'invoice.persist_private_pdf',p_input,a.id,a.version,'stored_candidate',i.customer_id);
 prior:=jsonb_set(prior,'{contract_version}','"billing.artifact.v1"'::jsonb)||jsonb_build_object('invoice_id',i.id,'document_id',d.id,'renderer_version',a.renderer_version,'verification_required',true);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.billing_artifact_v1_attach(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.billing_artifact_v1_attach(uuid,jsonb)to authenticated;
create function public.billing_artifact_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare a public.billing_private_pdf_artifacts%rowtype;st text;begin
 perform public.billing_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key)from jsonb_object_keys(p_input)key)is distinct from array['id']::text[]or jsonb_typeof(p_input->'id')is distinct from 'string'or p_input->>'id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='artifact_invalid_input';end if;
 select *into a from public.billing_private_pdf_artifacts where workspace_id=p_workspace_id and invoice_id=(p_input->>'id')::uuid order by version desc limit 1;
 if not found then return null;end if;select status into st from public.documents where workspace_id=p_workspace_id and id=a.document_id;
 return jsonb_build_object('contract_version','billing.artifact.v1','operation','invoice.private_pdf_reference','id',a.id,'invoice_id',a.invoice_id,'document_id',a.document_id,'version',a.version,'renderer_version',a.renderer_version,'verification_required',true,'document_status',st);
end$$;
revoke all on function public.billing_artifact_v1_get(uuid,jsonb)from public,anon,authenticated,service_role;grant execute on function public.billing_artifact_v1_get(uuid,jsonb)to authenticated;
commit;
