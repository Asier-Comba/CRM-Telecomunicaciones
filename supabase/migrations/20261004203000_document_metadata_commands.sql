-- Protected document metadata lifecycle; Storage capabilities remain separate.
begin;
alter table public.documents add column version bigint not null default 1 check(version>0 and version<1000000000000000);
create trigger documents_product_version before update on public.documents for each row execute function public.manage_task_version();
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 if expr is null then raise exception 'command registry absent';end if;
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''document.archive'',''document.restore''))';
end$$;
create function public.document_v1_assert_scope(p_workspace_id uuid)returns uuid language plpgsql security definer set search_path=''as $$
declare actor uuid;begin
 actor:=public.product_v1_assert_scope(p_workspace_id,false);
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=actor and status='active'and role in ('owner','admin'))then raise exception using errcode='42501',message='document_access_denied';end if;
 return actor;
end$$;
revoke all on function public.document_v1_assert_scope(uuid)from public,anon,authenticated,service_role;
create function public.document_v1_safe_metadata(p_workspace_id uuid,p_id uuid)returns jsonb language sql security definer set search_path=''as $$
 select jsonb_build_object('id',id,'version',version,'status',status,'document_kind',document_kind,'media_type',media_type,'size_bytes',size_bytes,
 'target',jsonb_build_object('kind',case when customer_id is not null then 'customer'when contract_id is not null then 'contract'when service_id is not null then 'service'when line_id is not null then 'line'when service_case_id is not null then 'service_case'else 'opportunity'end,
 'id',coalesce(customer_id,contract_id,service_id,line_id,service_case_id,opportunity_id)))from public.documents where workspace_id=p_workspace_id and id=p_id
$$;
revoke all on function public.document_v1_safe_metadata(uuid,uuid)from public,anon,authenticated,service_role;
create function public.document_v1_command(p_workspace_id uuid,p_op text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;prior jsonb;d public.documents%rowtype;k text;customer uuid;begin
 actor:=public.document_v1_assert_scope(p_workspace_id);
 if p_op not in ('document.archive','document.restore')or p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from array['command_id','expected_version','id']::text[]then raise exception using errcode='22023',message='document_invalid_input';end if;
 foreach k in array array['id','command_id']loop if jsonb_typeof(p_input->k)<>'string'or p_input->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='document_invalid_input';end if;end loop;
 if jsonb_typeof(p_input->'expected_version')<>'number'or p_input->>'expected_version'!~'^[1-9][0-9]{0,14}$'then raise exception using errcode='22023',message='document_invalid_input';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if prior is not null then return prior;end if;
 select *into d from public.documents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='document_not_found';end if;
 if d.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='document_conflict';end if;
 if(p_op='document.archive'and d.status<>'active')or(p_op='document.restore'and d.status<>'archived')then raise exception using errcode='22023',message='document_invalid_transition';end if;
 update public.documents set status=case p_op when 'document.archive'then 'archived'else 'active'end,archived_at=case p_op when 'document.archive'then statement_timestamp()else null end,archived_by_user_id=case p_op when 'document.archive'then actor else null end where id=d.id returning *into d;
 select coalesce(d.customer_id,(select customer_id from public.telecom_contracts where workspace_id=p_workspace_id and id=d.contract_id),(select customer_id from public.telecom_services where workspace_id=p_workspace_id and id=d.service_id),(select s.customer_id from public.telecom_lines l join public.telecom_services s on s.workspace_id=l.workspace_id and s.id=l.service_id where l.workspace_id=p_workspace_id and l.id=d.line_id),(select customer_id from public.service_cases where workspace_id=p_workspace_id and id=d.service_case_id),(select customer_id from public.opportunities where workspace_id=p_workspace_id and id=d.opportunity_id))into customer;
 prior:=public.product_v1_finish_command(p_workspace_id,actor,p_op,p_input,d.id,d.version,d.status,customer);
 prior:=jsonb_set(prior,'{contract_version}','"document.v1"'::jsonb);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;
 return prior;
end$$;
revoke all on function public.document_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
create function public.document_v1_get_metadata(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare record jsonb;begin
 perform public.document_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from array['id']::text[]or jsonb_typeof(p_input->'id')<>'string'or p_input->>'id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='document_invalid_input';end if;
 record:=public.document_v1_safe_metadata(p_workspace_id,(p_input->>'id')::uuid);
 if record is null then return null;end if;
 return jsonb_build_object('contract_version','document.v1','operation','document.get_metadata','record',record);
end$$;
revoke all on function public.document_v1_get_metadata(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_v1_get_metadata(uuid,jsonb)to authenticated;
create function public.document_v1_list(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare lim integer;rows jsonb;target uuid;kind text;next_id uuid;k text;begin
 perform public.document_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or exists(select 1 from jsonb_object_keys(p_input)x where x not in ('target_kind','target_id','status','limit','after_id'))or jsonb_typeof(p_input->'target_kind')is distinct from 'string'or p_input->>'target_kind'not in ('customer','contract','service','line','service_case','opportunity')or not p_input?'target_id'then raise exception using errcode='22023',message='document_invalid_input';end if;
 foreach k in array array['target_id','after_id']loop if p_input?k and(jsonb_typeof(p_input->k)<>'string'or p_input->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then raise exception using errcode='22023',message='document_invalid_input';end if;end loop;
 if p_input?'status'and(jsonb_typeof(p_input->'status')<>'string'or p_input->>'status'not in ('active','archived'))or p_input?'limit'and(jsonb_typeof(p_input->'limit')<>'number'or p_input->>'limit'!~'^[1-9][0-9]{0,2}$'or(p_input->>'limit')::integer>100)then raise exception using errcode='22023',message='document_invalid_input';end if;
 kind:=p_input->>'target_kind';target:=(p_input->>'target_id')::uuid;lim:=coalesce((p_input->>'limit')::integer,20);
 select coalesce(jsonb_agg(public.document_v1_safe_metadata(p_workspace_id,id)order by id),'[]'::jsonb)into rows from(select id from public.documents where workspace_id=p_workspace_id and status=coalesce(p_input->>'status','active')and(not p_input?'after_id'or id>(p_input->>'after_id')::uuid)and case kind when 'customer'then customer_id when 'contract'then contract_id when 'service'then service_id when 'line'then line_id when 'service_case'then service_case_id else opportunity_id end=target order by id limit lim)x;
 next_id:=case when jsonb_array_length(rows)=lim then(rows->(lim-1)->>'id')::uuid else null end;
 return jsonb_build_object('contract_version','document.v1','operation','document.list','items',rows,'next_id',next_id);
end$$;
revoke all on function public.document_v1_list(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_v1_list(uuid,jsonb)to authenticated;
create function public.document_v1_archive(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_v1_command(p_workspace_id,'document.archive',p_input)$$;
revoke all on function public.document_v1_archive(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_v1_archive(uuid,jsonb)to authenticated;
create function public.document_v1_restore(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.document_v1_command(p_workspace_id,'document.restore',p_input)$$;
revoke all on function public.document_v1_restore(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_v1_restore(uuid,jsonb)to authenticated;
commit;
