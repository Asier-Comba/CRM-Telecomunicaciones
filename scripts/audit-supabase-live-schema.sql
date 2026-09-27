-- W1/P0 — Inventario de metadatos del schema vivo para reconciliar el drift.
--
-- Solo consulta catálogos PostgreSQL; no lee filas de negocio ni modifica objetos.
-- Ejecutar con un rol autorizado en el SQL Editor del proyecto Supabase y guardar
-- el único valor JSON resultante. Revisar el JSON antes de compartirlo: contiene
-- definiciones de schema y policies, pero no datos de las tablas.

with
target_relations(name) as (
  values
    ('activities'),
    ('agent_action_logs'),
    ('assistant_actions'),
    ('assistant_agent_memory'),
    ('assistant_findings'),
    ('assistant_messages'),
    ('assistant_threads'),
    ('automation_workflows'),
    ('calendar_events'),
    ('clients'),
    ('conversations'),
    ('entity_files'),
    ('inbox_agent_settings'),
    ('integrations'),
    ('invoice_items'),
    ('invoices'),
    ('messages'),
    ('n8n_flows'),
    ('n8n_trigger_logs'),
    ('notifications'),
    ('opportunities'),
    ('profiles'),
    ('properties'),
    ('service_cases'),
    ('tasks'),
    ('vw_google_calendar_status'),
    ('vw_integrations_status'),
    ('whatsapp_connections'),
    ('workspace_members'),
    ('workspace_settings'),
    ('workspace_templates'),
    ('workspaces')
),
target_functions(name) as (
  values
    ('reserve_invoice_number')
),
relations as (
  select c.oid, n.nspname as schema_name, c.relname, c.relkind,
    c.relrowsecurity, c.relforcerowsecurity,
    pg_get_userbyid(c.relowner) as owner,
    c.relacl::text as acl
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join target_relations t on t.name = c.relname
  where n.nspname = 'public'
),
relation_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', schema_name,
    'name', relname,
    'kind', relkind,
    'rls_enabled', relrowsecurity,
    'rls_forced', relforcerowsecurity,
    'owner', owner,
    'acl', acl
  ) order by relname), '[]'::jsonb) as value
  from relations
),
columns_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relation', r.relname,
    'position', a.attnum,
    'name', a.attname,
    'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
    'not_null', a.attnotnull,
    'identity', nullif(a.attidentity, ''),
    'generated', nullif(a.attgenerated, ''),
    'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid)
  ) order by r.relname, a.attnum), '[]'::jsonb) as value
  from relations r
  join pg_catalog.pg_attribute a on a.attrelid = r.oid
  left join pg_catalog.pg_attrdef d
    on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attnum > 0 and not a.attisdropped
),
constraints_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relation', r.relname,
    'name', con.conname,
    'type', con.contype,
    'definition', pg_catalog.pg_get_constraintdef(con.oid, true),
    'validated', con.convalidated,
    'deferrable', con.condeferrable,
    'initially_deferred', con.condeferred
  ) order by r.relname, con.conname), '[]'::jsonb) as value
  from relations r
  join pg_catalog.pg_constraint con on con.conrelid = r.oid
),
indexes_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relation', r.relname,
    'name', idx.relname,
    'definition', pg_catalog.pg_get_indexdef(i.indexrelid),
    'primary', i.indisprimary,
    'unique', i.indisunique,
    'valid', i.indisvalid
  ) order by r.relname, idx.relname), '[]'::jsonb) as value
  from relations r
  join pg_catalog.pg_index i on i.indrelid = r.oid
  join pg_catalog.pg_class idx on idx.oid = i.indexrelid
),
triggers_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relation', r.relname,
    'name', tr.tgname,
    'enabled', tr.tgenabled,
    'definition', pg_catalog.pg_get_triggerdef(tr.oid, true),
    'function_schema', fn_ns.nspname,
    'function_name', fn.proname,
    'function_definition', pg_catalog.pg_get_functiondef(fn.oid)
  ) order by r.relname, tr.tgname), '[]'::jsonb) as value
  from relations r
  join pg_catalog.pg_trigger tr on tr.tgrelid = r.oid and not tr.tgisinternal
  join pg_catalog.pg_proc fn on fn.oid = tr.tgfoid
  join pg_catalog.pg_namespace fn_ns on fn_ns.oid = fn.pronamespace
),
policies_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relation', p.tablename,
    'name', p.policyname,
    'permissive', p.permissive,
    'roles', p.roles,
    'command', p.cmd,
    'using', p.qual,
    'check', p.with_check
  ) order by p.tablename, p.policyname), '[]'::jsonb) as value
  from pg_catalog.pg_policies p
  join target_relations t on t.name = p.tablename
  where p.schemaname = 'public'
),
grants_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'relation', g.table_name,
    'grantor', g.grantor,
    'grantee', g.grantee,
    'privilege', g.privilege_type,
    'grantable', g.is_grantable
  ) order by g.table_name, g.grantee, g.privilege_type), '[]'::jsonb) as value
  from information_schema.role_table_grants g
  join target_relations t on t.name = g.table_name
  where g.table_schema = 'public'
),
views_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', v.viewname,
    'owner', v.viewowner,
    'definition', v.definition
  ) order by v.viewname), '[]'::jsonb) as value
  from pg_catalog.pg_views v
  join target_relations t on t.name = v.viewname
  where v.schemaname = 'public'
),
live_functions as (
  select p.*,
    n.nspname as schema_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_catalog.pg_get_function_result(p.oid) as result,
    pg_catalog.pg_get_userbyid(p.proowner) as owner,
    pg_catalog.pg_get_functiondef(p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join target_functions t on t.name = p.proname
  where n.nspname = 'public'
),
functions_metadata as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', f.schema_name,
    'name', f.proname,
    'identity_arguments', f.identity_arguments,
    'result', f.result,
    'kind', f.prokind,
    'security_definer', f.prosecdef,
    'volatility', f.provolatile,
    'owner', f.owner,
    'acl', f.proacl::text,
    'definition', f.definition
  ) order by f.proname, f.identity_arguments), '[]'::jsonb) as value
  from live_functions f
),
missing_targets as (
  select coalesce(jsonb_agg(t.name order by t.name), '[]'::jsonb) as value
  from target_relations t
  left join relations r on r.relname = t.name
  where r.oid is null
),
missing_functions as (
  select coalesce(jsonb_agg(t.name order by t.name), '[]'::jsonb) as value
  from target_functions t
  left join live_functions f on f.proname = t.name
  where f.oid is null
)
select jsonb_build_object(
  'captured_at', pg_catalog.clock_timestamp(),
  'database', pg_catalog.current_database(),
  'relations', relation_metadata.value,
  'columns', columns_metadata.value,
  'constraints', constraints_metadata.value,
  'indexes', indexes_metadata.value,
  'triggers', triggers_metadata.value,
  'policies', policies_metadata.value,
  'grants', grants_metadata.value,
  'views', views_metadata.value,
  'functions', functions_metadata.value,
  'missing_targets', missing_targets.value,
  'missing_functions', missing_functions.value
) as supabase_schema_inventory
from relation_metadata
cross join columns_metadata
cross join constraints_metadata
cross join indexes_metadata
cross join triggers_metadata
cross join policies_metadata
cross join grants_metadata
cross join views_metadata
cross join functions_metadata
cross join missing_targets
cross join missing_functions;
