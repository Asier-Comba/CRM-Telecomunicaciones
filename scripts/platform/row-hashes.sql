-- Read-only row fingerprints; results stay private inside the disposable runner.
-- Canonical sorted text preserves every public row and local Auth user/identity.
select jsonb_object_agg(name,digest) from (
 select n.nspname||'.'||c.relname name,
  (xpath('/row/h/text()',query_to_xml(
    format('select encode(sha256(convert_to(coalesce(string_agg(t::text,chr(10) order by t::text),''''),''UTF8'')),''hex'') h from %I.%I t',n.nspname,c.relname),
    false,true,'')))[1]::text digest
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where (n.nspname='public' or n.nspname='auth' and c.relname in ('users','identities')) and c.relkind='r'
) x;
