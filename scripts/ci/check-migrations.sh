#!/usr/bin/env bash
set -euo pipefail

migration_dir="supabase/migrations"
[[ -d "$migration_dir" ]] || exit 0

invalid=0
while IFS= read -r -d '' migration; do
  name="${migration##*/}"
  if [[ ! "$name" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
    echo "::error file=$migration::Migration names must be YYYYMMDDHHMMSS_snake_case.sql"
    invalid=1
  fi
done < <(find "$migration_dir" -maxdepth 1 -type f -name '*.sql' -print0)

if [[ -n "${BASE_SHA:-}" ]] && git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  while IFS=$'\t' read -r status path; do
    [[ -z "${path:-}" ]] && continue
    case "$status" in
      M|D|R*|C*)
        echo "::error file=$path::Committed migrations are immutable; add a new migration"
        invalid=1
        ;;
    esac
  done < <(git diff --name-status --diff-filter=MDRC "$BASE_SHA"...HEAD -- "$migration_dir/*.sql")
fi

exit "$invalid"
