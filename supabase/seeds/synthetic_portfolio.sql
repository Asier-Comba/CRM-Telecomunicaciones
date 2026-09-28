-- Disposable test seed only. All identities and names are invented.
-- This file must be run by a harness that sets app.environment=test on an
-- isolated database, never as a production or staging Supabase seed.
do $$
begin
  if current_setting('app.environment', true) is distinct from 'test' then
    raise exception using errcode='42501',message='synthetic seed requires disposable test database';
  end if;
end;
$$;

begin;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000',
    'authenticated','authenticated','agent-a@example.invalid','',now(),'{}','{}',now(),now()),
  ('a1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000',
    'authenticated','authenticated','agent-b@example.invalid','',now(),'{}','{}',now(),now());

insert into public.workspaces (id,name,slug,status) values
  ('b2000000-0000-4000-8000-000000000001','Synthetic Workspace A','synthetic-portfolio-a','active'),
  ('b2000000-0000-4000-8000-000000000002','Synthetic Workspace B','synthetic-portfolio-b','active');
insert into public.workspace_members (id,workspace_id,user_id,role,status) values
  ('c3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001','owner','active'),
  ('c3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000002','owner','active');
insert into public.customers (
  id,workspace_id,account_kind,legal_name,lifecycle,status,assigned_user_id,source,created_by_user_id
) values
  ('d4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',
    'legal_entity','Synthetic Customer A','customer','active',
    'a1000000-0000-4000-8000-000000000001','manual','a1000000-0000-4000-8000-000000000001'),
  ('d4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002',
    'legal_entity','Synthetic Customer B','customer','active',
    'a1000000-0000-4000-8000-000000000002','manual','a1000000-0000-4000-8000-000000000002');
commit;
