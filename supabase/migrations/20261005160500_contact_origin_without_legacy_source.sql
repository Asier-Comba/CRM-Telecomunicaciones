begin;
create or replace function public.provenance_v1_capture_manual()returns trigger language plpgsql security definer set search_path=''as $$
declare kind text;relation text;source_value text;begin
 kind:=case new.operation when 'customer.create'then 'customer'when 'contact.create'then 'contact'when 'opportunity.create'then 'opportunity'when 'contract.create_manual'then 'contract'when 'service.create_manual'then 'service'when 'line.create_manual'then 'line'when 'contract.record_renewal'then 'renewal'when 'permanence.create_manual'then 'permanence'else null end;
 if kind is null then return new;end if;
 relation:=case kind when 'customer'then 'customers'when 'contact'then 'contacts'when 'opportunity'then 'opportunities'when 'contract'then 'telecom_contracts'when 'service'then 'telecom_services'when 'line'then 'telecom_lines'when 'renewal'then 'telecom_renewals'else 'telecom_commitments'end;
 if kind='contact'then source_value:='manual';else execute format('select source from public.%I where workspace_id=$1 and id=$2',relation)into source_value using new.workspace_id,new.entity_id;end if;
 if source_value='manual'then insert into public.product_manual_origin_proofs(workspace_id,entity_kind,entity_id,audit_event_id,verified_at)values(new.workspace_id,kind,new.entity_id,new.id,new.occurred_at);end if;
 return new;
end$$;
revoke all on function public.provenance_v1_capture_manual()from public,anon,authenticated,service_role;

create or replace function public.provenance_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare relation text;src text;verified timestamptz;begin
 perform public.team_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from array['id','kind']::text[]or jsonb_typeof(p_input->'id')<>'string'or p_input->>'id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(p_input->'kind')<>'string'or p_input->>'kind'not in ('customer','contact','opportunity','contract','service','line','renewal','permanence')then raise exception using errcode='22023',message='provenance_invalid_input';end if;
 relation:=case p_input->>'kind'when 'customer'then 'customers'when 'contact'then 'contacts'when 'opportunity'then 'opportunities'when 'contract'then 'telecom_contracts'when 'service'then 'telecom_services'when 'line'then 'telecom_lines'when 'renewal'then 'telecom_renewals'else 'telecom_commitments'end;
 if p_input->>'kind'='contact'then execute 'select ''unrecorded''::text from public.contacts where workspace_id=$1 and id=$2 for share'into src using p_workspace_id,(p_input->>'id')::uuid;else execute format('select source from public.%I where workspace_id=$1 and id=$2 for share',relation)into src using p_workspace_id,(p_input->>'id')::uuid;end if;
 if src is null then raise exception using errcode='P0002',message='provenance_not_found';end if;
 select verified_at into verified from public.product_manual_origin_proofs where workspace_id=p_workspace_id and entity_kind=p_input->>'kind'and entity_id=(p_input->>'id')::uuid;
 if src='unrecorded'and verified is not null then src:='manual';end if;
 return jsonb_build_object('contract_version','provenance.v1','operation','provenance.get','kind',p_input->>'kind','id',p_input->>'id','declared_source',src,'confidence',case when verified is not null and src='manual'then 'verified_new_manual'when src='manual'then 'declared_legacy_manual'when src='unrecorded'then 'unverified_legacy'else 'declared_external'end,'verified_at',case when src='manual'then verified else null end);
end$$;
revoke all on function public.provenance_v1_get(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.provenance_v1_get(uuid,jsonb)to authenticated;

commit;
