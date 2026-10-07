-- Metadata only. No business data, signing keys or Auth credentials.
select jsonb_build_object(
 'migrations',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname) from pg_extension),
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'settings',p.proconfig,'definition',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),
 'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit,'mimes',allowed_mime_types) order by id) from storage.buckets),
 'tables',(select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),'columns',(select jsonb_agg(jsonb_build_object('name',attname,'type',format_type(atttypid,atttypmod),'not_null',attnotnull) order by attnum) from pg_attribute where attrelid=c.oid and attnum>0 and not attisdropped)) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v'))
);
