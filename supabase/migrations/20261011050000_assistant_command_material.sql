-- Private validated producer material. No business worker/effect/public grants.
begin;
alter table public.assistant_registered_commands add constraint assistant_registered_command_material_binding_key
 unique(workspace_id,command_ref,schema_version,arguments_digest);
create table public.assistant_command_material (
 workspace_id uuid not null,
 command_ref text not null,
 schema_version integer not null check(schema_version>0),
 arguments_digest text not null check(arguments_digest ~ '^[0-9a-f]{64}$'),
 digest_algorithm text not null check(digest_algorithm='w3-canonical-json-localeCompare-sha256-v1'),
 producer_runtime text not null check(producer_runtime ~ '^[A-Za-z0-9._:-]{3,80}$'),
 canonical_arguments text not null check(octet_length(canonical_arguments) between 2 and 65536),
 arguments jsonb generated always as (canonical_arguments::jsonb) stored,
 created_at timestamptz not null,
 primary key(workspace_id,command_ref),
 foreign key(workspace_id,command_ref,schema_version,arguments_digest)
  references public.assistant_registered_commands(workspace_id,command_ref,schema_version,arguments_digest),
 check(jsonb_typeof(arguments)='object'),
 check(encode(extensions.digest(convert_to(canonical_arguments,'UTF8'),'sha256'),'hex')=arguments_digest)
);
alter table public.assistant_command_material enable row level security;
alter table public.assistant_command_material force row level security;
revoke all on public.assistant_command_material from public,anon,authenticated,service_role;
create function public.assistant_command_material_guard() returns trigger
 language plpgsql set search_path='' as $$
begin raise exception using errcode='42501',message='assistant_command_material_immutable';end$$;
revoke all on function public.assistant_command_material_guard() from public,anon,authenticated,service_role;
create trigger assistant_command_material_immutable before update or delete on public.assistant_command_material
 for each row execute function public.assistant_command_material_guard();

create function public.assistant_durable_v1_confirm_reserve_material(
 p_workspace uuid,p_confirmation text,p_capability text,p_digest text,p_key text,
 p_dispatcher text,p_command text,p_request text,p_material jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;r jsonb;c public.assistant_registered_commands%rowtype;m public.assistant_command_material%rowtype;
 version_id integer;canonical_value text;runtime_value text;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_material is null or jsonb_typeof(p_material)<>'object'
  or (select array_agg(key order by key) from jsonb_object_keys(p_material) key)
   is distinct from array['canonicalArguments','digestAlgorithm','producerRuntime','schemaVersion']::text[]
  or jsonb_typeof(p_material->'schemaVersion')<>'number'
  or (p_material->>'schemaVersion') !~ '^[1-9][0-9]{0,9}$'
  or (p_material->>'schemaVersion')::numeric>2147483647
  or p_material->>'digestAlgorithm' is distinct from 'w3-canonical-json-localeCompare-sha256-v1'
  or jsonb_typeof(p_material->'canonicalArguments')<>'string'
  or jsonb_typeof(p_material->'producerRuntime')<>'string' then
  raise exception using errcode='22023',message='assistant_invalid_command_material';end if;
 version_id:=(p_material->>'schemaVersion')::integer;
 canonical_value:=p_material->>'canonicalArguments';runtime_value:=p_material->>'producerRuntime';
 if octet_length(canonical_value) not between 2 and 65536 or runtime_value !~ '^[A-Za-z0-9._:-]{3,80}$'
  or jsonb_typeof(canonical_value::jsonb)<>'object'
  or encode(extensions.digest(convert_to(canonical_value,'UTF8'),'sha256'),'hex') is distinct from p_digest then
  raise exception using errcode='22023',message='assistant_invalid_command_material';end if;
 -- Reuse the reviewed locking/binding/confirmation/audit transaction. An error
 -- in the material insert below rolls back every write, including consumption.
 r:=public.assistant_durable_v1_confirm_reserve(p_workspace,p_confirmation,p_capability,p_digest,p_key,p_dispatcher,p_command,p_request);
 if r->>'status' not in ('reserved','existing') then return r;end if;
 select * into c from public.assistant_registered_commands x where x.workspace_id=p_workspace
  and x.command_ref=p_command and x.operation_ref=r->>'operationRef' and x.actor_id=a
  and x.capability=p_capability and x.arguments_digest=p_digest and x.dispatcher_key=p_dispatcher and x.schema_version=version_id for share;
 if not found then raise exception using errcode='22023',message='assistant_invalid_command_material';end if;
 if r->>'status'='reserved' then
  insert into public.assistant_command_material(workspace_id,command_ref,schema_version,arguments_digest,digest_algorithm,
   producer_runtime,canonical_arguments,created_at)
  values(p_workspace,p_command,version_id,p_digest,'w3-canonical-json-localeCompare-sha256-v1',runtime_value,canonical_value,c.created_at);
 else
  select * into m from public.assistant_command_material x where x.workspace_id=p_workspace and x.command_ref=p_command for share;
  if not found or m.schema_version<>version_id or m.arguments_digest<>p_digest or m.canonical_arguments<>canonical_value
   or m.digest_algorithm<>'w3-canonical-json-localeCompare-sha256-v1' then
   -- Legacy metadata-only reservations cannot be silently promoted on replay.
   raise exception using errcode='22023',message='assistant_command_material_conflict';end if;
 end if;
 return r; -- Closed reserved projection only; argument material stays private.
end$$;
revoke all on function public.assistant_durable_v1_confirm_reserve_material(uuid,text,text,text,text,text,text,text,jsonb)
 from public,anon,authenticated,service_role;
commit;
