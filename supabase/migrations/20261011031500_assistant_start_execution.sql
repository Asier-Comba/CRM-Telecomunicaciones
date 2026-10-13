-- Lifecycle transition only. No effect claim, worker fence, business handler,
-- result completion or public/client grant is introduced.
begin;
create function public.assistant_durable_v1_start_execution(
 p_workspace uuid,p_operation text,p_capability text,p_digest text,p_version bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;o public.assistant_operations%rowtype;c public.assistant_registered_commands%rowtype;
 b public.assistant_effect_outbox%rowtype;t timestamptz;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_operation is null or p_operation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_capability is null or p_capability !~ '^[a-z][a-z0-9.:_-]{2,119}$'
 or p_digest is null or p_digest !~ '^[0-9a-f]{64}$'
 or p_version is null or p_version<1 or p_version>=9007199254740991 then
  raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into o from public.assistant_operations x
 where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 if o.capability<>p_capability or o.arguments_digest<>p_digest then return jsonb_build_object('status','binding_mismatch');end if;
 if o.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if o.state<>'reserved' or o.receipt_ref is not null then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox v using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=p_operation and i.operation_version=1 and i.event='assistant.operation.reserved'
 and i.actor_id=a and i.capability=p_capability and i.arguments_digest=p_digest for share of i,v;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select x.* into c from public.assistant_registered_commands x join public.assistant_registered_dispatchers d
 on d.dispatcher_key=x.dispatcher_key and d.capability=x.capability and d.schema_version=x.schema_version
 where x.workspace_id=p_workspace and x.operation_ref=p_operation and x.actor_id=a
 and x.capability=p_capability and x.arguments_digest=p_digest for share of x,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select * into b from public.assistant_effect_outbox x where x.workspace_id=p_workspace and x.operation_ref=p_operation
 and x.command_ref=c.command_ref and x.dispatcher_key=c.dispatcher_key and x.actor_id=a
 and x.capability=p_capability and x.arguments_digest=p_digest for update;
 if not found or b.state<>'pending' or b.worker_ref is not null or b.receipt_ref is not null or b.fence<>0 then
  return jsonb_build_object('status','invalid_transition');end if;
 -- Time is authoritative only after all blocking locks, including the outbox.
 t:=clock_timestamp();
 if t>=o.lease_expires_at then return jsonb_build_object('status','invalid_transition');end if;
 update public.assistant_operations set state='executing',version=version+1,lease_expires_at=t+interval '5 minutes',
 failure_code=null,updated_at=t where workspace_id=p_workspace and operation_ref=p_operation;
 return jsonb_build_object('status','applied','record',public.assistant_durable_v1_load_operation(p_workspace,p_operation));
end$$;
revoke all on function public.assistant_durable_v1_start_execution(uuid,text,text,text,bigint) from public,anon,authenticated,service_role;
commit;
