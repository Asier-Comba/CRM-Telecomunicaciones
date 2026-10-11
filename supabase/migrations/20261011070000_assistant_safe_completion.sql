-- Private, empty registrations. v1 admits closed flat scalar DTOs only; each
-- field has an explicit reviewed scalar/customer policy. No business activation.
begin;
create function public.assistant_result_schema_valid_v1(s jsonb,p jsonb) returns boolean
 language plpgsql immutable set search_path='' as $$
declare k text;v jsonb;typ text;
begin
 if s is null or p is null or jsonb_typeof(s)<>'object' or jsonb_typeof(p)<>'object'
 or s->>'type' is distinct from 'object' or s->'additionalProperties' is distinct from 'false'::jsonb
 or jsonb_typeof(s->'properties') is distinct from 'object' or jsonb_typeof(s->'required') is distinct from 'array'
 or (select count(*) from jsonb_object_keys(s))<>4 then return false;end if;
 if (select count(*) from jsonb_object_keys(s->'properties')) not between 1 and 32
 or (select array_agg(x order by x) from jsonb_object_keys(s->'properties') x) is distinct from
 (select array_agg(x order by x) from jsonb_object_keys(p) x)
 or (select array_agg(x order by x) from jsonb_array_elements_text(s->'required') x) is distinct from
 (select array_agg(x order by x) from jsonb_object_keys(p) x) then return false;end if;
 for k,v in select * from jsonb_each(s->'properties') loop
  if k !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' or lower(replace(k,'_','')) in ('workspace','workspaceid','tenant','tenantid')
  or k ~* 'token|secret|password|passwd|cookie|authorization|api.?key|session' or jsonb_typeof(v)<>'object'
  or p->>k not in ('scalar','customer') or jsonb_typeof(p->k)<>'string' then return false;end if;
  typ:=v->>'type';
  if typ is null or typ not in ('string','number','boolean','null') then return false;end if;
  if (p->>k='customer' and typ<>'string') or (k ~* '(ref|id)$' and p->>k<>'customer') then return false;end if;
  if typ='string' then
   if exists(select 1 from jsonb_object_keys(v) x where x not in ('type','maxLength','minLength','enum'))
   or jsonb_typeof(v->'maxLength') is distinct from 'number' or (v->>'maxLength')::numeric not between 1 and 4096
   or trunc((v->>'maxLength')::numeric)<>(v->>'maxLength')::numeric
   or (v ? 'minLength' and (jsonb_typeof(v->'minLength')<>'number' or (v->>'minLength')::numeric<0
    or (v->>'minLength')::numeric>(v->>'maxLength')::numeric or trunc((v->>'minLength')::numeric)<>(v->>'minLength')::numeric))
   or (v ? 'enum' and (jsonb_typeof(v->'enum')<>'array' or jsonb_array_length(v->'enum') not between 1 and 100
    or exists(select 1 from jsonb_array_elements(v->'enum') e where jsonb_typeof(e)<>'string'))) then return false;end if;
  elsif typ='number' then
   if exists(select 1 from jsonb_object_keys(v) x where x not in ('type','minimum','maximum'))
   or (v ? 'minimum' and jsonb_typeof(v->'minimum')<>'number') or (v ? 'maximum' and jsonb_typeof(v->'maximum')<>'number')
   or (v ? 'minimum' and v ? 'maximum' and (v->>'minimum')::numeric>(v->>'maximum')::numeric) then return false;end if;
  elsif (select count(*) from jsonb_object_keys(v))<>1 then return false;end if;
 end loop;
 return true;
exception when others then return false;
end$$;
revoke all on function public.assistant_result_schema_valid_v1(jsonb,jsonb) from public,anon,authenticated,service_role;
create table public.assistant_registered_result_schemas (
 dispatcher_key text not null,capability text not null,input_schema_version integer not null,
 output_schema_version integer not null check(output_schema_version>0),access_class text not null check(access_class in ('SAFE_WRITE','SENSITIVE_WRITE','IRREVERSIBLE')),
 canonical_schema text not null check(octet_length(canonical_schema)<=32768),schema_digest text not null check(schema_digest ~ '^[0-9a-f]{64}$'),
 field_policy jsonb not null,
 primary key(dispatcher_key,capability,input_schema_version,output_schema_version),
 foreign key(dispatcher_key,capability,input_schema_version) references public.assistant_registered_dispatchers(dispatcher_key,capability,schema_version),
 check(schema_digest=encode(extensions.digest(convert_to(canonical_schema,'UTF8'),'sha256'),'hex')),
 check(public.assistant_result_schema_valid_v1(canonical_schema::jsonb,field_policy))
);
create function public.assistant_result_material_guard_v1() returns trigger language plpgsql set search_path='' as $$
begin raise exception using errcode='42501',message='assistant_result_material_immutable';end$$;
revoke all on function public.assistant_result_material_guard_v1() from public,anon,authenticated,service_role;
create trigger assistant_result_schema_immutable before update or delete on public.assistant_registered_result_schemas
 for each row execute function public.assistant_result_material_guard_v1();
create table public.assistant_safe_results (
 workspace_id uuid not null,operation_ref text not null,actor_id uuid not null,capability text not null,arguments_digest text not null,
 command_ref text not null,dispatcher_key text not null,input_schema_version integer not null,output_schema_version integer not null,
 receipt_ref text not null check(receipt_ref ~ '^[A-Za-z0-9_-]{24,200}$'),schema_digest text not null,
 canonical_result text not null check(octet_length(canonical_result)<=32768),result_digest text not null check(result_digest ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null,primary key(workspace_id,operation_ref),
 foreign key(workspace_id,operation_ref,actor_id,capability,arguments_digest)
 references public.assistant_operations(workspace_id,operation_ref,actor_id,capability,arguments_digest),
 foreign key(workspace_id,operation_ref,command_ref,dispatcher_key)
 references public.assistant_registered_commands(workspace_id,operation_ref,command_ref,dispatcher_key),
 foreign key(dispatcher_key,capability,input_schema_version,output_schema_version)
 references public.assistant_registered_result_schemas(dispatcher_key,capability,input_schema_version,output_schema_version),
 check(result_digest=encode(extensions.digest(convert_to(canonical_result,'UTF8'),'sha256'),'hex'))
);
create trigger assistant_safe_result_immutable before update or delete on public.assistant_safe_results
 for each row execute function public.assistant_result_material_guard_v1();
alter table public.assistant_registered_result_schemas enable row level security;
alter table public.assistant_registered_result_schemas force row level security;
alter table public.assistant_safe_results enable row level security;
alter table public.assistant_safe_results force row level security;
revoke all on public.assistant_registered_result_schemas,public.assistant_safe_results from public,anon,authenticated,service_role;
alter table public.assistant_original_audit_intents add column capability_event jsonb;
alter table public.assistant_original_audit_intents add column canonical_capability_event text;
alter table public.assistant_original_audit_intents drop constraint assistant_original_audit_event_reason_check;
alter table public.assistant_original_audit_intents add constraint assistant_original_audit_event_reason_check check(
 (event in ('assistant.operation.reserved','assistant.operation.effect_applied') and reason_code is null and capability_event is null and canonical_capability_event is null) or
 (event='assistant.operation.recovery_required' and reason_code in ('internal_safe','temporary_unavailable') and reason_code is not null and capability_event is null and canonical_capability_event is null) or
 (event='assistant.capability.completed' and reason_code='capability_success' and reason_code is not null and capability_event is not null
  and canonical_capability_event is not null and octet_length(canonical_capability_event)<=4096 and canonical_capability_event::jsonb=capability_event)
);
create function public.assistant_result_data_valid_v1(s jsonb,p jsonb,d jsonb,w uuid) returns boolean
 language plpgsql set search_path='' as $$
declare k text;v jsonb;x jsonb;typ text;
begin
 if not public.assistant_result_schema_valid_v1(s,p) or jsonb_typeof(d)<>'object'
 or (select array_agg(z order by z) from jsonb_object_keys(d) z) is distinct from
 (select array_agg(z order by z) from jsonb_object_keys(p) z) then return false;end if;
 for k,v in select * from jsonb_each(s->'properties') loop
  x:=d->k;typ:=v->>'type';if jsonb_typeof(x)<>typ then return false;end if;
  if typ='string' then
   if char_length(d->>k)>(v->>'maxLength')::integer or char_length(d->>k)<coalesce((v->>'minLength')::integer,0)
   or (v ? 'enum' and not (v->'enum' @> jsonb_build_array(x)))
   or d->>k ~* '-----BEGIN .*PRIVATE KEY-----|\mbearer[[:space:]]+[A-Za-z0-9._~+/-]{16,}|\m(sk-|gh[pousr]_|github_pat_|xox[baprs]-)|\meyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.' then return false;end if;
  elsif typ='number' and ((v ? 'minimum' and (d->>k)::numeric<(v->>'minimum')::numeric)
   or (v ? 'maximum' and (d->>k)::numeric>(v->>'maximum')::numeric)) then return false;end if;
  if p->>k='customer' then
   if d->>k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false;end if;
   perform 1 from public.customers c where c.workspace_id=w and c.id=(d->>k)::uuid for share;
   if not found then return false;end if;
  end if;
 end loop;
 return true;
end$$;
revoke all on function public.assistant_result_data_valid_v1(jsonb,jsonb,jsonb,uuid) from public,anon,authenticated,service_role;
create function public.assistant_durable_v1_complete(p_workspace uuid,p_worker text,p_authority_version bigint,p_operation text,p_version bigint,
 p_receipt text,p_output_schema_version integer,p_schema_digest text,p_result text,p_audit text,p_event text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_effect_workers%rowtype;o public.assistant_operations%rowtype;b public.assistant_effect_outbox%rowtype;
 c public.assistant_registered_commands%rowtype;s public.assistant_registered_result_schemas%rowtype;r jsonb;e jsonb;t timestamptz;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_operation is null or p_operation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_authority_version is null or p_authority_version not between 1 and 9007199254740990
 or p_version is null or p_version not between 3 and 9007199254740990 or p_receipt is null or p_receipt !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_output_schema_version is null or p_output_schema_version<1 or p_schema_digest is null or p_schema_digest !~ '^[0-9a-f]{64}$'
 or p_result is null or octet_length(p_result)>32768 or p_audit is null or octet_length(p_audit)>4096
 or p_event is null or p_event !~ '^[0-9a-f]{64}$' then raise exception using errcode='22023',message='assistant_invalid_request';end if;
 r:=p_result::jsonb;e:=p_audit::jsonb;
 select * into g from public.assistant_registered_effect_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 select * into o from public.assistant_operations x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a and x.capability=g.capability for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 if o.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if o.state<>'effect_applied' or o.receipt_ref is distinct from p_receipt or o.failure_code is not null then return jsonb_build_object('status','invalid_transition');end if;
 select * into c from public.assistant_registered_commands x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a
 and x.capability=g.capability and x.arguments_digest=o.arguments_digest and x.dispatcher_key=g.dispatcher_key and x.schema_version=g.schema_version for share;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_command_material m where m.workspace_id=p_workspace and m.command_ref=c.command_ref
 and m.schema_version=c.schema_version and m.arguments_digest=o.arguments_digest for share;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest
 and i.operation_version=o.version and i.event='assistant.operation.effect_applied' for share of i,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest
 and i.operation_version=1 and i.event='assistant.operation.reserved' for share of i,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select * into b from public.assistant_effect_outbox x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a
 and x.capability=g.capability and x.arguments_digest=o.arguments_digest and x.dispatcher_key=c.dispatcher_key and x.command_ref=c.command_ref for share;
 if not found or b.state<>'delivered' or b.receipt_ref is distinct from p_receipt or b.worker_ref is not null or b.claim_ref is not null
 or b.claim_authority_version is not null or b.lease_expires_at is not null then return jsonb_build_object('status','invalid_transition');end if;
 select * into s from public.assistant_registered_result_schemas x where x.dispatcher_key=c.dispatcher_key and x.capability=c.capability
 and x.input_schema_version=c.schema_version and x.output_schema_version=p_output_schema_version and x.schema_digest=p_schema_digest for share;
 if not found then raise exception using errcode='42501',message='assistant_result_unregistered';end if;
 if jsonb_typeof(r) is distinct from 'object' or (select count(*) from jsonb_object_keys(r))<>3 or not (r ?& array['status','capability','data'])
 or r->'status' is distinct from to_jsonb('SUCCESS'::text) or r->'capability' is distinct from to_jsonb(o.capability)
 or not public.assistant_result_data_valid_v1(s.canonical_schema::jsonb,s.field_policy,r->'data',p_workspace) then
 raise exception using errcode='22023',message='assistant_result_invalid';end if;
 if jsonb_typeof(e) is distinct from 'object' or (select count(*) from jsonb_object_keys(e))<>11
 or not(e ?& array['event','requestId','actorId','workspaceId','capability','accessClass','status','reasonCode','confirmationState','idempotencyState','durationMs'])
 or e->>'event' is distinct from 'assistant.capability.completed' or e->'actorId' is distinct from to_jsonb(a::text) or e->'workspaceId' is distinct from to_jsonb(p_workspace::text) or e->'capability' is distinct from to_jsonb(o.capability)
 or e->'accessClass' is distinct from to_jsonb(s.access_class) or e->'status' is distinct from to_jsonb('SUCCESS'::text) or e->'reasonCode' is distinct from to_jsonb('capability_success'::text)
 or e->'confirmationState' is distinct from to_jsonb('accepted'::text) or e->'idempotencyState' is distinct from to_jsonb('reserved'::text)
 or jsonb_typeof(e->'requestId') is distinct from 'string' or e->>'requestId' !~ '^[A-Za-z0-9_-]{16,128}$'
 or jsonb_typeof(e->'durationMs') is distinct from 'number' or (e->>'durationMs')::numeric not between 0 and 9007199254740991
 or trunc((e->>'durationMs')::numeric)<>(e->>'durationMs')::numeric then raise exception using errcode='22023',message='assistant_audit_invalid';end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 if t>=o.lease_expires_at then return jsonb_build_object('status','invalid_transition');end if;
 insert into public.assistant_safe_results(workspace_id,operation_ref,actor_id,capability,arguments_digest,command_ref,dispatcher_key,input_schema_version,
 output_schema_version,receipt_ref,schema_digest,canonical_result,result_digest,created_at)
 values(p_workspace,p_operation,a,o.capability,o.arguments_digest,c.command_ref,c.dispatcher_key,c.schema_version,p_output_schema_version,p_receipt,
 p_schema_digest,p_result,encode(extensions.digest(convert_to(p_result,'UTF8'),'sha256'),'hex'),t);
 update public.assistant_operations set state='completed',version=version+1,updated_at=t where workspace_id=p_workspace and operation_ref=p_operation returning * into o;
 insert into public.assistant_original_audit_intents(workspace_id,event_ref,operation_ref,operation_version,actor_id,capability,arguments_digest,event,request_ref,created_at,reason_code,capability_event,canonical_capability_event)
 values(p_workspace,p_event,p_operation,o.version,a,o.capability,o.arguments_digest,'assistant.capability.completed',e->>'requestId',t,'capability_success',e,p_audit);
 insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,p_event,t,t);
 return jsonb_build_object('status','applied','record',jsonb_build_object('operationRef',o.operation_ref,'idempotencyKey',o.idempotency_key,
 'binding',jsonb_build_object('actorId',o.actor_id,'workspaceId',o.workspace_id,'capability',o.capability,'argumentsDigest',o.arguments_digest),
 'state',o.state,'attempt',o.attempt,'version',o.version,'leaseExpiresAt',o.lease_expires_at,'effectReceiptRef',o.receipt_ref,
 'createdAt',o.created_at,'updatedAt',o.updated_at,'result',r));
end$$;
revoke all on function public.assistant_durable_v1_complete(uuid,text,bigint,text,bigint,text,integer,text,text,text,text) from public,anon,authenticated,service_role;
create function public.assistant_durable_v1_load_result(p_workspace uuid,p_worker text,p_authority_version bigint,p_operation text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_effect_workers%rowtype;o public.assistant_operations%rowtype;
 m public.assistant_safe_results%rowtype;s public.assistant_registered_result_schemas%rowtype;r jsonb;t timestamptz;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_operation is null or p_operation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_authority_version is null or p_authority_version not between 1 and 9007199254740990 then raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into g from public.assistant_registered_effect_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 select * into o from public.assistant_operations x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a and x.capability=g.capability for share;
 if not found or o.state<>'completed' or o.version<4 then return null;end if;
 select m0.* into m from public.assistant_safe_results m0 join public.assistant_registered_commands c
 using(workspace_id,operation_ref,command_ref,dispatcher_key) where m0.workspace_id=p_workspace and m0.operation_ref=p_operation
 and m0.actor_id=a and m0.capability=g.capability and m0.arguments_digest=o.arguments_digest and m0.receipt_ref=o.receipt_ref
 and m0.dispatcher_key=g.dispatcher_key and m0.input_schema_version=g.schema_version for share of m0,c;
 if not found then raise exception using errcode='22023',message='assistant_result_missing';end if;
 select * into s from public.assistant_registered_result_schemas x where x.dispatcher_key=m.dispatcher_key and x.capability=m.capability
 and x.input_schema_version=m.input_schema_version and x.output_schema_version=m.output_schema_version and x.schema_digest=m.schema_digest for share;
 if not found then raise exception using errcode='42501',message='assistant_result_unregistered';end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.actor_id=a and i.capability=g.capability
 and i.arguments_digest=o.arguments_digest and i.operation_version=o.version and i.event='assistant.capability.completed'
 and i.capability_event is not null for share of i,d;
 if not found then raise exception using errcode='22023',message='assistant_result_audit_missing';end if;
 perform 1 from public.assistant_effect_outbox b where b.workspace_id=p_workspace and b.operation_ref=p_operation
 and b.actor_id=a and b.capability=g.capability and b.arguments_digest=o.arguments_digest and b.command_ref=m.command_ref
 and b.dispatcher_key=m.dispatcher_key and b.state='delivered' and b.receipt_ref=o.receipt_ref for share;
 if not found then raise exception using errcode='22023',message='assistant_result_receipt_missing';end if;
 r:=m.canonical_result::jsonb;
 if not public.assistant_result_data_valid_v1(s.canonical_schema::jsonb,s.field_policy,r->'data',p_workspace) then
 raise exception using errcode='42501',message='assistant_result_resource_forbidden';end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 return jsonb_build_object('command',jsonb_build_object('dispatcher',m.dispatcher_key,'commandRef',m.command_ref),
 'record',jsonb_build_object('operationRef',o.operation_ref,'idempotencyKey',o.idempotency_key,
 'binding',jsonb_build_object('actorId',o.actor_id,'workspaceId',o.workspace_id,'capability',o.capability,'argumentsDigest',o.arguments_digest),
 'state',o.state,'attempt',o.attempt,'version',o.version,'leaseExpiresAt',o.lease_expires_at,'effectReceiptRef',o.receipt_ref,
 'createdAt',o.created_at,'updatedAt',o.updated_at,'result',r));
end$$;
revoke all on function public.assistant_durable_v1_load_result(uuid,text,bigint,text) from public,anon,authenticated,service_role;
-- Preserve the complete original application audit; older event projections stay exact.
create or replace function public.assistant_durable_v1_claim_audit(
 p_workspace uuid,p_worker text,p_authority_version bigint,p_event text,p_version bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_audit_workers%rowtype;i public.assistant_original_audit_intents%rowtype;
 d public.assistant_audit_delivery_outbox%rowtype;t timestamptz;proof text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_event is null or p_event !~ '^[0-9a-f]{64}$'
 or p_authority_version is null or p_authority_version<1 or p_authority_version>=9007199254740991
 or p_version is null or p_version<1 or p_version>=9007199254740990 then
  raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into g from public.assistant_registered_audit_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then return jsonb_build_object('status','forbidden');end if;
 -- Grant scope precedes event materialization; original actor remains content,
 -- not the authenticated delegated delivery worker's identity.
 select * into i from public.assistant_original_audit_intents x
 where x.workspace_id=p_workspace and x.event_ref=p_event and x.capability=g.capability for share;
 if not found then return jsonb_build_object('status','not_found');end if;
 select * into d from public.assistant_audit_delivery_outbox x where x.workspace_id=p_workspace and x.event_ref=p_event for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then return jsonb_build_object('status','forbidden');end if;
 if d.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if d.state<>'pending' or d.receipt_ref is not null or t<d.next_eligible_at or (d.worker_ref is not null and d.lease_expires_at is not null and t<d.lease_expires_at) then
  return jsonb_build_object('status','invalid_transition');end if;
 if d.fence>=9007199254740991 or d.attempt>=9007199254740991 then
  raise exception using errcode='22023',message='assistant_version_exhausted';end if;
 proof:=encode(extensions.gen_random_bytes(32),'hex');
 update public.assistant_audit_delivery_outbox set worker_ref=p_worker,claim_ref=proof,claim_authority_version=p_authority_version,
 version=version+1,fence=fence+1,attempt=attempt+1,lease_expires_at=t+interval '5 minutes'
 where workspace_id=p_workspace and event_ref=p_event returning * into d;
 return jsonb_build_object('status','applied','version',d.version,'fence',d.fence,'claimRef',proof,
 'workerRef',p_worker,'grantVersion',p_authority_version,'claimedAt',t,'leaseExpiresAt',d.lease_expires_at,
 'event',jsonb_build_object('eventRef',i.event_ref,'workspaceId',i.workspace_id,'operationRef',i.operation_ref,
 'operationVersion',i.operation_version,'actorId',i.actor_id,'capability',i.capability,'argumentsDigest',i.arguments_digest,
 'event',i.event,'requestId',i.request_ref,'createdAt',i.created_at,'reasonCode',i.reason_code) || case when i.event='assistant.capability.completed' then jsonb_build_object('capabilityEvent',i.capability_event) else '{}'::jsonb end);
end$$;
revoke all on function public.assistant_durable_v1_claim_audit(uuid,text,bigint,text,bigint) from public,anon,authenticated,service_role;

commit;
