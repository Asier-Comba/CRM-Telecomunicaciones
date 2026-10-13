-- Private SAFE_WRITE/none reservation. Registrations remain empty.
begin;
create table public.assistant_unconfirmed_policies (
 dispatcher_key text not null,capability text not null,schema_version integer not null,
 access_class text not null check(access_class='SAFE_WRITE'),
 confirmation_policy text not null check(confirmation_policy='none'),
 primary key(dispatcher_key,capability,schema_version),
 foreign key(dispatcher_key,capability,schema_version) references public.assistant_registered_dispatchers(dispatcher_key,capability,schema_version)
);
alter table public.assistant_unconfirmed_policies enable row level security;
alter table public.assistant_unconfirmed_policies force row level security;
revoke all on public.assistant_unconfirmed_policies from public,anon,authenticated,service_role;
create trigger assistant_unconfirmed_policy_immutable before update or delete on public.assistant_unconfirmed_policies
 for each row execute function public.assistant_result_material_guard_v1();
create function public.assistant_durable_v1_reserve_material(
 p_workspace uuid,p_worker text,p_authority_version bigint,p_capability text,p_digest text,p_key text,
 p_dispatcher text,p_command text,p_request text,p_material jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_effect_workers%rowtype;o public.assistant_operations%rowtype;
 c public.assistant_registered_commands%rowtype;m public.assistant_command_material%rowtype;t timestamptz;
 canonical_value text;runtime_value text;schema_id integer;event_id text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_authority_version is null or p_authority_version not between 1 and 9007199254740990
 or p_capability is null or p_digest is null or p_digest !~ '^[0-9a-f]{64}$'
 or p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,128}$' or p_dispatcher is null
 or p_command is null or p_command !~ '^[A-Za-z0-9_-]{24,200}$' or p_request is null or p_request !~ '^[A-Za-z0-9_-]{16,128}$'
 then raise exception using errcode='22023',message='assistant_invalid_request';end if;
 if jsonb_typeof(p_material) is distinct from 'object'
 or (select array_agg(key order by key) from jsonb_object_keys(p_material) key) is distinct from array['canonicalArguments','digestAlgorithm','producerRuntime','schemaVersion']::text[]
 or jsonb_typeof(p_material->'schemaVersion') is distinct from 'number' or p_material->>'schemaVersion' !~ '^[1-9][0-9]{0,9}$'
 or (p_material->>'schemaVersion')::numeric>2147483647
 or p_material->>'digestAlgorithm' is distinct from 'w3-canonical-json-localeCompare-sha256-v1'
 or jsonb_typeof(p_material->'canonicalArguments') is distinct from 'string' or jsonb_typeof(p_material->'producerRuntime') is distinct from 'string'
 then raise exception using errcode='22023',message='assistant_invalid_command_material';end if;
 schema_id:=(p_material->>'schemaVersion')::integer;canonical_value:=p_material->>'canonicalArguments';runtime_value:=p_material->>'producerRuntime';
 if octet_length(canonical_value) not between 2 and 65536 or runtime_value !~ '^[A-Za-z0-9._:-]{3,80}$'
 or jsonb_typeof(canonical_value::jsonb) is distinct from 'object'
 or encode(extensions.digest(convert_to(canonical_value,'UTF8'),'sha256'),'hex') is distinct from p_digest
 then raise exception using errcode='22023',message='assistant_invalid_command_material';end if;
 select * into g from public.assistant_registered_effect_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker
 and x.actor_id=a and x.capability=p_capability and x.dispatcher_key=p_dispatcher and x.schema_version=schema_id for share;
 if not found then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 perform 1 from public.assistant_unconfirmed_policies p where p.dispatcher_key=p_dispatcher and p.capability=p_capability
 and p.schema_version=schema_id and p.access_class='SAFE_WRITE' and p.confirmation_policy='none' for share;
 if not found then raise exception using errcode='42501',message='assistant_unconfirmed_forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended(jsonb_build_array(p_workspace,p_capability,p_key)::text,0));
 select * into o from public.assistant_operations x where x.workspace_id=p_workspace and x.capability=p_capability and x.idempotency_key=p_key for update;
 if found then
  select * into c from public.assistant_registered_commands x where x.workspace_id=p_workspace and x.operation_ref=o.operation_ref for share;
  if o.actor_id<>a or o.arguments_digest<>p_digest or o.confirmation_ref is not null or c.command_ref is distinct from p_command
  or c.dispatcher_key is distinct from p_dispatcher or c.schema_version is distinct from schema_id then return jsonb_build_object('status','conflict');end if;
  select * into m from public.assistant_command_material x where x.workspace_id=p_workspace and x.command_ref=p_command for share;
  if not found or m.canonical_arguments is distinct from canonical_value or m.arguments_digest is distinct from p_digest
  or m.schema_version is distinct from schema_id or m.digest_algorithm is distinct from 'w3-canonical-json-localeCompare-sha256-v1'
  then raise exception using errcode='22023',message='assistant_command_material_conflict';end if;
  perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
  where i.workspace_id=p_workspace and i.operation_ref=o.operation_ref and i.operation_version=1 and i.actor_id=a
  and i.capability=p_capability and i.arguments_digest=p_digest and i.event='assistant.operation.reserved' for share of i,d;
  if not found then raise exception using errcode='22023',message='assistant_reservation_audit_missing';end if;
  perform 1 from public.assistant_effect_outbox b where b.workspace_id=p_workspace and b.operation_ref=o.operation_ref and b.actor_id=a
  and b.capability=p_capability and b.arguments_digest=p_digest and b.command_ref=p_command and b.dispatcher_key=p_dispatcher for share;
  if not found then raise exception using errcode='22023',message='assistant_reservation_outbox_missing';end if;
  t:=clock_timestamp();
  if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
  return jsonb_build_object('status','existing','operationRef',o.operation_ref);
 end if;
 -- All registration, membership, grant, unique-key locks precede authoritative time.
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 insert into public.assistant_operations(workspace_id,operation_ref,actor_id,capability,idempotency_key,arguments_digest,confirmation_ref,lease_expires_at,created_at,updated_at)
 values(p_workspace,encode(extensions.gen_random_bytes(32),'hex'),a,p_capability,p_key,p_digest,null,t+interval '5 minutes',t,t) returning * into o;
 insert into public.assistant_registered_commands(workspace_id,command_ref,operation_ref,actor_id,capability,arguments_digest,dispatcher_key,schema_version,created_at)
 values(p_workspace,p_command,o.operation_ref,a,p_capability,p_digest,p_dispatcher,schema_id,t);
 insert into public.assistant_command_material(workspace_id,command_ref,schema_version,arguments_digest,digest_algorithm,producer_runtime,canonical_arguments,created_at)
 values(p_workspace,p_command,schema_id,p_digest,'w3-canonical-json-localeCompare-sha256-v1',runtime_value,canonical_value,t);
 insert into public.assistant_effect_outbox(workspace_id,outbox_ref,operation_ref,actor_id,capability,arguments_digest,dispatcher_key,command_ref,created_at,updated_at)
 values(p_workspace,encode(extensions.gen_random_bytes(32),'hex'),o.operation_ref,a,p_capability,p_digest,p_dispatcher,p_command,t,t);
 event_id:=encode(extensions.digest(convert_to(jsonb_build_array('assistant.operation.reserved',p_workspace,o.operation_ref,o.version)::text,'UTF8'),'sha256'),'hex');
 insert into public.assistant_original_audit_intents(workspace_id,event_ref,operation_ref,operation_version,actor_id,capability,arguments_digest,event,request_ref,created_at)
 values(p_workspace,event_id,o.operation_ref,o.version,a,p_capability,p_digest,'assistant.operation.reserved',p_request,t);
 insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,event_id,t,t);
 return jsonb_build_object('status','reserved','record',jsonb_build_object('operationRef',o.operation_ref,'idempotencyKey',o.idempotency_key,
 'binding',jsonb_build_object('actorId',o.actor_id,'workspaceId',o.workspace_id,'capability',o.capability,'argumentsDigest',o.arguments_digest),
 'state',o.state,'attempt',o.attempt,'version',o.version,'leaseExpiresAt',o.lease_expires_at,'createdAt',o.created_at,'updatedAt',o.updated_at));
end$$;
revoke all on function public.assistant_durable_v1_reserve_material(uuid,text,bigint,text,text,text,text,text,text,jsonb) from public,anon,authenticated,service_role;

-- Forward-only: original confirmation provenance determines the audit literal.
create or replace function public.assistant_durable_v1_complete(p_workspace uuid,p_worker text,p_authority_version bigint,p_operation text,p_version bigint,
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
 if o.confirmation_ref is null then
  perform 1 from public.assistant_unconfirmed_policies p where p.dispatcher_key=c.dispatcher_key and p.capability=c.capability
  and p.schema_version=c.schema_version and p.access_class='SAFE_WRITE' and p.confirmation_policy='none' for share;
  if not found or s.access_class<>'SAFE_WRITE' then raise exception using errcode='42501',message='assistant_unconfirmed_forbidden';end if;
 end if;
 if jsonb_typeof(e) is distinct from 'object' or (select count(*) from jsonb_object_keys(e))<>11
 or not(e ?& array['event','requestId','actorId','workspaceId','capability','accessClass','status','reasonCode','confirmationState','idempotencyState','durationMs'])
 or e->>'event' is distinct from 'assistant.capability.completed' or e->'actorId' is distinct from to_jsonb(a::text) or e->'workspaceId' is distinct from to_jsonb(p_workspace::text) or e->'capability' is distinct from to_jsonb(o.capability)
 or e->'accessClass' is distinct from to_jsonb(s.access_class) or e->'status' is distinct from to_jsonb('SUCCESS'::text) or e->'reasonCode' is distinct from to_jsonb('capability_success'::text)
 or e->'confirmationState' is distinct from to_jsonb(case when o.confirmation_ref is null then 'not_applicable' else 'accepted' end) or e->'idempotencyState' is distinct from to_jsonb('reserved'::text)
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
commit;
