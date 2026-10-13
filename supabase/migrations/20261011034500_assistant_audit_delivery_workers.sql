-- Private scoped user-session worker registry; empty in production. No business
-- effect authority, service-principal wiring or client grants are introduced.
begin;
create table public.assistant_registered_audit_workers (
 workspace_id uuid not null references public.workspaces(id),
 worker_ref text not null check(worker_ref ~ '^[A-Za-z0-9_-]{24,200}$'),
 actor_id uuid not null references auth.users(id),
 capability text not null check(capability ~ '^[a-z][a-z0-9.:_-]{2,119}$'),
 authority_version bigint not null default 1 check(authority_version between 1 and 9007199254740991),
 active boolean not null default true,
 expires_at timestamptz not null,
 primary key(workspace_id,worker_ref)
);
alter table public.assistant_registered_audit_workers enable row level security;
alter table public.assistant_registered_audit_workers force row level security;
revoke all on public.assistant_registered_audit_workers from public,anon,authenticated,service_role;
create function public.assistant_audit_worker_grant_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if TG_OP='DELETE' then raise exception using errcode='22023',message='assistant_worker_grant_immutable';end if;
 if NEW.workspace_id<>OLD.workspace_id or NEW.worker_ref<>OLD.worker_ref or NEW.actor_id<>OLD.actor_id or NEW.capability<>OLD.capability
 or OLD.authority_version>=9007199254740991 or NEW.authority_version<>OLD.authority_version+1 then
  raise exception using errcode='22023',message='assistant_worker_grant_invalid';end if;
 return NEW;
end$$;
revoke all on function public.assistant_audit_worker_grant_guard() from public,anon,authenticated,service_role;
create trigger assistant_audit_worker_grant_version before update or delete on public.assistant_registered_audit_workers
 for each row execute function public.assistant_audit_worker_grant_guard();
alter table public.assistant_audit_delivery_outbox add column claim_ref text check(claim_ref is null or claim_ref ~ '^[0-9a-f]{64}$');
alter table public.assistant_audit_delivery_outbox add column receipt_ref text check(receipt_ref is null or receipt_ref ~ '^[A-Za-z0-9_-]{24,200}$');
alter table public.assistant_audit_delivery_outbox add column claim_authority_version bigint
 check(claim_authority_version is null or claim_authority_version between 1 and 9007199254740991);
alter table public.assistant_audit_delivery_outbox add constraint assistant_audit_claim_tuple_check check(
 (worker_ref is null and claim_ref is null and claim_authority_version is null and lease_expires_at is null) or
 (state='pending' and worker_ref is not null and worker_ref ~ '^[A-Za-z0-9_-]{24,200}$'
 and claim_ref is not null and claim_authority_version is not null and lease_expires_at is not null)
) not valid;

create function public.assistant_durable_v1_claim_audit(
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
 'event',i.event,'requestId',i.request_ref,'createdAt',i.created_at,'reasonCode',i.reason_code));
end$$;
revoke all on function public.assistant_durable_v1_claim_audit(uuid,text,bigint,text,bigint) from public,anon,authenticated,service_role;

create function public.assistant_durable_v1_ack_audit(
 p_workspace uuid,p_worker text,p_authority_version bigint,p_event text,p_version bigint,p_fence bigint,p_claim text,p_receipt text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_audit_workers%rowtype;d public.assistant_audit_delivery_outbox%rowtype;t timestamptz;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$' or p_event is null or p_event !~ '^[0-9a-f]{64}$'
 or p_authority_version is null or p_authority_version<1 or p_authority_version>=9007199254740991
 or p_version is null or p_version<1 or p_version>=9007199254740991
 or p_fence is null or p_fence<1 or p_fence>9007199254740991
 or p_claim is null or p_claim !~ '^[0-9a-f]{64}$'
 or p_receipt is null or p_receipt !~ '^[A-Za-z0-9_-]{24,200}$' then
  raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into g from public.assistant_registered_audit_workers x where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then return jsonb_build_object('status','forbidden');end if;
 perform 1 from public.assistant_original_audit_intents x where x.workspace_id=p_workspace and x.event_ref=p_event and x.capability=g.capability for share;
 if not found then return jsonb_build_object('status','not_found');end if;
 select * into d from public.assistant_audit_delivery_outbox x where x.workspace_id=p_workspace and x.event_ref=p_event for update;
 if not found then return jsonb_build_object('status','not_found');end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then return jsonb_build_object('status','forbidden');end if;
 if d.version<>p_version then return jsonb_build_object('status','version_conflict');end if;
 if d.state<>'pending' or d.worker_ref is distinct from p_worker or d.fence<>p_fence or d.claim_ref is distinct from p_claim
 or d.claim_authority_version is distinct from p_authority_version or d.lease_expires_at is null or t>=d.lease_expires_at then
  return jsonb_build_object('status','invalid_claim');end if;
 update public.assistant_audit_delivery_outbox set state='delivered',version=version+1,receipt_ref=p_receipt,
 worker_ref=null,claim_ref=null,claim_authority_version=null,lease_expires_at=null
 where workspace_id=p_workspace and event_ref=p_event returning * into d;
 return jsonb_build_object('status','applied','version',d.version);
end$$;
revoke all on function public.assistant_durable_v1_ack_audit(uuid,text,bigint,text,bigint,bigint,text,text) from public,anon,authenticated,service_role;
commit;
