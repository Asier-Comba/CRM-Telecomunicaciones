#!/usr/bin/env bash
set -euo pipefail

# Runs only against the CI-created official PostgreSQL 16 service container. The backup is
# synthetic, unencrypted, transient and never uploaded or called production DR.
container="${TELECOM_NATIVE_TEST_CONTAINER:-}"
[[ "$container" =~ ^[0-9a-f]{12,64}$ ]] || {
  echo 'Missing disposable PostgreSQL service container ID' >&2
  exit 1
}
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
image="$(docker inspect --format='{{.Config.Image}}' "$container")"
node "$repo_root/scripts/security/native-postgres/expected-image.mjs" "$image"

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
run_fixture supabase/tests/product-customer-contact-commands.sql
run_fixture supabase/tests/product-work-commands.sql
run_fixture supabase/tests/billing-exact-issue.sql
run_fixture supabase/tests/billing-private-pdf-artifacts.sql
run_fixture supabase/tests/team-protected-management.sql
run_fixture supabase/tests/portfolio-human-commands.sql
run_fixture supabase/tests/portfolio-deadline-commands.sql
run_fixture supabase/tests/document-metadata-commands.sql
run_fixture supabase/tests/document-content-workflow.sql
run_fixture supabase/tests/importjob-product-management.sql
run_fixture supabase/tests/internal-inbox-domain.sql
run_fixture supabase/tests/personal-notifications.sql
run_fixture supabase/tests/registered-automations.sql
run_fixture supabase/tests/product-settings.sql
run_fixture supabase/tests/requested-sensitive-reveal.sql
run_fixture supabase/tests/immutable-commercial-catalog.sql
run_fixture supabase/tests/commercial-portability-workflow.sql
run_fixture supabase/tests/product-dashboard-search.sql
# Density is rolled back so existing recovery sentinels remain exact.
{
  printf "set app.environment = 'test';\n"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/seeds/synthetic_product_billing.sql"
  cat "$repo_root/supabase/tests/product-rich-density.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/product-service-case-workflow.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/commercial-sim-esim-history.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/telecom-customer360-report-reads.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/deterministic-telecom-attention.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/seeds/synthetic_product_billing.sql"
  cat "$repo_root/supabase/tests/currency-separated-billing-cohorts.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/full-customer360-work-collections.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/service-installation-addon-history.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/normalized-service-locations.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/bounded-commercial-equipment.sql"
  sed '/commit;[[:space:]]*$/Id' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/registered-external-identities.sql"
} | psql_native > "${RUNNER_TEMP:-$tmp_dir}/product-density-query-plans.jsonlog"
{
  printf "set app.environment = 'test';\n"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/telecom-commercial-collections.sql"
} | psql_native > /dev/null
{
  printf "set app.environment = 'test';\n"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/protected-telecom-identifiers.sql"
} | psql_native > /dev/null
run_fixture supabase/seeds/synthetic_portfolio.sql
run_fixture supabase/tests/assistant-durable-foundation.sql
run_fixture supabase/tests/assistant-conversations-v2.sql
run_fixture supabase/seeds/synthetic_durable.sql

# Pattern A: preserve ACLs with the same required logical roles in this disposable
# cluster. Never expose a restored DB before role/grant and actual-call checks.
snapshot() {
  docker exec -i -u postgres "$container" psql -X -qAt -v ON_ERROR_STOP=1 \
    -U postgres -d "$1" < "$repo_root/scripts/security/native-postgres/privilege-snapshot.sql" > "$2"
}
node --test "$repo_root/scripts/security/native-postgres/test-privilege-matrix.mjs"
manifest="$repo_root/scripts/security/native-postgres/function-privileges.json"
checker="$repo_root/scripts/security/native-postgres/check-privilege-matrix.mjs"
snapshot "$test_db" "$tmp_dir/fresh.json"
node "$checker" "$manifest" "$tmp_dir/fresh.json"
run_fixture scripts/security/native-postgres/reader-role-matrix.sql

docker exec -u postgres "$container" pg_dump -U postgres -Fc -d "$test_db" > "$tmp_dir/synthetic.dump"
[[ -s "$tmp_dir/synthetic.dump" ]] || {
  echo 'Native PostgreSQL produced an empty dump' >&2
  exit 1
}
dump_sha="$(sha256sum "$tmp_dir/synthetic.dump" | cut -d' ' -f1)"

# Negative control: old --no-acl restore must fail before it could be exposed.
unsafe_db=telecom_acl_negative_test
docker exec -u postgres "$container" createdb -U postgres "$unsafe_db"
docker exec -i -u postgres "$container" pg_restore -U postgres --exit-on-error \
  --no-owner --no-acl -d "$unsafe_db" < "$tmp_dir/synthetic.dump" > /dev/null
snapshot "$unsafe_db" "$tmp_dir/unsafe.json"
if node "$checker" "$manifest" "$tmp_dir/fresh.json" "$tmp_dir/unsafe.json"; then
  echo 'Restore gate failed to reject deliberately omitted ACLs' >&2
  exit 1
fi
# This executes the historical attack only inside an unexposed synthetic DB.
docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d "$unsafe_db" > /dev/null <<'SQL'
begin;
set local role anon;
do $$begin
 if public.telecom_v1_customer_get_row(
  'a1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001') is null then
   raise exception 'ACL-loss negative control did not reproduce';
 end if;
end$$;
rollback;
SQL

docker exec -u postgres "$container" createdb -U postgres "$restore_db"
docker exec -i -u postgres "$container" pg_restore -U postgres --exit-on-error \
  --no-owner -d "$restore_db" < "$tmp_dir/synthetic.dump" > /dev/null

snapshot "$restore_db" "$tmp_dir/restored.json"
# Metadata-only diagnosis supplements, never bypasses, exact restore equality.
node "$repo_root/scripts/security/native-postgres/diagnose-privilege-drift.mjs" "$tmp_dir/fresh.json" "$tmp_dir/restored.json"
node "$checker" "$manifest" "$tmp_dir/fresh.json" "$tmp_dir/restored.json"
docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d "$restore_db" < "$repo_root/scripts/security/native-postgres/reader-role-matrix.sql" > /dev/null

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

migration_head="$(basename "${migration}")"
{
  printf "set app.environment = 'test';\n"
  cat "$repo_root/supabase/tests/product-customer-contact-commands.sql"
} | docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$restore_db" > /dev/null

{
  printf "set app.environment = 'test';\n"
  cat "$repo_root/supabase/tests/product-work-commands.sql"
  cat "$repo_root/supabase/tests/billing-exact-issue.sql"
  cat "$repo_root/supabase/tests/billing-private-pdf-artifacts.sql"
  cat "$repo_root/supabase/tests/team-protected-management.sql"
  cat "$repo_root/supabase/tests/portfolio-human-commands.sql"
  cat "$repo_root/supabase/tests/portfolio-deadline-commands.sql"
  cat "$repo_root/supabase/tests/document-metadata-commands.sql"
  cat "$repo_root/supabase/tests/document-content-workflow.sql"
  cat "$repo_root/supabase/tests/importjob-product-management.sql"
  cat "$repo_root/supabase/tests/internal-inbox-domain.sql"
  cat "$repo_root/supabase/tests/personal-notifications.sql"
  cat "$repo_root/supabase/tests/registered-automations.sql"
  cat "$repo_root/supabase/tests/product-settings.sql"
  cat "$repo_root/supabase/tests/requested-sensitive-reveal.sql"
  cat "$repo_root/supabase/tests/immutable-commercial-catalog.sql"
  cat "$repo_root/supabase/tests/commercial-portability-workflow.sql"
  cat "$repo_root/supabase/tests/team-expiry-manual-origin.sql"
  cat "$repo_root/supabase/tests/document-integrity-cleanup.sql"
  cat "$repo_root/supabase/tests/product-dashboard-search.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/seeds/synthetic_product_billing.sql"
  cat "$repo_root/supabase/tests/product-rich-density.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/product-service-case-workflow.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/commercial-sim-esim-history.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/telecom-customer360-report-reads.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/deterministic-telecom-attention.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/seeds/synthetic_product_billing.sql"
  cat "$repo_root/supabase/tests/currency-separated-billing-cohorts.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/full-customer360-work-collections.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/service-installation-addon-history.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/normalized-service-locations.sql"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/bounded-commercial-equipment.sql"
  sed '/commit;[[:space:]]*$/Id' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/registered-external-identities.sql"
} | docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$restore_db" > /dev/null

{
  printf "set app.environment = 'test';\n"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/telecom-commercial-collections.sql"
} | docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$restore_db" > /dev/null
{
  printf "set app.environment = 'test';\n"
  sed '$d' "$repo_root/supabase/seeds/synthetic_product.sql"
  cat "$repo_root/supabase/tests/protected-telecom-identifiers.sql"
} | docker exec -i -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$restore_db" > /dev/null

node scripts/security/native-postgres/product-command-races.mjs
node scripts/security/native-postgres/service-commercial-races.mjs

printf '{"kind":"native_postgresql_restore_test_only","migration_count":%d,"migration_head":"%s","dump_sha256":"%s","schema":"pass","rows":"pass","assistant_rows":"pass","rls":"pass","scope":"pass","restored_privilege_matrix":"pass","fresh_role_calls":"pass","restored_role_calls":"pass","acl_loss_negative_control":"pass","production_backup":false}\n' \
  "$migration_count" "$migration_head" "$dump_sha"
