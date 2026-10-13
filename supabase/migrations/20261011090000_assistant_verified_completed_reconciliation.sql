-- Positive reconciliation only. Independent verified absence is not inferred.
begin;
create table public.assistant_reconciliation_policies (
 dispatcher_key text not null,capability text not null,schema_version integer not null,
 outcome text not null check(outcome='completed'),
 primary key(dispatcher_key,capability,schema_version),
 foreign key(dispatcher_key,capability,schema_version) references public.assistant_registered_dispatchers(dispatcher_key,capability,schema_version)
);
alter table public.assistant_reconciliation_policies enable row level security;
alter table public.assistant_reconciliation_policies force row level security;
revoke all on public.assistant_reconciliation_policies from public,anon,authenticated,service_role;
create trigger assistant_reconciliation_policy_immutable before update or delete on public.assistant_reconciliation_policies
 for each row execute function public.assistant_result_material_guard_v1();
alter table public.assistant_original_audit_intents add column reconciliation_event jsonb;
alter table public.assistant_original_audit_intents add column canonical_reconciliation_event text;
alter table public.assistant_original_audit_intents drop constraint assistant_original_audit_event_reason_check;
alter table public.assistant_original_audit_intents add constraint assistant_original_audit_event_reason_check check(
 (event in ('assistant.operation.reserved','assistant.operation.effect_applied') and reason_code is null and capability_event is null and canonical_capability_event is null and reconciliation_event is null and canonical_reconciliation_event is null) or
 (event='assistant.operation.recovery_required' and reason_code in ('internal_safe','temporary_unavailable') and reason_code is not null and capability_event is null and canonical_capability_event is null and reconciliation_event is null and canonical_reconciliation_event is null) or
 (event='assistant.capability.completed' and reason_code='capability_success' and reason_code is not null and capability_event is not null
  and canonical_capability_event is not null and octet_length(canonical_capability_event)<=4096 and canonical_capability_event::jsonb=capability_event and reconciliation_event is null and canonical_reconciliation_event is null) or
 (event='assistant.operation.reconciliation' and reason_code='reconciliation_applied' and reason_code is not null and capability_event is null and canonical_capability_event is null
  and reconciliation_event is not null and canonical_reconciliation_event is not null and octet_length(canonical_reconciliation_event)<=4096 and canonical_reconciliation_event::jsonb=reconciliation_event)
);
create function public.assistant_durable_v1_reconcile_completed(p_workspace uuid,p_worker text,p_authority_version bigint,p_operation text,p_version bigint,
 p_receipt text,p_output_schema_version integer,p_schema_digest text,p_result text,p_audit text,p_event text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_effect_workers%rowtype;o public.assistant_operations%rowtype;b public.assistant_effect_outbox%rowtype;
 c public.assistant_registered_commands%rowtype;s public.assistant_registered_result_schemas%rowtype;r jsonb;e jsonb;t timestamptz;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_operation is null or p_operation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_authority_version is null or p_authority_version not between 1 and 9007199254740990
 or p_version is null or p_version not between 4 and 9007199254740990 or p_receipt is null or p_receipt !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_output_schema_version is null or p_output_schema_version<1 or p_schema_digest is null or p_schema_digest !~ '^[0-9a-f]{64}$'
 or p_result is null or octet_length(p_result)>32768 or p_audit is null or octet_length(p_audit)>4096
 or p_event is null or p_event !~ '^[0-9a-f]{64}$' then raise exception using errcode='22023',message='assistant_invalid_request';end if;
 r:=p_result::jsonb;e:=p_audit::jsonb;
 select * into g from public.assistant_registered_effect_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 select * into o from public.assistant_operations x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a and x.capability=g.capability for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 if o.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if o.state<>'reconciliation_required' or o.receipt_ref is distinct from p_receipt or o.failure_code is null or o.failure_code not in ('internal_safe','temporary_unavailable') then return jsonb_build_object('status','invalid_transition');end if;
 select * into c from public.assistant_registered_commands x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a
 and x.capability=g.capability and x.arguments_digest=o.arguments_digest and x.dispatcher_key=g.dispatcher_key and x.schema_version=g.schema_version for share;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_reconciliation_policies p where p.dispatcher_key=c.dispatcher_key and p.capability=c.capability and p.schema_version=c.schema_version and p.outcome='completed' for share;
 if not found then raise exception using errcode='42501',message='assistant_reconciliation_forbidden';end if;
 perform 1 from public.assistant_command_material m where m.workspace_id=p_workspace and m.command_ref=c.command_ref
 and m.schema_version=c.schema_version and m.arguments_digest=o.arguments_digest for share;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest
 and i.operation_version<o.version and i.event='assistant.operation.effect_applied' for share of i,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest
 and i.operation_version=1 and i.event='assistant.operation.reserved' for share of i,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest
 and i.operation_version=o.version and i.event='assistant.operation.recovery_required' and i.reason_code=o.failure_code for share of i,d;
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
 if jsonb_typeof(e) is distinct from 'object' or (select count(*) from jsonb_object_keys(e))<>8
 or not(e ?& array['event','requestId','actorId','workspaceId','operationRef','requestedOutcome','decision','reasonCode'])
 or e->'event' is distinct from to_jsonb('assistant.operation.reconciliation'::text)
 or e->'actorId' is distinct from to_jsonb(a::text) or e->'workspaceId' is distinct from to_jsonb(p_workspace::text)
 or e->'operationRef' is distinct from to_jsonb(p_operation) or e->'requestedOutcome' is distinct from to_jsonb('completed'::text)
 or e->'decision' is distinct from to_jsonb('completed'::text) or e->'reasonCode' is distinct from to_jsonb('reconciliation_applied'::text)
 or jsonb_typeof(e->'requestId') is distinct from 'string' or e->>'requestId' !~ '^[A-Za-z0-9_-]{16,128}$'
 or p_event is distinct from encode(extensions.digest(convert_to(format('["%s","%s",%s]',p_workspace::text,p_operation,p_version),'UTF8'),'sha256'),'hex')
 then raise exception using errcode='22023',message='assistant_reconciliation_audit_invalid';end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 -- The original effect is independently acknowledged and quarantined: its old lease is not authority.
 -- Current worker grant and resource locks above still precede the current clock check.
 insert into public.assistant_safe_results(workspace_id,operation_ref,actor_id,capability,arguments_digest,command_ref,dispatcher_key,input_schema_version,
 output_schema_version,receipt_ref,schema_digest,canonical_result,result_digest,created_at)
 values(p_workspace,p_operation,a,o.capability,o.arguments_digest,c.command_ref,c.dispatcher_key,c.schema_version,p_output_schema_version,p_receipt,
 p_schema_digest,p_result,encode(extensions.digest(convert_to(p_result,'UTF8'),'sha256'),'hex'),t);
 update public.assistant_operations set state='completed',version=version+1,updated_at=t,failure_code=null where workspace_id=p_workspace and operation_ref=p_operation returning * into o;
 insert into public.assistant_original_audit_intents(workspace_id,event_ref,operation_ref,operation_version,actor_id,capability,arguments_digest,event,request_ref,created_at,reason_code,reconciliation_event,canonical_reconciliation_event)
 values(p_workspace,p_event,p_operation,o.version,a,o.capability,o.arguments_digest,'assistant.operation.reconciliation',e->>'requestId',t,'reconciliation_applied',e,p_audit);
 insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,p_event,t,t);
 return jsonb_build_object('status','applied','eventRef',p_event,'auditIntentPersisted',true,'record',jsonb_build_object('operationRef',o.operation_ref,'idempotencyKey',o.idempotency_key,
 'binding',jsonb_build_object('actorId',o.actor_id,'workspaceId',o.workspace_id,'capability',o.capability,'argumentsDigest',o.arguments_digest),
 'state',o.state,'attempt',o.attempt,'version',o.version,'leaseExpiresAt',o.lease_expires_at,'effectReceiptRef',o.receipt_ref,
 'createdAt',o.created_at,'updatedAt',o.updated_at,'result',r));
end$$;

revoke all on function public.assistant_durable_v1_reconcile_completed(uuid,text,bigint,text,bigint,text,integer,text,text,text,text) from public,anon,authenticated,service_role;
create or replace function public.assistant_durable_v1_load_result(p_workspace uuid,p_worker text,p_authority_version bigint,p_operation text) returns jsonb
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
 and i.arguments_digest=o.arguments_digest and i.operation_version=o.version
 and ((i.event='assistant.capability.completed' and i.capability_event is not null) or
 (i.event='assistant.operation.reconciliation' and i.reason_code='reconciliation_applied' and i.reconciliation_event->>'decision'='completed'
 and i.reconciliation_event->>'requestedOutcome'='completed' and i.reconciliation_event is not null)) for share of i,d;
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
 'event',i.event,'requestId',i.request_ref,'createdAt',i.created_at,'reasonCode',i.reason_code) || case when i.event='assistant.capability.completed' then jsonb_build_object('capabilityEvent',i.capability_event) when i.event='assistant.operation.reconciliation' then jsonb_build_object('reconciliationEvent',i.reconciliation_event) else '{}'::jsonb end);
end$$;

commit;
