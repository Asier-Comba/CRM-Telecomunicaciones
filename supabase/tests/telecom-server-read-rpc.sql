\set ON_ERROR_STOP on

do $$
begin
  if current_setting('app.environment', true) is distinct from 'test' then
    raise exception using errcode = '42501', message = 'refusing to run outside app.environment=test';
  end if;
end;
$$;

begin;

create function pg_temp.assert_true(value boolean, p_message text)
returns void language plpgsql set search_path = '' as $$
begin
  if value is not true then raise exception using message = p_message; end if;
end;
$$;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reader-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reader-b@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reader-suspended@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reader-removed@example.invalid', '', now(), '{}', '{}', now(), now());

insert into public.workspaces (id, name, slug, status) values
  ('20000000-0000-0000-0000-000000000001', 'Reader Workspace A', 'reader-workspace-a', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'Reader Workspace B', 'reader-workspace-b', 'active'),
  ('20000000-0000-0000-0000-000000000003', 'Reader Workspace Suspended', 'reader-workspace-suspended', 'suspended');

insert into public.workspace_members (id, workspace_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'owner', 'active'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'owner', 'active');

update public.profiles
   set full_name = 'Synthetic Reader A'
 where id = '10000000-0000-0000-0000-000000000001';

insert into public.customers (
  id, workspace_id, account_kind, legal_name, tax_identifier_kind, tax_identifier,
  lifecycle, status, assigned_user_id, source, created_by_user_id, created_at
) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'legal_entity', 'Synthetic Alpha Telecom', 'CIF', 'SYNTHETIC-CIF-A', 'customer', 'active', '10000000-0000-0000-0000-000000000001', 'manual', '10000000-0000-0000-0000-000000000001', '2026-09-27T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'legal_entity', 'Synthetic Beta Telecom', null, null, 'prospect', 'active', null, 'manual', '10000000-0000-0000-0000-000000000001', '2026-09-27T09:00:00Z'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'legal_entity', 'Synthetic Foreign Telecom', null, null, 'customer', 'active', null, 'manual', '10000000-0000-0000-0000-000000000002', '2026-09-27T08:00:00Z');

insert into public.contacts (
  id, workspace_id, customer_id, display_name, email, phone,
  is_primary, status, created_by_user_id
) values (
  '41000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', 'Synthetic Contact',
  'contact@example.invalid', '+34-000-000-000', true, 'active',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.telecom_operators (id, workspace_id, code, display_name, created_by_user_id)
values (
  '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  'synthetic-reader', 'Synthetic Operator', '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_plans (id, workspace_id, operator_id, code, display_name, service_kind, created_by_user_id)
values (
  '51000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', 'synthetic-plan', 'Synthetic Plan', 'mobile',
  '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_plan_versions (id, workspace_id, plan_id, version_number, valid_from, created_by_user_id)
values (
  '52000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001', 1, '2020-01-01',
  '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_contracts (
  id, workspace_id, customer_id, operator_id, plan_version_id, status,
  start_date, assigned_user_id, created_by_user_id
) values (
  '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001', 'active', current_date - 300,
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_services (
  id, workspace_id, customer_id, contract_id, operator_id, plan_version_id,
  service_kind, display_name, status, activated_on, created_by_user_id
) values (
  '61000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
  'mobile', 'Synthetic Mobile Service', 'active', current_date - 300,
  '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_lines (id, workspace_id, service_id, status, activated_on, created_by_user_id)
values (
  '62000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001', 'active', current_date - 300,
  '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_commitments (
  id, workspace_id, contract_id, service_id, commitment_kind, starts_on,
  ends_on, reason_code, created_by_user_id
) values (
  '63000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001',
  'minimum_term', current_date - 300, current_date + 30, 'minimum_term',
  '10000000-0000-0000-0000-000000000001'
);
insert into public.telecom_renewals (
  id, workspace_id, contract_id, target_on, opens_on, closes_on, created_by_user_id
) values (
  '64000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001', current_date + 20,
  current_date - 5, current_date + 20, '10000000-0000-0000-0000-000000000001'
);
insert into public.tasks (
  id, workspace_id, customer_id, title, status, priority, due_at, assigned_user_id, created_by_user_id
) values (
  '72000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', 'Synthetic Follow-up', 'pending', 'high',
  now() + interval '1 day', '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
);
insert into public.calendar_events (
  id, workspace_id, customer_id, title, status, channel, starts_at, ends_at,
  timezone, assigned_user_id, created_by_user_id
) values (
  '73000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', 'Synthetic Meeting', 'scheduled', 'video',
  now() + interval '2 days', now() + interval '2 days 1 hour', 'UTC',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'
);
insert into public.activities (
  id, workspace_id, customer_id, activity_kind, summary_code, actor_kind,
  source, source_event_ref, occurred_at, created_by_user_id
) values (
  '74000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', 'system', 'system.imported', 'system',
  'system', 'synthetic:summary:1', now() - interval '1 hour', null
);

insert into public.opportunity_stages (id,workspace_id,code,display_name,position,created_by_user_id)
values ('70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001','synthetic-stage','Synthetic Stage',1,
  '10000000-0000-0000-0000-000000000001');
insert into public.opportunities (
  id,workspace_id,customer_id,stage_id,title,status,owner_user_id,next_follow_up_at,created_by_user_id
) values ('71000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'Synthetic Opportunity','open','10000000-0000-0000-0000-000000000001',
  now()+interval '1 day','10000000-0000-0000-0000-000000000001');

set local role authenticated;
do $$
declare denied boolean := false;
begin
  begin
    perform public.telecom_v1_customer_get_row(
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'authenticated browser role executed a server-only reader'; end if;
end;
$$;

reset role;
set local role service_role;
select pg_temp.assert_true(
  jsonb_array_length(public.telecom_v1_customer_search_rows(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Synthetic', null, null, 1, null, null
  )->'rows') = 1,
  'customer search did not return the bounded first page'
);
select pg_temp.assert_true(
  (public.telecom_v1_customer_search_rows(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Synthetic', null, null, 1, null, null
  )->>'has_more')::boolean,
  'customer search did not expose a continuation boundary'
);
select pg_temp.assert_true(
  public.telecom_v1_customer_get_row(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001'
  )->>'legal_name' = 'Synthetic Alpha Telecom',
  'customer get did not return the scoped customer'
);
select pg_temp.assert_true(
  not public.telecom_v1_customer_get_row(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001'
  ) ?| array['tax_identifier','email','phone'],
  'customer reader exposed protected identity data'
);
select pg_temp.assert_true(
  public.telecom_v1_customer_get_row(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003'
  ) is null,
  'customer get crossed the selected workspace'
);

do $$
declare summary jsonb;
begin
  summary := public.telecom_v1_customer_summary(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'scope-epoch-0001'
  );
  if summary is null
     or summary->>'scope_epoch' <> 'scope-epoch-0001'
     or summary#>>'{customer,id}' <> '40000000-0000-0000-0000-000000000001'
     or jsonb_array_length(summary#>'{contracts,items}') <> 1
     or jsonb_array_length(summary#>'{services,items}') <> 1
     or jsonb_array_length(summary#>'{lines,items}') <> 1
     or jsonb_array_length(summary#>'{attention,next_task,items}') <> 1
     or jsonb_array_length(summary#>'{attention,next_meeting,items}') <> 1
     or jsonb_array_length(summary#>'{attention,nearest_renewal,items}') <> 1
     or jsonb_array_length(summary#>'{attention,nearest_permanence,items}') <> 1
     or jsonb_array_length(summary#>'{attention,recent_activity,items}') <> 1
     or summary#>>'{attention,alerts,source_state}' <> 'unsupported'
     or summary#>>'{customer,tax_identifier,visibility}' <> 'hidden' then
    raise exception 'customer summary shape or populated sections are invalid';
  end if;
  if summary::text ~ 'SYNTHETIC-CIF-A|contact@example.invalid|\\+34-000-000-000' then
    raise exception 'customer summary exposed protected source values';
  end if;
end;
$$;

select pg_temp.assert_true(
  public.telecom_v1_customer_summary(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'scope-epoch-0001'
  ) is null,
  'customer summary crossed the selected workspace'
);

do $$
declare first_page jsonb; second_page jsonb;
begin
  first_page := public.telecom_v1_customer_search_rows(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Synthetic', null, null, 1, null, null
  );
  second_page := public.telecom_v1_customer_search_rows(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Synthetic', null, null, 1,
    (first_page->>'next_created_at')::timestamptz,
    (first_page->>'next_id')::uuid
  );
  if jsonb_array_length(second_page->'rows') <> 1
     or (second_page->>'has_more')::boolean then
    raise exception 'customer keyset pagination was not stable';
  end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform public.telecom_v1_customer_get_row(
      '10000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'foreign actor used the customer reader'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform public.telecom_v1_customer_get_row(
      '10000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000003',
      '40000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'suspended workspace used the customer reader'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform public.telecom_v1_customer_get_row(
      '10000000-0000-0000-0000-000000000004',
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'removed membership used the customer reader'; end if;
end;
$$;

do $$
declare item jsonb; page jsonb; denied boolean := false;
begin
  item := public.telecom_v1_contract_get(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001', 'scope-epoch-0001');
  if item->>'id' <> '60000000-0000-0000-0000-000000000001'
    or item#>>'{external_reference,visibility}' <> 'not_available'
    or item#>>'{customer,display_name}' <> 'Synthetic Alpha Telecom' then
    raise exception 'contract projection mismatch';
  end if;
  page := public.telecom_v1_contract_list(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001', 'scope-epoch-0001',
    null,null,null,'active',null,null,1,null,null);
  if jsonb_array_length(page->'rows') <> 1 or (page->>'has_more')::boolean then
    raise exception 'contract list page mismatch';
  end if;
  if public.telecom_v1_contract_get(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002', 'scope-epoch-0001') is not null then
    raise exception 'contract get leaked a foreign row';
  end if;
  begin
    perform public.telecom_v1_contract_get(
      '10000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000001',
      '60000000-0000-0000-0000-000000000001', 'scope-epoch-0001');
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'foreign actor accessed contracts'; end if;
end;
$$;

do $$
declare services jsonb; lines jsonb; denied boolean := false;
begin
  services := public.telecom_v1_service_list(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001', 'scope-epoch-0001',
    '40000000-0000-0000-0000-000000000001',null,null,'active',1,null,null);
  lines := public.telecom_v1_line_list(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001', 'scope-epoch-0001',
    '40000000-0000-0000-0000-000000000001',null,'active',1,null,null);
  if jsonb_array_length(services->'rows') <> 1
    or services#>>'{rows,0,display_name}' <> 'Synthetic Mobile Service'
    or jsonb_array_length(lines->'rows') <> 1
    or lines#>>'{rows,0,identifier,visibility}' <> 'not_available' then
    raise exception 'portfolio service/line projection mismatch';
  end if;
  begin
    perform public.telecom_v1_line_list(
      '10000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000001', 'scope-epoch-0001',
      null,null,null,1,null,null);
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'foreign actor accessed lines'; end if;
end;
$$;

do $$
declare activities jsonb; opportunities jsonb;
begin
  activities := public.telecom_v1_activity_list(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',null,null,null,1,null,null);
  opportunities := public.telecom_v1_opportunity_list(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',null,null,null,null,'open',1,null,null);
  if jsonb_array_length(activities->'rows') <> 1
    or activities#>>'{rows,0,safe_summary}' <> 'Importación registrada'
    or jsonb_array_length(opportunities->'rows') <> 1
    or opportunities#>>'{rows,0,title}' <> 'Synthetic Opportunity' then
    raise exception 'activity/opportunity projections mismatch';
  end if;
end;
$$;

reset role;
rollback;
