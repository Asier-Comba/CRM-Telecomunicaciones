-- W3 durable v1 relational foundation only. No mutation routes, generic writer,
-- dispatcher, result store or production adapter is enabled by this DDL.
begin;

create table public.assistant_confirmations (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  confirmation_ref text not null check (
    char_length(confirmation_ref) between 24 and 200
    and confirmation_ref ~ '^[A-Za-z0-9_-]+$'),
  actor_id uuid not null references auth.users(id) on delete restrict,
  capability text not null check (
    char_length(capability) between 3 and 120
    and capability ~ '^[a-z][a-z0-9.:_-]+$'),
  arguments_digest text not null check (arguments_digest ~ '^[0-9a-f]{64}$'),
  digest_algorithm text not null default 'w3-canonical-json-localeCompare-sha256-v1'
    check (digest_algorithm='w3-canonical-json-localeCompare-sha256-v1'),
  state text not null default 'issued' check (state in ('issued','consumed','cancelled','expired')),
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id,confirmation_ref),
  unique (workspace_id,confirmation_ref,actor_id,capability,arguments_digest,digest_algorithm),
  check (expires_at>issued_at and expires_at<=issued_at+interval '5 minutes'),
  check (updated_at>=issued_at)
);

create table public.assistant_operations (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  operation_ref text not null check (
    char_length(operation_ref) between 24 and 200
    and operation_ref ~ '^[A-Za-z0-9_-]+$'),
  actor_id uuid not null references auth.users(id) on delete restrict,
  capability text not null check (
    char_length(capability) between 3 and 120
    and capability ~ '^[a-z][a-z0-9.:_-]+$'),
  idempotency_key text not null check (
    char_length(idempotency_key) between 16 and 128
    and idempotency_key ~ '^[A-Za-z0-9_-]+$'),
  arguments_digest text not null check (arguments_digest ~ '^[0-9a-f]{64}$'),
  digest_algorithm text not null default 'w3-canonical-json-localeCompare-sha256-v1'
    check (digest_algorithm='w3-canonical-json-localeCompare-sha256-v1'),
  confirmation_ref text,
  state text not null default 'reserved' check (state in (
    'reserved','executing','effect_applied','completed','failed_retryable',
    'failed_terminal','reconciliation_required')),
  attempt bigint not null default 1 check (attempt between 1 and 9007199254740991),
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  lease_expires_at timestamptz,
  receipt_ref text check (receipt_ref is null or (
    char_length(receipt_ref) between 24 and 200 and receipt_ref ~ '^[A-Za-z0-9_-]+$')),
  failure_code text check (failure_code is null or failure_code in (
    'temporary_unavailable','validation','conflict','access_revoked','internal_safe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,operation_ref),
  unique (workspace_id,capability,idempotency_key),
  unique (workspace_id,operation_ref,actor_id,capability,arguments_digest),
  unique (workspace_id,confirmation_ref),
  foreign key (workspace_id,confirmation_ref,actor_id,capability,arguments_digest,digest_algorithm)
    references public.assistant_confirmations(
      workspace_id,confirmation_ref,actor_id,capability,arguments_digest,digest_algorithm
    ) on delete restrict,
  check (updated_at>=created_at),
  check (lease_expires_at is null or lease_expires_at>created_at)
);

create table public.assistant_effect_outbox (
  workspace_id uuid not null,
  outbox_ref text not null check (
    char_length(outbox_ref) between 24 and 200 and outbox_ref ~ '^[A-Za-z0-9_-]+$'),
  operation_ref text not null,
  actor_id uuid not null,
  capability text not null,
  arguments_digest text not null check (arguments_digest ~ '^[0-9a-f]{64}$'),
  dispatcher_key text not null check (
    char_length(dispatcher_key) between 3 and 120 and dispatcher_key ~ '^[a-z][a-z0-9.:_-]+$'),
  command_ref text not null check (
    char_length(command_ref) between 24 and 200 and command_ref ~ '^[A-Za-z0-9_-]+$'),
  state text not null default 'pending' check (state in (
    'pending','dispatching','delivered','failed_retryable','failed_terminal','reconciliation_required')),
  attempt bigint not null default 1 check (attempt between 1 and 9007199254740991),
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  worker_ref text,
  fence bigint not null default 0 check (fence between 0 and 9007199254740991),
  lease_expires_at timestamptz,
  receipt_ref text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,outbox_ref),
  unique (workspace_id,operation_ref),
  foreign key (workspace_id,operation_ref,actor_id,capability,arguments_digest)
    references public.assistant_operations(
      workspace_id,operation_ref,actor_id,capability,arguments_digest
    ) on delete restrict,
  check (updated_at>=created_at)
);

create index assistant_operations_recovery_idx
  on public.assistant_operations (workspace_id,state,lease_expires_at,created_at)
  where state in ('reserved','executing','effect_applied','reconciliation_required');
create index assistant_outbox_recovery_idx
  on public.assistant_effect_outbox (workspace_id,state,lease_expires_at,created_at)
  where state in ('pending','dispatching','failed_retryable','reconciliation_required');
create index assistant_confirmations_expiry_idx
  on public.assistant_confirmations (workspace_id,expires_at)
  where state='issued';

alter table public.assistant_confirmations enable row level security;
alter table public.assistant_confirmations force row level security;
alter table public.assistant_operations enable row level security;
alter table public.assistant_operations force row level security;
alter table public.assistant_effect_outbox enable row level security;
alter table public.assistant_effect_outbox force row level security;
revoke all on public.assistant_confirmations,public.assistant_operations,
  public.assistant_effect_outbox from public,anon,authenticated,service_role;

comment on table public.assistant_confirmations is
  'W3 durable foundation, inert until server transaction adapter and native process acceptance.';
commit;
