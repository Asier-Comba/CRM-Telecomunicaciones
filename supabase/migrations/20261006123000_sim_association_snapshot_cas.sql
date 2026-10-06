-- Forward-only repair of the association snapshot race observed on e8cd805.
-- No data rewrite or backfill. CREATE OR REPLACE preserves function identity/ACL.
-- Applied once by the migration ledger; repeating the definition is safe.
begin;
create or replace function public.sim_v1_command(p_workspace_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;prior jsonb;q public.telecom_sims%rowtype;replacement public.telecom_sims%rowtype;assoc public.telecom_sim_associations%rowtype;new_assoc uuid;line uuid;c public.telecom_contracts%rowtype;s public.telecom_services%rowtype;l public.telecom_lines%rowtype;iccid uuid;eid uuid;target_sim uuid;begin
 a:=public.product_v1_assert_scope(p_workspace_id,true);perform public.sim_v1_validate(p_operation,p_input);if p_operation in('sim.list','sim.get','sim.history')then raise exception using errcode='22023',message='sim_invalid_operation';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,a,p_operation,p_input);if prior is not null then return prior;end if;
 if p_operation='sim.create'then
 perform 1 from public.customers where workspace_id=p_workspace_id and id=(p_input->>'customer_id')::uuid and status='active'for share;if not found then raise exception using errcode='P0002',message='sim_customer_not_found';end if;
 perform 1 from public.telecom_operators where workspace_id=p_workspace_id and id=(p_input->>'operator_id')::uuid and status='active'for share;if not found then raise exception using errcode='P0002',message='sim_operator_not_found';end if;
 insert into public.telecom_sims(workspace_id,customer_id,operator_id,kind,display_label,created_by_user_id)values(p_workspace_id,(p_input->>'customer_id')::uuid,(p_input->>'operator_id')::uuid,p_input->>'kind',p_input->>'display_label',a)returning *into q;
 else
 select *into q from public.telecom_sims where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid;if not found then raise exception using errcode='P0002',message='sim_not_found';end if;
 if q.source<>'manual'then raise exception using errcode='42501',message='sim_external_read_only';end if;if q.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='sim_conflict';end if;
 if p_operation='sim.assign'then line:=(p_input->>'line_id')::uuid;elsif p_operation<>'sim.cancel'then select *into assoc from public.telecom_sim_associations where workspace_id=p_workspace_id and sim_id=q.id and ended_at is null;if not found then
 -- The initial resource read and association read use separate READ COMMITTED snapshots.
 -- A winning replacement/deactivation may close the association between them. Lock and
 -- recheck CAS before deciding this was an invalid transition. This branch only throws,
 -- so it never subsequently acquires portfolio ancestors in the reverse lock order.
 select *into q from public.telecom_sims where workspace_id=p_workspace_id and id=q.id for update;
 if q.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='sim_conflict';end if;
 raise exception using errcode='22023',message='sim_invalid_transition';
 end if;line:=assoc.line_id;end if;
 if line is not null then
 select con.*into c from public.telecom_contracts con join public.telecom_services svc on svc.contract_id=con.id and svc.workspace_id=con.workspace_id join public.telecom_lines lin on lin.service_id=svc.id and lin.workspace_id=svc.workspace_id where lin.workspace_id=p_workspace_id and lin.id=line for update of con;if not found then raise exception using errcode='P0002',message='sim_line_not_found';end if;
 select svc.*into s from public.telecom_services svc join public.telecom_lines lin on lin.service_id=svc.id and lin.workspace_id=svc.workspace_id where lin.workspace_id=p_workspace_id and lin.id=line for update of svc;
 select *into l from public.telecom_lines where workspace_id=p_workspace_id and id=line for update;
 if l.version<>(p_input->>'expected_line_version')::bigint then raise exception using errcode='40001',message='sim_line_conflict';end if;
 if c.source<>'manual'or s.source<>'manual'or l.source<>'manual'then raise exception using errcode='42501',message='sim_external_line_read_only';end if;
 if s.service_kind not in('mobile','data_connectivity')or l.status not in('pending','active','suspended')or s.status not in('pending','active','suspended')or c.status not in('draft','active')then raise exception using errcode='22023',message='sim_line_inactive';end if;
 end if;
 -- Lock both resources deterministically after the same portfolio ancestor order.
 perform 1 from public.telecom_sims where workspace_id=p_workspace_id and(id=q.id or p_operation='sim.replace'and id=(p_input->>'replacement_sim_id')::uuid)order by id for update;
 select *into q from public.telecom_sims where workspace_id=p_workspace_id and id=q.id;
 if q.source<>'manual'then raise exception using errcode='42501',message='sim_external_read_only';end if;if q.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='sim_conflict';end if;
 perform 1 from public.customers where workspace_id=p_workspace_id and id=q.customer_id and status='active'for share;if not found then raise exception using errcode='22023',message='sim_customer_inactive';end if;
 if line is not null and(q.customer_id<>s.customer_id or q.operator_id<>s.operator_id)then raise exception using errcode='22023',message='sim_invalid_ancestry';end if;
 if p_operation not in('sim.assign','sim.cancel')then select *into assoc from public.telecom_sim_associations where workspace_id=p_workspace_id and id=assoc.id and sim_id=q.id and ended_at is null for update;if not found then raise exception using errcode='40001',message='sim_conflict';end if;end if;
 if p_operation='sim.cancel'then if q.status<>'prepared'then raise exception using errcode='22023',message='sim_invalid_transition';end if;update public.telecom_sims set status='cancelled',cancelled_at=statement_timestamp()where id=q.id returning *into q;
 elsif p_operation='sim.assign'then
 if q.status<>'prepared'then raise exception using errcode='22023',message='sim_invalid_transition';end if;
 select id into iccid from public.telecom_identifiers where workspace_id=p_workspace_id and sim_id=q.id and identifier_kind='iccid'and status='active'for share;if not found then raise exception using errcode='22023',message='sim_iccid_required';end if;
 select id into eid from public.telecom_identifiers where workspace_id=p_workspace_id and sim_id=q.id and identifier_kind='eid'and status='active'for share;
 insert into public.telecom_sim_associations(workspace_id,sim_id,line_id,iccid_identifier_id,eid_identifier_id,created_by_user_id)values(p_workspace_id,q.id,l.id,iccid,eid,a)returning *into assoc;
 update public.telecom_sims set status='assigned'where id=q.id returning *into q;
 elsif p_operation='sim.activate'then
 if q.status<>'assigned'then raise exception using errcode='22023',message='sim_invalid_transition';end if;
 update public.telecom_sim_associations set activated_at=statement_timestamp()where id=assoc.id returning *into assoc;update public.telecom_sims set status='active',activated_at=statement_timestamp()where id=q.id returning *into q;
 elsif p_operation='sim.deactivate'then
 if q.status not in('assigned','active')then raise exception using errcode='22023',message='sim_invalid_transition';end if;
 update public.telecom_sim_associations set ended_at=statement_timestamp(),end_reason='deactivated'where id=assoc.id returning *into assoc;update public.telecom_sims set status='inactive',deactivated_at=statement_timestamp()where id=q.id returning *into q;
 else
 if q.status not in('assigned','active')then raise exception using errcode='22023',message='sim_invalid_transition';end if;
 select *into replacement from public.telecom_sims where workspace_id=p_workspace_id and id=(p_input->>'replacement_sim_id')::uuid;if not found then raise exception using errcode='P0002',message='sim_replacement_not_found';end if;
 if replacement.source<>'manual'then raise exception using errcode='42501',message='sim_external_read_only';end if;if replacement.version<>(p_input->>'expected_replacement_version')::bigint then raise exception using errcode='40001',message='sim_conflict';end if;if replacement.status<>'prepared'or replacement.customer_id<>q.customer_id or replacement.operator_id<>q.operator_id then raise exception using errcode='22023',message='sim_invalid_replacement';end if;
 select id into iccid from public.telecom_identifiers where workspace_id=p_workspace_id and sim_id=replacement.id and identifier_kind='iccid'and status='active'for share;if not found then raise exception using errcode='22023',message='sim_iccid_required';end if;
 select id into eid from public.telecom_identifiers where workspace_id=p_workspace_id and sim_id=replacement.id and identifier_kind='eid'and status='active'for share;
 update public.telecom_sim_associations set ended_at=statement_timestamp(),end_reason='replaced',replacement_sim_id=replacement.id where id=assoc.id returning *into assoc;
 insert into public.telecom_sim_associations(workspace_id,sim_id,line_id,iccid_identifier_id,eid_identifier_id,activated_at,created_by_user_id)values(p_workspace_id,replacement.id,l.id,iccid,eid,case when p_input->>'replacement_status'='active'then statement_timestamp()end,a)returning id into new_assoc;
 update public.telecom_sims set status='replaced',replaced_at=statement_timestamp()where id=q.id returning *into q;
 update public.telecom_sims set status=p_input->>'replacement_status',activated_at=case when p_input->>'replacement_status'='active'then statement_timestamp()end where id=replacement.id returning *into replacement;
 end if;end if;
 prior:=jsonb_build_object('contract_version','sim.v1','operation',p_operation,'command_id',p_input->>'command_id','id',q.id,'version',q.version,'status',q.status,'source',q.source,'association_id',assoc.id,'replacement_id',replacement.id,'replacement_version',replacement.version,'replacement_status',replacement.status,'replacement_association_id',new_assoc);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,p_operation,q.id,q.version);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;
 exception when unique_violation then raise exception using errcode='40001',message='sim_conflict';when integrity_constraint_violation or data_exception then raise exception using errcode='22023',message='sim_invalid_input';
end$$;
revoke all on function public.sim_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.sim_v1_command(uuid,text,jsonb)to authenticated;
commit;
