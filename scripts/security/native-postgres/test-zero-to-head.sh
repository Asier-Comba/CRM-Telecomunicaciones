#!/usr/bin/env bash
set -euo pipefail

# Runs only against the CI-created postgres:16 service container. The backup is
# synthetic, unencrypted, transient and never uploaded or called production DR.
container="${TELECOM_NATIVE_TEST_CONTAINER:-}"
[[ "$container" =~ ^[0-9a-f]{12,64}$ ]] || {
  echo 'Missing disposable PostgreSQL service container ID' >&2
  exit 1
}
image="$(docker inspect --format='{{.Config.Image}}' "$container")"
[[ "$image" == postgres:16* ]] || {
  echo 'Refusing an unexpected PostgreSQL container image' >&2
  exit 1
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
test_db=telecom_test
restore_db=telecom_restore_test
tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "$tmp_dir"' EXIT

psql_native() {
  docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$test_db"
}

docker exec -u postgres "$container" createdb -U postgres "$test_db"
psql_native < "$repo_root/scripts/security/native-postgres/bootstrap.sql"
psql_native < "$repo_root/scripts/security/ephemeral-postgres/storage-stub.sql"

migration_count=0
for migration in "$repo_root"/supabase/migrations/*.sql; do
  psql_native < "$migration" > /dev/null
  migration_count=$((migration_count + 1))
done

run_fixture() {
  local fixture="$1"
  {
    printf "set app.environment = 'test';\n"
    cat "$repo_root/$fixture"
  } | psql_native > /dev/null
}

run_fixture supabase/tests/telecom-domain-rls.sql
run_fixture supabase/tests/telecom-server-read-rpc.sql
run_fixture supabase/seeds/synthetic_portfolio.sql
run_fixture supabase/tests/assistant-durable-foundation.sql
run_fixture supabase/seeds/synthetic_durable.sql

docker exec -u postgres "$container" pg_dump -U postgres -Fc -d "$test_db" > "$tmp_dir/synthetic.dump"
[[ -s "$tmp_dir/synthetic.dump" ]] || {
  echo 'Native PostgreSQL produced an empty dump' >&2
  exit 1
}
dump_sha="$(sha256sum "$tmp_dir/synthetic.dump" | cut -d' ' -f1)"

docker exec -u postgres "$container" createdb -U postgres "$restore_db"
docker exec -i -u postgres "$container" pg_restore -U postgres --exit-on-error \
  --no-owner --no-acl -d "$restore_db" < "$tmp_dir/synthetic.dump" > /dev/null

docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d "$restore_db" > /dev/null <<'SQL'
do $$
begin
  if (select count(*) from public.customers) <> 2
    or (select count(*) from public.assistant_operations) <> 1
    or (select count(*) from public.assistant_effect_outbox) <> 1
    or (select count(*) from storage.buckets where public) <> 0
    or not exists (
      select 1 from pg_class where oid='public.assistant_operations'::regclass
        and relrowsecurity and relforcerowsecurity
    ) then
    raise exception 'native restore rows/schema/RLS mismatch';
  end if;
  if has_table_privilege('authenticated','public.assistant_operations','SELECT') then
    raise exception 'assistant raw table became readable';
  end if;
  perform public.telecom_v1_customer_get_row(
    'a1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001',
    'd4000000-0000-4000-8000-000000000001');
  if public.telecom_v1_customer_get_row(
    'a1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001',
    'd4000000-0000-4000-8000-000000000002') is not null then
    raise exception 'restored cross-workspace read leaked';
  end if;
end;
$$;
SQL

printf '{"kind":"native_postgresql_restore_test_only","migration_count":%d,"dump_sha256":"%s","schema":"pass","rows":"pass","assistant_rows":"pass","rls":"pass","scope":"pass","production_backup":false}\n' \
  "$migration_count" "$dump_sha"
