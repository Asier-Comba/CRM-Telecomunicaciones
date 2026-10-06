-- Manual renewable deadlines, independent of provider/import truth.
begin;
create or replace function public.product_v1_finish_command(p_workspace_id uuid,p_actor uuid,p_operation text,
 p_input jsonb,p_entity uuid,p_version bigint,p_status text,p_customer uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 result:=jsonb_build_object('contract_version','product.v1','command_id',p_input->>'command_id',
  'operation',p_operation,'id',p_entity,'version',p_version,'status',p_status);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)
 values(p_workspace_id,p_actor,(p_input->>'command_id')::uuid,p_operation,p_entity,p_version);
 -- Existing telecom.v1 renderer remains compatible. Detailed closed operation
 -- identity is retained separately in the business audit, without PII blobs.
 insert into public.activities(workspace_id,customer_id,activity_kind,summary_code,actor_user_id,created_by_user_id)
 values(p_workspace_id,p_customer,
  case when (p_operation like '%.create' or p_operation like '%.create_manual' or p_operation='contract.record_renewal') then 'created' else 'updated' end,
  case when (p_operation like '%.create' or p_operation like '%.create_manual' or p_operation='contract.record_renewal') then 'entity.created' else 'entity.updated' end,p_actor,p_actor);
 update public.product_commands set receipt=result
 where workspace_id=p_workspace_id and actor_id=p_actor and command_id=(p_input->>'command_id')::uuid;
 return result;
end;
$$;
revoke all on function public.product_v1_finish_command(uuid,uuid,text,jsonb,uuid,bigint,text,uuid) from public,anon,authenticated,service_role;
alter table public.telecom_renewals add column version bigint not null default 1 check(version>0 and version<1000000000000000);
alter table public.telecom_commitments add column version bigint not null default 1 check(version>0 and version<1000000000000000);
alter table public.telecom_renewals add column source text not null default 'manual'check(source in ('manual','import','integration'));
update public.telecom_renewals r set source=c.source from public.telecom_contracts c where c.id=r.contract_id and c.workspace_id=r.workspace_id;
create function public.portfolio_v1_deadline_identity()returns trigger language plpgsql security definer set search_path=''as $$
begin
 if tg_op='INSERT'and tg_table_name='telecom_renewals'then select source into new.source from public.telecom_contracts where id=new.contract_id and workspace_id=new.workspace_id;
 elsif tg_op='UPDATE'and (to_jsonb(new)-array['version','updated_at','target_on','opens_on','closes_on','status','completed_at','dismissed_at','reason_code','starts_on','ends_on','administrative_status','cancelled_at','cancelled_by_user_id'])is distinct from(to_jsonb(old)-array['version','updated_at','target_on','opens_on','closes_on','status','completed_at','dismissed_at','reason_code','starts_on','ends_on','administrative_status','cancelled_at','cancelled_by_user_id'])then raise exception using errcode='55000',message='portfolio_deadline_identity_immutable';end if;
 return new;
end$$;
revoke all on function public.portfolio_v1_deadline_identity()from public,anon,authenticated,service_role;
create trigger telecom_renewals_product_version before update on public.telecom_renewals for each row execute function public.manage_task_version();
create trigger telecom_renewals_product_identity before insert or update on public.telecom_renewals for each row execute function public.portfolio_v1_deadline_identity();
create trigger telecom_commitments_product_version before update on public.telecom_commitments for each row execute function public.manage_task_version();
create trigger telecom_commitments_product_identity before insert or update on public.telecom_commitments for each row execute function public.portfolio_v1_deadline_identity();
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 if expr is null then raise exception 'command registry absent';end if;
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation=any(array[''contract.record_renewal'',''renewal.update'',''renewal.resolve'',''renewal.dismiss'',''permanence.create_manual'',''permanence.update'',''permanence.cancel'' ]::text[]))';
end$$;
create function public.portfolio_v1_deadline_validate(p_op text,p_input jsonb)returns void language plpgsql set search_path=''as $$
declare req text[];opt text[]:=array[]::text[];k text;v jsonb;s text;d date;begin
 req:=case p_op
 when 'contract.record_renewal'then array['command_id','contract_id','target_on','opens_on','closes_on']
 when 'renewal.update'then array['command_id','id','expected_version','target_on','opens_on','closes_on']
 when 'renewal.resolve'then array['command_id','id','expected_version','reason_code']
 when 'renewal.dismiss'then array['command_id','id','expected_version','reason_code']
 when 'permanence.create_manual'then array['command_id','contract_id','commitment_kind','starts_on','ends_on','reason_code']
 when 'permanence.update'then array['command_id','id','expected_version','starts_on','ends_on','reason_code']
 when 'permanence.cancel'then array['command_id','id','expected_version','reason_code']else null end;
 if p_op='permanence.create_manual'then opt:=array['service_id'];end if;
 if req is null or p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or exists(select 1 from unnest(req)x where not p_input?x)or exists(select 1 from jsonb_object_keys(p_input)x where not x=any(req||opt))then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 for k,v in select key,value from jsonb_each(p_input)loop
  s:=p_input->>k;
  if v='null'::jsonb then if k not in ('opens_on','closes_on','service_id')then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif k='expected_version'then if jsonb_typeof(v)<>'number'or s!~'^[1-9][0-9]{0,14}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif k like '%_id'or k='id'then if jsonb_typeof(v)<>'string'or s!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif k like '%_on'then
   if jsonb_typeof(v)<>'string'or s!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
   begin d:=s::date;exception when others then raise exception using errcode='22023',message='portfolio_invalid_input';end;
   if d<'1900-01-01'::date or d>'2199-12-31'::date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  elsif jsonb_typeof(v)<>'string'or(k='reason_code'and s!~'^[a-z0-9][a-z0-9_-]{0,63}$')or(k='commitment_kind'and s not in ('minimum_term','device','subsidy','discount','other'))then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 end loop;
 if p_op in ('contract.record_renewal','renewal.update')and((p_input->>'opens_on'is null)<>(p_input->>'closes_on'is null)or(p_input->>'opens_on'is not null and((p_input->>'closes_on')::date<(p_input->>'opens_on')::date or(p_input->>'target_on')::date not between(p_input->>'opens_on')::date and(p_input->>'closes_on')::date)))then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 if p_op in ('permanence.create_manual','permanence.update')and(p_input->>'ends_on')::date<(p_input->>'starts_on')::date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
end$$;
revoke all on function public.portfolio_v1_deadline_validate(text,jsonb)from public,anon,authenticated,service_role;
create function public.portfolio_v1_deadline_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;cid uuid;c public.telecom_contracts%rowtype;r public.telecom_renewals%rowtype;p public.telecom_commitments%rowtype;prior jsonb;entity uuid;ver bigint;st text;src text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id,true);
 perform public.portfolio_v1_deadline_validate(p_op,p_input);
 prior:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if prior is not null then return prior;end if;
 if p_op in ('contract.record_renewal','permanence.create_manual')then cid:=(p_input->>'contract_id')::uuid;
 elsif p_op like 'renewal.%'then select contract_id into cid from public.telecom_renewals where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;
 else select contract_id into cid from public.telecom_commitments where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;end if;
 select *into c from public.telecom_contracts where id=cid and workspace_id=p_workspace_id for update;
 if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
 if c.source<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
 if p_op in ('contract.record_renewal','permanence.create_manual','renewal.update','permanence.update')and c.status not in ('draft','active')then raise exception using errcode='22023',message='portfolio_closed_parent';end if;
 if p_op='contract.record_renewal'then
  if(p_input->>'target_on')::date<c.start_date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  insert into public.telecom_renewals(workspace_id,contract_id,target_on,opens_on,closes_on,created_by_user_id)values(p_workspace_id,c.id,(p_input->>'target_on')::date,(p_input->>'opens_on')::date,(p_input->>'closes_on')::date,actor)returning *into r;
 elsif p_op like 'renewal.%'then
  select *into r from public.telecom_renewals where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id and contract_id=c.id for update;
  if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
  if r.source<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
  if r.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='portfolio_conflict';end if;
  if r.status<>'open'then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
  if p_op='renewal.update'then
   if(p_input->>'target_on')::date<c.start_date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
   update public.telecom_renewals set target_on=(p_input->>'target_on')::date,opens_on=(p_input->>'opens_on')::date,closes_on=(p_input->>'closes_on')::date where id=r.id returning *into r;
  elsif p_op='renewal.resolve'then update public.telecom_renewals set status='completed',completed_at=statement_timestamp(),reason_code=p_input->>'reason_code'where id=r.id returning *into r;
  else update public.telecom_renewals set status='dismissed',dismissed_at=statement_timestamp(),reason_code=p_input->>'reason_code'where id=r.id returning *into r;end if;
 elsif p_op='permanence.create_manual'then
  if p_input->>'service_id'is not null then
   perform 1 from public.telecom_services where id=(p_input->>'service_id')::uuid and workspace_id=p_workspace_id and contract_id=c.id and source='manual'and status not in ('ended','cancelled')for update;
   if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
  end if;
  if(p_input->>'starts_on')::date<c.start_date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
  insert into public.telecom_commitments(workspace_id,contract_id,service_id,commitment_kind,starts_on,ends_on,reason_code,source,created_by_user_id)values(p_workspace_id,c.id,(p_input->>'service_id')::uuid,p_input->>'commitment_kind',(p_input->>'starts_on')::date,(p_input->>'ends_on')::date,p_input->>'reason_code','manual',actor)returning *into p;
 else
  select *into p from public.telecom_commitments where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id and contract_id=c.id for update;
  if not found then raise exception using errcode='P0002',message='portfolio_not_found';end if;
  if p.source<>'manual'then raise exception using errcode='42501',message='portfolio_external_truth';end if;
  if p.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='portfolio_conflict';end if;
  if p.administrative_status<>'open'then raise exception using errcode='22023',message='portfolio_invalid_transition';end if;
  if p_op='permanence.update'then
   if(p_input->>'starts_on')::date<c.start_date then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
   update public.telecom_commitments set starts_on=(p_input->>'starts_on')::date,ends_on=(p_input->>'ends_on')::date,reason_code=p_input->>'reason_code'where id=p.id returning *into p;
  else update public.telecom_commitments set administrative_status='cancelled',cancelled_at=statement_timestamp(),cancelled_by_user_id=actor,reason_code=p_input->>'reason_code'where id=p.id returning *into p;end if;
 end if;
 if p_op='contract.record_renewal'or p_op like 'renewal.%'then entity:=r.id;ver:=r.version;st:=r.status;src:=r.source;else entity:=p.id;ver:=p.version;st:=p.administrative_status;src:=p.source;end if;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,entity,ver,st,c.customer_id);
 prior:=jsonb_set(prior,'{contract_version}','"portfolio.v1"'::jsonb)||jsonb_build_object('source',src);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 return prior;
end$$;
revoke all on function public.portfolio_v1_deadline_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
alter function public.portfolio_v1_get(uuid,jsonb)rename to portfolio_v1_get_portfolio_base;
revoke all on function public.portfolio_v1_get_portfolio_base(uuid,jsonb)from public,anon,authenticated,service_role;
create function public.portfolio_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare row jsonb;begin
 perform public.product_v1_assert_scope(p_workspace_id,false);
 if p_input is null or octet_length(p_input::text)>4096 then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 if p_input->>'kind'not in ('renewal','permanence')or p_input->>'kind'is null then return public.portfolio_v1_get_portfolio_base(p_workspace_id,p_input);end if;
 perform public.product_v1_assert_scope(p_workspace_id,false);
 if p_input is null or jsonb_typeof(p_input)<>'object'or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from array['id','kind']::text[]or jsonb_typeof(p_input->'id')<>'string'or p_input->>'id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='portfolio_invalid_input';end if;
 if p_input->>'kind'='renewal'then select jsonb_build_object('id',id,'version',version,'status',status,'source',source,'contract_id',contract_id,'target_on',target_on,'opens_on',opens_on,'closes_on',closes_on,'reason_code',reason_code)into row from public.telecom_renewals where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;
 else select jsonb_build_object('id',id,'version',version,'status',administrative_status,'source',source,'contract_id',contract_id,'service_id',service_id,'commitment_kind',commitment_kind,'starts_on',starts_on,'ends_on',ends_on,'reason_code',reason_code)into row from public.telecom_commitments where id=(p_input->>'id')::uuid and workspace_id=p_workspace_id;end if;
 if row is null then return null;end if;
 return jsonb_build_object('contract_version','portfolio.v1','kind',p_input->>'kind','record',row);
end$$;
revoke all on function public.portfolio_v1_get(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_get(uuid,jsonb)to authenticated;
create function public.portfolio_v1_contract_record_renewal(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'contract.record_renewal',p_input)$$;
revoke all on function public.portfolio_v1_contract_record_renewal(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_contract_record_renewal(uuid,jsonb)to authenticated;
create function public.portfolio_v1_renewal_update(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'renewal.update',p_input)$$;
revoke all on function public.portfolio_v1_renewal_update(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_renewal_update(uuid,jsonb)to authenticated;
create function public.portfolio_v1_renewal_resolve(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'renewal.resolve',p_input)$$;
revoke all on function public.portfolio_v1_renewal_resolve(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_renewal_resolve(uuid,jsonb)to authenticated;
create function public.portfolio_v1_renewal_dismiss(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'renewal.dismiss',p_input)$$;
revoke all on function public.portfolio_v1_renewal_dismiss(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_renewal_dismiss(uuid,jsonb)to authenticated;
create function public.portfolio_v1_permanence_create_manual(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'permanence.create_manual',p_input)$$;
revoke all on function public.portfolio_v1_permanence_create_manual(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_permanence_create_manual(uuid,jsonb)to authenticated;
create function public.portfolio_v1_permanence_update(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'permanence.update',p_input)$$;
revoke all on function public.portfolio_v1_permanence_update(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_permanence_update(uuid,jsonb)to authenticated;
create function public.portfolio_v1_permanence_cancel(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.portfolio_v1_deadline_command(p_workspace_id,'permanence.cancel',p_input)$$;
revoke all on function public.portfolio_v1_permanence_cancel(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.portfolio_v1_permanence_cancel(uuid,jsonb)to authenticated;
commit;
