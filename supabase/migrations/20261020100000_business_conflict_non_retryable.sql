-- P1 (issue 67, hosted acceptance 2026-10-19): business conflicts raised with
-- SQLSTATE 40001 are treated as transient by the hosted API gateway, so the
-- HTTP call never answers. Every product RPC that reports a deterministic
-- conflict (changed intent, stale version, claimed resource) now raises PT409,
-- answered once as HTTP 409. Services map both PT409 and 40001 to `conflict`.
--
-- Only function bodies change: CREATE OR REPLACE keeps owner, ACL, SECURITY
-- DEFINER and search_path; the guard fails the migration if any business
-- 40001 remains or if a rewritten function's privileges/settings changed.
begin;

create temporary table w5_conflict_fingerprint on commit drop as
select p.oid, p.proacl::text as acl, p.prosecdef, p.proconfig::text as config, p.proowner
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc like '%40001%';

do $$
declare
  r record;
  def text;
begin
  for r in select oid from w5_conflict_fingerprint loop
    def := pg_get_functiondef(r.oid);
    def := replace(def, 'errcode=''40001''', 'errcode=''PT409''');
    def := replace(def, 'errcode = ''40001''', 'errcode = ''PT409''');
    -- Handlers that classify an inner command failure keep their meaning.
    def := replace(def, 'when ''40001''', 'when ''PT409''');
    execute def;
  end loop;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.prosrc like '%errcode=''40001''%' or p.prosrc like '%errcode = ''40001''%'
           or p.prosrc like '%when ''40001''%')
  ) then
    raise exception using errcode = '42P17', message = 'business 40001 still raised';
  end if;

  if exists (
    select 1 from w5_conflict_fingerprint f join pg_proc p on p.oid = f.oid
    where p.proacl::text is distinct from f.acl or p.prosecdef <> f.prosecdef
       or p.proconfig::text is distinct from f.config or p.proowner <> f.proowner
  ) then
    raise exception using errcode = '42P17', message = 'function privileges changed';
  end if;
end;
$$;

commit;
