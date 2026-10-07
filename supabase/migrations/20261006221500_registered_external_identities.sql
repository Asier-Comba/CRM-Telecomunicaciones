-- W2 takeover: registered metadata identities only. No provider calls or credentials.
begin;
alter table public.import_jobs drop constraint import_jobs_import_kind_check;
alter table public.import_jobs add constraint import_jobs_import_kind_check check(import_kind in('customers','contacts','operators','plans','plan_versions','entitlements','bundle_components','contracts','services','lines','renewals','permanences','sims','portabilities','cases','service_locations','equipment','protected_identifiers'));
create table public.external_identity_integrations(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),
 integration_key text not null check(integration_key~'^[a-z][a-z0-9._-]{0,63}$'),
 provider_code text not null check(provider_code in('generic.telecom.v1','generic.crm.v1','local.import.v1')),
 display_name text not null check(char_length(btrim(display_name))between 1 and 160 and display_name!~'[[:cntrl:]]'),
 source text not null check(source in('import','integration')),status text not null default'active'check(status='active'),version bigint not null default 1 check(version=1),
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),
 unique(id,workspace_id),unique(workspace_id,integration_key)
);
create table public.external_entity_identities(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,integration_id uuid not null,
 external_kind text not null check(external_kind~'^[a-z][a-z0-9._-]{0,63}$'),external_id text not null check(external_id~'^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
 local_entity_kind text not null check(local_entity_kind in('customer','contact','operator','plan','plan_version','contract','service','line','renewal','permanence','sim','portability','case','service_location','equipment')),
 local_entity_id uuid not null,source text not null check(source in('import','integration')),status text not null default'active'check(status in('active','retired')),
 version bigint not null default 1 check(version between 1 and 999999999999999),created_by_user_id uuid not null references auth.users(id),
 created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),retired_at timestamptz,
 unique(id,workspace_id),unique(workspace_id,integration_id,external_kind,external_id),
 foreign key(integration_id,workspace_id)references public.external_identity_integrations(id,workspace_id),check((status='retired')=(retired_at is not null))
);
create index external_identity_local_page on public.external_entity_identities(workspace_id,local_entity_kind,local_entity_id,id);
alter table public.external_identity_integrations enable row level security;alter table public.external_identity_integrations force row level security;
alter table public.external_entity_identities enable row level security;alter table public.external_entity_identities force row level security;
revoke all on public.external_identity_integrations,public.external_entity_identities from public,anon,authenticated,service_role;
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''external_identity.integration_register'',''external_identity.bind'',''external_identity.retire''))';end$$;
create function public.external_identity_v1_target(w uuid,k text,i uuid)returns boolean language plpgsql security definer set search_path=''as $$declare t text;found_id uuid;begin
 t:=case k when'customer'then'customers'when'contact'then'contacts'when'operator'then'telecom_operators'when'plan'then'telecom_plans'when'plan_version'then'telecom_plan_versions'when'contract'then'telecom_contracts'when'service'then'telecom_services'when'line'then'telecom_lines'when'renewal'then'telecom_renewals'when'permanence'then'telecom_commitments'when'sim'then'telecom_sims'when'portability'then'telecom_portabilities'when'case'then'service_cases'when'service_location'then'telecom_service_locations'when'equipment'then'telecom_equipment'else null end;
 if t is null then return false;end if;
 execute format('select id from public.%I where workspace_id=$1 and id=$2 for share',t)into found_id using w,i;
 return found_id is not null;
end$$;
create function public.external_identity_v1_guard()returns trigger language plpgsql security definer set search_path=''as $$declare src text;begin
 if tg_op='UPDATE'and(new.workspace_id,new.integration_id,new.external_kind,new.external_id,new.local_entity_kind,new.local_entity_id,new.source,new.created_by_user_id,new.created_at)is distinct from(old.workspace_id,old.integration_id,old.external_kind,old.external_id,old.local_entity_kind,old.local_entity_id,old.source,old.created_by_user_id,old.created_at)then raise exception using errcode='23514',message='external_identity_immutable_context';end if;
 if tg_op='UPDATE'and(old.status<>'active'or new.status<>'retired'or new.version<>old.version+1)then raise exception using errcode='23514',message='external_identity_invalid_transition';end if;
 if not public.external_identity_v1_target(new.workspace_id,new.local_entity_kind,new.local_entity_id)then raise exception using errcode='23503',message='external_identity_target_not_found';end if;
 select source into src from public.external_identity_integrations where workspace_id=new.workspace_id and id=new.integration_id;
 if src is distinct from new.source then raise exception using errcode='23514',message='external_identity_source_mismatch';end if;return new;
end$$;
create trigger external_identity_context_guard before insert or update on public.external_entity_identities for each row execute function public.external_identity_v1_guard();
create function public.external_identity_v1_validate(op text,inp jsonb)returns void language plpgsql security definer set search_path=''as $$declare req text[];opt text[]:=array[]::text[];k text;v jsonb;s text;begin
 case op
 when'external_identity.integration_register'then req:=array['command_id','integration_key','provider_code','display_name','source'];
 when'external_identity.bind'then req:=array['command_id','integration_id','external_kind','external_id','local_entity_kind','local_entity_id'];
 when'external_identity.retire'then req:=array['command_id','id','expected_version'];
 when'external_identity.list'then req:=array['local_entity_kind','local_entity_id'];opt:=array['integration_id','status','limit','after_id'];
 when'external_identity.integration_list'then req:=array[]::text[];opt:=array['limit','after_id'];
 else raise exception using errcode='22023',message='external_identity_invalid_operation';end case;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or exists(select 1 from jsonb_object_keys(inp)x where not x=any(req||opt))or exists(select 1 from unnest(req)x where not inp?x)then raise exception using errcode='22023',message='external_identity_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop s:=inp->>k;
 if k in('command_id','id','integration_id','local_entity_id','after_id')then if jsonb_typeof(v)<>'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='external_identity_invalid_input';end if;
 elsif k in('limit','expected_version')then if jsonb_typeof(v)<>'number'or s!~'^[1-9][0-9]{0,14}$'or(k='limit'and s::bigint>100)then raise exception using errcode='22023',message='external_identity_invalid_input';end if;
 else if jsonb_typeof(v)<>'string'or(k in('integration_key','external_kind')and s!~'^[a-z][a-z0-9._-]{0,63}$')or(k='external_id'and s!~'^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')or(k='provider_code'and s not in('generic.telecom.v1','generic.crm.v1','local.import.v1'))or(k='source'and s not in('import','integration'))or(k='status'and s not in('active','retired'))or(k='display_name'and(char_length(btrim(s))not between 1 and 160 or s~'[[:cntrl:]]'))or(k='local_entity_kind'and s not in('customer','contact','operator','plan','plan_version','contract','service','line','renewal','permanence','sim','portability','case','service_location','equipment'))then raise exception using errcode='22023',message='external_identity_invalid_input';end if;end if;end loop;
end$$;
create function public.external_identity_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;prior jsonb;g public.external_identity_integrations%rowtype;e public.external_entity_identities%rowtype;begin
 a:=public.billing_v1_assert_scope(p_workspace_id);perform public.external_identity_v1_validate(p_operation,p_input);
 if p_operation not in('external_identity.integration_register','external_identity.bind','external_identity.retire')then raise exception using errcode='22023',message='external_identity_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 if p_operation='external_identity.integration_register'then
 insert into public.external_identity_integrations(workspace_id,integration_key,provider_code,display_name,source,created_by_user_id)values(p_workspace_id,p_input->>'integration_key',p_input->>'provider_code',p_input->>'display_name',p_input->>'source',a)returning *into g;
 prior:=jsonb_build_object('contract_version','external_identity.v1','operation',p_operation,'command_id',p_input->>'command_id','id',g.id,'version',g.version,'status',g.status,'external_effect','disabled');
 elsif p_operation='external_identity.bind'then
 select *into g from public.external_identity_integrations where workspace_id=p_workspace_id and id=(p_input->>'integration_id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='external_identity_integration_not_found';end if;
 if not public.external_identity_v1_target(p_workspace_id,p_input->>'local_entity_kind',(p_input->>'local_entity_id')::uuid)then raise exception using errcode='P0002',message='external_identity_target_not_found';end if;
 select *into e from public.external_entity_identities where workspace_id=p_workspace_id and integration_id=g.id and external_kind=p_input->>'external_kind'and external_id=p_input->>'external_id'for update;
 if found then
 if e.local_entity_kind<>p_input->>'local_entity_kind'or e.local_entity_id<>(p_input->>'local_entity_id')::uuid or e.status<>'active'then raise exception using errcode='40001',message='external_identity_binding_conflict';end if;
 else insert into public.external_entity_identities(workspace_id,integration_id,external_kind,external_id,local_entity_kind,local_entity_id,source,created_by_user_id)values(p_workspace_id,g.id,p_input->>'external_kind',p_input->>'external_id',p_input->>'local_entity_kind',(p_input->>'local_entity_id')::uuid,g.source,a)returning *into e;end if;
 else
 select *into e from public.external_entity_identities where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='external_identity_not_found';end if;
 if e.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='external_identity_conflict';end if;
 if e.status<>'active'then raise exception using errcode='22023',message='external_identity_invalid_transition';end if;
 update public.external_entity_identities set status='retired',retired_at=statement_timestamp(),updated_at=statement_timestamp(),version=version+1 where id=e.id returning *into e;
 end if;
 if p_operation<>'external_identity.integration_register'then prior:=jsonb_build_object('contract_version','external_identity.v1','operation',p_operation,'command_id',p_input->>'command_id','id',e.id,'version',e.version,'status',e.status,'external_effect','disabled');end if;
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,(prior->>'id')::uuid,(prior->>'version')::bigint);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
 exception when unique_violation then raise exception using errcode='40001',message='external_identity_conflict';when integrity_constraint_violation or data_exception then raise exception using errcode='22023',message='external_identity_invalid_input';end$$;
create function public.external_identity_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare rows jsonb;lim int;cursor uuid;begin
 perform public.billing_v1_assert_scope(p_workspace_id);perform public.external_identity_v1_validate(p_operation,p_input);
 lim:=coalesce((p_input->>'limit')::int,20);
 if p_operation='external_identity.integration_list'then
 select coalesce(jsonb_agg(to_jsonb(x)order by x.id),'[]'::jsonb)into rows from(select id,integration_key,provider_code,display_name,source,status,version,created_at,'disabled'::text as external_effect from public.external_identity_integrations where workspace_id=p_workspace_id and(p_input->>'after_id'is null or id>(p_input->>'after_id')::uuid)order by id limit lim+1)x;
 elsif p_operation='external_identity.list'then
 if not public.external_identity_v1_target(p_workspace_id,p_input->>'local_entity_kind',(p_input->>'local_entity_id')::uuid)then raise exception using errcode='P0002',message='external_identity_target_not_found';end if;
 select coalesce(jsonb_agg(to_jsonb(x)order by x.id),'[]'::jsonb)into rows from(select id,integration_id,external_kind,external_id,local_entity_kind,local_entity_id,source,status,version,created_at,updated_at,retired_at from public.external_entity_identities where workspace_id=p_workspace_id and local_entity_kind=p_input->>'local_entity_kind'and local_entity_id=(p_input->>'local_entity_id')::uuid and(p_input->>'integration_id'is null or integration_id=(p_input->>'integration_id')::uuid)and(p_input->>'status'is null or status=p_input->>'status')and(p_input->>'after_id'is null or id>(p_input->>'after_id')::uuid)order by id limit lim+1)x;
 else raise exception using errcode='22023',message='external_identity_invalid_operation';end if;
 if jsonb_array_length(rows)>lim then rows:=rows-lim;cursor:=(rows->(lim-1)->>'id')::uuid;end if;
 return jsonb_build_object('contract_version','external_identity.v1','operation',p_operation,'items',rows,'next_id',cursor);
end$$;
revoke all on function public.external_identity_v1_target(uuid,text,uuid),public.external_identity_v1_guard(),public.external_identity_v1_validate(text,jsonb),public.external_identity_v1_command(uuid,text,jsonb),public.external_identity_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.external_identity_v1_command(uuid,text,jsonb),public.external_identity_v1_query(uuid,text,jsonb)to authenticated;
commit;
