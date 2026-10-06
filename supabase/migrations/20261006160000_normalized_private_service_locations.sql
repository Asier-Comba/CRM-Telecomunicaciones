-- Forward-only. Private normalized installation locations; no billing-address inference.
begin;
create table public.telecom_service_locations(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,customer_id uuid not null,version bigint not null default 1 check(version=1),
 label text not null check(char_length(btrim(label))between 1 and 100 and label!~'[[:cntrl:]]'),
 address_line1 text not null check(char_length(btrim(address_line1))between 1 and 300 and address_line1!~'[[:cntrl:]]'),
 address_line2 text check(address_line2 is null or(char_length(btrim(address_line2))between 1 and 150 and address_line2!~'[[:cntrl:]]')),
 postal_code text not null check(char_length(btrim(postal_code))between 1 and 20 and postal_code!~'[[:cntrl:]]'),
 city text not null check(char_length(btrim(city))between 1 and 100 and city!~'[[:cntrl:]]'),
 region text check(region is null or(char_length(btrim(region))between 1 and 100 and region!~'[[:cntrl:]]')),
 country text not null check(country~'^[A-Z]{2}$'),source text not null default'manual'check(source in('manual','import','integration')),
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),unique(id,workspace_id),foreign key(customer_id,workspace_id)references public.customers(id,workspace_id)
);
alter table public.telecom_service_installations add column location_id uuid;
alter table public.telecom_service_installations add foreign key(location_id,workspace_id)references public.telecom_service_locations(id,workspace_id);
create table public.telecom_service_location_assignments(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,service_id uuid not null,location_id uuid,details_version bigint not null,
 actor_user_id uuid not null references auth.users(id),assigned_at timestamptz not null default statement_timestamp(),
 foreign key(service_id,workspace_id)references public.telecom_services(id,workspace_id),foreign key(location_id,workspace_id)references public.telecom_service_locations(id,workspace_id),unique(workspace_id,service_id,details_version)
);
alter table public.telecom_service_locations enable row level security;alter table public.telecom_service_locations force row level security;
alter table public.telecom_service_location_assignments enable row level security;alter table public.telecom_service_location_assignments force row level security;
revoke all on public.telecom_service_locations,public.telecom_service_location_assignments from public,anon,authenticated,service_role;
create trigger telecom_location_immutable before update or delete on public.telecom_service_locations for each row execute function public.reject_activity_mutation();
create trigger telecom_location_assignment_immutable before update or delete on public.telecom_service_location_assignments for each row execute function public.reject_activity_mutation();
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''service_location.create'',''service_location.assign''))';end$$;
create function public.service_location_v1_validate(op text,inp jsonb)returns void language plpgsql security definer set search_path=''as $$declare req text[];opt text[]:=array[]::text[];k text;v jsonb;s text;lim int;begin
 case op when'service_location.create'then req:=array['command_id','customer_id','label','address_line1','address_line2','postal_code','city','region','country'];when'service_location.assign'then req:=array['command_id','service_id','location_id','expected_service_version','expected_details_version'];when'service_location.get'then req:=array['id'];when'service_location.list'then req:=array['customer_id'];opt:=array['limit','after_id'];else raise exception using errcode='22023',message='service_location_invalid_operation';end case;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or exists(select 1 from jsonb_object_keys(inp)x where not x=any(req||opt))or exists(select 1 from unnest(req)x where not inp?x)then raise exception using errcode='22023',message='service_location_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop s:=inp->>k;
 if v='null'::jsonb and k in('location_id','address_line2','region')then continue;end if;
 if k='id'or k like'%_id'then if jsonb_typeof(v)<>'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='service_location_invalid_input';end if;
 elsif k in('limit','expected_service_version','expected_details_version')then if jsonb_typeof(v)<>'number'or s!~'^(0|[1-9][0-9]{0,14})$'or(s::bigint=0 and k<>'expected_details_version')or(k='limit'and s::bigint>100)then raise exception using errcode='22023',message='service_location_invalid_input';end if;
 else lim:=case k when'address_line1'then 300 when'address_line2'then 150 when'postal_code'then 20 when'country'then 2 else 100 end;if jsonb_typeof(v)<>'string'or char_length(btrim(s))not between 1 and lim or s~'[[:cntrl:]]'or(k='country'and s!~'^[A-Z]{2}$')then raise exception using errcode='22023',message='service_location_invalid_input';end if;
 end if;end loop;end$$;
create function public.service_location_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;prior jsonb;l public.telecom_service_locations%rowtype;s public.telecom_services%rowtype;c public.telecom_contracts%rowtype;d public.telecom_service_installations%rowtype;cid uuid;rid uuid;customer uuid;ver bigint;sv bigint;state text;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.service_location_v1_validate(p_operation,p_input);if p_operation not in('service_location.create','service_location.assign')then raise exception using errcode='22023',message='service_location_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 if p_operation='service_location.create'then
 customer:=(p_input->>'customer_id')::uuid;perform 1 from public.customers where workspace_id=p_workspace_id and id=customer and status='active'for share;if not found then raise exception using errcode='P0002',message='service_location_not_found';end if;
 insert into public.telecom_service_locations(workspace_id,customer_id,label,address_line1,address_line2,postal_code,city,region,country,created_by_user_id)values(p_workspace_id,customer,p_input->>'label',p_input->>'address_line1',p_input->>'address_line2',p_input->>'postal_code',p_input->>'city',p_input->>'region',p_input->>'country',a)returning *into l;rid:=l.id;ver:=1;state:='created';
 else
 select contract_id into cid from public.telecom_services where workspace_id=p_workspace_id and id=(p_input->>'service_id')::uuid;if not found then raise exception using errcode='P0002',message='service_location_not_found';end if;
 select *into c from public.telecom_contracts where workspace_id=p_workspace_id and id=cid for update;
 select *into s from public.telecom_services where workspace_id=p_workspace_id and id=(p_input->>'service_id')::uuid and contract_id=c.id for update;if not found then raise exception using errcode='P0002',message='service_location_not_found';end if;
 if s.version<>(p_input->>'expected_service_version')::bigint then raise exception using errcode='40001',message='service_location_conflict';end if;
 if s.source<>'manual'or c.source<>'manual'then raise exception using errcode='42501',message='service_location_external_read_only';end if;
 if s.status in('ended','cancelled')or c.status in('ended','cancelled')or s.service_kind not in('fiber','fixed_voice','data_connectivity')then raise exception using errcode='22023',message='service_location_invalid_context';end if;
 customer:=s.customer_id;
 if p_input->>'location_id'is not null then select *into l from public.telecom_service_locations where workspace_id=p_workspace_id and id=(p_input->>'location_id')::uuid and customer_id=customer for share;if not found then raise exception using errcode='P0002',message='service_location_not_found';end if;end if;
 select *into d from public.telecom_service_installations where workspace_id=p_workspace_id and service_id=s.id for update;if coalesce(d.version,0)<>(p_input->>'expected_details_version')::bigint then raise exception using errcode='40001',message='service_location_conflict';end if;
 if d.version is null then insert into public.telecom_service_installations(service_id,workspace_id,location_id,created_by_user_id)values(s.id,p_workspace_id,l.id,a)returning *into d;else update public.telecom_service_installations set location_id=l.id where service_id=s.id returning *into d;end if;
 insert into public.telecom_service_location_assignments(workspace_id,service_id,location_id,details_version,actor_user_id)values(p_workspace_id,s.id,l.id,d.version,a);
 update public.telecom_services set display_name=display_name where id=s.id returning version into sv;rid:=s.id;ver:=d.version;state:='assigned';
 end if;
 prior:=jsonb_build_object('contract_version','service_location.v1','operation',p_operation,'command_id',p_input->>'command_id','id',rid,'customer_id',customer,'service_id',s.id,'service_version',sv,'version',ver,'status',state);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,rid,ver);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
 exception when unique_violation then raise exception using errcode='40001',message='service_location_conflict';when integrity_constraint_violation or data_exception then raise exception using errcode='22023',message='service_location_invalid_input';end$$;
create function public.service_location_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare rows jsonb;lim int;cursor uuid;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);perform public.service_location_v1_validate(p_operation,p_input);if p_operation not in('service_location.list','service_location.get')then raise exception using errcode='22023',message='service_location_invalid_operation';end if;
 lim:=case when p_operation='service_location.get'then 1 else coalesce((p_input->>'limit')::int,50)end;
 select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(select id,customer_id,version,label,country,source from public.telecom_service_locations where workspace_id=p_workspace_id and(p_operation<>'service_location.get'or id=(p_input->>'id')::uuid)and(p_operation<>'service_location.list'or customer_id=(p_input->>'customer_id')::uuid and(not p_input?'after_id'or id>(p_input->>'after_id')::uuid))order by id limit lim+1)x;
 if p_operation='service_location.get'then if jsonb_array_length(rows)=0 then raise exception using errcode='P0002',message='service_location_not_found';end if;return jsonb_build_object('contract_version','service_location.v1','operation',p_operation,'record',rows->0);end if;
 if jsonb_array_length(rows)>lim then rows:=rows-lim;cursor:=(rows->(lim-1)->>'id')::uuid;end if;
 return jsonb_build_object('contract_version','service_location.v1','operation',p_operation,'items',rows,'next_id',cursor);end$$;
revoke all on function public.service_location_v1_validate(text,jsonb),public.service_location_v1_command(uuid,text,jsonb),public.service_location_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.service_location_v1_command(uuid,text,jsonb),public.service_location_v1_query(uuid,text,jsonb)to authenticated;
create or replace function public.service_commercial_v1_guard()returns trigger
language plpgsql security definer set search_path=''as $$declare s public.telecom_services%rowtype;component public.telecom_plan_version_components%rowtype;begin
 if tg_op='DELETE'then raise exception using errcode='55000',message='service_commercial_history_frozen';end if;
 select *into s from public.telecom_services where workspace_id=new.workspace_id and id=new.service_id;
 if not found then raise exception using errcode='23514',message='service_commercial_invalid_context';end if;
 if tg_op='INSERT'then new.source:=s.source;end if;
 if tg_table_name='telecom_service_installations'then
 if s.service_kind not in('fiber','fixed_voice','data_connectivity')or(new.location_id is not null and not exists(select 1 from public.telecom_service_locations where workspace_id=new.workspace_id and id=new.location_id and customer_id=s.customer_id))or(new.installation_contact_id is not null and not exists(select 1 from public.contacts where workspace_id=new.workspace_id and id=new.installation_contact_id and customer_id=s.customer_id))then raise exception using errcode='23514',message='service_commercial_invalid_context';end if;
 if tg_op='UPDATE'and(new.service_id,new.workspace_id,new.source,new.created_by_user_id,new.created_at)is distinct from(old.service_id,old.workspace_id,old.source,old.created_by_user_id,old.created_at)then raise exception using errcode='55000',message='service_commercial_identity_frozen';end if;
 else
 select *into component from public.telecom_plan_version_components where workspace_id=new.workspace_id and plan_version_id=new.plan_version_id and position=new.component_position;
 if not found or component.component_kind<>'add_on'or component.service_kind<>s.service_kind or s.plan_version_id is distinct from new.plan_version_id or new.quantity>component.quantity or not exists(select 1 from public.telecom_plan_version_publications where workspace_id=new.workspace_id and plan_version_id=new.plan_version_id)then raise exception using errcode='23514',message='service_commercial_invalid_component';end if;
 if tg_op='UPDATE'and((to_jsonb(new)-array['version','updated_at','ended_on'])is distinct from(to_jsonb(old)-array['version','updated_at','ended_on'])or old.ended_on is not null or new.ended_on is null)then raise exception using errcode='55000',message='service_commercial_history_frozen';end if;
 if tg_op='INSERT'and exists(select 1 from public.telecom_service_addon_assignments x where x.workspace_id=new.workspace_id and x.service_id=new.service_id and x.component_position=new.component_position and(x.ended_on is null or new.valid_from<=x.ended_on))then raise exception using errcode='40001',message='service_commercial_period_conflict';end if;
 end if;return new;
end$$;
create or replace function public.service_commercial_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb
language plpgsql security definer set search_path=''as $$declare s public.telecom_services%rowtype;record jsonb;rows jsonb;lim int;cursor uuid;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);perform public.service_commercial_v1_validate(p_operation,p_input);if p_operation not in('service.installation_get','service.addon_list')then raise exception using errcode='22023',message='service_commercial_invalid_operation';end if;
 select *into s from public.telecom_services where workspace_id=p_workspace_id and id=(p_input->>'service_id')::uuid;if not found then raise exception using errcode='P0002',message='service_commercial_not_found';end if;
 if p_operation='service.installation_get'then
 select jsonb_build_object('version',version,'site_label',site_label,'location_id',location_id,'installation_contact_id',installation_contact_id,'activation_target_on',activation_target_on,'source',source)into record from public.telecom_service_installations where workspace_id=p_workspace_id and service_id=s.id;
 return jsonb_build_object('contract_version','telecom.service_commercial.v1','operation',p_operation,'service_id',s.id,'service_version',s.version,'service_kind',s.service_kind,'source',s.source,'plan_version_id',s.plan_version_id,'activated_on',s.activated_on,'ended_on',s.ended_on,'installation',record);
 end if;
 lim:=coalesce((p_input->>'limit')::int,50);
 select coalesce(jsonb_agg(to_jsonb(z)order by id),'[]'::jsonb)into rows from(
 select x.id,x.version,x.service_id,x.plan_version_id,x.component_position,p.addon_code,x.quantity,x.valid_from,x.valid_until,x.ended_on,x.source,
 case when x.ended_on is not null then'ended'when x.valid_from>(statement_timestamp()at time zone'Europe/Madrid')::date then'planned'when x.valid_until<(statement_timestamp()at time zone'Europe/Madrid')::date then'expired'else'current'end as timing_state
 from public.telecom_service_addon_assignments x join public.telecom_plan_version_components p on p.workspace_id=x.workspace_id and p.plan_version_id=x.plan_version_id and p.position=x.component_position
 where x.workspace_id=p_workspace_id and x.service_id=s.id and(not p_input?'after_id'or x.id>(p_input->>'after_id')::uuid)order by x.id limit lim+1)z;
 if jsonb_array_length(rows)>lim then rows:=rows-lim;cursor:=(rows->(lim-1)->>'id')::uuid;end if;
 return jsonb_build_object('contract_version','telecom.service_commercial.v1','operation',p_operation,'service_id',s.id,'as_of',(statement_timestamp()at time zone'Europe/Madrid')::date,'items',rows,'next_id',cursor);
end$$;

alter table public.product_reveal_audit_events drop constraint product_reveal_audit_events_entity_kind_check;
alter table public.product_reveal_audit_events add constraint product_reveal_audit_events_entity_kind_check check(entity_kind in('contact','customer','telecom_identifier','service_location'));
alter table public.product_reveal_audit_events drop constraint product_reveal_audit_events_field_categories_check;
alter table public.product_reveal_audit_events add constraint product_reveal_audit_events_field_categories_check check(cardinality(field_categories)between 1 and 6 and field_categories<@array['email','phone','fiscal_id','canonical_value','address_line1','address_line2','postal_code','city','region','country']::text[]);
create or replace function public.sensitive_v1_validate(inp jsonb)returns void language plpgsql set search_path=''as $$declare fields text[];begin
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or not inp?'entity_kind'or not inp?'entity_id'or not inp?'fields'or(select count(*)from jsonb_object_keys(inp))<>3 or inp->'entity_kind'not in('"contact"'::jsonb,'"customer"'::jsonb,'"telecom_identifier"'::jsonb,'"service_location"'::jsonb)or jsonb_typeof(inp->'entity_id')is distinct from 'string'or inp->>'entity_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(inp->'fields')is distinct from 'array'then raise exception using errcode='22023',message='sensitive_invalid_input';end if;
 if jsonb_array_length(inp->'fields')not between 1 and(case when inp->>'entity_kind'='service_location'then 6 else 2 end)or exists(select 1 from jsonb_array_elements(inp->'fields')v where jsonb_typeof(v)<>'string')then raise exception using errcode='22023',message='sensitive_invalid_input';end if;
 select array_agg(value order by value)into fields from jsonb_array_elements_text(inp->'fields');
 if(select count(distinct x)from unnest(fields)x)<>cardinality(fields)or(inp->>'entity_kind'='contact'and not fields<@array['email','phone']::text[])or(inp->>'entity_kind'='customer'and fields<>array['fiscal_id']::text[])or(inp->>'entity_kind'='telecom_identifier'and fields<>array['canonical_value']::text[])or(inp->>'entity_kind'='service_location'and not fields<@array['address_line1','address_line2','postal_code','city','region','country']::text[])then raise exception using errcode='22023',message='sensitive_field_not_allowed';end if;end$$;
create or replace function public.sensitive_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;r text;kind text;target uuid;fields text[];result_values jsonb:='{}';f text;email text;phone text;fiscal text;canonical text;loc public.telecom_service_locations%rowtype;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);perform public.sensitive_v1_validate(p_input);select role into r from public.workspace_members where workspace_id=p_workspace_id and user_id=a;
 kind:=p_input->>'entity_kind';target:=(p_input->>'entity_id')::uuid;
 if r not in('owner','admin','member')or(kind='customer'and r not in('owner','admin'))then raise exception using errcode='42501',message='sensitive_access_denied';end if;
 select array_agg(value order by value)into fields from jsonb_array_elements_text(p_input->'fields');
 if kind='service_location'then select l.*into loc from public.telecom_service_locations l join public.customers x on x.id=l.customer_id and x.workspace_id=l.workspace_id where l.workspace_id=p_workspace_id and l.id=target and x.status='active'for share of l,x;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;elsif kind='contact'then select c.email,c.phone into email,phone from public.contacts c join public.customers x on x.id=c.customer_id and x.workspace_id=c.workspace_id where c.workspace_id=p_workspace_id and c.id=target and c.status='active'and x.status='active'and c.status not in('ended','cancelled')for share of c,x;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;
 elsif kind='telecom_identifier'then select i.canonical_value into canonical from public.telecom_identifiers i join public.customers x on x.id=i.customer_id and x.workspace_id=i.workspace_id where i.workspace_id=p_workspace_id and i.id=target and x.status='active'for share of i,x;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;
 else perform 1 from public.customers where workspace_id=p_workspace_id and id=target and status='active'for share;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;select tax_id into fiscal from public.billing_customer_profiles where workspace_id=p_workspace_id and customer_id=target;end if;
 foreach f in array fields loop if kind='service_location'then result_values:=result_values||jsonb_build_object(f,to_jsonb(loc)->f);else result_values:=result_values||jsonb_build_object(f,case f when 'email'then email when 'phone'then phone when 'fiscal_id'then fiscal when 'canonical_value'then canonical end);end if;end loop;
 insert into public.product_reveal_audit_events(workspace_id,actor_id,entity_kind,entity_id,field_categories)values(p_workspace_id,a,kind,target,fields);
 return jsonb_build_object('contract_version','sensitive.v1','operation','sensitive.get','entity_kind',kind,'entity_id',target,'values',result_values);end$$;
commit;
