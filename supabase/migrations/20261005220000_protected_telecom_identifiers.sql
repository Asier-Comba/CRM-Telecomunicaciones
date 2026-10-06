-- TEL5 protected identifiers. Migration runner applies once; no backfill of raw identifiers.
-- Canonical values never enter general DTOs, command receipts, audits, search or activities.
begin;
create table public.telecom_identifiers(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),
 entity_kind text not null check(entity_kind in('line','service','contract')),
 line_id uuid,service_id uuid,contract_id uuid,customer_id uuid not null,operator_id uuid not null,
 identifier_kind text not null check(identifier_kind in('msisdn','circuit_reference','provider_account_reference','provider_contract_reference')),
 canonical_value text not null,
 masked_display text generated always as ('••••'||right(canonical_value,3)) stored,
 status text not null default 'active' check(status in('active','retired')),
 source text not null default 'manual' check(source in('manual','import','integration')),
 valid_from timestamptz not null default statement_timestamp(),valid_until timestamptz,
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),
 version bigint not null default 1 check(version>0),
 unique(id,workspace_id),
 foreign key(line_id,workspace_id)references public.telecom_lines(id,workspace_id),
 foreign key(service_id,workspace_id)references public.telecom_services(id,workspace_id),
 foreign key(contract_id,workspace_id)references public.telecom_contracts(id,workspace_id),
 foreign key(customer_id,workspace_id)references public.customers(id,workspace_id),
 foreign key(operator_id,workspace_id)references public.telecom_operators(id,workspace_id),
 check((entity_kind='line' and line_id is not null and service_id is null and contract_id is null and identifier_kind='msisdn')or
 (entity_kind='service'and service_id is not null and line_id is null and contract_id is null and identifier_kind='circuit_reference')or
 (entity_kind='contract'and contract_id is not null and line_id is null and service_id is null and identifier_kind in('provider_account_reference','provider_contract_reference'))),
 check((identifier_kind='msisdn'and canonical_value ~ '^\+[1-9][0-9]{7,14}$')or(identifier_kind<>'msisdn'and canonical_value ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{7,95}$')),
 check((status='active'and valid_until is null)or(status='retired'and valid_until>=valid_from))
);
create function public.identifier_v1_guard_row()returns trigger language plpgsql set search_path=''as $$declare c uuid;o uuid;begin
 if tg_op='UPDATE'then
 if (new.id,new.workspace_id,new.entity_kind,new.line_id,new.service_id,new.contract_id,new.customer_id,new.operator_id,new.identifier_kind,new.canonical_value,new.source,new.valid_from,new.created_by_user_id,new.created_at)is distinct from(old.id,old.workspace_id,old.entity_kind,old.line_id,old.service_id,old.contract_id,old.customer_id,old.operator_id,old.identifier_kind,old.canonical_value,old.source,old.valid_from,old.created_by_user_id,old.created_at)or old.status<>'active'or new.status<>'retired'or new.version<>old.version+1 then raise exception using errcode='55000',message='identifier_immutable_identity';end if;
 return new;end if;
 if new.entity_kind='line'then select s.customer_id,s.operator_id into c,o from public.telecom_lines l join public.telecom_services s on s.id=l.service_id and s.workspace_id=l.workspace_id where l.workspace_id=new.workspace_id and l.id=new.line_id;
 elsif new.entity_kind='service'then select customer_id,operator_id into c,o from public.telecom_services where workspace_id=new.workspace_id and id=new.service_id;
 else select customer_id,operator_id into c,o from public.telecom_contracts where workspace_id=new.workspace_id and id=new.contract_id;end if;
 if c is null or c<>new.customer_id or o<>new.operator_id then raise exception using errcode='23514',message='identifier_invalid_ancestry';end if;return new;end$$;
revoke all on function public.identifier_v1_guard_row()from public,anon,authenticated,service_role;
create trigger telecom_identifier_identity before insert or update on public.telecom_identifiers for each row execute function public.identifier_v1_guard_row();
create trigger telecom_identifier_no_delete before delete on public.telecom_identifiers for each row execute function public.reject_activity_mutation();
create unique index telecom_identifier_entity_active on public.telecom_identifiers(workspace_id,entity_kind,coalesce(line_id,service_id,contract_id),identifier_kind)where status='active';
create unique index telecom_identifier_msisdn_active on public.telecom_identifiers(workspace_id,canonical_value)where status='active'and identifier_kind='msisdn';
create unique index telecom_identifier_provider_active on public.telecom_identifiers(workspace_id,operator_id,identifier_kind,canonical_value)where status='active'and identifier_kind in('circuit_reference','provider_contract_reference');
-- An operator account may span several contracts; no incorrect uniqueness for that kind.
create index telecom_identifier_page on public.telecom_identifiers(workspace_id,entity_kind,coalesce(line_id,service_id,contract_id),id);
alter table public.telecom_identifiers enable row level security;
alter table public.telecom_identifiers force row level security;
revoke all on public.telecom_identifiers from public,anon,authenticated,service_role;
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''identifier.create_manual'',''identifier.retire''))';end$$;

create function public.identifier_v1_validate(op text,inp jsonb)returns void language plpgsql set search_path=''as $$declare required text[];optional text[];k text;v jsonb;s text;begin
 required:=case op when 'identifier.create_manual'then array['command_id','entity_kind','entity_id','identifier_kind','canonical_value']when 'identifier.retire'then array['command_id','id','expected_version']when 'identifier.list'then array['entity_kind','entity_id']when 'identifier.get'then array['id']else null end;
 optional:=case op when 'identifier.list'then array['limit','after_id','status']else array[]::text[]end;
 if required is null or inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or exists(select 1 from jsonb_object_keys(inp)x where not x=any(required||optional))or exists(select 1 from unnest(required)x where not inp?x)then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop
 s:=inp->>k;
 if k in('command_id','id','entity_id','after_id')then
  if jsonb_typeof(v)is distinct from 'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 elsif k in('expected_version','limit')then
  if jsonb_typeof(v)is distinct from 'number'or s!~'^[1-9][0-9]{0,14}$'or(k='limit'and s::bigint>100)then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 elsif k='entity_kind'then
  if jsonb_typeof(v)is distinct from 'string'or s not in('line','service','contract')then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 elsif k='identifier_kind'then
  if jsonb_typeof(v)is distinct from 'string'or s not in('msisdn','circuit_reference','provider_account_reference','provider_contract_reference')then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 elsif k='status'then
  if jsonb_typeof(v)is distinct from 'string'or s not in('active','retired')then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 elsif k='canonical_value'then
  if jsonb_typeof(v)is distinct from 'string'or char_length(s)not between 8 and 96 or s~'[[:cntrl:]]'then raise exception using errcode='22023',message='identifier_invalid_input';end if;
 end if;
 end loop;
 if op='identifier.create_manual'and not((inp->>'entity_kind'='line'and inp->>'identifier_kind'='msisdn'and inp->>'canonical_value'~'^\+[1-9][0-9]{7,14}$')or(inp->>'entity_kind'='service'and inp->>'identifier_kind'='circuit_reference'and inp->>'canonical_value'~'^[A-Za-z0-9][A-Za-z0-9._/-]{7,95}$')or(inp->>'entity_kind'='contract'and inp->>'identifier_kind'in('provider_account_reference','provider_contract_reference')and inp->>'canonical_value'~'^[A-Za-z0-9][A-Za-z0-9._/-]{7,95}$'))then raise exception using errcode='22023',message='identifier_invalid_input';end if;
end$$;
create function public.identifier_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;prior jsonb;d public.telecom_identifiers%rowtype;customer uuid;operator uuid;src text;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.identifier_v1_validate(p_operation,p_input);
 if p_operation not in('identifier.create_manual','identifier.retire')then raise exception using errcode='22023',message='identifier_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 if p_operation='identifier.create_manual'then
 if p_input->>'entity_kind'='line'then select s.customer_id,s.operator_id,l.source into customer,operator,src from public.telecom_lines l join public.telecom_services s on s.id=l.service_id and s.workspace_id=l.workspace_id join public.telecom_contracts c on c.id=s.contract_id and c.workspace_id=s.workspace_id join public.customers x on x.id=s.customer_id and x.workspace_id=s.workspace_id where l.workspace_id=p_workspace_id and l.id=(p_input->>'entity_id')::uuid and x.status='active'and l.status not in('ended','cancelled')and s.status not in('ended','cancelled')and c.status not in('ended','cancelled')for share of l,s,c,x;
 elsif p_input->>'entity_kind'='service'then select s.customer_id,s.operator_id,s.source into customer,operator,src from public.telecom_services s join public.telecom_contracts c on c.id=s.contract_id and c.workspace_id=s.workspace_id join public.customers x on x.id=s.customer_id and x.workspace_id=s.workspace_id where s.workspace_id=p_workspace_id and s.id=(p_input->>'entity_id')::uuid and x.status='active'and s.status not in('ended','cancelled')and c.status not in('ended','cancelled')for share of s,c,x;
 else select c.customer_id,c.operator_id,c.source into customer,operator,src from public.telecom_contracts c join public.customers x on x.id=c.customer_id and x.workspace_id=c.workspace_id where c.workspace_id=p_workspace_id and c.id=(p_input->>'entity_id')::uuid and x.status='active'and c.status not in('ended','cancelled')for share of c,x;end if;
 if customer is null then raise exception using errcode='P0002',message='identifier_not_found';end if;
 if src<>'manual'then raise exception using errcode='42501',message='identifier_external_read_only';end if;
 insert into public.telecom_identifiers(workspace_id,entity_kind,line_id,service_id,contract_id,customer_id,operator_id,identifier_kind,canonical_value,created_by_user_id)values(p_workspace_id,p_input->>'entity_kind',case when p_input->>'entity_kind'='line'then(p_input->>'entity_id')::uuid end,case when p_input->>'entity_kind'='service'then(p_input->>'entity_id')::uuid end,case when p_input->>'entity_kind'='contract'then(p_input->>'entity_id')::uuid end,customer,operator,p_input->>'identifier_kind',p_input->>'canonical_value',a)returning *into d;
 else
 select *into d from public.telecom_identifiers where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='identifier_not_found';end if;
 if d.source<>'manual'then raise exception using errcode='42501',message='identifier_external_read_only';end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='identifier_conflict';end if;
 if d.status<>'active'then raise exception using errcode='22023',message='identifier_invalid_transition';end if;
 update public.telecom_identifiers set status='retired',valid_until=statement_timestamp(),version=version+1 where id=d.id returning *into d;
 end if;
 prior:=jsonb_build_object('contract_version','identifiers.v1','operation',p_operation,'command_id',p_input->>'command_id','id',d.id,'version',d.version,'status',d.status);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,d.id,d.version);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
exception when unique_violation then raise exception using errcode='40001',message='identifier_conflict';when integrity_constraint_violation then raise exception using errcode='22023',message='identifier_invalid_input';
end$$;
create function public.identifier_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare rows jsonb;lim int;next_id uuid;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);perform public.identifier_v1_validate(p_operation,p_input);
 if p_operation not in('identifier.list','identifier.get')then raise exception using errcode='22023',message='identifier_invalid_operation';end if;
 lim:=case when p_operation='identifier.get'then 1 else coalesce((p_input->>'limit')::int,50)end;
 select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(select id,entity_kind,coalesce(line_id,service_id,contract_id)as entity_id,identifier_kind,masked_display,status,source,valid_from,valid_until,version from public.telecom_identifiers where workspace_id=p_workspace_id and(p_operation<>'identifier.get'or id=(p_input->>'id')::uuid)and(p_operation<>'identifier.list'or entity_kind=p_input->>'entity_kind'and coalesce(line_id,service_id,contract_id)=(p_input->>'entity_id')::uuid and(not p_input?'after_id'or id>(p_input->>'after_id')::uuid)and(not p_input?'status'or status=p_input->>'status'))order by id limit lim)x;
 if p_operation='identifier.get'then if jsonb_array_length(rows)=0 then return null;end if;return jsonb_build_object('contract_version','identifiers.v1','operation',p_operation,'record',rows->0);end if;
 next_id:=case when jsonb_array_length(rows)=lim then(rows->(lim-1)->>'id')::uuid end;
 return jsonb_build_object('contract_version','identifiers.v1','operation',p_operation,'items',rows,'next_id',next_id);
end$$;
revoke all on function public.identifier_v1_validate(text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.identifier_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.identifier_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.identifier_v1_command(uuid,text,jsonb),public.identifier_v1_query(uuid,text,jsonb)to authenticated;
alter table public.product_reveal_audit_events drop constraint product_reveal_audit_events_entity_kind_check;
alter table public.product_reveal_audit_events add constraint product_reveal_audit_events_entity_kind_check check(entity_kind in('contact','customer','telecom_identifier'));
alter table public.product_reveal_audit_events drop constraint product_reveal_audit_events_field_categories_check;
alter table public.product_reveal_audit_events add constraint product_reveal_audit_events_field_categories_check check(cardinality(field_categories)between 1 and 2 and field_categories<@array['email','phone','fiscal_id','canonical_value']::text[]);
create or replace function public.sensitive_v1_validate(inp jsonb)returns void language plpgsql set search_path=''as $$declare fields text[];begin
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or not inp?'entity_kind'or not inp?'entity_id'or not inp?'fields'or(select count(*)from jsonb_object_keys(inp))<>3 or inp->'entity_kind'not in('"contact"'::jsonb,'"customer"'::jsonb,'"telecom_identifier"'::jsonb)or jsonb_typeof(inp->'entity_id')is distinct from 'string'or inp->>'entity_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(inp->'fields')is distinct from 'array'then raise exception using errcode='22023',message='sensitive_invalid_input';end if;
 if jsonb_array_length(inp->'fields')not between 1 and 2 or exists(select 1 from jsonb_array_elements(inp->'fields')v where jsonb_typeof(v)<>'string')then raise exception using errcode='22023',message='sensitive_invalid_input';end if;
 select array_agg(value order by value)into fields from jsonb_array_elements_text(inp->'fields');
 if(select count(distinct x)from unnest(fields)x)<>cardinality(fields)or(inp->>'entity_kind'='contact'and not fields<@array['email','phone']::text[])or(inp->>'entity_kind'='customer'and fields<>array['fiscal_id']::text[])or(inp->>'entity_kind'='telecom_identifier'and fields<>array['canonical_value']::text[])then raise exception using errcode='22023',message='sensitive_field_not_allowed';end if;end$$;
create or replace function public.sensitive_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;r text;kind text;target uuid;fields text[];result_values jsonb:='{}';f text;email text;phone text;fiscal text;canonical text;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);perform public.sensitive_v1_validate(p_input);select role into r from public.workspace_members where workspace_id=p_workspace_id and user_id=a;
 kind:=p_input->>'entity_kind';target:=(p_input->>'entity_id')::uuid;
 if r not in('owner','admin','member')or(kind='customer'and r not in('owner','admin'))then raise exception using errcode='42501',message='sensitive_access_denied';end if;
 select array_agg(value order by value)into fields from jsonb_array_elements_text(p_input->'fields');
 if kind='contact'then select c.email,c.phone into email,phone from public.contacts c join public.customers x on x.id=c.customer_id and x.workspace_id=c.workspace_id where c.workspace_id=p_workspace_id and c.id=target and c.status='active'and x.status='active'and c.status not in('ended','cancelled')for share of c,x;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;
 elsif kind='telecom_identifier'then select i.canonical_value into canonical from public.telecom_identifiers i join public.customers x on x.id=i.customer_id and x.workspace_id=i.workspace_id where i.workspace_id=p_workspace_id and i.id=target and x.status='active'for share of i,x;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;
 else perform 1 from public.customers where workspace_id=p_workspace_id and id=target and status='active'for share;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;select tax_id into fiscal from public.billing_customer_profiles where workspace_id=p_workspace_id and customer_id=target;end if;
 foreach f in array fields loop result_values:=result_values||jsonb_build_object(f,case f when 'email'then email when 'phone'then phone when 'fiscal_id'then fiscal when 'canonical_value'then canonical end);end loop;
 insert into public.product_reveal_audit_events(workspace_id,actor_id,entity_kind,entity_id,field_categories)values(p_workspace_id,a,kind,target,fields);
 return jsonb_build_object('contract_version','sensitive.v1','operation','sensitive.get','entity_kind',kind,'entity_id',target,'values',result_values);end$$;
commit;
