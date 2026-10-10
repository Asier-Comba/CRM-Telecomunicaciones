-- W2 physical transaction candidate. No executable business dispatcher, grants,
-- worker, application route or full DurableDatabasePort is enabled here.
begin;

create table public.assistant_registered_dispatchers (
  dispatcher_key text primary key check (dispatcher_key ~ '^[a-z][a-z0-9.:_-]{2,119}$'),
  capability text not null check (capability ~ '^[a-z][a-z0-9.:_-]{2,119}$'),
  schema_version integer not null check (schema_version > 0),
  unique (dispatcher_key,capability,schema_version)
);
-- Empty after migration. Registration requires a reviewed, server-owned schema.
create table public.assistant_registered_commands (
  workspace_id uuid not null,
  command_ref text not null check (command_ref ~ '^[A-Za-z0-9_-]{24,200}$'),
  operation_ref text not null,
  actor_id uuid not null,
  capability text not null,
  arguments_digest text not null,
  dispatcher_key text not null,
  schema_version integer not null,
  created_at timestamptz not null,
  primary key (workspace_id,command_ref),
  unique (workspace_id,operation_ref),
  unique (workspace_id,operation_ref,command_ref,dispatcher_key),
  foreign key (dispatcher_key,capability,schema_version)
    references public.assistant_registered_dispatchers(dispatcher_key,capability,schema_version),
  foreign key (workspace_id,operation_ref,actor_id,capability,arguments_digest)
    references public.assistant_operations(workspace_id,operation_ref,actor_id,capability,arguments_digest)
);
-- Existing inert outbox rows have no registered command: do not silently promote
-- them. NOT VALID checks every new/changed row; prior rows require explicit repair.
alter table public.assistant_effect_outbox add constraint assistant_outbox_registered_command_fk
  foreign key (workspace_id,operation_ref,command_ref,dispatcher_key)
  references public.assistant_registered_commands(workspace_id,operation_ref,command_ref,dispatcher_key)
  not valid;

create table public.assistant_original_audit_intents (
  workspace_id uuid not null,
  event_ref text not null check (event_ref ~ '^[0-9a-f]{64}$'),
  operation_ref text not null,
  operation_version bigint not null check (operation_version between 1 and 9007199254740991),
  actor_id uuid not null,
  capability text not null,
  arguments_digest text not null,
  event text not null check (event = 'assistant.operation.reserved'),
  request_ref text not null check (request_ref ~ '^[A-Za-z0-9_-]{16,128}$'),
  created_at timestamptz not null,
  primary key (workspace_id,event_ref),
  unique (workspace_id,operation_ref,operation_version),
  foreign key (workspace_id,operation_ref,actor_id,capability,arguments_digest)
    references public.assistant_operations(workspace_id,operation_ref,actor_id,capability,arguments_digest)
);
create table public.assistant_audit_delivery_outbox (
  workspace_id uuid not null,
  event_ref text not null,
  state text not null default 'pending' check (state in ('pending','delivered')),
  attempt bigint not null default 0 check (attempt between 0 and 9007199254740991),
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  fence bigint not null default 0 check (fence between 0 and 9007199254740991),
  worker_ref text,
  lease_expires_at timestamptz,
  next_eligible_at timestamptz not null,
  created_at timestamptz not null,
  primary key (workspace_id,event_ref),
  foreign key (workspace_id,event_ref)
    references public.assistant_original_audit_intents(workspace_id,event_ref)
);

alter table public.assistant_registered_dispatchers enable row level security;
alter table public.assistant_registered_dispatchers force row level security;
alter table public.assistant_registered_commands enable row level security;
alter table public.assistant_registered_commands force row level security;
alter table public.assistant_original_audit_intents enable row level security;
alter table public.assistant_original_audit_intents force row level security;
alter table public.assistant_audit_delivery_outbox enable row level security;
alter table public.assistant_audit_delivery_outbox force row level security;
revoke all on public.assistant_registered_dispatchers,public.assistant_registered_commands,
  public.assistant_original_audit_intents,public.assistant_audit_delivery_outbox
  from public,anon,authenticated,service_role;

create function public.assistant_original_audit_guard_v1() returns trigger
language plpgsql set search_path='' as $$
begin
 raise exception using errcode='42501',message='assistant_original_audit_immutable';
end;
$$;
revoke all on function public.assistant_original_audit_guard_v1() from public,anon,authenticated,service_role;
create trigger assistant_original_audit_immutable before update or delete
  on public.assistant_original_audit_intents for each row
  execute function public.assistant_original_audit_guard_v1();

create function public.assistant_durable_v1_issue(
 p_workspace uuid,p_capability text,p_digest text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; t timestamptz; c public.assistant_confirmations%rowtype;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_capability is null or p_digest is null or p_digest !~ '^[0-9a-f]{64}$' then
  raise exception using errcode='22023',message='assistant_invalid_binding';
 end if;
 -- This also makes absent production registration a fail-closed prerequisite.
 perform 1 from public.assistant_registered_dispatchers d
 where d.capability=p_capability for share;
 if not found then raise exception using errcode='42501',message='assistant_dispatcher_unregistered';end if;
 t:=clock_timestamp();
 insert into public.assistant_confirmations(workspace_id,confirmation_ref,actor_id,capability,
  arguments_digest,issued_at,expires_at,updated_at)
 values(p_workspace,encode(extensions.gen_random_bytes(32),'hex'),a,p_capability,p_digest,
  t,t+interval '5 minutes',t) returning * into c;
 return jsonb_build_object('confirmationRef',c.confirmation_ref,'state',c.state,'version',c.version,
  'issuedAt',c.issued_at,'expiresAt',c.expires_at);
end;
$$;
revoke all on function public.assistant_durable_v1_issue(uuid,text,text) from public,anon,authenticated,service_role;

create function public.assistant_durable_v1_confirm_reserve(
 p_workspace uuid,p_confirmation text,p_capability text,p_digest text,p_key text,
 p_dispatcher text,p_command text,p_request text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; t timestamptz; c public.assistant_confirmations%rowtype;
 o public.assistant_operations%rowtype; cmd public.assistant_registered_commands%rowtype;
 schema_id integer; event_id text; outbox_id text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_confirmation is null or p_confirmation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_capability is null or p_digest is null or p_digest !~ '^[0-9a-f]{64}$'
 or p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,128}$'
 or p_dispatcher is null or p_command is null or p_command !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_request is null or p_request !~ '^[A-Za-z0-9_-]{16,128}$' then
  raise exception using errcode='22023',message='assistant_invalid_request';
 end if;
 select d.schema_version into schema_id from public.assistant_registered_dispatchers d
 where d.dispatcher_key=p_dispatcher and d.capability=p_capability for share;
 if not found then return jsonb_build_object('status','forbidden');end if;
 -- Serialize the unique reservation before taking a confirmation row lock. Hash
 -- collisions cause contention only; the exact tenant/key predicate is repeated.
 perform pg_advisory_xact_lock(hashtextextended(jsonb_build_array(p_workspace,p_capability,p_key)::text,0));
 select * into o from public.assistant_operations x
 where x.workspace_id=p_workspace and x.capability=p_capability and x.idempotency_key=p_key for update;
 if found then
  select * into cmd from public.assistant_registered_commands x
  where x.workspace_id=p_workspace and x.operation_ref=o.operation_ref;
  if o.actor_id<>a or o.arguments_digest<>p_digest or o.confirmation_ref is distinct from p_confirmation
   or cmd.command_ref is distinct from p_command or cmd.dispatcher_key is distinct from p_dispatcher
   or cmd.schema_version is distinct from schema_id then
   return jsonb_build_object('status','conflict');
  end if;
  return jsonb_build_object('status','existing','operationRef',o.operation_ref,'state',o.state,'version',o.version);
 end if;
 select * into c from public.assistant_confirmations x
 where x.workspace_id=p_workspace and x.confirmation_ref=p_confirmation for update;
 -- Time is measured after every potentially blocking lock; waiting cannot extend TTL.
 t:=clock_timestamp();
 if not found or c.actor_id<>a or c.capability<>p_capability or c.arguments_digest<>p_digest
  or c.state<>'issued' or t>=c.expires_at or c.version>=9007199254740991 then
  return jsonb_build_object('status','invalid_confirmation');
 end if;
 update public.assistant_confirmations set state='consumed',version=version+1,updated_at=t
 where workspace_id=p_workspace and confirmation_ref=p_confirmation;
 insert into public.assistant_operations(workspace_id,operation_ref,actor_id,capability,
  idempotency_key,arguments_digest,confirmation_ref,lease_expires_at,created_at,updated_at)
 values(p_workspace,encode(extensions.gen_random_bytes(32),'hex'),a,p_capability,p_key,p_digest,
  p_confirmation,t+interval '5 minutes',t,t) returning * into o;
 insert into public.assistant_registered_commands(workspace_id,command_ref,operation_ref,actor_id,
  capability,arguments_digest,dispatcher_key,schema_version,created_at)
 values(p_workspace,p_command,o.operation_ref,a,p_capability,p_digest,p_dispatcher,schema_id,t);
 outbox_id:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.assistant_effect_outbox(workspace_id,outbox_ref,operation_ref,actor_id,
  capability,arguments_digest,dispatcher_key,command_ref,created_at,updated_at)
 values(p_workspace,outbox_id,o.operation_ref,a,p_capability,p_digest,p_dispatcher,p_command,t,t);
 -- Reservation audit has its own registered identity, distinct from reconciliation.
 event_id:=encode(extensions.digest(convert_to(jsonb_build_array('assistant.operation.reserved',
  p_workspace,o.operation_ref,o.version)::text,'UTF8'),'sha256'),'hex');
 insert into public.assistant_original_audit_intents(workspace_id,event_ref,operation_ref,
  operation_version,actor_id,capability,arguments_digest,event,request_ref,created_at)
 values(p_workspace,event_id,o.operation_ref,o.version,a,p_capability,p_digest,
  'assistant.operation.reserved',p_request,t);
 insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at)
 values(p_workspace,event_id,t,t);
 return jsonb_build_object('status','reserved','operationRef',o.operation_ref,'state',o.state,'version',o.version);
end;
$$;
revoke all on function public.assistant_durable_v1_confirm_reserve(uuid,text,text,text,text,text,text,text)
 from public,anon,authenticated,service_role;
commit;
