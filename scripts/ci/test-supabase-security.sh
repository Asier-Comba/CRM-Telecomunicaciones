#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

assert_fails() {
  if "$@" >/dev/null 2>&1; then
    echo "Expected command to fail: $*" >&2
    exit 1
  fi
}

make_case() {
  local name="$1"
  mkdir -p "$tmp_root/$name/supabase/migrations"
}

make_case safe
printf '%s\n' \
  '-- alter table public.accounts disable row level security; (commented negative control)' \
  'create table public.accounts (id uuid primary key, workspace_id uuid not null);' \
  'alter table public.accounts enable row level security;' \
  > "$tmp_root/safe/supabase/migrations/20260925000000_accounts.sql"
(
  cd "$tmp_root/safe"
  bash "$repo_root/scripts/ci/check-supabase-security.sh" >/dev/null
)

make_case disable_rls
printf '%s\n' 'alter table public.accounts disable row level security;' \
  > "$tmp_root/disable_rls/supabase/migrations/20260925000001_disable.sql"
(
  cd "$tmp_root/disable_rls"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case broad_grant
printf '%s\n' 'grant all privileges on table public.accounts to authenticated;' \
  > "$tmp_root/broad_grant/supabase/migrations/20260925000002_grant.sql"
(
  cd "$tmp_root/broad_grant"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case create_grant
printf '%s\n' 'grant create on schema public to anon;' \
  > "$tmp_root/create_grant/supabase/migrations/20260925000003_schema_grant.sql"
(
  cd "$tmp_root/create_grant"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case row_security_off
printf '%s\n' 'set row_security = off;' \
  > "$tmp_root/row_security_off/supabase/migrations/20260925000004_row_security.sql"
(
  cd "$tmp_root/row_security_off"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case no_force_rls
printf '%s\n' 'alter table public.accounts no force row level security;' \
  > "$tmp_root/no_force_rls/supabase/migrations/20260925000005_no_force.sql"
(
  cd "$tmp_root/no_force_rls"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case comment_obfuscation
printf '%s\n' 'alter table public.accounts disable /* unsafe */ row level security;' \
  > "$tmp_root/comment_obfuscation/supabase/migrations/20260925000006_obfuscated.sql"
(
  cd "$tmp_root/comment_obfuscation"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case unsafe_definer
printf '%s\n' \
  'create function public.lookup_account() returns uuid' \
  'language sql security definer as $$ select null::uuid $$;' \
  > "$tmp_root/unsafe_definer/supabase/migrations/20260925000007_definer.sql"
(
  cd "$tmp_root/unsafe_definer"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case safe_definer
printf '%s\n' \
  'create function public.lookup_account() returns uuid' \
  "language sql security definer set search_path = ''" \
  'as $$ select null::uuid $$;' \
  > "$tmp_root/safe_definer/supabase/migrations/20260925000008_definer.sql"
(
  cd "$tmp_root/safe_definer"
  bash "$repo_root/scripts/ci/check-supabase-security.sh" >/dev/null
)

make_case mixed_definers
printf '%s\n' \
  'create function public.unsafe_lookup() returns uuid' \
  'language sql security definer as $$ select null::uuid $$;' \
  'create function public.safe_lookup() returns uuid' \
  "language sql security definer set search_path = ''" \
  'as $$ select null::uuid $$;' \
  > "$tmp_root/mixed_definers/supabase/migrations/20260925000009_mixed.sql"
(
  cd "$tmp_root/mixed_definers"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case combined_schema_grant
printf '%s\n' 'grant usage, create on schema public to authenticated;' \
  > "$tmp_root/combined_schema_grant/supabase/migrations/20260925000010_schema_grant.sql"
(
  cd "$tmp_root/combined_schema_grant"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case unsafe_owner
printf '%s\n' 'alter table public.accounts owner to authenticated;' \
  > "$tmp_root/unsafe_owner/supabase/migrations/20260925000011_owner.sql"
(
  cd "$tmp_root/unsafe_owner"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case bypassrls
printf '%s\n' 'alter role authenticated bypassrls;' \
  > "$tmp_root/bypassrls/supabase/migrations/20260925000012_bypass.sql"
(
  cd "$tmp_root/bypassrls"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

make_case privileged_role_grant
printf '%s\n' 'grant service_role to authenticated;' \
  > "$tmp_root/privileged_role_grant/supabase/migrations/20260925000013_role.sql"
(
  cd "$tmp_root/privileged_role_grant"
  assert_fails bash "$repo_root/scripts/ci/check-supabase-security.sh"
)

echo "Supabase security guardrail tests passed"
