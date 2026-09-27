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

reset role;
rollback;
