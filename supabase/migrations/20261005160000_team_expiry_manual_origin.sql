begin;
alter table public.team_invite_intents add column expires_at timestamptz;
update public.team_invite_intents set expires_at=created_at+interval '7 days';
alter table public.team_invite_intents alter column expires_at set not null;
alter table public.team_invite_intents alter column expires_at set default(statement_timestamp()+interval '7 days');
alter table public.team_invite_intents add constraint team_invite_expiry_order check(expires_at>created_at);
do $$declare expr text;begin
 select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';
 alter table public.product_commands drop constraint product_commands_operation_check;
 execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation=''member.reissue_invite'')';
end$$;
create function public.team_v1_member_reissue_invite(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid;prior jsonb;i public.team_invite_intents%rowtype;r text;begin
 actor:=public.team_v1_assert_scope(p_workspace_id);
 perform public.document_content_v1_validate('document.finalize_upload',p_input);
 select role into r from public.workspace_members where workspace_id=p_workspace_id and user_id=actor;
 -- Current target authorization is checked even on replay.
 select *into i from public.team_invite_intents where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
 if not found then raise exception using errcode='P0002',message='team_not_found';end if;
 if i.role='admin'and r<>'owner'then raise exception using errcode='42501',message='team_access_denied';end if;
 prior:=public.product_v1_begin_command(p_workspace_id,actor,'member.reissue_invite',p_input);if prior is not null then return prior;end if;
 if i.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='team_conflict';end if;
 if i.status<>'pending'or i.expires_at>statement_timestamp()then raise exception using errcode='22023',message='team_invalid_transition';end if;
 update public.team_invite_intents set expires_at=statement_timestamp()+interval '7 days',updated_at=statement_timestamp()where id=i.id returning *into i;
 prior:=public.team_v1_finish(p_workspace_id,actor,'member.reissue_invite',p_input,i.id,i.version,i.status)||jsonb_build_object('expires_at',i.expires_at);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=actor and command_id=(p_input->>'command_id')::uuid;return prior;
end$$;
revoke all on function public.team_v1_member_reissue_invite(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_reissue_invite(uuid,jsonb)to authenticated;
create function public.team_v1_member_invite_list(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare lim integer;rows jsonb;next_id uuid;begin
 perform public.team_v1_assert_scope(p_workspace_id);
 -- Reuse the closed bounded roster validator, but never return roster data here.
 perform public.team_v1_member_list(p_workspace_id,p_input);
 lim:=coalesce((p_input->>'limit')::integer,20);
 select coalesce(jsonb_agg(to_jsonb(x)order by id),'[]'::jsonb)into rows from(
  select id,version,email,role,case when status='pending'and expires_at<=statement_timestamp()then 'expired'else status end as status,expires_at
  from public.team_invite_intents where workspace_id=p_workspace_id and(not p_input?'after_id'or id>(p_input->>'after_id')::uuid)order by id limit lim)x;
 next_id:=case when jsonb_array_length(rows)=lim then(rows->(lim-1)->>'id')::uuid else null end;
 return jsonb_build_object('contract_version','team.v1','operation','member.invite_list','items',rows,'next_id',next_id);
end$$;
revoke all on function public.team_v1_member_invite_list(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.team_v1_member_invite_list(uuid,jsonb)to authenticated;

create table public.product_manual_origin_proofs(
 workspace_id uuid not null references public.workspaces(id),entity_kind text not null check(entity_kind in ('customer','contact','opportunity','contract','service','line','renewal','permanence')),entity_id uuid not null,
 audit_event_id uuid not null unique references public.product_audit_events(id),verified_at timestamptz not null,
 primary key(workspace_id,entity_kind,entity_id)
);
alter table public.product_manual_origin_proofs enable row level security;
alter table public.product_manual_origin_proofs force row level security;
revoke all on public.product_manual_origin_proofs from public,anon,authenticated,service_role;
create trigger product_manual_proof_append_only before update or delete on public.product_manual_origin_proofs for each row execute function public.reject_activity_mutation();
create function public.provenance_v1_capture_manual()returns trigger language plpgsql security definer set search_path=''as $$
declare kind text;relation text;source_value text;begin
 kind:=case new.operation when 'customer.create'then 'customer'when 'contact.create'then 'contact'when 'opportunity.create'then 'opportunity'when 'contract.create_manual'then 'contract'when 'service.create_manual'then 'service'when 'line.create_manual'then 'line'when 'contract.record_renewal'then 'renewal'when 'permanence.create_manual'then 'permanence'else null end;
 if kind is null then return new;end if;
 relation:=case kind when 'customer'then 'customers'when 'contact'then 'contacts'when 'opportunity'then 'opportunities'when 'contract'then 'telecom_contracts'when 'service'then 'telecom_services'when 'line'then 'telecom_lines'when 'renewal'then 'telecom_renewals'else 'telecom_commitments'end;
 execute format('select source from public.%I where workspace_id=$1 and id=$2',relation)into source_value using new.workspace_id,new.entity_id;
 if source_value='manual'then insert into public.product_manual_origin_proofs(workspace_id,entity_kind,entity_id,audit_event_id,verified_at)values(new.workspace_id,kind,new.entity_id,new.id,new.occurred_at);end if;
 return new;
end$$;
revoke all on function public.provenance_v1_capture_manual()from public,anon,authenticated,service_role;
-- Only future canonical audit inserts emit proof. No backfill or source relabeling.
create trigger product_audit_manual_origin after insert on public.product_audit_events for each row execute function public.provenance_v1_capture_manual();
create function public.provenance_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare relation text;src text;verified timestamptz;begin
 perform public.team_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>4096 or(select array_agg(key order by key)from jsonb_object_keys(p_input)key)is distinct from array['id','kind']::text[]or jsonb_typeof(p_input->'id')<>'string'or p_input->>'id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(p_input->'kind')<>'string'or p_input->>'kind'not in ('customer','contact','opportunity','contract','service','line','renewal','permanence')then raise exception using errcode='22023',message='provenance_invalid_input';end if;
 relation:=case p_input->>'kind'when 'customer'then 'customers'when 'contact'then 'contacts'when 'opportunity'then 'opportunities'when 'contract'then 'telecom_contracts'when 'service'then 'telecom_services'when 'line'then 'telecom_lines'when 'renewal'then 'telecom_renewals'else 'telecom_commitments'end;
 execute format('select source from public.%I where workspace_id=$1 and id=$2 for share',relation)into src using p_workspace_id,(p_input->>'id')::uuid;
 if src is null then raise exception using errcode='P0002',message='provenance_not_found';end if;
 select verified_at into verified from public.product_manual_origin_proofs where workspace_id=p_workspace_id and entity_kind=p_input->>'kind'and entity_id=(p_input->>'id')::uuid;
 return jsonb_build_object('contract_version','provenance.v1','operation','provenance.get','kind',p_input->>'kind','id',p_input->>'id','declared_source',src,'confidence',case when verified is not null and src='manual'then 'verified_new_manual'when src='manual'then 'declared_legacy_manual'else 'declared_external'end,'verified_at',case when src='manual'then verified else null end);
end$$;
revoke all on function public.provenance_v1_get(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.provenance_v1_get(uuid,jsonb)to authenticated;
commit;
