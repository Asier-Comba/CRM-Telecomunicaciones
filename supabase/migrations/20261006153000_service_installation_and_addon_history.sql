-- Forward-only, ledger applied once. Commercial planning/history, no provisioning or billing engine.
begin;
create table public.telecom_service_installations(
 service_id uuid primary key,workspace_id uuid not null,
 version bigint not null default 1 check(version between 1 and 999999999999999),
 site_label text check(site_label is null or(char_length(btrim(site_label))between 1 and 100 and site_label!~'[[:cntrl:]]')),
 installation_contact_id uuid references public.contacts(id),
 activation_target_on date check(activation_target_on is null or activation_target_on between date'2000-01-01'and date'2100-12-31'),
 source text not null default'manual'check(source in('manual','import','integration')),
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 foreign key(service_id,workspace_id)references public.telecom_services(id,workspace_id)
);
create table public.telecom_service_addon_assignments(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,service_id uuid not null,plan_version_id uuid not null,component_position integer not null check(component_position between 1 and 8),
 version bigint not null default 1 check(version between 1 and 999999999999999),quantity integer not null check(quantity between 1 and 100),
 valid_from date not null check(valid_from between date'2000-01-01'and date'2100-12-31'),
 valid_until date check(valid_until is null or(valid_until>=valid_from and valid_until<=date'2100-12-31')),
 ended_on date check(ended_on is null or(ended_on>=valid_from and ended_on<=coalesce(valid_until,date'2100-12-31'))),
 source text not null default'manual'check(source in('manual','import','integration')),
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 foreign key(service_id,workspace_id)references public.telecom_services(id,workspace_id),
 foreign key(plan_version_id,workspace_id,component_position)references public.telecom_plan_version_components(plan_version_id,workspace_id,position),
 unique(id,workspace_id)
);
create unique index telecom_service_addon_one_open on public.telecom_service_addon_assignments(workspace_id,service_id,component_position)where ended_on is null;
create index telecom_service_addon_page on public.telecom_service_addon_assignments(workspace_id,service_id,id);
alter table public.telecom_service_installations enable row level security;alter table public.telecom_service_installations force row level security;
alter table public.telecom_service_addon_assignments enable row level security;alter table public.telecom_service_addon_assignments force row level security;
revoke all on public.telecom_service_installations,public.telecom_service_addon_assignments from public,anon,authenticated,service_role;
create function public.service_commercial_v1_guard()returns trigger
language plpgsql security definer set search_path=''as $$declare s public.telecom_services%rowtype;component public.telecom_plan_version_components%rowtype;begin
 if tg_op='DELETE'then raise exception using errcode='55000',message='service_commercial_history_frozen';end if;
 select *into s from public.telecom_services where workspace_id=new.workspace_id and id=new.service_id;
 if not found then raise exception using errcode='23514',message='service_commercial_invalid_context';end if;
 if tg_op='INSERT'then new.source:=s.source;end if;
 if tg_table_name='telecom_service_installations'then
 if s.service_kind not in('fiber','fixed_voice','data_connectivity')or(new.installation_contact_id is not null and not exists(select 1 from public.contacts where workspace_id=new.workspace_id and id=new.installation_contact_id and customer_id=s.customer_id))then raise exception using errcode='23514',message='service_commercial_invalid_context';end if;
 if tg_op='UPDATE'and(new.service_id,new.workspace_id,new.source,new.created_by_user_id,new.created_at)is distinct from(old.service_id,old.workspace_id,old.source,old.created_by_user_id,old.created_at)then raise exception using errcode='55000',message='service_commercial_identity_frozen';end if;
 else
 select *into component from public.telecom_plan_version_components where workspace_id=new.workspace_id and plan_version_id=new.plan_version_id and position=new.component_position;
 if not found or component.component_kind<>'add_on'or component.service_kind<>s.service_kind or s.plan_version_id is distinct from new.plan_version_id or new.quantity>component.quantity or not exists(select 1 from public.telecom_plan_version_publications where workspace_id=new.workspace_id and plan_version_id=new.plan_version_id)then raise exception using errcode='23514',message='service_commercial_invalid_component';end if;
 if tg_op='UPDATE'and((to_jsonb(new)-array['version','updated_at','ended_on'])is distinct from(to_jsonb(old)-array['version','updated_at','ended_on'])or old.ended_on is not null or new.ended_on is null)then raise exception using errcode='55000',message='service_commercial_history_frozen';end if;
 if tg_op='INSERT'and exists(select 1 from public.telecom_service_addon_assignments x where x.workspace_id=new.workspace_id and x.service_id=new.service_id and x.component_position=new.component_position and(x.ended_on is null or new.valid_from<=x.ended_on))then raise exception using errcode='40001',message='service_commercial_period_conflict';end if;
 end if;return new;
end$$;
create trigger telecom_installation_guard before insert or update or delete on public.telecom_service_installations for each row execute function public.service_commercial_v1_guard();
create trigger telecom_installation_version before update on public.telecom_service_installations for each row execute function public.manage_task_version();
create trigger telecom_addon_guard before insert or update or delete on public.telecom_service_addon_assignments for each row execute function public.service_commercial_v1_guard();
create trigger telecom_addon_version before update on public.telecom_service_addon_assignments for each row execute function public.manage_task_version();
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''service.installation_set'',''service.addon_assign'',''service.addon_end''))';end$$;
create function public.service_commercial_v1_validate(op text,inp jsonb)returns void
language plpgsql security definer set search_path=''as $$declare req text[];opt text[]:=array[]::text[];k text;v jsonb;s text;begin
 case op
 when'service.installation_set'then req:=array['command_id','service_id','expected_service_version','expected_details_version','site_label','installation_contact_id','activation_target_on'];
 when'service.addon_assign'then req:=array['command_id','service_id','expected_service_version','component_position','quantity','valid_from','valid_until'];
 when'service.addon_end'then req:=array['command_id','service_id','id','expected_service_version','expected_version','ended_on'];
 when'service.installation_get'then req:=array['service_id'];
 when'service.addon_list'then req:=array['service_id'];opt:=array['limit','after_id'];
 else raise exception using errcode='22023',message='service_commercial_invalid_operation';end case;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or exists(select 1 from jsonb_object_keys(inp)x where not x=any(req||opt))or exists(select 1 from unnest(req)x where not inp?x)then raise exception using errcode='22023',message='service_commercial_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop s:=inp->>k;
 if v='null'::jsonb and k in('site_label','installation_contact_id','activation_target_on','valid_until')then continue;end if;
 if k='id'or k like '%_id'then if jsonb_typeof(v)<>'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='service_commercial_invalid_input';end if;
 elsif k in('expected_version','expected_service_version','expected_details_version','quantity','component_position','limit')then
 if jsonb_typeof(v)<>'number'or s!~'^(0|[1-9][0-9]{0,14})$'or(s::bigint=0 and k<>'expected_details_version')or(k in('quantity','limit')and s::bigint>100)or(k='component_position'and s::bigint>8)then raise exception using errcode='22023',message='service_commercial_invalid_input';end if;
 elsif k='site_label'then
 if jsonb_typeof(v)<>'string'or char_length(btrim(s))not between 1 and 100 or s~'[[:cntrl:]]'then raise exception using errcode='22023',message='service_commercial_invalid_input';end if;
 else
 if jsonb_typeof(v)<>'string'or s!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'or s::date not between date'2000-01-01'and date'2100-12-31'or to_char(s::date,'YYYY-MM-DD')<>s then raise exception using errcode='22023',message='service_commercial_invalid_input';end if;
 end if;end loop;
 if op='service.addon_assign'and inp->>'valid_until'is not null and(inp->>'valid_until')::date<(inp->>'valid_from')::date then raise exception using errcode='22023',message='service_commercial_invalid_input';end if;
 exception when data_exception then raise exception using errcode='22023',message='service_commercial_invalid_input';
end$$;
create function public.service_commercial_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb
language plpgsql security definer set search_path=''as $$declare a uuid;prior jsonb;s public.telecom_services%rowtype;c public.telecom_contracts%rowtype;d public.telecom_service_installations%rowtype;x public.telecom_service_addon_assignments%rowtype;sid uuid;cid uuid;rid uuid;ver bigint;state text;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.service_commercial_v1_validate(p_operation,p_input);
 if p_operation not in('service.installation_set','service.addon_assign','service.addon_end')then raise exception using errcode='22023',message='service_commercial_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 sid:=(p_input->>'service_id')::uuid;
 select contract_id into cid from public.telecom_services where workspace_id=p_workspace_id and id=sid;if not found then raise exception using errcode='P0002',message='service_commercial_not_found';end if;
 select *into c from public.telecom_contracts where workspace_id=p_workspace_id and id=cid for update;
 select *into s from public.telecom_services where workspace_id=p_workspace_id and id=sid and contract_id=c.id for update;if not found then raise exception using errcode='P0002',message='service_commercial_not_found';end if;
 if s.version<>(p_input->>'expected_service_version')::bigint then raise exception using errcode='40001',message='service_commercial_conflict';end if;
 if s.source<>'manual'or c.source<>'manual'then raise exception using errcode='42501',message='service_commercial_external_read_only';end if;
 if p_operation<>'service.addon_end'and(s.status in('ended','cancelled')or c.status in('ended','cancelled'))then raise exception using errcode='22023',message='service_commercial_parent_terminal';end if;
 if p_operation='service.installation_set'then
 if p_input->>'installation_contact_id'is not null then perform 1 from public.contacts where workspace_id=p_workspace_id and id=(p_input->>'installation_contact_id')::uuid and customer_id=s.customer_id and status='active'for share;if not found then raise exception using errcode='P0002',message='service_commercial_contact_not_found';end if;end if;
 select *into d from public.telecom_service_installations where workspace_id=p_workspace_id and service_id=s.id for update;
 if coalesce(d.version,0)<>(p_input->>'expected_details_version')::bigint then raise exception using errcode='40001',message='service_commercial_conflict';end if;
 if d.version is null then insert into public.telecom_service_installations(service_id,workspace_id,site_label,installation_contact_id,activation_target_on,created_by_user_id)values(s.id,p_workspace_id,p_input->>'site_label',(p_input->>'installation_contact_id')::uuid,(p_input->>'activation_target_on')::date,a)returning *into d;
 else update public.telecom_service_installations set site_label=p_input->>'site_label',installation_contact_id=(p_input->>'installation_contact_id')::uuid,activation_target_on=(p_input->>'activation_target_on')::date where service_id=s.id returning *into d;end if;
 rid:=s.id;ver:=d.version;state:='recorded';
 elsif p_operation='service.addon_assign'then
 insert into public.telecom_service_addon_assignments(workspace_id,service_id,plan_version_id,component_position,quantity,valid_from,valid_until,created_by_user_id)values(p_workspace_id,s.id,s.plan_version_id,(p_input->>'component_position')::int,(p_input->>'quantity')::int,(p_input->>'valid_from')::date,(p_input->>'valid_until')::date,a)returning *into x;
 rid:=x.id;ver:=x.version;state:='assigned';
 else
 select *into x from public.telecom_service_addon_assignments where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid and service_id=s.id for update;if not found then raise exception using errcode='P0002',message='service_commercial_not_found';end if;
 if x.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='service_commercial_conflict';end if;
 if x.source<>'manual'then raise exception using errcode='42501',message='service_commercial_external_read_only';end if;
 if x.ended_on is not null then raise exception using errcode='22023',message='service_commercial_invalid_transition';end if;
 update public.telecom_service_addon_assignments set ended_on=(p_input->>'ended_on')::date where id=x.id returning *into x;rid:=x.id;ver:=x.version;state:='ended';
 end if;
 update public.telecom_services set display_name=display_name where id=s.id returning *into s;
 prior:=jsonb_build_object('contract_version','telecom.service_commercial.v1','operation',p_operation,'command_id',p_input->>'command_id','id',rid,'service_id',s.id,'service_version',s.version,'version',ver,'status',state);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,rid,ver);
 insert into public.activities(workspace_id,customer_id,contract_id,service_id,activity_kind,summary_code,actor_user_id,created_by_user_id)values(p_workspace_id,s.customer_id,s.contract_id,s.id,'updated','entity.updated',a,a);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
 exception when unique_violation then raise exception using errcode='40001',message='service_commercial_conflict';when integrity_constraint_violation or data_exception then raise exception using errcode='22023',message='service_commercial_invalid_input';
end$$;
create function public.service_commercial_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb
language plpgsql security definer set search_path=''as $$declare s public.telecom_services%rowtype;record jsonb;rows jsonb;lim int;cursor uuid;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);perform public.service_commercial_v1_validate(p_operation,p_input);if p_operation not in('service.installation_get','service.addon_list')then raise exception using errcode='22023',message='service_commercial_invalid_operation';end if;
 select *into s from public.telecom_services where workspace_id=p_workspace_id and id=(p_input->>'service_id')::uuid;if not found then raise exception using errcode='P0002',message='service_commercial_not_found';end if;
 if p_operation='service.installation_get'then
 select jsonb_build_object('version',version,'site_label',site_label,'installation_contact_id',installation_contact_id,'activation_target_on',activation_target_on,'source',source)into record from public.telecom_service_installations where workspace_id=p_workspace_id and service_id=s.id;
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
revoke all on function public.service_commercial_v1_guard(),public.service_commercial_v1_validate(text,jsonb),public.service_commercial_v1_command(uuid,text,jsonb),public.service_commercial_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.service_commercial_v1_command(uuid,text,jsonb),public.service_commercial_v1_query(uuid,text,jsonb)to authenticated;
commit;
