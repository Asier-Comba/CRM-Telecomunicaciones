-- A normalized text/audio/manual proposal is a protected read: no save, issue or counter mutation.
begin;
create function public.billing_v1_invoice_propose(p_workspace_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare draft jsonb;customer uuid;totals jsonb;
begin
 perform public.billing_v1_assert_scope(p_workspace_id);
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>32768
  or (select array_agg(key order by key) from jsonb_object_keys(p_input) key) is distinct from array['draft','source']
  or jsonb_typeof(p_input->'source')<>'string' or p_input->>'source' not in ('manual','text','audio')
  or jsonb_typeof(p_input->'draft')<>'object' or p_input->'draft' ? 'command_id' then
  raise exception using errcode='22023',message='billing_invalid_proposal';
 end if;
 draft:=p_input->'draft';
 perform public.billing_v1_validate('invoice.create_draft',draft||jsonb_build_object('command_id','00000000-0000-4000-8000-000000000001'));
 customer:=(draft->>'customer_id')::uuid;
 perform 1 from public.customers where workspace_id=p_workspace_id and id=customer and status<>'archived' for share;
 if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
 if draft->>'contract_id' is not null then
  perform 1 from public.telecom_contracts where workspace_id=p_workspace_id and id=(draft->>'contract_id')::uuid and customer_id=customer for share;
  if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
 end if;
 if draft->>'service_id' is not null then
  perform 1 from public.telecom_services where workspace_id=p_workspace_id and id=(draft->>'service_id')::uuid and customer_id=customer and (draft->>'contract_id' is null or contract_id=(draft->>'contract_id')::uuid) for share;
  if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
 end if;
 if draft->>'opportunity_id' is not null then
  perform 1 from public.opportunities where workspace_id=p_workspace_id and id=(draft->>'opportunity_id')::uuid and customer_id=customer for share;
  if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
 end if;
 -- Normalize canonical IDs; proposals never accept a principal, raw audio, transcript or derived total.
 draft:=draft||jsonb_build_object('customer_id',customer);
 if draft->>'contract_id' is not null then draft:=draft||jsonb_build_object('contract_id',(draft->>'contract_id')::uuid);end if;
 if draft->>'service_id' is not null then draft:=draft||jsonb_build_object('service_id',(draft->>'service_id')::uuid);end if;
 if draft->>'opportunity_id' is not null then draft:=draft||jsonb_build_object('opportunity_id',(draft->>'opportunity_id')::uuid);end if;
 totals:=public.billing_v1_calculate(draft->'lines')-'lines';
 return jsonb_build_object('contract_version','billing.v1','operation','invoice.propose','source',p_input->>'source','draft',draft,'totals',totals,'requires_review',true,'saved',false);
end $$;
revoke all on function public.billing_v1_invoice_propose(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_propose(uuid,jsonb) to authenticated;
commit;
