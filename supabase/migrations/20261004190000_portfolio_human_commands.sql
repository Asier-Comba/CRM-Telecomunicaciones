-- B4 human portfolio boundary. Published migrations remain immutable.
begin;
alter table public.telecom_contracts add column version bigint not null default 1 check(version>0 and version<1000000000000000);
alter table public.telecom_services add column version bigint not null default 1 check(version>0 and version<1000000000000000);
alter table public.telecom_lines add column version bigint not null default 1 check(version>0 and version<1000000000000000);
alter table public.telecom_services add column source text not null default 'manual' check(source in ('manual','import','integration'));
alter table public.telecom_lines add column source text not null default 'manual' check(source in ('manual','import','integration'));
alter table public.telecom_services add column status_effective_on date;
alter table public.telecom_lines add column status_effective_on date;
update public.telecom_services set status_effective_on=coalesce(ended_on,activated_on);
update public.telecom_lines set status_effective_on=coalesce(ended_on,activated_on);
alter table public.telecom_lines add column display_name text check(display_name is null or (char_length(btrim(display_name))between 1 and 200 and display_name!~'[[:cntrl:]]'));
update public.telecom_services s set source=c.source from public.telecom_contracts c where c.id=s.contract_id and c.workspace_id=s.workspace_id;
update public.telecom_lines l set source=s.source from public.telecom_services s where s.id=l.service_id and s.workspace_id=l.workspace_id;
create function public.portfolio_v1_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if tg_table_name='telecom_services' then select source into new.source from public.telecom_contracts where id=new.contract_id and workspace_id=new.workspace_id;
  elsif tg_table_name='telecom_lines' then select source into new.source from public.telecom_services where id=new.service_id and workspace_id=new.workspace_id;end if;
 elsif (to_jsonb(new)-array['version','updated_at','assigned_user_id','display_name','status','signed_date','cancelled_at','cancelled_by_user_id','activated_on','ended_on','status_effective_on']) is distinct from (to_jsonb(old)-array['version','updated_at','assigned_user_id','display_name','status','signed_date','cancelled_at','cancelled_by_user_id','activated_on','ended_on','status_effective_on']) then
  raise exception using errcode='55000',message='portfolio_identity_immutable';
 end if;
 return new;
end$$;
revoke all on function public.portfolio_v1_identity()from public,anon,authenticated,service_role;
create trigger telecom_contracts_product_version before update on public.telecom_contracts for each row execute function public.manage_task_version();
create trigger telecom_contracts_product_identity before insert or update on public.telecom_contracts for each row execute function public.portfolio_v1_identity();
create trigger telecom_services_product_version before update on public.telecom_services for each row execute function public.manage_task_version();
create trigger telecom_services_product_identity before insert or update on public.telecom_services for each row execute function public.portfolio_v1_identity();
create trigger telecom_lines_product_version before update on public.telecom_lines for each row execute function public.manage_task_version();
create trigger telecom_lines_product_identity before insert or update on public.telecom_lines for each row execute function public.portfolio_v1_identity();
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 if expr is null then raise exception 'command registry absent';end if;
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||') or operation=any(array[''contract.create_manual'',''contract.update_allowed_metadata'',''contract.activate'',''contract.cancel'',''service.create_manual'',''service.update_label'',''service.transition'',''line.create_manual'',''line.update_label'',''line.transition'' ]::text[]))';
end$$;
create function public.portfolio_v1_validate(p_op text,p_input jsonb)returns void language plpgsql set search_path=''as $$
declare req text[];opt text[]:=array[]::text[];k text;v jsonb;s text;d date;begin
 req:=case p_op
 when 'contract.create_manual'then array['command_id','customer_id','operator_id','start_date']
 when 'contract.update_allowed_metadata'then array['command_id','id','expected_version','assigned_user_id']
 when 'contract.activate'then array['command_id','id','expected_version','signed_date']
 when 'contract.cancel'then array['command_id','id','expected_version']
 when 'service.create_manual'then array['command_id','contract_id','service_kind','display_name']
 when 'line.create_manual'then array['command_id','service_id','display_name']
 when 'service.update_label'then array['command_id','id','expected_version','display_name']
 when 'line.update_label'then array['command_id','id','expected_version','display_name']
 when 'service.transition'then array['command_id','id','expected_version','status','effective_on']
 when 'line.transition'then array['command_id','id','expected_version','status','effective_on']
 else null end;
 if req is null then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 if p_op='contract.create_manual'then opt:=array['plan_version_id','assigned_user_id'];elsif p_op='service.create_manual'then opt:=array['plan_version_id'];end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096 or exists(select 1 from unnest(req)x where not p_input?x) or exists(select 1 from jsonb_object_keys(p_input)x where not x=any(req||opt)) then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 for k,v in select key,value from jsonb_each(p_input)loop
  s:=p_input->>k;
  if v='null'::jsonb then
   if k not in ('assigned_user_id','plan_version_id')then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif k='expected_version'then
   if jsonb_typeof(v)<>'number' or s!~'^[1-9][0-9]{0,14}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif k like '%_id' or k='id'then
   if jsonb_typeof(v)<>'string' or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif k in ('start_date','signed_date','effective_on')then
   if jsonb_typeof(v)<>'string' or s!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
   begin d:=s::date;exception when others then raise exception using errcode='22023',message='portfolio_invalid_input';end;
   if d<'1900-01-01'::date or d>'2199-12-31'::date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif jsonb_typeof(v)<>'string' or char_length(btrim(s))not between 1 and 200 or s~'[[:cntrl:]]' or(k='status'and s not in ('active','suspended','ended','cancelled'))or(k='service_kind'and s not in ('mobile','fiber','fixed_voice','data_connectivity','other'))then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 end loop;
end$$;
revoke all on function public.portfolio_v1_validate(text,jsonb)from public,anon,authenticated,service_role;
create function public.portfolio_v1_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;prior jsonb;c public.telecom_contracts%rowtype;s public.telecom_services%rowtype;l public.telecom_lines%rowtype;cid uuid;sid uuid;entity uuid;ver bigint;st text;src text;at date;before_status text;activated date;last_effective date;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id,true);
 perform public.portfolio_v1_validate(p_op,p_input);
 prior:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if prior is not null then return prior;end if;
 if p_op='contract.create_manual'then
  perform 1 from public.customers where id=(p_input->>'customer_id')::uuid and workspace_id=p_workspace_id and status='active' for share;
  if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
  perform 1 from public.telecom_operators where id=(p_input->>'operator_id')::uuid and workspace_id=p_workspace_id and status='active' for share;
  if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
  insert into public.telecom_contracts(workspace_id,customer_id,operator_id,start_date,plan_version_id,assigned_user_id,source,created_by_user_id)
  values(p_workspace_id,(p_input->>'customer_id')::uuid,(p_input->>'operator_id')::uuid,(p_input->>'start_date')::date,(p_input->>'plan_version_id')::uuid,(p_input->>'assigned_user_id')::uuid,'manual',actor)returning *into c;
  entity:=c.id;ver:=c.version;st:=c.status;src:=c.source;
 else
  -- Ancestor-first locks serialize child creation/transition against parent closure.
  if p_op like 'contract.%'then cid:=(p_input->>'id')::uuid;
  elsif p_op='service.create_manual'then cid:=(p_input->>'contract_id')::uuid;
  elsif p_op like 'service.%'then select contract_id into cid from public.telecom_services where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;
  else
   if p_op='line.create_manual'then sid:=(p_input->>'service_id')::uuid;else select service_id into sid from public.telecom_lines where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;end if;
   select contract_id into cid from public.telecom_services where id=sid and workspace_id=p_workspace_id;
  end if;
  select *into c from public.telecom_contracts where id=cid and workspace_id=p_workspace_id for update;
  if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
  if p_op like 'contract.%'then
   if c.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='portfolio_conflict';end if;
   if p_op='contract.update_allowed_metadata'then
    update public.telecom_contracts set assigned_user_id=(p_input->>'assigned_user_id')::uuid where id=c.id returning *into c;
   else
    if c.source<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
    if p_op='contract.activate'then
     if c.status<>'draft'then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
     update public.telecom_contracts set status='active',signed_date=(p_input->>'signed_date')::date where id=c.id returning *into c;
    else
     if c.status not in ('draft','active')or exists(select 1 from public.telecom_services where contract_id=c.id and workspace_id=p_workspace_id and status not in ('ended','cancelled'))then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
     update public.telecom_contracts set status='cancelled',cancelled_at=statement_timestamp(),cancelled_by_user_id=actor where id=c.id returning *into c;
    end if;
   end if;
   entity:=c.id;ver:=c.version;st:=c.status;src:=c.source;
  elsif p_op='service.create_manual'then
   if c.source<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
   if c.status not in ('draft','active')then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
   insert into public.telecom_services(workspace_id,customer_id,operator_id,contract_id,service_kind,display_name,plan_version_id,created_by_user_id)
   values(p_workspace_id,c.customer_id,c.operator_id,c.id,p_input->>'service_kind',p_input->>'display_name',(p_input->>'plan_version_id')::uuid,actor)returning *into s;
   entity:=s.id;ver:=s.version;st:=s.status;src:=s.source;
  else
   select *into s from public.telecom_services where id=case when p_op like 'service.%'then(p_input->>'id')::uuid else sid end and workspace_id=p_workspace_id and contract_id=c.id for update;
   if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
   if p_op='line.create_manual'then
    if c.source<>'manual'or s.source<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
    if c.status not in ('draft','active')or s.status not in ('pending','active','suspended')then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
    insert into public.telecom_lines(workspace_id,service_id,display_name,created_by_user_id)values(p_workspace_id,s.id,p_input->>'display_name',actor)returning *into l;
   else
    if p_op like 'line.%'then
     select *into l from public.telecom_lines where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id and service_id=s.id for update;
     if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
     ver:=l.version;before_status:=l.status;activated:=l.activated_on;last_effective:=l.status_effective_on;src:=l.source;
    else ver:=s.version;before_status:=s.status;activated:=s.activated_on;last_effective:=s.status_effective_on;src:=s.source;end if;
    if ver<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='portfolio_conflict';end if;
    if p_op like '%.update_label'then
     if p_op like 'line.%'then update public.telecom_lines set display_name=p_input->>'display_name'where id=l.id returning *into l;
     else update public.telecom_services set display_name=p_input->>'display_name'where id=s.id returning *into s;end if;
    else
     if c.source<>'manual'or s.source<>'manual'or src<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
     st:=p_input->>'status';at:=(p_input->>'effective_on')::date;
     if not ((before_status='pending'and st in ('active','cancelled'))or(before_status='active'and st in ('suspended','ended'))or(before_status='suspended'and st in ('active','ended')))or at<c.start_date or(activated is not null and at<activated)or(last_effective is not null and at<last_effective)or(p_op like 'line.%'and s.activated_on is not null and at<s.activated_on)or(st='active'and(c.status<>'active'or(p_op like 'line.%'and s.status<>'active')))then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
     if p_op like 'service.%'and st in ('ended','cancelled')and exists(select 1 from public.telecom_lines where workspace_id=p_workspace_id and service_id=s.id and(status not in ('ended','cancelled')or ended_on>at))then raise exception using errcode='22023',message='portfolio_live_children';end if;
     if p_op like 'line.%'then
      update public.telecom_lines set status=st,status_effective_on=at,activated_on=case when before_status='pending'and st='active'then at else activated_on end,ended_on=case when st in ('ended','cancelled')then at else null end where id=l.id returning *into l;
     else
      update public.telecom_services set status=st,status_effective_on=at,activated_on=case when before_status='pending'and st='active'then at else activated_on end,ended_on=case when st in ('ended','cancelled')then at else null end where id=s.id returning *into s;
     end if;
    end if;
   end if;
   if p_op like 'line.%'then entity:=l.id;ver:=l.version;st:=l.status;src:=l.source;else entity:=s.id;ver:=s.version;st:=s.status;src:=s.source;end if;
  end if;
 end if;
 -- Closed receipt and atomic coded audit/activity; no labels or identifiers in audit.
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,entity,ver,st,c.customer_id);
 prior:=jsonb_set(prior,'{contract_version}','"portfolio.v1"'::jsonb)||jsonb_build_object('source',src);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 return prior;
end$$;
revoke all on function public.portfolio_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
create function public.portfolio_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare row jsonb;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);
 if p_input is null or jsonb_typeof(p_input)<>'object'or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from array['id','kind']::text[] or jsonb_typeof(p_input->'id')<>'string'or p_input->>'id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(p_input->'kind')<>'string'or p_input->>'kind'not in ('contract','service','line')then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 if p_input->>'kind'='contract'then select jsonb_build_object('id',id,'version',version,'status',status,'source',source,'customer_id',customer_id,'operator_id',operator_id,'plan_version_id',plan_version_id,'start_date',start_date,'signed_date',signed_date,'end_date',end_date,'assigned_user_id',assigned_user_id)into row from public.telecom_contracts where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;
 elsif p_input->>'kind'='service'then select jsonb_build_object('id',id,'version',version,'status',status,'source',source,'customer_id',customer_id,'contract_id',contract_id,'operator_id',operator_id,'plan_version_id',plan_version_id,'service_kind',service_kind,'display_name',display_name,'activated_on',activated_on,'ended_on',ended_on,'status_effective_on',status_effective_on)into row from public.telecom_services where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;
 else select jsonb_build_object('id',id,'version',version,'status',status,'source',source,'service_id',service_id,'display_name',display_name,'activated_on',activated_on,'ended_on',ended_on,'status_effective_on',status_effective_on)into row from public.telecom_lines where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;end if;
 if row is null then return null;end if;
 return jsonb_build_object('contract_version','portfolio.v1','kind',p_input->>'kind','record',row);
end$$;
revoke all on function public.portfolio_v1_get(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_get(uuid,jsonb)to authenticated;
create function public.portfolio_v1_contract_create_manual(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'contract.create_manual',p_input)$$;
revoke all on function public.portfolio_v1_contract_create_manual(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_contract_create_manual(uuid,jsonb)to authenticated;
create function public.portfolio_v1_contract_update_allowed_metadata(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'contract.update_allowed_metadata',p_input)$$;
revoke all on function public.portfolio_v1_contract_update_allowed_metadata(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_contract_update_allowed_metadata(uuid,jsonb)to authenticated;
create function public.portfolio_v1_contract_activate(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'contract.activate',p_input)$$;
revoke all on function public.portfolio_v1_contract_activate(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_contract_activate(uuid,jsonb)to authenticated;
create function public.portfolio_v1_contract_cancel(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'contract.cancel',p_input)$$;
revoke all on function public.portfolio_v1_contract_cancel(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_contract_cancel(uuid,jsonb)to authenticated;
create function public.portfolio_v1_service_create_manual(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'service.create_manual',p_input)$$;
revoke all on function public.portfolio_v1_service_create_manual(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_service_create_manual(uuid,jsonb)to authenticated;
create function public.portfolio_v1_service_update_label(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'service.update_label',p_input)$$;
revoke all on function public.portfolio_v1_service_update_label(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_service_update_label(uuid,jsonb)to authenticated;
create function public.portfolio_v1_service_transition(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'service.transition',p_input)$$;
revoke all on function public.portfolio_v1_service_transition(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_service_transition(uuid,jsonb)to authenticated;
create function public.portfolio_v1_line_create_manual(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'line.create_manual',p_input)$$;
revoke all on function public.portfolio_v1_line_create_manual(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_line_create_manual(uuid,jsonb)to authenticated;
create function public.portfolio_v1_line_update_label(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'line.update_label',p_input)$$;
revoke all on function public.portfolio_v1_line_update_label(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_line_update_label(uuid,jsonb)to authenticated;
create function public.portfolio_v1_line_transition(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_command(p_workspace_id,'line.transition',p_input)$$;
revoke all on function public.portfolio_v1_line_transition(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_line_transition(uuid,jsonb)to authenticated;
commit;
