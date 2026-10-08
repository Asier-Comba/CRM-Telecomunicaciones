-- Forward-only commercial customer equipment. No serial/IMEI/secrets or stock ERP.
begin;
create table public.telecom_equipment(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,customer_id uuid not null,contract_id uuid,service_id uuid,line_id uuid,commitment_id uuid,
 version bigint not null default 1 check(version between 1 and 999999999999999),
 kind text not null check(kind in('router','ont','mobile_terminal','other')),
 manufacturer text not null check(char_length(btrim(manufacturer))between 1 and 100 and manufacturer!~'[[:cntrl:]]'),
 model text not null check(char_length(btrim(model))between 1 and 100 and model!~'[[:cntrl:]]'),
 commercial_description text check(commercial_description is null or(char_length(btrim(commercial_description))between 1 and 200 and commercial_description!~'[[:cntrl:]]')),
 status text not null check(status in('prepared','assigned','returned','replaced','cancelled')),
 purchased_on date check(purchased_on between date'2000-01-01'and date'2100-12-31'),assigned_on date check(assigned_on between date'2000-01-01'and date'2100-12-31'),
 returned_on date check(returned_on between date'2000-01-01'and date'2100-12-31'),replaced_on date check(replaced_on between date'2000-01-01'and date'2100-12-31'),cancelled_on date check(cancelled_on between date'2000-01-01'and date'2100-12-31'),replaces_equipment_id uuid,replaced_by_id uuid,
 source text not null default'manual'check(source in('manual','import','integration')),
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 unique(id,workspace_id),foreign key(customer_id,workspace_id)references public.customers(id,workspace_id),
 foreign key(contract_id,workspace_id)references public.telecom_contracts(id,workspace_id),foreign key(service_id,workspace_id)references public.telecom_services(id,workspace_id),foreign key(line_id,workspace_id)references public.telecom_lines(id,workspace_id),foreign key(commitment_id,workspace_id)references public.telecom_commitments(id,workspace_id),
 foreign key(replaces_equipment_id,workspace_id)references public.telecom_equipment(id,workspace_id)deferrable initially deferred,
 foreign key(replaced_by_id,workspace_id)references public.telecom_equipment(id,workspace_id)deferrable initially deferred,
 check(service_id is null or contract_id is not null),check(line_id is null or service_id is not null),check(commitment_id is null or contract_id is not null),
 check(assigned_on is null or purchased_on is null or assigned_on>=purchased_on),
 check((status='prepared'and assigned_on is null and returned_on is null and replaced_on is null and cancelled_on is null and replaced_by_id is null)
 or(status='assigned'and assigned_on is not null and returned_on is null and replaced_on is null and cancelled_on is null and replaced_by_id is null)
 or(status='returned'and assigned_on is not null and returned_on is not null and returned_on>=assigned_on and replaced_on is null and cancelled_on is null and replaced_by_id is null)
 or(status='replaced'and assigned_on is not null and replaced_on is not null and replaced_on>=assigned_on and replaced_by_id is not null and returned_on is null and cancelled_on is null)
 or(status='cancelled'and assigned_on is null and cancelled_on is not null and returned_on is null and replaced_on is null and replaced_by_id is null)),
 check(replaced_by_id is null or replaced_by_id<>id),check(replaces_equipment_id is null or replaces_equipment_id<>id)
);
create index telecom_equipment_page on public.telecom_equipment(workspace_id,customer_id,id);
create unique index telecom_equipment_commitment_current on public.telecom_equipment(workspace_id,commitment_id)where commitment_id is not null and status='assigned';
create unique index telecom_equipment_one_successor on public.telecom_equipment(workspace_id,replaces_equipment_id)where replaces_equipment_id is not null;
create table public.telecom_equipment_events(
 workspace_id uuid not null,equipment_id uuid not null,version bigint not null,operation text not null check(operation in('equipment.create','equipment.assign','equipment.return','equipment.replace','equipment.cancel')),
 status text not null check(status in('prepared','assigned','returned','replaced','cancelled')),event_on date,related_equipment_id uuid,actor_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),
 primary key(workspace_id,equipment_id,version),foreign key(equipment_id,workspace_id)references public.telecom_equipment(id,workspace_id),foreign key(related_equipment_id,workspace_id)references public.telecom_equipment(id,workspace_id)deferrable initially deferred
);
alter table public.telecom_equipment enable row level security;alter table public.telecom_equipment force row level security;
alter table public.telecom_equipment_events enable row level security;alter table public.telecom_equipment_events force row level security;
revoke all on public.telecom_equipment,public.telecom_equipment_events from public,anon,authenticated,service_role;
create trigger equipment_events_append_only before update or delete on public.telecom_equipment_events for each row execute function public.reject_activity_mutation();
create function public.equipment_v1_context(w uuid,customer uuid,contract uuid,service uuid,line uuid,commitment uuid,k text,live boolean)returns void language plpgsql security definer set search_path=''as $$declare s public.telecom_services%rowtype;begin
 perform 1 from public.customers where workspace_id=w and id=customer and(not live or status='active')for share;if not found then raise exception using errcode='P0002',message='equipment_context_not_found';end if;
 if contract is not null then perform 1 from public.telecom_contracts where workspace_id=w and id=contract and customer_id=customer and(not live or status not in('ended','cancelled'))for share;if not found then raise exception using errcode='P0002',message='equipment_context_not_found';end if;end if;
 if service is not null then select *into s from public.telecom_services where workspace_id=w and id=service and customer_id=customer and contract_id=contract and(not live or status not in('ended','cancelled'))for share;if not found then raise exception using errcode='P0002',message='equipment_context_not_found';end if;
 if(k='ont'and s.service_kind<>'fiber')or(k='router'and s.service_kind not in('fiber','fixed_voice','data_connectivity'))or(k='mobile_terminal'and s.service_kind<>'mobile')then raise exception using errcode='22023',message='equipment_kind_incompatible';end if;end if;
 if line is not null then perform 1 from public.telecom_lines where workspace_id=w and id=line and service_id=service and(not live or status not in('ended','cancelled'))for share;if not found then raise exception using errcode='P0002',message='equipment_context_not_found';end if;end if;
 if commitment is not null then perform 1 from public.telecom_commitments where workspace_id=w and id=commitment and contract_id=contract and(service_id is null or service_id=service)and commitment_kind='device'and(not live or administrative_status='open')for share;if not found then raise exception using errcode='P0002',message='equipment_commitment_not_found';end if;end if;
end$$;
create function public.equipment_v1_guard()returns trigger language plpgsql security definer set search_path=''as $$declare current_row public.telecom_equipment%rowtype;linked public.telecom_equipment%rowtype;begin
 if tg_when='AFTER'then
 select *into current_row from public.telecom_equipment where workspace_id=new.workspace_id and id=new.id;
 if current_row.replaces_equipment_id is not null then select *into linked from public.telecom_equipment where workspace_id=current_row.workspace_id and id=current_row.replaces_equipment_id;
 if not found or linked.status<>'replaced'or linked.replaced_by_id is distinct from current_row.id or linked.replaced_on is distinct from current_row.assigned_on or(linked.customer_id,linked.contract_id,linked.service_id,linked.line_id,linked.kind)is distinct from(current_row.customer_id,current_row.contract_id,current_row.service_id,current_row.line_id,current_row.kind)then raise exception using errcode='23514',message='equipment_invalid_replacement_link';end if;end if;
 if current_row.replaced_by_id is not null then select *into linked from public.telecom_equipment where workspace_id=current_row.workspace_id and id=current_row.replaced_by_id;
 if not found or linked.replaces_equipment_id is distinct from current_row.id or linked.assigned_on is distinct from current_row.replaced_on or(linked.customer_id,linked.contract_id,linked.service_id,linked.line_id,linked.kind)is distinct from(current_row.customer_id,current_row.contract_id,current_row.service_id,current_row.line_id,current_row.kind)then raise exception using errcode='23514',message='equipment_invalid_replacement_link';end if;end if;return null;
 end if;
 if tg_op='DELETE'then raise exception using errcode='55000',message='equipment_history_frozen';end if;
 perform public.equipment_v1_context(new.workspace_id,new.customer_id,new.contract_id,new.service_id,new.line_id,new.commitment_id,new.kind,false);
 if tg_op='UPDATE'then
 if(to_jsonb(new)-array['version','updated_at','status','assigned_on','returned_on','replaced_on','cancelled_on','replaced_by_id'])is distinct from(to_jsonb(old)-array['version','updated_at','status','assigned_on','returned_on','replaced_on','cancelled_on','replaced_by_id'])or(old.status='prepared'and new.status not in('assigned','cancelled'))or(old.status='assigned'and new.status not in('returned','replaced'))or old.status in('returned','replaced','cancelled')or(old.assigned_on is not null and new.assigned_on is distinct from old.assigned_on)then raise exception using errcode='55000',message='equipment_history_frozen';end if;
 end if;return new;end$$;
create trigger equipment_guard before insert or update or delete on public.telecom_equipment for each row execute function public.equipment_v1_guard();
create constraint trigger equipment_history_links after insert or update on public.telecom_equipment deferrable initially deferred for each row execute function public.equipment_v1_guard();
create trigger equipment_version before update on public.telecom_equipment for each row execute function public.manage_task_version();
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''equipment.create'',''equipment.assign'',''equipment.return'',''equipment.replace'',''equipment.cancel''))';end$$;
create function public.equipment_v1_validate(op text,inp jsonb)returns void language plpgsql security definer set search_path=''as $$declare req text[];opt text[]:=array[]::text[];k text;v jsonb;s text;begin
 case op
 when'equipment.create'then req:=array['command_id','customer_id','contract_id','service_id','line_id','commitment_id','kind','manufacturer','model','commercial_description','purchased_on','assigned_on'];
 when'equipment.assign','equipment.return','equipment.cancel'then req:=array['command_id','id','expected_version','event_on'];
 when'equipment.replace'then req:=array['command_id','id','expected_version','event_on','manufacturer','model','commercial_description','purchased_on','commitment_id'];
 when'equipment.get'then req:=array['id'];
 when'equipment.list'then req:=array[]::text[];opt:=array['customer_id','contract_id','service_id','line_id','kind','status','source','limit','after_id'];
 when'equipment.history'then req:=array['id'];opt:=array['limit','after_version'];else raise exception using errcode='22023',message='equipment_invalid_operation';end case;
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or exists(select 1 from jsonb_object_keys(inp)x where not x=any(req||opt))or exists(select 1 from unnest(req)x where not inp?x)then raise exception using errcode='22023',message='equipment_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop s:=inp->>k;
 if v='null'::jsonb and k in('contract_id','service_id','line_id','commitment_id','commercial_description','purchased_on','assigned_on')and op in('equipment.create','equipment.replace')then continue;end if;
 if k='id'or k like'%_id'then if jsonb_typeof(v)<>'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='equipment_invalid_input';end if;
 elsif k in('expected_version','limit','after_version')then if jsonb_typeof(v)<>'number'or s!~'^[1-9][0-9]{0,14}$'or(k='limit'and s::bigint>100)then raise exception using errcode='22023',message='equipment_invalid_input';end if;
 elsif k in('purchased_on','assigned_on','event_on')then if jsonb_typeof(v)<>'string'or s!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'or s::date not between date'2000-01-01'and date'2100-12-31'or to_char(s::date,'YYYY-MM-DD')<>s or s::date>(statement_timestamp()at time zone'Europe/Madrid')::date then raise exception using errcode='22023',message='equipment_invalid_date';end if;
 elsif k in('kind','status','source')then if jsonb_typeof(v)<>'string'or(k='kind'and s not in('router','ont','mobile_terminal','other'))or(k='status'and s not in('prepared','assigned','returned','replaced','cancelled'))or(k='source'and s not in('manual','import','integration'))then raise exception using errcode='22023',message='equipment_invalid_input';end if;
 else if jsonb_typeof(v)<>'string'or char_length(btrim(s))not between 1 and(case when k='commercial_description'then 200 else 100 end)or s~'[[:cntrl:]]'then raise exception using errcode='22023',message='equipment_invalid_input';end if;end if;end loop;
 if op='equipment.create'and((inp->>'service_id'is not null and inp->>'contract_id'is null)or(inp->>'line_id'is not null and inp->>'service_id'is null)or(inp->>'commitment_id'is not null and inp->>'contract_id'is null))then raise exception using errcode='22023',message='equipment_invalid_context';end if;
 if inp->>'purchased_on'is not null and coalesce(inp->>'assigned_on',inp->>'event_on')is not null and(inp->>'purchased_on')::date>coalesce(inp->>'assigned_on',inp->>'event_on')::date then raise exception using errcode='22023',message='equipment_invalid_date';end if;
 exception when data_exception then raise exception using errcode='22023',message='equipment_invalid_input';end$$;
create function public.equipment_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;prior jsonb;e public.telecom_equipment%rowtype;n public.telecom_equipment%rowtype;nid uuid;event_date date;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.equipment_v1_validate(p_operation,p_input);if p_operation in('equipment.list','equipment.get','equipment.history')then raise exception using errcode='22023',message='equipment_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 event_date:=coalesce(p_input->>'event_on',p_input->>'assigned_on',p_input->>'purchased_on')::date;
 if p_operation='equipment.create'then
 perform public.equipment_v1_context(p_workspace_id,(p_input->>'customer_id')::uuid,(p_input->>'contract_id')::uuid,(p_input->>'service_id')::uuid,(p_input->>'line_id')::uuid,(p_input->>'commitment_id')::uuid,p_input->>'kind',true);
 insert into public.telecom_equipment(workspace_id,customer_id,contract_id,service_id,line_id,commitment_id,kind,manufacturer,model,commercial_description,purchased_on,assigned_on,status,created_by_user_id)values(p_workspace_id,(p_input->>'customer_id')::uuid,(p_input->>'contract_id')::uuid,(p_input->>'service_id')::uuid,(p_input->>'line_id')::uuid,(p_input->>'commitment_id')::uuid,p_input->>'kind',p_input->>'manufacturer',p_input->>'model',p_input->>'commercial_description',(p_input->>'purchased_on')::date,(p_input->>'assigned_on')::date,case when p_input->>'assigned_on'is null then'prepared'else'assigned'end,a)returning *into e;
 else
 select *into e from public.telecom_equipment where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;if not found then raise exception using errcode='P0002',message='equipment_not_found';end if;
 if e.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='equipment_conflict';end if;
 if e.source<>'manual'then raise exception using errcode='42501',message='equipment_external_read_only';end if;
 if(p_operation in('equipment.assign','equipment.cancel')and e.status<>'prepared')or(p_operation in('equipment.return','equipment.replace')and e.status<>'assigned')then raise exception using errcode='22023',message='equipment_invalid_transition';end if;
 if event_date<coalesce(e.assigned_on,e.purchased_on,event_date)then raise exception using errcode='22023',message='equipment_invalid_date';end if;
 if p_operation in('equipment.assign','equipment.replace')then perform public.equipment_v1_context(p_workspace_id,e.customer_id,e.contract_id,e.service_id,e.line_id,case when p_operation='equipment.replace'then(p_input->>'commitment_id')::uuid else e.commitment_id end,e.kind,true);end if;
 if p_operation='equipment.assign'then update public.telecom_equipment set status='assigned',assigned_on=event_date where id=e.id returning *into e;
 elsif p_operation='equipment.return'then update public.telecom_equipment set status='returned',returned_on=event_date where id=e.id returning *into e;
 elsif p_operation='equipment.cancel'then update public.telecom_equipment set status='cancelled',cancelled_on=event_date where id=e.id returning *into e;
 else nid:=gen_random_uuid();update public.telecom_equipment set status='replaced',replaced_on=event_date,replaced_by_id=nid where id=e.id returning *into e;
 insert into public.telecom_equipment(id,workspace_id,customer_id,contract_id,service_id,line_id,commitment_id,kind,manufacturer,model,commercial_description,purchased_on,assigned_on,status,replaces_equipment_id,created_by_user_id)values(nid,p_workspace_id,e.customer_id,e.contract_id,e.service_id,e.line_id,(p_input->>'commitment_id')::uuid,e.kind,p_input->>'manufacturer',p_input->>'model',p_input->>'commercial_description',(p_input->>'purchased_on')::date,event_date,'assigned',e.id,a)returning *into n;
 insert into public.telecom_equipment_events(workspace_id,equipment_id,version,operation,status,event_on,related_equipment_id,actor_user_id)values(p_workspace_id,n.id,1,'equipment.create','assigned',event_date,e.id,a);end if;end if;
 insert into public.telecom_equipment_events(workspace_id,equipment_id,version,operation,status,event_on,related_equipment_id,actor_user_id)values(p_workspace_id,e.id,e.version,p_operation,e.status,event_date,n.id,a);
 prior:=jsonb_build_object('contract_version','equipment.v1','operation',p_operation,'command_id',p_input->>'command_id','id',e.id,'version',e.version,'status',e.status,'source',e.source,'replacement_id',n.id,'replacement_version',n.version);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,e.id,e.version);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
 exception when unique_violation then raise exception using errcode='40001',message='equipment_conflict';when integrity_constraint_violation or data_exception then raise exception using errcode='22023',message='equipment_invalid_input';end$$;
create function public.equipment_v1_query(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare rows jsonb;lim int;cursor uuid;seq bigint;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);perform public.equipment_v1_validate(p_operation,p_input);if p_operation not in('equipment.list','equipment.get','equipment.history')then raise exception using errcode='22023',message='equipment_invalid_operation';end if;
 lim:=case when p_operation='equipment.get'then 1 else coalesce((p_input->>'limit')::int,50)end;
 if p_operation='equipment.history'then perform 1 from public.telecom_equipment where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;if not found then raise exception using errcode='P0002',message='equipment_not_found';end if;
 select coalesce(jsonb_agg(to_jsonb(x)order by version),'[]'::jsonb)into rows from(select version,operation,status,event_on,related_equipment_id,actor_user_id,created_at from public.telecom_equipment_events where workspace_id=p_workspace_id and equipment_id=(p_input->>'id')::uuid and(not p_input?'after_version'or version>(p_input->>'after_version')::bigint)order by version limit lim+1)x;
 if jsonb_array_length(rows)>lim then rows:=rows-lim;seq:=(rows->(lim-1)->>'version')::bigint;end if;return jsonb_build_object('contract_version','equipment.v1','operation',p_operation,'id',p_input->>'id','items',rows,'next_version',seq);end if;
 select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(select id,version,customer_id,contract_id,service_id,line_id,commitment_id,kind,manufacturer,model,commercial_description,status,purchased_on,assigned_on,returned_on,replaced_on,cancelled_on,replaces_equipment_id,replaced_by_id,source from public.telecom_equipment where workspace_id=p_workspace_id and(p_operation<>'equipment.get'or id=(p_input->>'id')::uuid)and(not p_input?'after_id'or id>(p_input->>'after_id')::uuid)and(not p_input?'customer_id'or customer_id=(p_input->>'customer_id')::uuid)and(not p_input?'contract_id'or contract_id=(p_input->>'contract_id')::uuid)and(not p_input?'service_id'or service_id=(p_input->>'service_id')::uuid)and(not p_input?'line_id'or line_id=(p_input->>'line_id')::uuid)and(not p_input?'kind'or kind=p_input->>'kind')and(not p_input?'status'or status=p_input->>'status')and(not p_input?'source'or source=p_input->>'source')order by id limit lim+1)x;
 if p_operation='equipment.get'then if jsonb_array_length(rows)=0 then raise exception using errcode='P0002',message='equipment_not_found';end if;return jsonb_build_object('contract_version','equipment.v1','operation',p_operation,'record',rows->0);end if;
 if jsonb_array_length(rows)>lim then rows:=rows-lim;cursor:=(rows->(lim-1)->>'id')::uuid;end if;return jsonb_build_object('contract_version','equipment.v1','operation',p_operation,'items',rows,'next_id',cursor);end$$;
revoke all on function public.equipment_v1_context(uuid,uuid,uuid,uuid,uuid,uuid,text,boolean),public.equipment_v1_guard(),public.equipment_v1_validate(text,jsonb),public.equipment_v1_command(uuid,text,jsonb),public.equipment_v1_query(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.equipment_v1_command(uuid,text,jsonb),public.equipment_v1_query(uuid,text,jsonb)to authenticated;
comment on table public.telecom_equipment is 'Commercial customer-bound equipment; prepared means customer allocation, not warehouse stock. Manufacturer/model and lifecycle history only: no serial, IMEI, credentials or network provisioning.';
commit;
