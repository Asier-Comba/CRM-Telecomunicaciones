-- TEL5 bounded commercial catalogue. Runner applies once; no historical terms inferred.
begin;
alter table public.telecom_operators add column version bigint not null default 1 check(version>0);
alter table public.telecom_plans add column version bigint not null default 1 check(version>0);
-- NULL preserves unknown legacy plan provenance; only new canonical create marks manual.
alter table public.telecom_plans add column source text check(source in('manual','import','integration'));
create trigger telecom_operator_version before insert or update on public.telecom_operators for each row execute function public.manage_task_version();
create trigger telecom_plan_version_counter before insert or update on public.telecom_plans for each row execute function public.manage_task_version();
alter table public.telecom_plan_versions add column one_time_amount_minor bigint check(one_time_amount_minor>=0);
alter table public.telecom_plan_versions add column is_bundle boolean;
alter table public.telecom_plan_versions add column recurring_period text check(recurring_period='month');
create table public.telecom_entitlement_codes(code text primary key,value_kind text not null check(value_kind in('integer','boolean','text')),unit text,allowed_values text[],unique(code,value_kind));
insert into public.telecom_entitlement_codes values('data_mib','integer','MiB',null);
insert into public.telecom_entitlement_codes values('unlimited_data','boolean',null,null);
insert into public.telecom_entitlement_codes values('voice_minutes','integer','minutes',null);
insert into public.telecom_entitlement_codes values('unlimited_voice','boolean',null,null);
insert into public.telecom_entitlement_codes values('sms_count','integer','messages',null);
insert into public.telecom_entitlement_codes values('unlimited_sms','boolean',null,null);
insert into public.telecom_entitlement_codes values('download_mbps','integer','Mbps',null);
insert into public.telecom_entitlement_codes values('upload_mbps','integer','Mbps',null);
insert into public.telecom_entitlement_codes values('access_technology','text',null,array['fiber_ftth','cable_hfc','dsl','4g','5g','satellite','other']::text[]);
insert into public.telecom_entitlement_codes values('roaming_zone','text',null,array['domestic','eea','international']::text[]);
insert into public.telecom_entitlement_codes values('commitment_months','integer','months',null);
insert into public.telecom_entitlement_codes values('promotion_months','integer','months',null);
create trigger telecom_entitlement_code_frozen before update or delete on public.telecom_entitlement_codes for each row execute function public.reject_telecom_plan_version_mutation();
create table public.telecom_plan_version_components(
 workspace_id uuid not null,plan_version_id uuid not null,position integer not null check(position between 1 and 8),
 component_kind text not null check(component_kind in('base','add_on')),
 service_kind text not null check(service_kind in('mobile','fiber','fixed_voice','data_connectivity','other')),
 addon_code text check(addon_code in('extra_data','international_calling','roaming','static_ip','device_financing')),
 quantity integer not null check(quantity between 1 and 100),
 primary key(plan_version_id,workspace_id,position),foreign key(plan_version_id,workspace_id)references public.telecom_plan_versions(id,workspace_id),
 check((component_kind='base'and addon_code is null)or(component_kind='add_on'and addon_code is not null))
);
create table public.telecom_plan_version_entitlements(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,plan_version_id uuid not null,component_position integer,
 code text not null,value_kind text not null,integer_value bigint,boolean_value boolean,text_value text,
 foreign key(plan_version_id,workspace_id)references public.telecom_plan_versions(id,workspace_id),
 foreign key(plan_version_id,workspace_id,component_position)references public.telecom_plan_version_components(plan_version_id,workspace_id,position),
 foreign key(code,value_kind)references public.telecom_entitlement_codes(code,value_kind),
 check((value_kind='integer'and integer_value is not null and integer_value between 0 and 1000000000000 and boolean_value is null and text_value is null)or(value_kind='boolean'and integer_value is null and boolean_value is not null and text_value is null)or(value_kind='text'and integer_value is null and boolean_value is null and text_value is not null)),
 check(code<>'access_technology'or text_value in('fiber_ftth','cable_hfc','dsl','4g','5g','satellite','other')),
 check(code<>'roaming_zone'or text_value in('domestic','eea','international')),
 check(code not in('commitment_months','promotion_months')or integer_value<=60),
 check(code not in('download_mbps','upload_mbps')or integer_value between 1 and 1000000)
);
create unique index telecom_entitlement_scope_unique on public.telecom_plan_version_entitlements(workspace_id,plan_version_id,code,coalesce(component_position,0));
create table public.telecom_plan_version_publications(
 plan_version_id uuid primary key,workspace_id uuid not null,published_by_user_id uuid not null references auth.users(id),published_at timestamptz not null default statement_timestamp(),
 foreign key(plan_version_id,workspace_id)references public.telecom_plan_versions(id,workspace_id)
);
create trigger telecom_plan_publication_frozen before update or delete on public.telecom_plan_version_publications for each row execute function public.reject_telecom_plan_version_mutation();
create function public.catalog_v1_guard_commercial_fact()returns trigger language plpgsql set search_path=''as $$begin
 if tg_op<>'INSERT'or exists(select 1 from public.telecom_plan_version_publications where workspace_id=new.workspace_id and plan_version_id=new.plan_version_id)or not exists(select 1 from public.telecom_plan_versions where workspace_id=new.workspace_id and id=new.plan_version_id and is_bundle is not null)then raise exception using errcode='55000',message='catalog_version_frozen';end if;return new;end$$;
create trigger telecom_component_frozen before insert or update or delete on public.telecom_plan_version_components for each row execute function public.catalog_v1_guard_commercial_fact();
create trigger telecom_entitlement_frozen before insert or update or delete on public.telecom_plan_version_entitlements for each row execute function public.catalog_v1_guard_commercial_fact();
alter table public.telecom_entitlement_codes enable row level security;alter table public.telecom_entitlement_codes force row level security;revoke all on public.telecom_entitlement_codes from public,anon,authenticated,service_role;
alter table public.telecom_plan_version_components enable row level security;alter table public.telecom_plan_version_components force row level security;revoke all on public.telecom_plan_version_components from public,anon,authenticated,service_role;
alter table public.telecom_plan_version_entitlements enable row level security;alter table public.telecom_plan_version_entitlements force row level security;revoke all on public.telecom_plan_version_entitlements from public,anon,authenticated,service_role;
alter table public.telecom_plan_version_publications enable row level security;alter table public.telecom_plan_version_publications force row level security;revoke all on public.telecom_plan_version_publications from public,anon,authenticated,service_role;
revoke all on public.telecom_operators,public.telecom_plans,public.telecom_plan_versions from service_role;
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''operator.create'',''operator.update'',''operator.activate'',''operator.deactivate'',''plan.create'',''plan.update_metadata'',''plan.change_status'',''plan_version.create''))';end$$;
create function public.catalog_v1_validate(op text,inp jsonb)returns void language plpgsql set search_path=''as $$declare required text[];k text;v jsonb;s text;c jsonb;e jsonb;pos int;registry public.telecom_entitlement_codes%rowtype;begin
 case op
 when 'operator.create'then required:=array['command_id','code','display_name']::text[];
 when 'operator.update'then required:=array['command_id','id','expected_version','display_name']::text[];
 when 'operator.activate'then required:=array['command_id','id','expected_version']::text[];
 when 'operator.deactivate'then required:=array['command_id','id','expected_version']::text[];
 when 'plan.create'then required:=array['command_id','operator_id','code','display_name','service_kind']::text[];
 when 'plan.update_metadata'then required:=array['command_id','id','expected_version','display_name']::text[];
 when 'plan.change_status'then required:=array['command_id','id','expected_version','status']::text[];
 when 'plan_version.create'then required:=array['command_id','plan_id','expected_version','valid_from','valid_until','currency','recurring_amount_minor','one_time_amount_minor','is_bundle','components','entitlements']::text[];
 when 'plan_version.terms_get'then required:=array['id']::text[];
 else raise exception using errcode='22023',message='catalog_invalid_operation';end case;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>8192 or(select array_agg(key order by key)from jsonb_object_keys(inp)key)is distinct from(select array_agg(x order by x)from unnest(required)x)then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop s:=inp->>k;
 if k='valid_until'and v='null'::jsonb then continue;end if;
 if k in('command_id','id','operator_id','plan_id')then if jsonb_typeof(v)is distinct from 'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 elsif k='expected_version'then if jsonb_typeof(v)is distinct from 'number'or s!~'^[1-9][0-9]{0,14}$'then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 elsif k in('recurring_amount_minor','one_time_amount_minor')then if jsonb_typeof(v)is distinct from 'string'or s!~'^(0|[1-9][0-9]{0,18})$'or s::numeric>9223372036854775807 then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 elsif k in('valid_from','valid_until')then if jsonb_typeof(v)is distinct from 'string'or s!~'^(19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$'or to_char(s::date,'YYYY-MM-DD')<>s then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 elsif k='is_bundle'then if jsonb_typeof(v)is distinct from 'boolean'then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 elsif k in('components','entitlements')then if jsonb_typeof(v)is distinct from 'array'or jsonb_array_length(v)>(case k when 'components'then 8 else 24 end)then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 else if jsonb_typeof(v)is distinct from 'string'or char_length(s)not between 1 and 200 or s~'[[:cntrl:]]'or(k='code'and s!~'^[a-z0-9][a-z0-9_-]{0,63}$')or(k='currency'and s!~'^[A-Z]{3}$')or(k='service_kind'and s not in('mobile','fiber','fixed_voice','data_connectivity','other'))or(k='status'and s not in('active','retired'))then raise exception using errcode='22023',message='catalog_invalid_input';end if;end if;end loop;
 if op<>'plan_version.create'then return;end if;
 if inp->>'valid_until'is not null and(inp->>'valid_until')::date<(inp->>'valid_from')::date then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 if jsonb_array_length(inp->'components')<1 then raise exception using errcode='22023',message='catalog_invalid_input';end if;
 pos:=0;
 for c in select value from jsonb_array_elements(inp->'components')loop
 pos:=pos+1;
 if jsonb_typeof(c)<>'object'or(select array_agg(key order by key)from jsonb_object_keys(c)key)is distinct from array['addon_code','component_kind','quantity','service_kind']::text[]or c->>'component_kind'not in('base','add_on')or c->>'service_kind'not in('mobile','fiber','fixed_voice','data_connectivity','other')or jsonb_typeof(c->'quantity')is distinct from 'number'or c->>'quantity'!~'^[1-9][0-9]{0,2}$'or(c->>'quantity')::int>100 or(c->>'component_kind'='base'and c->'addon_code'<>'null'::jsonb)or(c->>'component_kind'='add_on'and coalesce(c->>'addon_code','')not in('extra_data','international_calling','roaming','static_ip','device_financing'))then raise exception using errcode='22023',message='catalog_invalid_component';end if;
 end loop;
 if(inp->'components'->0->>'component_kind')<>'base'or((inp->>'is_bundle')::boolean and(select sum((x->>'quantity')::int)from jsonb_array_elements(inp->'components')x where x->>'component_kind'='base')<2)or(not(inp->>'is_bundle')::boolean and(select sum((x->>'quantity')::int)from jsonb_array_elements(inp->'components')x where x->>'component_kind'='base')<>1)then raise exception using errcode='22023',message='catalog_invalid_bundle';end if;
 for e in select value from jsonb_array_elements(inp->'entitlements')loop
 if jsonb_typeof(e)<>'object'or(select array_agg(key order by key)from jsonb_object_keys(e)key)is distinct from array['boolean_value','code','component_position','integer_value','text_value']::text[]or jsonb_typeof(e->'code')is distinct from 'string'then raise exception using errcode='22023',message='catalog_invalid_entitlement';end if;
 select *into registry from public.telecom_entitlement_codes where code=e->>'code';if not found then raise exception using errcode='22023',message='catalog_invalid_entitlement';end if;
 if e->'component_position'<>'null'::jsonb and(jsonb_typeof(e->'component_position')is distinct from 'number'or e->>'component_position'!~'^[1-8]$'or(e->>'component_position')::int>pos)then raise exception using errcode='22023',message='catalog_invalid_entitlement';end if;
 if(registry.value_kind='integer'and(jsonb_typeof(e->'integer_value')is distinct from 'string'or e->>'integer_value'!~'^(0|[1-9][0-9]{0,12})$'or(e->>'integer_value')::numeric>1000000000000 or e->'boolean_value'<>'null'::jsonb or e->'text_value'<>'null'::jsonb))or(registry.value_kind='boolean'and(jsonb_typeof(e->'boolean_value')is distinct from 'boolean'or e->'integer_value'<>'null'::jsonb or e->'text_value'<>'null'::jsonb))or(registry.value_kind='text'and(jsonb_typeof(e->'text_value')is distinct from 'string'or not(e->>'text_value'=any(registry.allowed_values))or e->'integer_value'<>'null'::jsonb or e->'boolean_value'<>'null'::jsonb))then raise exception using errcode='22023',message='catalog_invalid_entitlement';end if;
 if e->>'code'in('commitment_months','promotion_months')and(e->>'integer_value')::bigint>60 or e->>'code'in('download_mbps','upload_mbps')and(e->>'integer_value')::bigint not between 1 and 1000000 then raise exception using errcode='22023',message='catalog_invalid_entitlement';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(inp->'entitlements')entry group by entry->>'code',entry->>'component_position'having count(*)>1)then raise exception using errcode='22023',message='catalog_duplicate_entitlement';end if;
 if exists(select 1 from jsonb_array_elements(inp->'entitlements')a join jsonb_array_elements(inp->'entitlements')b on(a->>'component_position')is not distinct from(b->>'component_position')where a->'boolean_value'='true'::jsonb and(a->>'code',b->>'code')in(('unlimited_data','data_mib'),('unlimited_voice','voice_minutes'),('unlimited_sms','sms_count')))then raise exception using errcode='22023',message='catalog_conflicting_entitlement';end if;
end$$;
create function public.catalog_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;role_code text;prior jsonb;o public.telecom_operators%rowtype;p public.telecom_plans%rowtype;v public.telecom_plan_versions%rowtype;entity uuid;ver bigint;state text;c jsonb;e jsonb;pos int:=0;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);select role into role_code from public.workspace_members where workspace_id=p_workspace_id and user_id=a;if role_code not in('owner','admin')then raise exception using errcode='42501',message='catalog_admin_required';end if;
 perform public.catalog_v1_validate(p_operation,p_input);if p_operation='plan_version.terms_get'then raise exception using errcode='22023',message='catalog_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 if p_operation='operator.create'then
 insert into public.telecom_operators(workspace_id,code,display_name,source,created_by_user_id)values(p_workspace_id,p_input->>'code',p_input->>'display_name','manual',a)returning *into o;entity:=o.id;ver:=o.version;state:=o.status;
 elsif p_operation like 'operator.%'then
 select *into o from public.telecom_operators where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;if not found then raise exception using errcode='P0002',message='catalog_not_found';end if;
 if o.source<>'manual'then raise exception using errcode='42501',message='catalog_external_read_only';end if;if o.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='catalog_conflict';end if;
 if(p_operation='operator.activate'and o.status<>'inactive')or(p_operation='operator.deactivate'and o.status<>'active')then raise exception using errcode='22023',message='catalog_invalid_transition';end if;
 update public.telecom_operators set display_name=case when p_operation='operator.update'then p_input->>'display_name'else display_name end,status=case p_operation when 'operator.activate'then 'active'when 'operator.deactivate'then 'inactive'else status end where id=o.id returning *into o;entity:=o.id;ver:=o.version;state:=o.status;
 elsif p_operation='plan.create'then
 select *into o from public.telecom_operators where workspace_id=p_workspace_id and id=(p_input->>'operator_id')::uuid for share;if not found then raise exception using errcode='P0002',message='catalog_not_found';end if;if o.status<>'active'or o.source<>'manual'then raise exception using errcode='42501',message='catalog_operator_unavailable';end if;
 insert into public.telecom_plans(workspace_id,operator_id,code,display_name,service_kind,source,created_by_user_id)values(p_workspace_id,o.id,p_input->>'code',p_input->>'display_name',p_input->>'service_kind','manual',a)returning *into p;entity:=p.id;ver:=p.version;state:=p.status;
 else
 select *into p from public.telecom_plans where workspace_id=p_workspace_id and id=(case when p_operation='plan_version.create'then p_input->>'plan_id'else p_input->>'id'end)::uuid for update;if not found then raise exception using errcode='P0002',message='catalog_not_found';end if;
 if p.source is distinct from 'manual'then raise exception using errcode='42501',message='catalog_external_or_unknown_origin';end if;if p.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='catalog_conflict';end if;
 if p_operation='plan_version.create'then
 perform 1 from public.telecom_operators where workspace_id=p_workspace_id and id=p.operator_id and status='active'for share;if not found or p.status<>'active'then raise exception using errcode='22023',message='catalog_parent_inactive';end if;
 if p_input->'components'->0->>'service_kind'<>p.service_kind then raise exception using errcode='22023',message='catalog_primary_kind_mismatch';end if;
 insert into public.telecom_plan_versions(workspace_id,plan_id,version_number,valid_from,valid_until,currency,recurring_amount_minor,one_time_amount_minor,is_bundle,recurring_period,created_by_user_id)select p_workspace_id,p.id,coalesce(max(version_number),0)+1,(p_input->>'valid_from')::date,(p_input->>'valid_until')::date,p_input->>'currency',(p_input->>'recurring_amount_minor')::bigint,(p_input->>'one_time_amount_minor')::bigint,(p_input->>'is_bundle')::boolean,'month',a from public.telecom_plan_versions where workspace_id=p_workspace_id and plan_id=p.id returning *into v;
 for c in select value from jsonb_array_elements(p_input->'components')loop pos:=pos+1;insert into public.telecom_plan_version_components values(p_workspace_id,v.id,pos,c->>'component_kind',c->>'service_kind',c->>'addon_code',(c->>'quantity')::int);end loop;
 for e in select value from jsonb_array_elements(p_input->'entitlements')loop insert into public.telecom_plan_version_entitlements(workspace_id,plan_version_id,component_position,code,value_kind,integer_value,boolean_value,text_value)select p_workspace_id,v.id,(e->>'component_position')::int,e->>'code',value_kind,(e->>'integer_value')::bigint,(e->>'boolean_value')::boolean,e->>'text_value'from public.telecom_entitlement_codes where code=e->>'code';end loop;
 insert into public.telecom_plan_version_publications values(v.id,p_workspace_id,a,statement_timestamp());update public.telecom_plans set updated_at=statement_timestamp()where id=p.id returning *into p;
 entity:=v.id;ver:=1;state:='published';
 else
 if p_operation='plan.change_status'and p.status=p_input->>'status'then raise exception using errcode='22023',message='catalog_invalid_transition';end if;
 update public.telecom_plans set display_name=case when p_operation='plan.update_metadata'then p_input->>'display_name'else display_name end,status=case when p_operation='plan.change_status'then p_input->>'status'else status end where id=p.id returning *into p;entity:=p.id;ver:=p.version;state:=p.status;
 end if;end if;
 prior:=jsonb_build_object('contract_version','catalog.v1','operation',p_operation,'command_id',p_input->>'command_id','id',entity,'version',ver,'status',state);
 if p_operation='plan_version.create'then prior:=prior||jsonb_build_object('plan_id',p.id,'parent_version',p.version,'version_number',v.version_number);end if;
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,entity,ver);update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
 exception when unique_violation or exclusion_violation then raise exception using errcode='40001',message='catalog_conflict';when integrity_constraint_violation or data_exception then raise exception using errcode='22023',message='catalog_invalid_input';
end$$;
create function public.catalog_v1_terms_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare v public.telecom_plan_versions%rowtype;components jsonb;entitlements jsonb;sealed boolean;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);perform public.catalog_v1_validate('plan_version.terms_get',p_input);
 select *into v from public.telecom_plan_versions where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;if not found then return null;end if;
 sealed:=exists(select 1 from public.telecom_plan_version_publications where workspace_id=p_workspace_id and plan_version_id=v.id);
 select coalesce(jsonb_agg(to_jsonb(x)order by position),'[]'::jsonb)into components from(select position,component_kind,service_kind,addon_code,quantity from public.telecom_plan_version_components where workspace_id=p_workspace_id and plan_version_id=v.id order by position)x;
 select coalesce(jsonb_agg(to_jsonb(x)order by coalesce(component_position,0),code),'[]'::jsonb)into entitlements from(select e.code,e.component_position,e.value_kind,e.integer_value::text as integer_value,e.boolean_value,e.text_value,c.unit from public.telecom_plan_version_entitlements e join public.telecom_entitlement_codes c on c.code=e.code where e.workspace_id=p_workspace_id and e.plan_version_id=v.id)x;
 return jsonb_build_object('contract_version','catalog.v1','operation','plan_version.terms_get','record',jsonb_build_object('id',v.id,'plan_id',v.plan_id,'version_number',v.version_number,'terms_status',case when sealed then 'published'else 'unrecorded'end,'currency',v.currency,'recurring_period',v.recurring_period,'valid_from',v.valid_from,'valid_until',v.valid_until,'recurring_amount_minor',v.recurring_amount_minor::text,'one_time_amount_minor',v.one_time_amount_minor::text,'is_bundle',v.is_bundle,'components',components,'entitlements',entitlements));
end$$;
revoke all on function public.catalog_v1_guard_commercial_fact(),public.catalog_v1_validate(text,jsonb),public.catalog_v1_command(uuid,text,jsonb),public.catalog_v1_terms_get(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.catalog_v1_command(uuid,text,jsonb),public.catalog_v1_terms_get(uuid,jsonb)to authenticated;
create or replace function public.telecom_collection_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; allowed text[]; k text; v jsonb; n int; rows jsonb; more boolean; get_one boolean; enums text[]; first_date date; last_date date;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id,false);
 if p_operation is null or p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096 then raise exception using errcode='22023',message='collection_invalid_input';end if;
 get_one:=p_operation like '%.get';
 case p_operation
 when 'customer.list' then allowed:=array['limit','after_id','sort','status','lifecycle','assigned_user_id','source','operator_id'];
 when 'contact.list' then allowed:=array['limit','after_id','sort','customer_id','status'];
 when 'opportunity.list' then allowed:=array['limit','after_id','sort','customer_id','owner_user_id','stage_id','status','currency','expected_close_from','expected_close_to'];
 when 'activity.list' then allowed:=array['limit','after_id','sort','customer_id','kind','entity_kind','entity_id','date_from','date_to'];
 when 'assignee.list' then allowed:=array['limit','after_id','sort','role'];
 when 'operator.list' then allowed:=array['limit','after_id','sort','status','source'];
 when 'operator.get' then allowed:=array['id'];
 when 'plan.list' then allowed:=array['limit','after_id','sort','operator_id','service_kind','status'];
 when 'plan.get' then allowed:=array['id'];
 when 'plan_version.list' then allowed:=array['limit','after_id','sort','plan_id','operator_id','service_kind','valid_on','status'];
 when 'plan_version.get' then allowed:=array['id'];
 when 'contract.list' then allowed:=array['limit','after_id','sort','customer_id','operator_id','plan_id','assigned_user_id','status','source'];
 when 'service.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','operator_id','plan_id','kind','status','source'];
 when 'line.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','service_id','operator_id','status','source'];
 when 'renewal.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','owner_user_id','status','window_from','window_to'];
 when 'renewal.get' then allowed:=array['id'];
 when 'permanence.list' then allowed:=array['limit','after_id','sort','customer_id','contract_id','service_id','status','window_from','window_to'];
 when 'permanence.get' then allowed:=array['id'];
 else raise exception using errcode='22023',message='collection_invalid_operation';end case;
 if exists(select 1 from jsonb_object_keys(p_input) f where not f=any(allowed)) or (get_one and not p_input ? 'id') then raise exception using errcode='22023',message='collection_invalid_input';end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  if v='null'::jsonb then raise exception using errcode='22023',message='collection_invalid_input';end if;
  if k='limit' then
   if jsonb_typeof(v)<>'number' or v::text !~ '^[1-9][0-9]{0,2}$' or (v::text)::int>100 then raise exception using errcode='22023',message='collection_invalid_limit';end if;
  else
   if jsonb_typeof(v)<>'string' or char_length(p_input->>k)>64 or (p_input->>k) ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='collection_invalid_input';end if;
   if (k='id' or k like '%\_id' escape '\') and p_input->>k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='collection_invalid_id';end if;
   if k='sort' and p_input->>k<>'id_asc' then raise exception using errcode='22023',message='collection_invalid_sort';end if;
   if k='currency' and p_input->>k !~ '^[A-Z]{3}$' then raise exception using errcode='22023',message='collection_invalid_currency';end if;
   if k in ('valid_on','expected_close_from','expected_close_to','date_from','date_to','window_from','window_to') then
    if p_input->>k !~ '^\d{4}-\d{2}-\d{2}$' or (p_input->>k)::date::text<>p_input->>k or (p_input->>k)::date not between date '1900-01-01' and date '2199-12-31' then raise exception using errcode='22023',message='collection_invalid_date';end if;
   end if;
   enums:=null;
   if p_operation='customer.list' and k='status' then enums:=array['active','inactive','archived'];end if;
   if p_operation='customer.list' and k='lifecycle' then enums:=array['lead','prospect','customer','former_customer'];end if;
   if p_operation='customer.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='contact.list' and k='status' then enums:=array['active','inactive','archived'];end if;
   if p_operation='opportunity.list' and k='status' then enums:=array['open','won','lost','cancelled'];end if;
   if p_operation='activity.list' and k='kind' then enums:=array['created','updated','contacted','status_changed','system'];end if;
   if p_operation='activity.list' and k='entity_kind' then enums:=array['customer','contract','service','opportunity','task','meeting'];end if;
   if p_operation='assignee.list' and k='role' then enums:=array['owner','admin','member'];end if;
   if p_operation='operator.list' and k='status' then enums:=array['active','inactive'];end if;
   if p_operation='operator.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='plan.list' and k='status' then enums:=array['active','retired'];end if;
   if p_operation='plan.list' and k='service_kind' then enums:=array['mobile','fiber','fixed_voice','data_connectivity','other'];end if;
   if p_operation='plan_version.list' and k='service_kind' then enums:=array['mobile','fiber','fixed_voice','data_connectivity','other'];end if;
   if p_operation='plan_version.list' and k='status' then enums:=array['active','retired'];end if;
   if p_operation='contract.list' and k='status' then enums:=array['draft','active','ended','cancelled'];end if;
   if p_operation='contract.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='service.list' and k='kind' then enums:=array['mobile','fiber','fixed_voice','data_connectivity','other'];end if;
   if p_operation='service.list' and k='status' then enums:=array['pending','active','suspended','ended','cancelled'];end if;
   if p_operation='service.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='line.list' and k='status' then enums:=array['pending','active','suspended','ended','cancelled'];end if;
   if p_operation='line.list' and k='source' then enums:=array['manual','import','integration'];end if;
   if p_operation='renewal.list' and k='status' then enums:=array['open','completed','dismissed','not_applicable'];end if;
   if p_operation='permanence.list' and k='status' then enums:=array['open','cancelled'];end if;
   if enums is not null and not (p_input->>k)=any(enums) then raise exception using errcode='22023',message='collection_invalid_filter';end if;
  end if;
 end loop;
 if (p_input ? 'entity_kind')<>(p_input ? 'entity_id') then raise exception using errcode='22023',message='collection_invalid_entity';end if;
 foreach k in array array['expected_close','date','window'] loop
  if (p_input ? (k||'_from'))<>(p_input ? (k||'_to')) then raise exception using errcode='22023',message='collection_invalid_range';end if;
  if p_input ? (k||'_from') then
   first_date:=(p_input->>(k||'_from'))::date;last_date:=(p_input->>(k||'_to'))::date;
   if last_date<first_date or last_date-first_date>366 then raise exception using errcode='22023',message='collection_invalid_range';end if;
  end if;
 end loop;
 n:=case when get_one then 1 else coalesce((p_input->>'limit')::int,50) end;
 case split_part(p_operation,'.',1)
 when 'customer' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'display_name',coalesce(nullif(btrim(x.trade_name),''),x.legal_name),'account_kind',x.account_kind,'lifecycle',x.lifecycle,'status',x.status,'source',x.source,'assigned_user_id',x.assigned_user_id) dto from public.customers x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'lifecycle' or (x.lifecycle=(p_input->>'lifecycle'))) and (not p_input ? 'assigned_user_id' or (x.assigned_user_id=(p_input->>'assigned_user_id')::uuid)) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) and (not p_input ? 'operator_id' or (exists(select 1 from public.telecom_contracts z where z.workspace_id=x.workspace_id and z.customer_id=x.id and z.operator_id=(p_input->>'operator_id')::uuid))) order by x.id limit n+1) page;
 when 'contact' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'display_name',x.display_name,'job_title',x.job_title,'status',x.status,'is_primary',x.is_primary,'has_email',x.email is not null,'has_phone',x.phone is not null) dto from public.contacts x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) order by x.id limit n+1) page;
 when 'opportunity' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'title',x.title,'status',x.status,'stage_id',x.stage_id,'owner_user_id',x.owner_user_id,'currency',x.currency,'amount_minor',x.amount_minor::text,'expected_close_date',x.expected_close_date,'next_follow_up_at',x.next_follow_up_at,'has_next_action',x.next_action is not null,'source',x.source,'links',coalesce((select jsonb_agg(jsonb_build_object('kind',l.kind,'id',l.target_id) order by l.kind) from public.product_opportunity_links l where l.workspace_id=x.workspace_id and l.opportunity_id=x.id),'[]'::jsonb)) dto from public.opportunities x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'owner_user_id' or (x.owner_user_id=(p_input->>'owner_user_id')::uuid)) and (not p_input ? 'stage_id' or (x.stage_id=(p_input->>'stage_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'currency' or (x.currency=(p_input->>'currency'))) and (not p_input ? 'expected_close_from' or (x.expected_close_date >= (p_input->>'expected_close_from')::date)) and (not p_input ? 'expected_close_to' or (x.expected_close_date <= (p_input->>'expected_close_to')::date)) order by x.id limit n+1) page;
 when 'activity' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'customer_id',x.customer_id,'activity_kind',x.activity_kind,'summary_code',x.summary_code,'occurred_at',x.occurred_at,'actor_user_id',x.actor_user_id,'contract_id',x.contract_id,'service_id',x.service_id,'opportunity_id',x.opportunity_id,'task_id',x.task_id,'meeting_id',x.calendar_event_id) dto from public.activities x  where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'kind' or (x.activity_kind=(p_input->>'kind'))) and (not p_input ? 'entity_kind' or (case p_input->>'entity_kind' when 'customer' then x.customer_id when 'contract' then x.contract_id when 'service' then x.service_id when 'opportunity' then x.opportunity_id when 'task' then x.task_id when 'meeting' then x.calendar_event_id end = (p_input->>'entity_id')::uuid)) and (not p_input ? 'entity_id' or (case p_input->>'entity_kind' when 'customer' then x.customer_id when 'contract' then x.contract_id when 'service' then x.service_id when 'opportunity' then x.opportunity_id when 'task' then x.task_id when 'meeting' then x.calendar_event_id end = (p_input->>'entity_id')::uuid)) and (not p_input ? 'date_from' or (x.occurred_at >= (p_input->>'date_from')::date::timestamp at time zone 'Europe/Madrid')) and (not p_input ? 'date_to' or (x.occurred_at < ((p_input->>'date_to')::date+1)::timestamp at time zone 'Europe/Madrid')) order by x.id limit n+1) page;
 when 'assignee' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.user_id id,jsonb_build_object('user_id',x.user_id,'display_name',coalesce(nullif(btrim(p.full_name),''),'Usuario'),'role',x.role) dto from public.workspace_members x left join public.profiles p on p.id=x.user_id where x.workspace_id=p_workspace_id and x.status='active' and x.role in ('owner','admin','member') and (not get_one or x.user_id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.user_id>(p_input->>'after_id')::uuid) and (not p_input ? 'role' or (x.role=(p_input->>'role'))) order by x.user_id limit n+1) page;
 when 'operator' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'code',x.code,'display_name',x.display_name,'status',x.status,'source',x.source) dto from public.telecom_operators x  where x.workspace_id=p_workspace_id and (p_operation<>'operator.list' or x.status=coalesce(p_input->>'status','active')) and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'plan' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'operator_id',x.operator_id,'code',x.code,'display_name',x.display_name,'service_kind',x.service_kind,'status',x.status) dto from public.telecom_plans x  where x.workspace_id=p_workspace_id and (p_operation<>'plan.list' or x.status=coalesce(p_input->>'status','active')) and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'operator_id' or (x.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'service_kind' or (x.service_kind=(p_input->>'service_kind')or exists(select 1 from public.telecom_plan_version_components pc join public.telecom_plan_versions revision on revision.id=pc.plan_version_id and revision.workspace_id=pc.workspace_id join public.telecom_plan_version_publications seal on seal.plan_version_id=revision.id and seal.workspace_id=revision.workspace_id where revision.workspace_id=x.workspace_id and revision.plan_id=x.id and pc.component_kind='base'and pc.service_kind=p_input->>'service_kind'and revision.is_bundle=true and revision.valid_from<=(statement_timestamp()at time zone'Europe/Madrid')::date and(revision.valid_until is null or revision.valid_until>=(statement_timestamp()at time zone'Europe/Madrid')::date)))) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) order by x.id limit n+1) page;
 when 'plan_version' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'plan_id',x.plan_id,'operator_id',p.operator_id,'service_kind',p.service_kind,'version_number',x.version_number,'valid_from',x.valid_from,'valid_until',x.valid_until,'currency',x.currency,'recurring_amount_minor',x.recurring_amount_minor::text,'plan_status',p.status) dto from public.telecom_plan_versions x join public.telecom_plans p on p.id=x.plan_id and p.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'plan_id' or (x.plan_id=(p_input->>'plan_id')::uuid)) and (not p_input ? 'operator_id' or (p.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'service_kind' or (p.service_kind=(p_input->>'service_kind')or exists(select 1 from public.telecom_plan_version_components pc join public.telecom_plan_version_publications seal on seal.plan_version_id=pc.plan_version_id and seal.workspace_id=pc.workspace_id where pc.workspace_id=x.workspace_id and pc.plan_version_id=x.id and pc.component_kind='base'and pc.service_kind=p_input->>'service_kind'and x.is_bundle=true))) and (not p_input ? 'valid_on' or (x.valid_from <= (p_input->>'valid_on')::date and (x.valid_until is null or x.valid_until >= (p_input->>'valid_on')::date))) and (not p_input ? 'status' or (p.status=(p_input->>'status'))) order by x.id limit n+1) page;
 when 'contract' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'operator_id',x.operator_id,'plan_version_id',x.plan_version_id,'assigned_user_id',x.assigned_user_id,'status',x.status,'source',x.source,'start_date',x.start_date,'end_date',x.end_date) dto from public.telecom_contracts x left join public.telecom_plan_versions pv on pv.id=x.plan_version_id and pv.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'operator_id' or (x.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'plan_id' or (pv.plan_id=(p_input->>'plan_id')::uuid)) and (not p_input ? 'assigned_user_id' or (x.assigned_user_id=(p_input->>'assigned_user_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'service' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'customer_id',x.customer_id,'contract_id',x.contract_id,'operator_id',x.operator_id,'plan_version_id',x.plan_version_id,'service_kind',x.service_kind,'display_name',x.display_name,'status',x.status,'source',x.source,'activated_on',x.activated_on,'ended_on',x.ended_on) dto from public.telecom_services x left join public.telecom_plan_versions pv on pv.id=x.plan_version_id and pv.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (x.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (x.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'operator_id' or (x.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'plan_id' or (pv.plan_id=(p_input->>'plan_id')::uuid)) and (not p_input ? 'kind' or (x.service_kind=(p_input->>'kind'))) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'line' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'service_id',x.service_id,'customer_id',s.customer_id,'contract_id',s.contract_id,'operator_id',s.operator_id,'plan_version_id',s.plan_version_id,'display_name',x.display_name,'status',x.status,'source',x.source,'activated_on',x.activated_on,'ended_on',x.ended_on) dto from public.telecom_lines x join public.telecom_services s on s.id=x.service_id and s.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (s.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (s.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'service_id' or (x.service_id=(p_input->>'service_id')::uuid)) and (not p_input ? 'operator_id' or (s.operator_id=(p_input->>'operator_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'source' or (x.source=(p_input->>'source'))) order by x.id limit n+1) page;
 when 'renewal' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'contract_id',x.contract_id,'customer_id',c.customer_id,'owner_user_id',c.assigned_user_id,'status',x.status,'source',x.source,'target_on',x.target_on,'opens_on',x.opens_on,'closes_on',x.closes_on,'attention_state',case when x.status<>'open' then x.status when x.target_on<(statement_timestamp() at time zone 'Europe/Madrid')::date then 'overdue' when x.target_on<=(statement_timestamp() at time zone 'Europe/Madrid')::date+30 then 'upcoming' else 'open' end) dto from public.telecom_renewals x join public.telecom_contracts c on c.id=x.contract_id and c.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (c.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (x.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'owner_user_id' or (c.assigned_user_id=(p_input->>'owner_user_id')::uuid)) and (not p_input ? 'status' or (x.status=(p_input->>'status'))) and (not p_input ? 'window_from' or (x.target_on >= (p_input->>'window_from')::date)) and (not p_input ? 'window_to' or (x.target_on <= (p_input->>'window_to')::date)) order by x.id limit n+1) page;
 when 'permanence' then
  select coalesce(jsonb_agg(dto order by id),'[]'::jsonb) into rows from (select x.id id,jsonb_build_object('id',x.id,'version',x.version,'contract_id',x.contract_id,'service_id',x.service_id,'customer_id',c.customer_id,'status',x.administrative_status,'source',x.source,'commitment_kind',x.commitment_kind,'starts_on',x.starts_on,'ends_on',x.ends_on,'days_remaining',x.ends_on - (statement_timestamp() at time zone 'Europe/Madrid')::date,'timing_state',case when x.administrative_status='cancelled' then 'cancelled' when x.ends_on<(statement_timestamp() at time zone 'Europe/Madrid')::date then 'expired' when x.ends_on<=(statement_timestamp() at time zone 'Europe/Madrid')::date+30 then 'upcoming' else 'current' end) dto from public.telecom_commitments x join public.telecom_contracts c on c.id=x.contract_id and c.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and true and (not get_one or x.id=(p_input->>'id')::uuid) and (not p_input ? 'after_id' or x.id>(p_input->>'after_id')::uuid) and (not p_input ? 'customer_id' or (c.customer_id=(p_input->>'customer_id')::uuid)) and (not p_input ? 'contract_id' or (x.contract_id=(p_input->>'contract_id')::uuid)) and (not p_input ? 'service_id' or (x.service_id=(p_input->>'service_id')::uuid)) and (not p_input ? 'status' or (x.administrative_status=(p_input->>'status'))) and (not p_input ? 'window_from' or (x.ends_on >= (p_input->>'window_from')::date)) and (not p_input ? 'window_to' or (x.ends_on <= (p_input->>'window_to')::date)) order by x.id limit n+1) page;
 end case;
 if get_one then
  if jsonb_array_length(rows)=0 then return null;end if;
  return jsonb_build_object('contract_version','telecom.collections.v1','operation',p_operation,'record',rows->0);
 end if;
 more:=jsonb_array_length(rows)>n;
 if more then rows:=rows-n;end if;
 return jsonb_build_object('contract_version','telecom.collections.v1','operation',p_operation,'items',rows,'next_id',case when more then coalesce(rows->(n-1)->>'id',rows->(n-1)->>'user_id') end);
end$$;
create or replace function public.validate_telecom_plan_operator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op not in ('INSERT', 'UPDATE') then
    raise exception using errcode = '0A000', message = 'unsupported telecom plan trigger operation';
  end if;

  case tg_table_name
    when 'telecom_contracts' then
      if new.plan_version_id is not null and not exists (
        select 1
          from public.telecom_plan_versions pv
          join public.telecom_plans p
            on p.id = pv.plan_id and p.workspace_id = pv.workspace_id
         where pv.id = new.plan_version_id
           and pv.workspace_id = new.workspace_id
           and p.operator_id = new.operator_id
           and pv.valid_from <= new.start_date
           and (pv.valid_until is null or pv.valid_until >= new.start_date)
      ) then
        raise exception using errcode = '23514', message = 'plan version is invalid for contract';
      end if;
    when 'telecom_services' then
      if new.plan_version_id is not null and not exists (
        select 1
          from public.telecom_plan_versions pv
          join public.telecom_plans p
            on p.id = pv.plan_id and p.workspace_id = pv.workspace_id
         where pv.id = new.plan_version_id
           and pv.workspace_id = new.workspace_id
           and p.operator_id = new.operator_id
           and (p.service_kind = new.service_kind or (pv.is_bundle=true and exists(select 1 from public.telecom_plan_version_components pc join public.telecom_plan_version_publications seal on seal.plan_version_id=pc.plan_version_id and seal.workspace_id=pc.workspace_id where pc.workspace_id=pv.workspace_id and pc.plan_version_id=pv.id and pc.component_kind='base'and pc.service_kind=new.service_kind)))
           and (
             new.activated_on is null
             or (
               pv.valid_from <= new.activated_on
               and (pv.valid_until is null or pv.valid_until >= new.activated_on)
             )
           )
      ) then
        raise exception using errcode = '23514', message = 'plan version is invalid for service';
      end if;
    else
      raise exception using errcode = '0A000', message = 'unsupported telecom plan trigger table';
  end case;

  return new;
end;
$$;

commit;
