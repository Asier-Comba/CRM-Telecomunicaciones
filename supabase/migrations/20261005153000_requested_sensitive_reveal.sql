begin;
create table public.product_reveal_audit_events(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),actor_id uuid not null references auth.users(id),entity_kind text not null check(entity_kind in('contact','customer')),entity_id uuid not null,
 field_categories text[]not null check(cardinality(field_categories)between 1 and 2 and field_categories<@array['email','phone','fiscal_id']::text[]),created_at timestamptz not null default statement_timestamp()
);
alter table public.product_reveal_audit_events enable row level security;alter table public.product_reveal_audit_events force row level security;
revoke all on public.product_reveal_audit_events from public,anon,authenticated,service_role;
create trigger product_reveal_audit_immutable before update or delete on public.product_reveal_audit_events for each row execute function public.reject_activity_mutation();
create function public.sensitive_v1_validate(inp jsonb)returns void language plpgsql set search_path=''as $$declare fields text[];begin
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>4096 or not inp?'entity_kind'or not inp?'entity_id'or not inp?'fields'or(select count(*)from jsonb_object_keys(inp))<>3 or inp->'entity_kind'not in('"contact"'::jsonb,'"customer"'::jsonb)or jsonb_typeof(inp->'entity_id')is distinct from 'string'or inp->>'entity_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(inp->'fields')is distinct from 'array'then raise exception using errcode='22023',message='sensitive_invalid_input';end if;
 if jsonb_array_length(inp->'fields')not between 1 and 2 or exists(select 1 from jsonb_array_elements(inp->'fields')v where jsonb_typeof(v)<>'string')then raise exception using errcode='22023',message='sensitive_invalid_input';end if;
 select array_agg(value order by value)into fields from jsonb_array_elements_text(inp->'fields');
 if(select count(distinct x)from unnest(fields)x)<>cardinality(fields)or(inp->>'entity_kind'='contact'and not fields<@array['email','phone']::text[])or(inp->>'entity_kind'='customer'and fields<>array['fiscal_id']::text[])then raise exception using errcode='22023',message='sensitive_field_not_allowed';end if;end$$;
create function public.sensitive_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;r text;kind text;target uuid;fields text[];result_values jsonb:='{}';f text;email text;phone text;fiscal text;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);perform public.sensitive_v1_validate(p_input);select role into r from public.workspace_members where workspace_id=p_workspace_id and user_id=a;
 kind:=p_input->>'entity_kind';target:=(p_input->>'entity_id')::uuid;
 if r not in('owner','admin','member')or(kind='customer'and r not in('owner','admin'))then raise exception using errcode='42501',message='sensitive_access_denied';end if;
 select array_agg(value order by value)into fields from jsonb_array_elements_text(p_input->'fields');
 if kind='contact'then select c.email,c.phone into email,phone from public.contacts c join public.customers x on x.id=c.customer_id and x.workspace_id=c.workspace_id where c.workspace_id=p_workspace_id and c.id=target and c.status='active'and x.status='active'for share of c,x;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;
 else perform 1 from public.customers where workspace_id=p_workspace_id and id=target and status='active'for share;if not found then raise exception using errcode='P0002',message='sensitive_not_found';end if;select tax_id into fiscal from public.billing_customer_profiles where workspace_id=p_workspace_id and customer_id=target;end if;
 foreach f in array fields loop result_values:=result_values||jsonb_build_object(f,case f when 'email'then email when 'phone'then phone when 'fiscal_id'then fiscal end);end loop;
 insert into public.product_reveal_audit_events(workspace_id,actor_id,entity_kind,entity_id,field_categories)values(p_workspace_id,a,kind,target,fields);
 return jsonb_build_object('contract_version','sensitive.v1','operation','sensitive.get','entity_kind',kind,'entity_id',target,'values',result_values);end$$;
revoke all on function public.sensitive_v1_validate(jsonb)from public,anon,authenticated,service_role;
revoke all on function public.sensitive_v1_get(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.sensitive_v1_get(uuid,jsonb)to authenticated;
commit;
