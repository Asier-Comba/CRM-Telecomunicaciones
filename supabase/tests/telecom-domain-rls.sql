\set ON_ERROR_STOP on

-- Destructive fixture setup is allowed only on an explicitly marked test DB.
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

create function pg_temp.assert_domain_visibility(
  allowed_workspaces uuid[], denied_workspaces uuid[], p_context text
) returns void language plpgsql set search_path = '' as $$
declare relation_name text; workspace uuid; visible_count bigint;
begin
  foreach relation_name in array array[
    'customers','contacts','telecom_operators','telecom_plans','telecom_plan_versions',
    'telecom_contracts','telecom_services','telecom_lines','telecom_commitments',
    'telecom_renewals','opportunity_stages','opportunities','tasks','calendar_events','activities',
    'service_cases','documents'
  ] loop
    foreach workspace in array allowed_workspaces loop
      execute format('select count(*) from public.%I where workspace_id = $1', relation_name)
        into visible_count using workspace;
      if visible_count < 1 then
        raise exception '% cannot read allowed workspace % in %', p_context, workspace, relation_name;
      end if;
    end loop;
    foreach workspace in array denied_workspaces loop
      execute format('select count(*) from public.%I where workspace_id = $1', relation_name)
        into visible_count using workspace;
      if visible_count <> 0 then
        raise exception '% can read denied workspace % in %', p_context, workspace, relation_name;
      end if;
    end loop;
  end loop;
end;
$$;

create function pg_temp.assert_privileged_visibility(
  allowed_workspaces uuid[], denied_workspaces uuid[], p_context text
) returns void language plpgsql set search_path = '' as $$
declare relation_name text; workspace uuid; visible_count bigint;
begin
  foreach relation_name in array array[
    'import_jobs','import_field_mappings','import_staging_rows',
    'import_row_issues','import_applications','business_audit_events'
  ] loop
    foreach workspace in array allowed_workspaces loop
      execute format('select count(*) from public.%I where workspace_id = $1', relation_name)
        into visible_count using workspace;
      if visible_count < 1 then
        raise exception '% cannot read privileged workspace % in %', p_context, workspace, relation_name;
      end if;
    end loop;
    foreach workspace in array denied_workspaces loop
      execute format('select count(*) from public.%I where workspace_id = $1', relation_name)
        into visible_count using workspace;
      if visible_count <> 0 then
        raise exception '% can read denied privileged workspace % in %', p_context, workspace, relation_name;
      end if;
    end loop;
  end loop;
end;
$$;

create function pg_temp.assert_no_domain_rows(p_context text)
returns void language plpgsql set search_path = '' as $$
declare relation_name text; visible_count bigint;
begin
  foreach relation_name in array array[
    'customers','contacts','telecom_operators','telecom_plans','telecom_plan_versions',
    'telecom_contracts','telecom_services','telecom_lines','telecom_commitments',
    'telecom_renewals','opportunity_stages','opportunities','tasks','calendar_events','activities',
    'service_cases','documents','import_jobs','import_field_mappings','import_staging_rows',
    'import_row_issues','import_applications','business_audit_events'
  ] loop
    execute format('select count(*) from public.%I', relation_name) into visible_count;
    if visible_count <> 0 then
      raise exception '% leaked rows in %', p_context, relation_name;
    end if;
  end loop;
end;
$$;

-- Synthetic identities only. The transaction, grants and fixtures are rolled back.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-c@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'removed@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'multi@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'suspended-member-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.workspaces (id, name, slug, status) values
  ('20000000-0000-0000-0000-000000000001', 'Synthetic Workspace A', 'synthetic-workspace-a', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'Synthetic Workspace B', 'synthetic-workspace-b', 'active'),
  ('20000000-0000-0000-0000-000000000003', 'Synthetic Workspace C', 'synthetic-workspace-c', 'suspended');

insert into public.workspace_members (id, workspace_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'member', 'active'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'owner', 'active'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'owner', 'active'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'viewer', 'active'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'member', 'active'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'admin', 'active'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'member', 'suspended'),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'member', 'active');

insert into public.customers (id, workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'legal_entity', 'Synthetic Customer A', 'customer', 'active', 'manual', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'legal_entity', 'Synthetic Customer B', 'customer', 'active', 'manual', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'legal_entity', 'Synthetic Customer No Contacts', 'prospect', 'active', 'manual', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'legal_entity', 'Synthetic Large Customer', 'customer', 'active', 'import', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'legal_entity', 'Synthetic Customer C', 'customer', 'active', 'manual', '10000000-0000-0000-0000-000000000004');

insert into public.contacts (id, workspace_id, customer_id, display_name, is_primary, status, created_by_user_id) values
  ('41000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Synthetic Primary A', true, 'active', '10000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Synthetic Primary B', true, 'active', '10000000-0000-0000-0000-000000000003'),
  ('41000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Synthetic Secondary A', false, 'active', '10000000-0000-0000-0000-000000000001'),
  ('41000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', 'Synthetic Primary C', true, 'active', '10000000-0000-0000-0000-000000000004');

insert into public.telecom_operators (id, workspace_id, code, display_name, created_by_user_id) values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'synthetic-a', 'Synthetic Operator A', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'synthetic-b', 'Synthetic Operator B', '10000000-0000-0000-0000-000000000003'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'synthetic-c', 'Synthetic Operator C', '10000000-0000-0000-0000-000000000004');

insert into public.telecom_plans (id, workspace_id, operator_id, code, display_name, service_kind, created_by_user_id) values
  ('51000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'mobile-a', 'Synthetic Mobile A', 'mobile', '10000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'mobile-b', 'Synthetic Mobile B', 'mobile', '10000000-0000-0000-0000-000000000003'),
  ('51000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'mobile-c', 'Synthetic Mobile C', 'mobile', '10000000-0000-0000-0000-000000000004');

insert into public.telecom_plan_versions (id, workspace_id, plan_id, version_number, valid_from, currency, recurring_amount_minor, created_by_user_id) values
  ('52000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, '2026-01-01', 'EUR', 2500, '10000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002', 1, '2026-01-01', 'EUR', 2600, '10000000-0000-0000-0000-000000000003'),
  ('52000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000003', 1, '2026-01-01', 'EUR', 2700, '10000000-0000-0000-0000-000000000004');

insert into public.telecom_contracts (id, workspace_id, customer_id, operator_id, plan_version_id, status, start_date, assigned_user_id, created_by_user_id) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000003', 'active', '2026-02-01', null, '10000000-0000-0000-0000-000000000004');

insert into public.telecom_contracts (
  id, workspace_id, customer_id, operator_id, plan_version_id, status,
  start_date, assigned_user_id, source, created_by_user_id
)
select
  md5('synthetic-contract-' || g)::uuid,
  '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  'active', '2026-02-01', '10000000-0000-0000-0000-000000000001',
  'import', '10000000-0000-0000-0000-000000000001'
from generate_series(1, 105) as series(g);

insert into public.telecom_services (id, workspace_id, customer_id, contract_id, operator_id, plan_version_id, service_kind, display_name, status, activated_on, created_by_user_id) values
  ('61000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'mobile', 'Synthetic Service A', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000001'),
  ('61000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'mobile', 'Synthetic Service B', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000003'),
  ('61000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000003', 'mobile', 'Synthetic Service C', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000004');

insert into public.telecom_services (
  id, workspace_id, customer_id, contract_id, operator_id, plan_version_id,
  service_kind, display_name, status, activated_on, created_by_user_id
)
select
  md5('synthetic-service-' || g)::uuid,
  '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000004',
  md5('synthetic-contract-' || g)::uuid,
  '50000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  'mobile', 'Synthetic Bulk Service ' || g, 'active', '2026-02-01',
  '10000000-0000-0000-0000-000000000001'
from generate_series(1, 105) as series(g);

insert into public.telecom_lines (id, workspace_id, service_id, status, activated_on, created_by_user_id) values
  ('62000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000003'),
  ('62000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003', 'active', '2026-02-01', '10000000-0000-0000-0000-000000000004');

insert into public.telecom_lines (id, workspace_id, service_id, status, activated_on, created_by_user_id)
select
  md5('synthetic-line-' || g || '-' || line_number)::uuid,
  '20000000-0000-0000-0000-000000000001',
  md5('synthetic-service-' || g)::uuid,
  'active', '2026-02-01', '10000000-0000-0000-0000-000000000001'
from generate_series(1, 105) as contracts(g)
cross join generate_series(1, 3) as lines(line_number);

insert into public.telecom_commitments (id, workspace_id, contract_id, service_id, commitment_kind, starts_on, ends_on, reason_code, created_by_user_id) values
  ('63000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'minimum_term', current_date - 300, current_date + 30, 'minimum_term', '10000000-0000-0000-0000-000000000001'),
  ('63000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002', 'minimum_term', '2026-02-01', '2027-02-01', 'minimum_term', '10000000-0000-0000-0000-000000000003'),
  ('63000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003', 'minimum_term', '2026-02-01', '2027-02-01', 'minimum_term', '10000000-0000-0000-0000-000000000004');

insert into public.telecom_renewals (id, workspace_id, contract_id, target_on, opens_on, closes_on, created_by_user_id) values
  ('64000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', current_date + 20, current_date - 5, current_date + 20, '10000000-0000-0000-0000-000000000001'),
  ('64000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '2027-02-01', '2026-12-01', '2027-02-01', '10000000-0000-0000-0000-000000000003'),
  ('64000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', '2027-03-01', '2027-01-01', '2027-03-01', '10000000-0000-0000-0000-000000000004');

insert into public.opportunity_stages (id, workspace_id, code, display_name, position, created_by_user_id) values
  ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'qualified', 'Synthetic Qualified A', 10, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'qualified', 'Synthetic Qualified B', 10, '10000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'qualified', 'Synthetic Qualified C', 10, '10000000-0000-0000-0000-000000000004');

insert into public.opportunities (id, workspace_id, customer_id, stage_id, title, owner_user_id, next_follow_up_at, created_by_user_id) values
  ('71000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Synthetic Opportunity A', '10000000-0000-0000-0000-000000000001', '2026-10-01T09:00:00Z', '10000000-0000-0000-0000-000000000001'),
  ('71000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Synthetic Opportunity B', '10000000-0000-0000-0000-000000000003', '2026-10-01T09:00:00Z', '10000000-0000-0000-0000-000000000003'),
  ('71000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000003', 'Synthetic Opportunity C', null, '2026-10-01T09:00:00Z', '10000000-0000-0000-0000-000000000004');

insert into public.tasks (id, workspace_id, customer_id, opportunity_id, title, due_at, assigned_user_id, created_by_user_id) values
  ('72000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'Synthetic Task A', '2026-10-02T09:00:00Z', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'Synthetic Task B', '2026-10-02T09:00:00Z', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('72000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', '71000000-0000-0000-0000-000000000003', 'Synthetic Task C', '2026-10-02T09:00:00Z', null, '10000000-0000-0000-0000-000000000004');

insert into public.calendar_events (id, workspace_id, customer_id, opportunity_id, title, starts_at, ends_at, timezone, assigned_user_id, created_by_user_id) values
  ('73000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'Synthetic Meeting A', '2026-10-03T09:00:00Z', '2026-10-03T10:00:00Z', 'Europe/Madrid', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'Synthetic Meeting B', '2026-10-03T09:00:00Z', '2026-10-03T10:00:00Z', 'Europe/Madrid', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('73000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', '71000000-0000-0000-0000-000000000003', 'Synthetic Meeting C', '2026-10-03T09:00:00Z', '2026-10-03T10:00:00Z', 'Europe/Madrid', null, '10000000-0000-0000-0000-000000000004');

insert into public.activities (id, workspace_id, customer_id, activity_kind, summary_code, actor_kind, source, source_event_ref, occurred_at, created_by_user_id) values
  ('74000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'system', 'system.imported', 'system', 'system', 'synthetic:event:a', now(), '10000000-0000-0000-0000-000000000001'),
  ('74000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'system', 'system.imported', 'system', 'system', 'synthetic:event:b', now(), '10000000-0000-0000-0000-000000000003'),
  ('74000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', 'system', 'system.imported', 'system', 'system', 'synthetic:event:c', now(), null);

insert into public.service_cases (
  id, workspace_id, customer_id, contract_id, service_id, line_id,
  case_type, title, status, priority, due_on, assigned_user_id, created_by_user_id
) values
  ('75000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'technical', 'Synthetic Case A', 'open', 'high', current_date + 5, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('75000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'billing', 'Synthetic Case B', 'open', 'normal', current_date + 10, '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('75000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003', '62000000-0000-0000-0000-000000000003', 'portability', 'Synthetic Case C', 'open', 'normal', current_date + 15, null, '10000000-0000-0000-0000-000000000004');

insert into public.documents (
  id, workspace_id, customer_id, document_kind, file_name, media_type,
  size_bytes, sha256_hex, storage_path, created_by_user_id
) values
  ('76000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'contract', 'synthetic-a.pdf', 'application/pdf', 100, repeat('a', 64), '20000000-0000-0000-0000-000000000001/documents/76000000-0000-0000-0000-000000000001/77000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('76000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'service', 'synthetic-b.pdf', 'application/pdf', 200, repeat('b', 64), '20000000-0000-0000-0000-000000000002/documents/76000000-0000-0000-0000-000000000002/77000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('76000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005', 'incident', 'synthetic-c.pdf', 'application/pdf', 300, repeat('c', 64), '20000000-0000-0000-0000-000000000003/documents/76000000-0000-0000-0000-000000000003/77000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004');

insert into public.documents (
  id, workspace_id, customer_id, contract_id, service_id, line_id,
  service_case_id, opportunity_id, document_kind, file_name, media_type,
  storage_path, created_by_user_id
) values
  ('76000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', null, '60000000-0000-0000-0000-000000000001', null, null, null, null, 'contract', 'contract-target.pdf', 'application/pdf', '20000000-0000-0000-0000-000000000001/documents/76000000-0000-0000-0000-000000000010/77000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001'),
  ('76000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', null, null, '61000000-0000-0000-0000-000000000001', null, null, null, 'service', 'service-target.pdf', 'application/pdf', '20000000-0000-0000-0000-000000000001/documents/76000000-0000-0000-0000-000000000011/77000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001'),
  ('76000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', null, null, null, '62000000-0000-0000-0000-000000000001', null, null, 'service', 'line-target.pdf', 'application/pdf', '20000000-0000-0000-0000-000000000001/documents/76000000-0000-0000-0000-000000000012/77000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001'),
  ('76000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', null, null, null, null, '75000000-0000-0000-0000-000000000001', null, 'incident', 'case-target.pdf', 'application/pdf', '20000000-0000-0000-0000-000000000001/documents/76000000-0000-0000-0000-000000000013/77000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001'),
  ('76000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000001', null, null, null, null, null, '71000000-0000-0000-0000-000000000001', 'general', 'opportunity-target.pdf', 'application/pdf', '20000000-0000-0000-0000-000000000001/documents/76000000-0000-0000-0000-000000000014/77000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001');

-- Import/audit fixtures exercise the real lifecycle so trigger invariants are part
-- of the database harness, not bypassed by inserting terminal rows directly.
insert into public.import_jobs (
  id, workspace_id, import_kind, source_file_ref_id, source_file_digest_hmac,
  digest_key_version, mapping_schema_version, idempotency_key_id, total_rows, created_by_user_id
) values
  ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'customers', '86000000-0000-0000-0000-000000000001', repeat('a', 64), 1, 1, '89000000-0000-0000-0000-000000000001', 2, '10000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'customers', '86000000-0000-0000-0000-000000000002', repeat('b', 64), 1, 1, '89000000-0000-0000-0000-000000000002', 2, '10000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'customers', '86000000-0000-0000-0000-000000000003', repeat('c', 64), 1, 1, '89000000-0000-0000-0000-000000000003', 2, '10000000-0000-0000-0000-000000000004');

update public.import_jobs set status = 'mapping';

insert into public.import_field_mappings (
  id, workspace_id, import_job_id, source_column_ordinal,
  target_field_code, created_by_user_id
) values
  ('81000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 0, 'legal_name', '10000000-0000-0000-0000-000000000001'),
  ('81000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 0, 'legal_name', '10000000-0000-0000-0000-000000000003'),
  ('81000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', 0, 'legal_name', '10000000-0000-0000-0000-000000000004');

update public.import_jobs set status = 'validating';

insert into public.import_staging_rows (
  id, workspace_id, import_job_id, source_row_number, row_digest_hmac, encrypted_payload_ref_id
) values
  ('82000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 1, repeat('a', 64), '87000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 2, repeat('b', 64), '87000000-0000-0000-0000-000000000002'),
  ('82000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 1, repeat('c', 64), '87000000-0000-0000-0000-000000000003'),
  ('82000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 2, repeat('d', 64), '87000000-0000-0000-0000-000000000004'),
  ('82000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', 1, repeat('e', 64), '87000000-0000-0000-0000-000000000005'),
  ('82000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', 2, repeat('f', 64), '87000000-0000-0000-0000-000000000006');

update public.import_staging_rows
   set validation_state = case when source_row_number = 1 then 'valid' else 'invalid' end,
       validated_at = now();

insert into public.import_row_issues (
  id, workspace_id, import_job_id, staging_row_id, severity,
  issue_code, field_code, message_template_code
) values
  ('83000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 'error', 'required_missing', 'legal_name', 'import.required_missing'),
  ('83000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000004', 'error', 'required_missing', 'legal_name', 'import.required_missing'),
  ('83000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000006', 'error', 'required_missing', 'legal_name', 'import.required_missing');

update public.import_jobs
   set status = 'ready', valid_rows = 1, invalid_rows = 1, checkpoint_rows_processed = 2;
update public.import_jobs set status = 'applying';

insert into public.import_applications (
  id, workspace_id, import_job_id, staging_row_id, customer_id,
  operation_ref_id, applied_by_user_id
) values
  ('84000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('84000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '88000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('84000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '88000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004');

update public.import_jobs
   set status = 'completed', applied_rows = 1, completed_at = now();

insert into public.business_audit_events (
  id, workspace_id, actor_kind, actor_ref_id, action_code,
  target_kind, target_id, outcome, occurred_at
) values
  ('85000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'system', '8a000000-0000-0000-0000-000000000001', 'import.completed.v1', 'import_job', '80000000-0000-0000-0000-000000000001', 'succeeded', now()),
  ('85000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'system', '8a000000-0000-0000-0000-000000000002', 'import.completed.v1', 'import_job', '80000000-0000-0000-0000-000000000002', 'succeeded', now()),
  ('85000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'system', '8a000000-0000-0000-0000-000000000003', 'import.completed.v1', 'import_job', '80000000-0000-0000-0000-000000000003', 'succeeded', now());

insert into public.business_audit_events (
  id, workspace_id, actor_kind, actor_ref_id, action_code,
  target_kind, target_id, outcome, occurred_at, recorded_at
) values (
  '85000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001',
  'system', '8a000000-0000-0000-0000-000000000001', 'import.completed.v1', 'import_job',
  '80000000-0000-0000-0000-000000000001', 'succeeded', '2020-01-01T00:00:00Z',
  '2020-01-01T00:00:00Z'
);
select pg_temp.assert_true(
  (select recorded_at > now() - interval '1 minute'
     from public.business_audit_events
    where id = '85000000-0000-0000-0000-000000000004'),
  'audit recorded_at was not assigned by the database clock'
);

do $$
declare denied boolean := false;
begin
  begin
    insert into public.business_audit_events (
      workspace_id, actor_kind, actor_ref_id, action_code, target_kind,
      target_id, outcome, occurred_at
    ) values (
      '20000000-0000-0000-0000-000000000001', 'system',
      '8a000000-0000-0000-0000-000000000001', 'import.completed.v1', 'import_job',
      '80000000-0000-0000-0000-000000000002', 'succeeded', now()
    );
  exception when sqlstate '23514' then denied := true;
  end;
  if not denied then raise exception 'cross-workspace successful audit target was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.business_audit_events (
      workspace_id, actor_kind, actor_ref_id, action_code, target_kind,
      target_id, outcome, occurred_at, prior_event_id
    ) values (
      '20000000-0000-0000-0000-000000000001', 'system',
      '8a000000-0000-0000-0000-000000000001', 'import.completed.v1', 'import_job',
      '80000000-0000-0000-0000-000000000001', 'succeeded',
      now() - interval '1 day', '85000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '23514' then denied := true;
  end;
  if not denied then raise exception 'backwards audit correction chain was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    update public.import_staging_rows
       set applied_at = applied_at + interval '1 second'
     where id = '82000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'applied staging timestamp rewrite was not denied'; end if;
end;
$$;

insert into public.import_jobs (
  id, workspace_id, import_kind, source_file_ref_id, source_file_digest_hmac,
  digest_key_version, mapping_schema_version, idempotency_key_id, total_rows, created_by_user_id
) values (
  '80000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001',
  'customers', '86000000-0000-0000-0000-000000000010', repeat('d', 64), 1, 1, '89000000-0000-0000-0000-000000000010', 1,
  '10000000-0000-0000-0000-000000000001'
);
do $$
declare denied boolean := false;
begin
  begin
    update public.import_jobs
       set status = 'failed', valid_rows = 1, checkpoint_rows_processed = 1,
           failure_code = 'system_failure'
     where id = '80000000-0000-0000-0000-000000000010';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'fabricated terminal import counters were not denied'; end if;
end;
$$;

insert into public.import_jobs (
  id, workspace_id, import_kind, source_file_ref_id, source_file_digest_hmac,
  digest_key_version, mapping_schema_version, idempotency_key_id, total_rows, created_by_user_id
) values (
  '80000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
  'customers', '86000000-0000-0000-0000-000000000011', repeat('e', 64), 1, 1, '89000000-0000-0000-0000-000000000011', 1,
  '10000000-0000-0000-0000-000000000001'
);
update public.import_jobs set status = 'mapping'
 where id = '80000000-0000-0000-0000-000000000011';
update public.import_jobs set status = 'validating'
 where id = '80000000-0000-0000-0000-000000000011';
insert into public.import_staging_rows (
  id, workspace_id, import_job_id, source_row_number, row_digest_hmac, encrypted_payload_ref_id
) values (
  '82000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000011', 1, repeat('1', 64), '87000000-0000-0000-0000-000000000011'
);
do $$
declare denied boolean := false;
begin
  begin
    update public.import_jobs set status = 'ready'
     where id = '80000000-0000-0000-0000-000000000011';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'ready import with pending validation was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    update public.import_jobs set total_rows = 2
     where id = '80000000-0000-0000-0000-000000000011';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'declared import total changed after validation started'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.import_staging_rows (
      id, workspace_id, import_job_id, source_row_number, row_digest_hmac,
      encrypted_payload_ref_id, validation_state, validated_at
    ) values (
      '82000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001',
      '80000000-0000-0000-0000-000000000011', 1, repeat('2', 64),
      '87000000-0000-0000-0000-000000000021', 'valid', now()
    );
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'non-pending staging insert was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.import_row_issues (
      id, workspace_id, import_job_id, staging_row_id, severity,
      issue_code, field_code, message_template_code
    ) values (
      '83000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000001',
      '80000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002',
      'error', 'required_missing', 'legal_name', 'import.required_missing'
    );
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'post-terminal import issue was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    delete from public.import_staging_rows
     where id = '82000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'staging ledger delete was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    delete from public.import_jobs
     where id = '80000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'import job delete was not denied'; end if;
end;
$$;

insert into public.import_jobs (
  id, workspace_id, import_kind, source_file_ref_id, source_file_digest_hmac,
  digest_key_version, mapping_schema_version, idempotency_key_id, total_rows, created_by_user_id
) values (
  '80000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001',
  'customers', '86000000-0000-0000-0000-000000000012', repeat('f', 64), 1, 1, '89000000-0000-0000-0000-000000000012', 0,
  '10000000-0000-0000-0000-000000000001'
);
update public.import_jobs set status = 'mapping'
 where id = '80000000-0000-0000-0000-000000000012';
update public.import_jobs set status = 'validating'
 where id = '80000000-0000-0000-0000-000000000012';
update public.import_jobs set status = 'ready'
 where id = '80000000-0000-0000-0000-000000000012';
update public.import_jobs set status = 'applying'
 where id = '80000000-0000-0000-0000-000000000012';
do $$
declare denied boolean := false;
begin
  begin
    update public.import_jobs set status = 'completed', completed_at = now()
     where id = '80000000-0000-0000-0000-000000000012';
  exception when sqlstate '23514' then denied := true;
  end;
  if not denied then raise exception 'completed import with null checkpoint was not denied'; end if;
end;
$$;

-- Domain raw grants remain closed in migrations. Temporary transactional grants
-- expose policies to authenticated/anon roles solely for this RLS harness.
grant select on table
  public.customers, public.contacts, public.telecom_operators, public.telecom_plans,
  public.telecom_plan_versions, public.telecom_contracts, public.telecom_services,
  public.telecom_lines, public.telecom_commitments, public.telecom_renewals,
  public.opportunity_stages, public.opportunities, public.tasks,
  public.calendar_events, public.activities, public.service_cases, public.documents,
  public.import_jobs, public.import_field_mappings, public.import_staging_rows,
  public.import_row_issues, public.import_applications, public.business_audit_events
to anon, authenticated;
grant insert, update, delete on table
  public.customers, public.contacts, public.telecom_operators, public.telecom_plans,
  public.telecom_plan_versions, public.telecom_contracts, public.telecom_services,
  public.telecom_lines, public.telecom_commitments, public.telecom_renewals,
  public.opportunity_stages, public.opportunities, public.tasks,
  public.calendar_events, public.activities, public.service_cases, public.documents
to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select pg_temp.assert_domain_visibility(
  array['20000000-0000-0000-0000-000000000001'::uuid],
  array['20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid],
  'owner A'
);
select pg_temp.assert_privileged_visibility(
  array['20000000-0000-0000-0000-000000000001'::uuid],
  array['20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid],
  'owner A'
);

insert into public.customers (
  id, workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id
) values (
  '40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001',
  'legal_entity', 'Owner A Allowed Insert', 'lead', 'active', 'manual',
  '10000000-0000-0000-0000-000000000001'
);

do $$
declare denied boolean := false;
begin
  begin
    insert into public.customers (workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id)
    values ('20000000-0000-0000-0000-000000000002', 'legal_entity', 'Cross Tenant Denied', 'lead', 'active', 'manual', '10000000-0000-0000-0000-000000000001');
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'cross-tenant insert was not denied by RLS'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.customers (
      id, workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id
    ) values (
      '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
      'legal_entity', 'Cross Tenant Upsert Denied', 'customer', 'active', 'manual',
      '10000000-0000-0000-0000-000000000001'
    ) on conflict (id) do update set legal_name = excluded.legal_name;
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'cross-tenant upsert was not denied by RLS'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.contacts (
      workspace_id, customer_id, display_name, status, created_by_user_id
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000002',
      'Cross Tenant Parent Denied', 'active',
      '10000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '23503' then denied := true;
  end;
  if not denied then raise exception 'cross-tenant composite parent was not denied by FK'; end if;
end;
$$;

delete from public.customers where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select count(*) from public.customers where id = '40000000-0000-0000-0000-000000000001') = 1,
  'delete without policy removed a row'
);

do $$
declare denied boolean := false;
begin
  begin
    update public.tasks set workspace_id = '20000000-0000-0000-0000-000000000002'
     where id = '72000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'tenant identity mutation was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    update public.documents
       set customer_id = null,
           contract_id = '60000000-0000-0000-0000-000000000001'
     where id = '76000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then denied := true;
  end;
  if not denied then raise exception 'document retarget was not denied'; end if;
end;
$$;

do $$
declare bad_path text; denied boolean;
begin
  foreach bad_path in array array[
    '20000000-0000-0000-0000-000000000002/documents/76100000-0000-0000-0000-000000000001/77100000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001/documents/76100000-0000-0000-0000-000000000001/%2e%2e',
    '20000000-0000-0000-0000-000000000001/documents/76100000-0000-0000-0000-000000000001/'
  ] loop
    denied := false;
    begin
      insert into public.documents (
        id, workspace_id, customer_id, document_kind, file_name, storage_path, created_by_user_id
      ) values (
        '76100000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        'general', 'invalid-path.pdf', bad_path,
        '10000000-0000-0000-0000-000000000001'
      );
    exception when sqlstate '23514' then denied := true;
    end;
    if not denied then raise exception 'invalid document path was not denied: %', bad_path; end if;
  end loop;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.service_cases (
      workspace_id, customer_id, contract_id, case_type, title, created_by_user_id
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '60000000-0000-0000-0000-000000000002',
      'technical', 'Cross Tenant Case Denied',
      '10000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '23514' then denied := true;
  end;
  if not denied then raise exception 'cross-scope service case was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.service_cases (
      workspace_id, customer_id, case_type, title, assigned_user_id, created_by_user_id
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      'technical', 'Foreign Assignee Denied',
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '23514' then denied := true;
  end;
  if not denied then raise exception 'foreign service-case assignee was not denied'; end if;
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.service_cases (
      workspace_id, customer_id, case_type, title, status,
      created_at, resolved_at, closed_at, created_by_user_id
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      'technical', 'Invalid Chronology Denied', 'closed',
      now() - interval '2 hours', now() - interval '1 hour',
      now() - interval '90 minutes',
      '10000000-0000-0000-0000-000000000001'
    );
  exception when sqlstate '23514' then denied := true;
  end;
  if not denied then raise exception 'invalid service-case chronology was not denied'; end if;
end;
$$;

reset role;
select pg_temp.assert_true(
  (select legal_name from public.customers where id = '40000000-0000-0000-0000-000000000002') = 'Synthetic Customer B',
  'cross-tenant upsert changed workspace B'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select pg_temp.assert_true((select count(*) from public.customers) >= 1, 'member A cannot read workspace A');
select pg_temp.assert_privileged_visibility(
  array[]::uuid[],
  array['20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid],
  'member A'
);

do $$
declare denied boolean := false;
begin
  begin
    insert into public.customers (workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id)
    values ('20000000-0000-0000-0000-000000000001', 'legal_entity', 'Member Write Denied', 'lead', 'active', 'manual', '10000000-0000-0000-0000-000000000002');
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'member insert was not denied'; end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000007', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
insert into public.customers (
  id, workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id
) values (
  '40000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
  'legal_entity', 'Admin A Allowed Insert', 'lead', 'active', 'manual',
  '10000000-0000-0000-0000-000000000007'
);
select pg_temp.assert_privileged_visibility(
  array['20000000-0000-0000-0000-000000000001'::uuid],
  array['20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid],
  'admin A'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
select pg_temp.assert_domain_visibility(
  array['20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid],
  array['20000000-0000-0000-0000-000000000003'::uuid],
  'multi-workspace actor'
);
select pg_temp.assert_privileged_visibility(
  array[]::uuid[],
  array['20000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid],
  'multi-workspace actor'
);
do $$
declare denied boolean := false;
begin
  begin
    insert into public.customers (workspace_id, account_kind, legal_name, lifecycle, status, source, created_by_user_id)
    values ('20000000-0000-0000-0000-000000000001', 'legal_entity', 'Viewer Write Denied', 'lead', 'active', 'manual', '10000000-0000-0000-0000-000000000006');
  exception when sqlstate '42501' then denied := true;
  end;
  if not denied then raise exception 'viewer insert was not denied'; end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select pg_temp.assert_no_domain_rows('suspended workspace');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000008', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
select pg_temp.assert_no_domain_rows('suspended membership');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select pg_temp.assert_true((select count(*) from public.customers) >= 1, 'membership fixture was not active before removal');
reset role;
delete from public.workspace_members
where id = '30000000-0000-0000-0000-000000000009';
set local role authenticated;
select pg_temp.assert_no_domain_rows('removed membership with stale JWT');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.assert_no_domain_rows('anonymous access');

reset role;
rollback;
