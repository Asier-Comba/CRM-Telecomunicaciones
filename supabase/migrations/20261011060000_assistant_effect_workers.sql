-- Empty private worker registry and receipt admission only; no effect dispatcher.
begin;
create table public.assistant_registered_effect_workers (
 workspace_id uuid not null references public.workspaces(id),worker_ref text not null check(worker_ref ~ '^[A-Za-z0-9_-]{24,200}$'),
 actor_id uuid not null references auth.users(id),capability text not null,dispatcher_key text not null,schema_version integer not null,
 authority_version bigint not null default 1 check(authority_version between 1 and 9007199254740991),
 active boolean not null default true,expires_at timestamptz not null,
 primary key(workspace_id,worker_ref),
 foreign key(dispatcher_key,capability,schema_version) references public.assistant_registered_dispatchers(dispatcher_key,capability,schema_version)
);
alter table public.assistant_registered_effect_workers enable row level security;
alter table public.assistant_registered_effect_workers force row level security;
revoke all on public.assistant_registered_effect_workers from public,anon,authenticated,service_role;
create function public.assistant_effect_worker_grant_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='DELETE' or NEW.workspace_id<>OLD.workspace_id or NEW.worker_ref<>OLD.worker_ref or NEW.actor_id<>OLD.actor_id
 or NEW.capability<>OLD.capability or NEW.dispatcher_key<>OLD.dispatcher_key or NEW.schema_version<>OLD.schema_version
 or OLD.authority_version>=9007199254740991 or NEW.authority_version<>OLD.authority_version+1 then
 raise exception using errcode='22023',message='assistant_effect_grant_immutable';end if;return NEW;
end$$;
revoke all on function public.assistant_effect_worker_grant_guard() from public,anon,authenticated,service_role;
create trigger assistant_effect_worker_grant_version before update or delete on public.assistant_registered_effect_workers
 for each row execute function public.assistant_effect_worker_grant_guard();
alter table public.assistant_effect_outbox add column claim_ref text check(claim_ref is null or claim_ref ~ '^[0-9a-f]{64}$');
alter table public.assistant_effect_outbox add column claim_authority_version bigint check(claim_authority_version is null or claim_authority_version between 1 and 9007199254740991);
-- Existing metadata-only/legacy dispatching rows stay inert. Recovery77 keeps
-- the old proof as historical metadata while fencing/quarantining the claim.
alter table public.assistant_effect_outbox add constraint assistant_effect_claim_tuple_check check(
 (claim_ref is null and claim_authority_version is null) or
 (state='dispatching' and worker_ref ~ '^[A-Za-z0-9_-]{24,200}$' and worker_ref is not null and lease_expires_at is not null and claim_ref is not null and claim_authority_version is not null) or
 (state='reconciliation_required' and worker_ref is null and claim_ref is not null and claim_authority_version is not null)
) not valid;
alter table public.assistant_original_audit_intents drop constraint assistant_original_audit_event_reason_check;
alter table public.assistant_original_audit_intents add constraint assistant_original_audit_event_reason_check check(
 (event in ('assistant.operation.reserved','assistant.operation.effect_applied') and reason_code is null) or
 (event='assistant.operation.recovery_required' and reason_code in ('internal_safe','temporary_unavailable') and reason_code is not null)
);
create function public.assistant_durable_v1_effect_projection(b public.assistant_effect_outbox) returns jsonb
 language sql set search_path='' as $$select jsonb_strip_nulls(jsonb_build_object(
 'outboxRef',b.outbox_ref,'operationRef',b.operation_ref,'binding',jsonb_build_object('actorId',b.actor_id,'workspaceId',b.workspace_id,'capability',b.capability,'argumentsDigest',b.arguments_digest),
 'command',jsonb_build_object('dispatcher',b.dispatcher_key,'commandRef',b.command_ref),'state',b.state,'attempt',b.attempt,'version',b.version,
 'leaseExpiresAt',b.lease_expires_at,'receiptRef',b.receipt_ref,'createdAt',b.created_at,'updatedAt',b.updated_at));$$;
revoke all on function public.assistant_durable_v1_effect_projection(public.assistant_effect_outbox) from public,anon,authenticated,service_role;

create function public.assistant_durable_v1_claim_effect(p_workspace uuid,p_worker text,p_authority_version bigint,p_outbox text,p_version bigint)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_effect_workers%rowtype;o public.assistant_operations%rowtype;
 b public.assistant_effect_outbox%rowtype;t timestamptz;proof text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_outbox is null or p_outbox !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_authority_version is null or p_authority_version<1 or p_authority_version>=9007199254740991
 or p_version is null or p_version<1 or p_version>=9007199254740990 then raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into g from public.assistant_registered_effect_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 select x.* into o from public.assistant_operations x join public.assistant_effect_outbox z using(workspace_id,operation_ref)
 where x.workspace_id=p_workspace and z.outbox_ref=p_outbox and x.actor_id=a and x.capability=g.capability for update of x;
 if not found then return jsonb_build_object('status','not_found');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=o.operation_ref and i.operation_version=1 and i.event='assistant.operation.reserved'
 and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest for share of i,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_registered_commands c join public.assistant_command_material m using(workspace_id,command_ref,schema_version,arguments_digest)
 where c.workspace_id=p_workspace and c.operation_ref=o.operation_ref and c.actor_id=a and c.capability=g.capability
 and c.arguments_digest=o.arguments_digest and c.dispatcher_key=g.dispatcher_key and c.schema_version=g.schema_version for share of c,m;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select * into b from public.assistant_effect_outbox x where x.workspace_id=p_workspace and x.outbox_ref=p_outbox and x.operation_ref=o.operation_ref
 and x.actor_id=a and x.capability=g.capability and x.arguments_digest=o.arguments_digest and x.dispatcher_key=g.dispatcher_key for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 if b.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 -- An expired dispatching lease never establishes that an effect was absent.
 if o.state<>'executing' or o.version<2 or o.receipt_ref is not null or o.lease_expires_at is null or t>=o.lease_expires_at
 or b.state<>'pending' or b.worker_ref is not null or b.claim_ref is not null or b.receipt_ref is not null or b.fence<>0 then
 return jsonb_build_object('status','invalid_transition');end if;
 if b.attempt>=9007199254740991 or b.fence>=9007199254740991 then raise exception using errcode='22023',message='assistant_version_exhausted';end if;
 proof:=encode(extensions.gen_random_bytes(32),'hex');
 update public.assistant_effect_outbox set state='dispatching',worker_ref=p_worker,claim_ref=proof,claim_authority_version=p_authority_version,
 version=version+1,attempt=attempt+1,fence=fence+1,lease_expires_at=least(t+interval '5 minutes',o.lease_expires_at),updated_at=t
 where workspace_id=p_workspace and outbox_ref=p_outbox returning * into b;
 return jsonb_build_object('status','applied','record',public.assistant_durable_v1_effect_projection(b),'claimFence','v1:'||b.fence||':'||proof);
end$$;
revoke all on function public.assistant_durable_v1_claim_effect(uuid,text,bigint,text,bigint) from public,anon,authenticated,service_role;

create function public.assistant_durable_v1_ack_effect(p_workspace uuid,p_worker text,p_authority_version bigint,p_outbox text,
 p_version bigint,p_fence bigint,p_claim text,p_receipt text,p_request text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_effect_workers%rowtype;o public.assistant_operations%rowtype;
 b public.assistant_effect_outbox%rowtype;t timestamptz;event_id text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_outbox is null or p_outbox !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_authority_version is null or p_authority_version<1 or p_authority_version>=9007199254740991
 or p_version is null or p_version<1 or p_version>=9007199254740991 or p_fence is null or p_fence<1 or p_fence>9007199254740991
 or p_claim is null or p_claim !~ '^[0-9a-f]{64}$' or p_receipt is null or p_receipt !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_request is null or p_request !~ '^[A-Za-z0-9_-]{16,128}$' then raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into g from public.assistant_registered_effect_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 select x.* into o from public.assistant_operations x join public.assistant_effect_outbox z using(workspace_id,operation_ref)
 where x.workspace_id=p_workspace and z.outbox_ref=p_outbox and x.actor_id=a and x.capability=g.capability for update of x;
 if not found then return jsonb_build_object('status','not_found');end if;
 perform 1 from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
 where i.workspace_id=p_workspace and i.operation_ref=o.operation_ref and i.operation_version=1 and i.event='assistant.operation.reserved'
 and i.actor_id=a and i.capability=g.capability and i.arguments_digest=o.arguments_digest for share of i,d;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 perform 1 from public.assistant_registered_commands c join public.assistant_command_material m using(workspace_id,command_ref,schema_version,arguments_digest)
 where c.workspace_id=p_workspace and c.operation_ref=o.operation_ref and c.actor_id=a and c.capability=g.capability
 and c.arguments_digest=o.arguments_digest and c.dispatcher_key=g.dispatcher_key and c.schema_version=g.schema_version for share of c,m;
 if not found then return jsonb_build_object('status','invalid_transition');end if;
 select * into b from public.assistant_effect_outbox x where x.workspace_id=p_workspace and x.outbox_ref=p_outbox and x.operation_ref=o.operation_ref
 and x.actor_id=a and x.capability=g.capability and x.arguments_digest=o.arguments_digest and x.dispatcher_key=g.dispatcher_key for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then raise exception using errcode='42501',message='assistant_effect_forbidden';end if;
 if b.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if b.state<>'dispatching' or b.worker_ref is distinct from p_worker or b.claim_authority_version is distinct from p_authority_version
 or b.fence<>p_fence or b.claim_ref is distinct from p_claim or b.lease_expires_at is null or t>=b.lease_expires_at
 or o.state<>'executing' or o.version<2 or o.receipt_ref is not null or o.lease_expires_at is null or t>=o.lease_expires_at then
 return jsonb_build_object('status','invalid_transition');end if;
 if o.version>=9007199254740990 then raise exception using errcode='22023',message='assistant_version_exhausted';end if;
 update public.assistant_effect_outbox set state='delivered',receipt_ref=p_receipt,version=version+1,worker_ref=null,
 claim_ref=null,claim_authority_version=null,lease_expires_at=null,updated_at=t where workspace_id=p_workspace and outbox_ref=p_outbox returning * into b;
 update public.assistant_operations set state='effect_applied',receipt_ref=p_receipt,version=version+1,updated_at=t
 where workspace_id=p_workspace and operation_ref=o.operation_ref;
 event_id:=encode(extensions.digest(convert_to(jsonb_build_array('assistant.operation.effect_applied',p_workspace,o.operation_ref,o.version+1)::text,'UTF8'),'sha256'),'hex');
 insert into public.assistant_original_audit_intents(workspace_id,event_ref,operation_ref,operation_version,actor_id,capability,arguments_digest,event,request_ref,created_at,reason_code)
 values(p_workspace,event_id,o.operation_ref,o.version+1,a,g.capability,o.arguments_digest,'assistant.operation.effect_applied',p_request,t,null);
 insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,event_id,t,t);
 return jsonb_build_object('status','applied','record',public.assistant_durable_v1_effect_projection(b));
end$$;
revoke all on function public.assistant_durable_v1_ack_effect(uuid,text,bigint,text,bigint,bigint,text,text,text) from public,anon,authenticated,service_role;
commit;
