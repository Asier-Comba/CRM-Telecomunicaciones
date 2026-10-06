-- Metadata only; no tenant rows or credentials. Same controlled role model.
select jsonb_build_object(
 'functions', (select jsonb_agg(jsonb_build_object(
  'signature', format('%s.%s(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)),
  'definer',p.prosecdef,
  'public',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
  'anon',has_function_privilege('anon',p.oid,'EXECUTE'),
  'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'service_role',has_function_privilege('service_role',p.oid,'EXECUTE'))
  order by n.nspname,p.proname,oidvectortypes(p.proargtypes))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','auth') and not exists(
   select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),
 'relations', (select jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||c.relname,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
  'grants',(select jsonb_agg(jsonb_build_object(
    'role',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
    'privilege',a.privilege_type,'grantable',a.is_grantable)
    order by case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,a.privilege_type)
    from aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a))
    order by n.nspname,c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','auth','storage') and c.relkind in ('r','p','S','v') and not exists(
   select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')),
 'schemas', (select jsonb_agg(jsonb_build_object('name',nspname,
   'anon',has_schema_privilege('anon',oid,'USAGE'),
   'authenticated',has_schema_privilege('authenticated',oid,'USAGE'),
   'service_role',has_schema_privilege('service_role',oid,'USAGE')) order by nspname)
   from pg_namespace where nspname in ('public','auth','storage')),
 'defaults', (select coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(defaclrole),
   'schema',coalesce(n.nspname,''),'kind',defaclobjtype,'acl',defaclacl::text)
   order by pg_get_userbyid(defaclrole),n.nspname,defaclobjtype),'[]'::jsonb)
   from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace),
 'policies', (select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,
   'name',policyname,'roles',roles,'command',cmd,'permissive',permissive,'using',qual,'check',with_check)
   order by schemaname,tablename,policyname),'[]'::jsonb) from pg_policies
   where schemaname in ('public','auth','storage')),
 'roles', (select jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,
   'bypassRls',rolbypassrls,'login',rolcanlogin) order by rolname)
   from pg_roles where rolname in ('anon','authenticated','service_role'))
) as snapshot;
