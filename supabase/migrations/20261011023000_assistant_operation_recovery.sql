-- Inert operation admission and recovery quarantine. No effect authority,
-- completion/result store, verified reconciliation, worker or client grant.
begin;
alter table public.assistant_original_audit_intents drop constraint assistant_original_audit_intents_event_check;
alter table public.assistant_original_audit_intents add column reason_code text;
alter table public.assistant_original_audit_intents add constraint assistant_original_audit_event_reason_check check (
 (event='assistant.operation.reserved' and reason_code is null) or
 (event='assistant.operation.recovery_required' and reason_code is not null and reason_code in ('internal_safe','temporary_unavailable'))
);

create function public.assistant_durable_v1_load_operation(p_workspace uuid,p_operation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;o public.assistant_operations%rowtype;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_operation is null or p_operation !~ '^[A-Za-z0-9_-]{24,200}$' then
  raise exception using errcode='22023',message='assistant_invalid_request';end if;
 -- Scope/original actor precede materialization. Legacy metadata-only rows with
 -- no registered association and unsupported completed results stay unavailable.
 select x.* into o from public.assistant_operations x
 join public.assistant_registered_commands c on c.workspace_id=x.workspace_id and c.operation_ref=x.operation_ref
  and c.actor_id=x.actor_id and c.capability=x.capability and c.arguments_digest=x.arguments_digest
 join public.assistant_registered_dispatchers d on d.dispatcher_key=c.dispatcher_key and d.capability=c.capability and d.schema_version=c.schema_version
 where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a
 and x.state in ('reserved','executing','effect_applied','reconciliation_required')
 and exists(select 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox v using(workspace_id,event_ref)
  where i.workspace_id=x.workspace_id and i.operation_ref=x.operation_ref and i.operation_version=1 and i.event='assistant.operation.reserved')
 and exists(select 1 from public.assistant_effect_outbox b where b.workspace_id=x.workspace_id and b.operation_ref=x.operation_ref
  and b.command_ref=c.command_ref and b.dispatcher_key=c.dispatcher_key)
 for share of x,c,d;
 if not found then return null;end if;
 return jsonb_strip_nulls(jsonb_build_object('operationRef',o.operation_ref,'idempotencyKey',o.idempotency_key,
 'binding',jsonb_build_object('actorId',o.actor_id,'workspaceId',o.workspace_id,'capability',o.capability,'argumentsDigest',o.arguments_digest),
 'state',o.state,'attempt',o.attempt,'version',o.version,'leaseExpiresAt',o.lease_expires_at,
 'createdAt',o.created_at,'updatedAt',o.updated_at,'effectReceiptRef',o.receipt_ref,'failureCode',o.failure_code));
end$$;
revoke all on function public.assistant_durable_v1_load_operation(uuid,text) from public,anon,authenticated,service_role;

create function public.assistant_durable_v1_require_reconciliation(
 p_workspace uuid,p_operation text,p_capability text,p_digest text,p_version bigint,p_reason text,p_request text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;o public.assistant_operations%rowtype;b public.assistant_effect_outbox%rowtype;
 c public.assistant_registered_commands%rowtype;t timestamptz;event_id text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_operation is null or p_operation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_capability is null or p_capability !~ '^[a-z][a-z0-9.:_-]{2,119}$'
 or p_digest is null or p_digest !~ '^[0-9a-f]{64}$'
 or p_version is null or p_version<1 or p_version>=9007199254740991
 or p_reason is null or p_reason not in ('internal_safe','temporary_unavailable')
 or p_request is null or p_request !~ '^[A-Za-z0-9_-]{16,128}$' then
  raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into o from public.assistant_operations x where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 if o.capability<>p_capability or o.arguments_digest<>p_digest then return jsonb_build_object('status','binding_mismatch');end if;
 if o.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if o.state not in ('executing','effect_applied') then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox v using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.operation_version=1 and i.event='assistant.operation.reserved';
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select x.* into c from public.assistant_registered_commands x join public.assistant_registered_dispatchers d
 on d.dispatcher_key=x.dispatcher_key and d.capability=x.capability and d.schema_version=x.schema_version
 where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a
 and x.capability=p_capability and x.arguments_digest=p_digest for share of x,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select * into b from public.assistant_effect_outbox x where x.workspace_id=p_workspace and x.operation_ref=p_operation
 and x.command_ref=c.command_ref and x.dispatcher_key=c.dispatcher_key for update;
 if not found or b.state not in ('pending','dispatching','delivered') then return jsonb_build_object('status','invalid_transition');end if;
 -- Capture time after all blocking locks. Temporary-unavailable denotes actual
 -- lease expiry here; internal-safe denotes uncertainty, never verified absence.
 t:=clock_timestamp();
 if p_reason='temporary_unavailable' and t<o.lease_expires_at then return jsonb_build_object('status','invalid_transition');end if;
 if b.state<>'delivered' and (b.version>=9007199254740991 or b.fence>=9007199254740991) then
  raise exception using errcode='22023',message='assistant_version_exhausted';end if;
 update public.assistant_operations set state='reconciliation_required',version=version+1,failure_code=p_reason,updated_at=t
 where workspace_id=p_workspace and operation_ref=p_operation;
 if b.state<>'delivered' then
  update public.assistant_effect_outbox set state='reconciliation_required',version=version+1,fence=fence+1,
   worker_ref=null,failure_code=p_reason,updated_at=t where workspace_id=p_workspace and outbox_ref=b.outbox_ref;
 end if;
 -- Separately registered recovery identity; never reuse W3's verified outcome ID.
 event_id:=encode(extensions.digest(convert_to(jsonb_build_array('assistant.operation.recovery_required',p_workspace,p_operation,p_version+1)::text,'UTF8'),'sha256'),'hex');
 insert into public.assistant_original_audit_intents(workspace_id,event_ref,operation_ref,operation_version,actor_id,
 capability,arguments_digest,event,request_ref,created_at,reason_code)
 values(p_workspace,event_id,p_operation,p_version+1,a,p_capability,p_digest,'assistant.operation.recovery_required',p_request,t,p_reason);
 insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,event_id,t,t);
 return jsonb_build_object('status','applied','record',public.assistant_durable_v1_load_operation(p_workspace,p_operation));
end$$;
revoke all on function public.assistant_durable_v1_require_reconciliation(uuid,text,text,text,bigint,text,text) from public,anon,authenticated,service_role;
commit;
