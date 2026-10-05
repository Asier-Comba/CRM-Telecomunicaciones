-- billing.v1: DB-authoritative exact money and indivisible issue/number/snapshot/audit.
-- Human owner/admin only. No assistant, raw client, service-role or external effects.
begin;
create table public.billing_issuers (
 workspace_id uuid primary key references public.workspaces(id),
 legal_name text not null, tax_id text not null, address text not null,
 postal_code text not null, city text not null, region text not null, country text not null,
 currency text not null check(currency in ('EUR','USD','GBP')),default_series text not null check(default_series ~ '^[A-Z0-9-]{1,8}$'),
 version bigint not null default 1 check(version>0),updated_at timestamptz not null default statement_timestamp()
);
create table public.billing_customer_profiles (
 workspace_id uuid not null,customer_id uuid not null,
 legal_name text not null,tax_id text not null,address text not null,
 postal_code text not null,city text not null,region text not null,country text not null,
 version bigint not null default 1 check(version>0),updated_at timestamptz not null default statement_timestamp(),
 primary key(workspace_id,customer_id),foreign key(customer_id,workspace_id) references public.customers(id,workspace_id)
);
create table public.billing_series (
 workspace_id uuid not null references public.workspaces(id),series text not null check(series ~ '^[A-Z0-9-]{1,8}$'),
 year integer not null check(year between 2000 and 2100),next_sequence bigint not null default 1 check(next_sequence between 1 and 1000000000000),
 primary key(workspace_id,series,year)
);
create table public.billing_invoices (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),customer_id uuid not null,
 contract_id uuid,service_id uuid,opportunity_id uuid,
 status text not null default 'draft' check(status in ('draft','trashed','issued','paid')),
 version bigint not null default 1 check(version>0),
 issue_on date not null check(issue_on between date '2000-01-01' and date '2100-12-31'),due_on date check(due_on>=issue_on),
 series text not null check(series ~ '^[A-Z0-9-]{1,8}$'),currency text not null check(currency in ('EUR','USD','GBP')),
 fx_rate_micros bigint check(fx_rate_micros between 1 and 1000000000),fx_on date,fx_source text,
 notes text,subtotal_minor bigint not null check(subtotal_minor between 0 and 1000000000000),
 tax_minor bigint not null check(tax_minor between 0 and 1000000000000),withholding_minor bigint not null check(withholding_minor between 0 and 1000000000000),
 total_minor bigint not null check(total_minor between 0 and 1000000000000),
 number_year integer,number_sequence bigint,issuer_snapshot jsonb,customer_snapshot jsonb,
 issued_at timestamptz,paid_at timestamptz,trashed_at timestamptz,
 created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),
 unique(id,workspace_id),unique(workspace_id,series,number_year,number_sequence),
 foreign key(customer_id,workspace_id) references public.customers(id,workspace_id),
 foreign key(contract_id,workspace_id) references public.telecom_contracts(id,workspace_id),
 foreign key(service_id,workspace_id) references public.telecom_services(id,workspace_id),
 foreign key(opportunity_id,workspace_id,customer_id) references public.opportunities(id,workspace_id,customer_id),
 check(total_minor=subtotal_minor+tax_minor-withholding_minor),
 check((status in ('issued','paid'))=(number_sequence is not null)),
 check((number_sequence is null)=(number_year is null)),
 check((status in ('issued','paid'))=(issuer_snapshot is not null)),check((status in ('issued','paid'))=(customer_snapshot is not null)),
 check((status in ('issued','paid'))=(issued_at is not null)),check((status='paid')=(paid_at is not null)),check((status='trashed')=(trashed_at is not null)),
 check((currency='EUR' and fx_rate_micros is null and fx_on is null and fx_source is null) or (currency<>'EUR' and fx_rate_micros is not null and fx_on is not null and fx_source is not null))
);
create table public.billing_invoice_lines (
 workspace_id uuid not null,invoice_id uuid not null,position integer not null check(position between 0 and 49),
 description text not null check(char_length(btrim(description)) between 1 and 300),
 quantity_milli bigint not null check(quantity_milli between 1 and 100000000),unit_price_minor bigint not null check(unit_price_minor between 0 and 1000000000),
 discount_bps integer not null check(discount_bps between 0 and 10000),tax_bps integer not null check(tax_bps between 0 and 10000),withholding_bps integer not null check(withholding_bps between 0 and 10000),
 subtotal_minor bigint not null,tax_minor bigint not null,withholding_minor bigint not null,total_minor bigint not null,
 primary key(workspace_id,invoice_id,position),foreign key(invoice_id,workspace_id) references public.billing_invoices(id,workspace_id)
);
alter table public.billing_issuers enable row level security;
alter table public.billing_issuers force row level security;
revoke all on public.billing_issuers from public,anon,authenticated,service_role;
alter table public.billing_customer_profiles enable row level security;
alter table public.billing_customer_profiles force row level security;
revoke all on public.billing_customer_profiles from public,anon,authenticated,service_role;
alter table public.billing_series enable row level security;
alter table public.billing_series force row level security;
revoke all on public.billing_series from public,anon,authenticated,service_role;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoices force row level security;
revoke all on public.billing_invoices from public,anon,authenticated,service_role;
alter table public.billing_invoice_lines enable row level security;
alter table public.billing_invoice_lines force row level security;
revoke all on public.billing_invoice_lines from public,anon,authenticated,service_role;
create trigger billing_issuers_version before insert or update on public.billing_issuers for each row execute function public.manage_task_version();
create trigger billing_customer_profiles_version before insert or update on public.billing_customer_profiles for each row execute function public.manage_task_version();
create trigger billing_invoices_version before insert or update on public.billing_invoices for each row execute function public.manage_task_version();
create trigger billing_invoices_identity before update on public.billing_invoices for each row execute function public.protect_operational_identity();
create index billing_invoices_scope_issue_idx on public.billing_invoices(workspace_id,issue_on,id);
create index billing_invoices_customer_idx on public.billing_invoices(workspace_id,customer_id,id);
create index billing_invoices_overdue_idx on public.billing_invoices(workspace_id,due_on) where status='issued';
create function public.billing_v1_assert_scope(p_workspace_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid; r text;
begin
 actor:=public.product_v1_assert_scope(p_workspace_id,false);
 select role into r from public.workspace_members where workspace_id=p_workspace_id and user_id=actor for share;
 if r not in ('owner','admin') then raise exception using errcode='42501',message='billing_access_denied'; end if;
 return actor;
end $$;
revoke all on function public.billing_v1_assert_scope(uuid) from public,anon,authenticated,service_role;
create function public.billing_v1_calculate(p_lines jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare line jsonb;k text;s text;gross numeric;discount numeric;base numeric;tax numeric;wh numeric;
 subtotal numeric:=0;taxes numeric:=0;withholdings numeric:=0;total numeric;rows jsonb:='[]';
begin
 if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 50 then raise exception using errcode='22023',message='billing_invalid_lines'; end if;
 for line in select value from jsonb_array_elements(p_lines) loop
  if jsonb_typeof(line)<>'object' or (select array_agg(key order by key) from jsonb_object_keys(line) key) is distinct from array['description','discount_bps','quantity_milli','tax_bps','unit_price_minor','withholding_bps'] then raise exception using errcode='22023',message='billing_invalid_lines'; end if;
  if jsonb_typeof(line->'description')<>'string' or char_length(btrim(line->>'description')) not between 1 and 300 or line->>'description' ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='billing_invalid_lines'; end if;
  foreach k in array array['quantity_milli','unit_price_minor','discount_bps','tax_bps','withholding_bps'] loop
   s:=line->>k;
   if jsonb_typeof(line->k)<>'number' or s !~ '^[0-9]{1,10}$' or s::numeric>(case when k='quantity_milli' then 100000000 when k='unit_price_minor' then 1000000000 else 10000 end) or (k='quantity_milli' and s::numeric<1) then raise exception using errcode='22023',message='billing_invalid_lines'; end if;
  end loop;
  gross:=round((line->>'quantity_milli')::numeric*(line->>'unit_price_minor')::numeric/1000);
  discount:=round(gross*(line->>'discount_bps')::numeric/10000);base:=gross-discount;
  tax:=round(base*(line->>'tax_bps')::numeric/10000);wh:=round(base*(line->>'withholding_bps')::numeric/10000);
  subtotal:=subtotal+base;taxes:=taxes+tax;withholdings:=withholdings+wh;
  rows:=rows||jsonb_build_array(jsonb_build_object('subtotal_minor',base::bigint,'tax_minor',tax::bigint,'withholding_minor',wh::bigint,'total_minor',(base+tax-wh)::bigint));
 end loop;
 total:=subtotal+taxes-withholdings;
 if greatest(subtotal,taxes,withholdings,total)>1000000000000 or least(subtotal,taxes,withholdings,total)<0 then raise exception using errcode='22023',message='billing_amount_overflow'; end if;
 return jsonb_build_object('subtotal_minor',subtotal::bigint,'tax_minor',taxes::bigint,'withholding_minor',withholdings::bigint,'total_minor',total::bigint,'lines',rows);
end $$;
revoke all on function public.billing_v1_calculate(jsonb) from public,anon,authenticated,service_role;
create function public.billing_v1_validate(p_operation text,p_input jsonb) returns void language plpgsql set search_path='' as $$
declare required text[];optional text[]:=array[]::text[];k text;v jsonb;s text;p jsonb;
begin
 required:=case when p_operation='issuer.set' then array['command_id','expected_version','profile','currency','default_series']
 when p_operation='customer_fiscal.set' then array['command_id','customer_id','expected_version','profile']
 when p_operation='invoice.create_draft' then array['command_id','customer_id','issue_on','due_on','series','currency','lines']
 when p_operation='invoice.update_draft' then array['command_id','id','expected_version','issue_on','due_on','series','currency','lines']
 else array['command_id','id','expected_version'] end;
 if p_operation in ('invoice.create_draft','invoice.update_draft') then optional:=array['contract_id','service_id','opportunity_id','notes','fx_rate_micros','fx_on','fx_source']; end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>32768
 or exists(select 1 from jsonb_object_keys(p_input) x where not x=any(required||optional))
 or exists(select 1 from unnest(required) x where not p_input ? x or (p_input->x='null'::jsonb and x<>'due_on')) then raise exception using errcode='22023',message='billing_invalid_input'; end if;
 for k,v in select key,value from jsonb_each(p_input) loop
  s:=p_input->>k;
  if v='null'::jsonb then
   if not k=any(array['due_on','contract_id','service_id','opportunity_id','notes','fx_rate_micros','fx_on','fx_source']) then raise exception using errcode='22023',message='billing_invalid_input'; end if;
  elsif k='id' or k like '%\_id' escape '\' then
   if jsonb_typeof(v)<>'string' or s !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='billing_invalid_input'; end if;
  elsif k in ('expected_version','fx_rate_micros') then
   if jsonb_typeof(v)<>'number' or s !~ '^[0-9]{1,15}$' or s::numeric>=1000000000000000
    or (k='expected_version' and p_operation not in ('issuer.set','customer_fiscal.set') and s::numeric<1)
    or (k='fx_rate_micros' and s::numeric not between 1 and 1000000000) then raise exception using errcode='22023',message='billing_invalid_input'; end if;
  elsif k='lines' then perform public.billing_v1_calculate(v);
  elsif k='profile' then
   p:=v;
   if jsonb_typeof(p)<>'object' or (select array_agg(key order by key) from jsonb_object_keys(p) key) is distinct from array['address','city','country','legal_name','postal_code','region','tax_id'] then raise exception using errcode='22023',message='billing_invalid_profile'; end if;
   if exists(select 1 from jsonb_each(p) x where jsonb_typeof(x.value)<>'string' or char_length(btrim(x.value#>>'{}')) not between 1 and (case when x.key='address' then 300 when x.key='legal_name' then 200 else 80 end) or x.value#>>'{}' ~ '[[:cntrl:]]') or p->>'country' !~ '^[A-Z]{2}$' then raise exception using errcode='22023',message='billing_invalid_profile'; end if;
  elsif k in ('issue_on','due_on','fx_on') then
   if jsonb_typeof(v)<>'string' or s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or s::date not between date '2000-01-01' and date '2100-12-31' then raise exception using errcode='22023',message='billing_invalid_date'; end if;
  elsif k='currency' then
   if jsonb_typeof(v)<>'string' or s not in ('EUR','USD','GBP') then raise exception using errcode='22023',message='billing_invalid_input'; end if;
  elsif k in ('series','default_series') then
   if jsonb_typeof(v)<>'string' or s !~ '^[A-Z0-9-]{1,8}$' then raise exception using errcode='22023',message='billing_invalid_input'; end if;
  else
   if jsonb_typeof(v)<>'string' or char_length(btrim(s)) not between 1 and (case when k='notes' then 2000 else 80 end) or s ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='billing_invalid_input'; end if;
  end if;
 end loop;
 if p_input ? 'issue_on' then
  if (p_input->>'due_on')::date<(p_input->>'issue_on')::date or
   (p_input->>'currency'='EUR' and (p_input->>'fx_rate_micros' is not null or p_input->>'fx_on' is not null or p_input->>'fx_source' is not null)) or
   (p_input->>'currency'<>'EUR' and (p_input->>'fx_rate_micros' is null or p_input->>'fx_on' is null or p_input->>'fx_source' is null)) then raise exception using errcode='22023',message='billing_invalid_input'; end if;
 end if;
end $$;
revoke all on function public.billing_v1_validate(text,jsonb) from public,anon,authenticated,service_role;
create function public.billing_v1_protect_invoice() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status in ('issued','paid') and (
   (to_jsonb(new)-array['status','paid_at','version','updated_at']) is distinct from (to_jsonb(old)-array['status','paid_at','version','updated_at'])
   or not ((old.status='issued' and new.status='paid') or (old.status='paid' and new.status='issued'))
 ) then raise exception using errcode='42501',message='billing_issued_immutable'; end if;
 if new.customer_id is distinct from old.customer_id then raise exception using errcode='42501',message='billing_customer_immutable'; end if;
 return new;
end $$;
revoke all on function public.billing_v1_protect_invoice() from public,anon,authenticated,service_role;
create trigger billing_invoices_protect before update on public.billing_invoices for each row execute function public.billing_v1_protect_invoice();
create function public.billing_v1_protect_line() returns trigger language plpgsql security definer set search_path='' as $$
declare state text;
begin
 select status into state from public.billing_invoices where workspace_id=coalesce(new.workspace_id,old.workspace_id) and id=coalesce(new.invoice_id,old.invoice_id) for share;
 if state is distinct from 'draft' then raise exception using errcode='42501',message='billing_issued_immutable'; end if;
 if tg_op='DELETE' then return old; end if;return new;
end $$;
revoke all on function public.billing_v1_protect_line() from public,anon,authenticated,service_role;
create trigger billing_lines_protect before insert or update or delete on public.billing_invoice_lines for each row execute function public.billing_v1_protect_line();
create function public.billing_v1_finish(p_workspace_id uuid,p_actor uuid,p_op text,p_input jsonb,p_id uuid,p_version bigint,p_state text,p_number jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; code text;
begin
 code:=case p_op when 'invoice.create_draft' then 'invoice.draft_created' when 'invoice.update_draft' then 'invoice.draft_updated' when 'invoice.issue' then 'invoice.issued' when 'invoice.mark_paid' then 'invoice.paid' when 'invoice.reverse_payment' then 'invoice.payment_reversed' when 'invoice.trash' then 'invoice.trashed' when 'invoice.restore' then 'invoice.restored' else p_op end;
 result:=jsonb_build_object('contract_version','billing.v1','operation',p_op,'command_id',p_input->>'command_id','id',p_id,'version',p_version,'status',p_state,'number',p_number);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version) values(p_workspace_id,p_actor,(p_input->>'command_id')::uuid,code,p_id,p_version);
 update public.product_commands set receipt=result where workspace_id=p_workspace_id and actor_id=p_actor and command_id=(p_input->>'command_id')::uuid;
 return result;
end $$;
revoke all on function public.billing_v1_finish(uuid,uuid,text,jsonb,uuid,bigint,text,jsonb) from public,anon,authenticated,service_role;
alter table public.product_commands drop constraint product_commands_operation_check;
alter table public.product_commands add constraint product_commands_operation_check check(operation in (
 'customer.create','customer.update','customer.archive','customer.restore','contact.create','contact.update','contact.archive','contact.restore',
 'task.create','task.update','task.start','task.complete','task.reopen','task.cancel',
 'meeting.create','meeting.update','meeting.reschedule','meeting.complete','meeting.cancel','meeting.no_show',
 'opportunity.create','opportunity.update','opportunity.change_stage','opportunity.assign','opportunity.win','opportunity.lose','opportunity.reopen','opportunity.archive','issuer.set','customer_fiscal.set','invoice.create_draft','invoice.update_draft','invoice.issue','invoice.mark_paid','invoice.reverse_payment','invoice.trash','invoice.restore'));
create function public.billing_v1_command(p_workspace_id uuid,p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;replay jsonb;i public.billing_invoices%rowtype;iss public.billing_issuers%rowtype;cust public.billing_customer_profiles%rowtype;
 customer uuid;entity uuid;ver bigint;state text;profile jsonb;totals jsonb;line jsonb;ordinal bigint;calc jsonb;number jsonb;issue_year integer;seq bigint;
begin
 actor:=public.billing_v1_assert_scope(p_workspace_id);
 if p_op not in ('issuer.set','customer_fiscal.set','invoice.create_draft','invoice.update_draft','invoice.issue','invoice.mark_paid','invoice.reverse_payment','invoice.trash','invoice.restore') then raise exception using errcode='22023',message='billing_invalid_operation'; end if;
 perform public.billing_v1_validate(p_op,p_input);
 replay:=public.product_v1_begin_command(p_workspace_id,actor,p_op,p_input);if replay is not null then return replay;end if;
 if p_op in ('issuer.set','customer_fiscal.set') then
  -- Serialize first creation as well as CAS updates; actor-independent profile lock.
  customer:=case when p_op='customer_fiscal.set' then (p_input->>'customer_id')::uuid else p_workspace_id end;
  perform pg_advisory_xact_lock(hashtextextended('billing-profile:'||p_workspace_id::text||':'||customer::text||':'||p_op,0));
  profile:=p_input->'profile';
  if p_op='issuer.set' then select * into iss from public.billing_issuers where workspace_id=p_workspace_id for update;ver:=coalesce(iss.version,0);
  else
   perform 1 from public.customers where workspace_id=p_workspace_id and id=customer and status<>'archived' for share;
   if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
   select * into cust from public.billing_customer_profiles where workspace_id=p_workspace_id and customer_id=customer for update;ver:=coalesce(cust.version,0);
  end if;
  if ver<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='billing_conflict';end if;
  if p_op='issuer.set' then
   insert into public.billing_issuers(workspace_id,legal_name,tax_id,address,postal_code,city,region,country,currency,default_series)
   values(p_workspace_id,profile->>'legal_name',profile->>'tax_id',profile->>'address',profile->>'postal_code',profile->>'city',profile->>'region',profile->>'country',p_input->>'currency',p_input->>'default_series')
   on conflict(workspace_id) do update set legal_name=excluded.legal_name,tax_id=excluded.tax_id,address=excluded.address,postal_code=excluded.postal_code,city=excluded.city,region=excluded.region,country=excluded.country,currency=excluded.currency,default_series=excluded.default_series,updated_at=statement_timestamp() returning version into ver;
  else
   insert into public.billing_customer_profiles(workspace_id,customer_id,legal_name,tax_id,address,postal_code,city,region,country)
   values(p_workspace_id,customer,profile->>'legal_name',profile->>'tax_id',profile->>'address',profile->>'postal_code',profile->>'city',profile->>'region',profile->>'country')
   on conflict(workspace_id,customer_id) do update set legal_name=excluded.legal_name,tax_id=excluded.tax_id,address=excluded.address,postal_code=excluded.postal_code,city=excluded.city,region=excluded.region,country=excluded.country,updated_at=statement_timestamp() returning version into ver;
  end if;
  return public.billing_v1_finish(p_workspace_id,actor,p_op,p_input,customer,ver,'profile',null);
 end if;
 if p_op='invoice.create_draft' then customer:=(p_input->>'customer_id')::uuid;
 else
  select * into i from public.billing_invoices where workspace_id=p_workspace_id and id=(p_input->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
  if i.version<>(p_input->>'expected_version')::bigint then raise exception using errcode='40001',message='billing_conflict';end if;
  customer:=i.customer_id;
 end if;
 perform 1 from public.customers where workspace_id=p_workspace_id and id=customer and status<>'archived' for share;
 if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
 if p_op in ('invoice.create_draft','invoice.update_draft') then
  if p_op='invoice.update_draft' and i.status<>'draft' then raise exception using errcode='22023',message='billing_invalid_transition';end if;
  if p_input->>'contract_id' is not null then
   perform 1 from public.telecom_contracts where workspace_id=p_workspace_id and id=(p_input->>'contract_id')::uuid and customer_id=customer for share;
   if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
  end if;
  if p_input->>'service_id' is not null then
   perform 1 from public.telecom_services where workspace_id=p_workspace_id and id=(p_input->>'service_id')::uuid and customer_id=customer and (p_input->>'contract_id' is null or contract_id=(p_input->>'contract_id')::uuid) for share;
   if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
  end if;
  if p_input->>'opportunity_id' is not null then
   perform 1 from public.opportunities where workspace_id=p_workspace_id and id=(p_input->>'opportunity_id')::uuid and customer_id=customer for share;
   if not found then raise exception using errcode='P0002',message='billing_not_found';end if;
  end if;
  totals:=public.billing_v1_calculate(p_input->'lines');
  if p_op='invoice.create_draft' then
   insert into public.billing_invoices(workspace_id,customer_id,created_by_user_id,issue_on,due_on,series,currency,contract_id,service_id,opportunity_id,notes,fx_rate_micros,fx_on,fx_source,subtotal_minor,tax_minor,withholding_minor,total_minor)
   values(p_workspace_id,customer,actor,(p_input->>'issue_on')::date,(p_input->>'due_on')::date,p_input->>'series',p_input->>'currency',(p_input->>'contract_id')::uuid,(p_input->>'service_id')::uuid,(p_input->>'opportunity_id')::uuid,p_input->>'notes',(p_input->>'fx_rate_micros')::bigint,(p_input->>'fx_on')::date,p_input->>'fx_source',(totals->>'subtotal_minor')::bigint,(totals->>'tax_minor')::bigint,(totals->>'withholding_minor')::bigint,(totals->>'total_minor')::bigint) returning * into i;
  else
   delete from public.billing_invoice_lines where workspace_id=p_workspace_id and invoice_id=i.id;
   update public.billing_invoices set issue_on=(p_input->>'issue_on')::date,due_on=(p_input->>'due_on')::date,series=p_input->>'series',currency=p_input->>'currency',contract_id=(p_input->>'contract_id')::uuid,service_id=(p_input->>'service_id')::uuid,opportunity_id=(p_input->>'opportunity_id')::uuid,notes=p_input->>'notes',fx_rate_micros=(p_input->>'fx_rate_micros')::bigint,fx_on=(p_input->>'fx_on')::date,fx_source=p_input->>'fx_source',subtotal_minor=(totals->>'subtotal_minor')::bigint,tax_minor=(totals->>'tax_minor')::bigint,withholding_minor=(totals->>'withholding_minor')::bigint,total_minor=(totals->>'total_minor')::bigint,updated_at=statement_timestamp() where workspace_id=p_workspace_id and id=i.id returning * into i;
  end if;
  for line,ordinal in select value,ordinality from jsonb_array_elements(p_input->'lines') with ordinality loop
   calc:=totals->'lines'->(ordinal::integer-1);
   insert into public.billing_invoice_lines(workspace_id,invoice_id,position,description,quantity_milli,unit_price_minor,discount_bps,tax_bps,withholding_bps,subtotal_minor,tax_minor,withholding_minor,total_minor)
   values(p_workspace_id,i.id,ordinal-1,line->>'description',(line->>'quantity_milli')::bigint,(line->>'unit_price_minor')::bigint,(line->>'discount_bps')::integer,(line->>'tax_bps')::integer,(line->>'withholding_bps')::integer,(calc->>'subtotal_minor')::bigint,(calc->>'tax_minor')::bigint,(calc->>'withholding_minor')::bigint,(calc->>'total_minor')::bigint);
  end loop;
 elsif p_op='invoice.issue' then
  if i.status<>'draft' then raise exception using errcode='22023',message='billing_invalid_transition';end if;
  select * into iss from public.billing_issuers where workspace_id=p_workspace_id for share;
  if not found then raise exception using errcode='22023',message='billing_missing_issuer';end if;
  select * into cust from public.billing_customer_profiles where workspace_id=p_workspace_id and customer_id=customer for share;
  if not found then raise exception using errcode='22023',message='billing_missing_customer_fiscal';end if;
  select jsonb_agg(jsonb_build_object('description',description,'quantity_milli',quantity_milli,'unit_price_minor',unit_price_minor,'discount_bps',discount_bps,'tax_bps',tax_bps,'withholding_bps',withholding_bps) order by position) into line from public.billing_invoice_lines where workspace_id=p_workspace_id and invoice_id=i.id;
  totals:=public.billing_v1_calculate(line);
  if totals->>'total_minor'<>i.total_minor::text or totals->>'subtotal_minor'<>i.subtotal_minor::text or totals->>'tax_minor'<>i.tax_minor::text or totals->>'withholding_minor'<>i.withholding_minor::text then raise exception using errcode='22023',message='billing_invalid_totals';end if;
  issue_year:=extract(year from i.issue_on)::integer;
  insert into public.billing_series(workspace_id,series,year) values(p_workspace_id,i.series,issue_year) on conflict do nothing;
  update public.billing_series set next_sequence=next_sequence+1 where workspace_id=p_workspace_id and series=i.series and billing_series.year=issue_year returning next_sequence-1 into seq;
  update public.billing_invoices set status='issued',number_year=issue_year,number_sequence=seq,issued_at=clock_timestamp(),issuer_snapshot=to_jsonb(iss)-array['workspace_id','version','updated_at'],customer_snapshot=to_jsonb(cust)-array['workspace_id','customer_id','version','updated_at'],updated_at=statement_timestamp() where workspace_id=p_workspace_id and id=i.id returning * into i;
 elsif p_op='invoice.mark_paid' then
  if i.status<>'issued' then raise exception using errcode='22023',message='billing_invalid_transition';end if;
  update public.billing_invoices set status='paid',paid_at=clock_timestamp(),updated_at=statement_timestamp() where workspace_id=p_workspace_id and id=i.id returning * into i;
 elsif p_op='invoice.reverse_payment' then
  if i.status<>'paid' then raise exception using errcode='22023',message='billing_invalid_transition';end if;
  update public.billing_invoices set status='issued',paid_at=null,updated_at=statement_timestamp() where workspace_id=p_workspace_id and id=i.id returning * into i;
 elsif p_op='invoice.trash' then
  if i.status<>'draft' then raise exception using errcode='22023',message='billing_invalid_transition';end if;
  update public.billing_invoices set status='trashed',trashed_at=clock_timestamp(),updated_at=statement_timestamp() where workspace_id=p_workspace_id and id=i.id returning * into i;
 elsif p_op='invoice.restore' then
  if i.status<>'trashed' then raise exception using errcode='22023',message='billing_invalid_transition';end if;
  update public.billing_invoices set status='draft',trashed_at=null,updated_at=statement_timestamp() where workspace_id=p_workspace_id and id=i.id returning * into i;
 end if;
 number:=case when i.number_sequence is null then null else jsonb_build_object('series',i.series,'year',i.number_year,'sequence',i.number_sequence) end;
 return public.billing_v1_finish(p_workspace_id,actor,p_op,p_input,i.id,i.version,i.status,number);
end $$;
revoke all on function public.billing_v1_command(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.billing_v1_issuer_set(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'issuer.set',p_input)$$;
revoke all on function public.billing_v1_issuer_set(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_issuer_set(uuid,jsonb) to authenticated;
create function public.billing_v1_customer_fiscal_set(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'customer_fiscal.set',p_input)$$;
revoke all on function public.billing_v1_customer_fiscal_set(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_customer_fiscal_set(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_create_draft(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.create_draft',p_input)$$;
revoke all on function public.billing_v1_invoice_create_draft(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_create_draft(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_update_draft(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.update_draft',p_input)$$;
revoke all on function public.billing_v1_invoice_update_draft(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_update_draft(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_issue(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.issue',p_input)$$;
revoke all on function public.billing_v1_invoice_issue(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_issue(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_mark_paid(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.mark_paid',p_input)$$;
revoke all on function public.billing_v1_invoice_mark_paid(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_mark_paid(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_reverse_payment(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.reverse_payment',p_input)$$;
revoke all on function public.billing_v1_invoice_reverse_payment(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_reverse_payment(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_trash(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.trash',p_input)$$;
revoke all on function public.billing_v1_invoice_trash(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_trash(uuid,jsonb) to authenticated;
create function public.billing_v1_invoice_restore(p_workspace_id uuid,p_input jsonb) returns jsonb language sql security definer set search_path='' as $$select public.billing_v1_command(p_workspace_id,'invoice.restore',p_input)$$;
revoke all on function public.billing_v1_invoice_restore(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.billing_v1_invoice_restore(uuid,jsonb) to authenticated;
commit;
