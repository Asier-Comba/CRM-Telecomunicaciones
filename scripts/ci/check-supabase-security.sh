#!/usr/bin/env bash
set -euo pipefail

migration_dir="${SUPABASE_MIGRATIONS_DIR:-supabase/migrations}"

if [[ "$migration_dir" = /* || "$migration_dir" == *".."* ]]; then
  echo "::error::SUPABASE_MIGRATIONS_DIR must stay inside the repository"
  exit 1
fi

if [[ ! -d "$migration_dir" ]]; then
  echo "No Supabase migrations found; static security scan skipped"
  exit 0
fi

mapfile -d '' migrations < <(find "$migration_dir" -type f -name '*.sql' -print0 | sort -z)
if [[ "${#migrations[@]}" -eq 0 ]]; then
  echo "No Supabase SQL migrations found; static security scan skipped"
  exit 0
fi

failed=false

report() {
  local file="$1"
  local rule="$2"
  echo "::error file=$file::$rule"
  failed=true
}

for file in "${migrations[@]}"; do
  normalized="$(perl -0777 -pe 's{--[^\n]*}{}g; s{/\*.*?\*/}{}gs; s{\s+}{ }g' "$file")"

  if printf '%s' "$normalized" | grep -Eqi 'alter[[:space:]]+table[^;]*disable[[:space:]]+row[[:space:]]+level[[:space:]]+security'; then
    report "$file" "Disabling row-level security is forbidden"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'alter[[:space:]]+table[^;]*no[[:space:]]+force[[:space:]]+row[[:space:]]+level[[:space:]]+security'; then
    report "$file" "Removing FORCE row-level security is forbidden"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'set[[:space:]]+row_security[[:space:]]*=[[:space:]]*off'; then
    report "$file" "SET row_security = off is forbidden"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'grant[[:space:]]+all([[:space:]]+privileges)?[[:space:]]+on[^;]*[[:space:]]+to[[:space:]]+(public|anon|authenticated)([^a-z_]|$)'; then
    report "$file" "GRANT ALL to public, anon or authenticated is forbidden"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'grant[^;]*create[^;]*on[[:space:]]+schema[[:space:]]+public[[:space:]]+to[[:space:]]+(public|anon|authenticated)([^a-z_]|$)'; then
    report "$file" "CREATE on schema public must not be granted to public, anon or authenticated"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'alter[[:space:]]+(table|view|sequence|function|procedure)[^;]*owner[[:space:]]+to[[:space:]]+(public|anon|authenticated)([^a-z_]|$)'; then
    report "$file" "Database objects must not be owned by public, anon or authenticated"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'alter[[:space:]]+role[[:space:]]+(anon|authenticated)[^;]*bypassrls'; then
    report "$file" "Client roles must never receive BYPASSRLS"
  fi

  if printf '%s' "$normalized" | grep -Eqi 'grant[[:space:]]+(service_role|supabase_admin|postgres)[[:space:]]+to[[:space:]]+(anon|authenticated)([^a-z_]|$)'; then
    report "$file" "Privileged roles must not be granted to client roles"
  fi

  unsafe_definers="$(printf '%s' "$normalized" | perl -0777 -ne '
    while (/create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([^\s(]+).*?(?=create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+|\z)/sig) {
      my $name = $1;
      my $definition = $&;
      if ($definition =~ /security\s+definer/i && $definition !~ /set\s+search_path\s*(?:=|to)\s*\x27\x27/i) {
        print "$name\n";
      }
    }
  ')"
  if [[ -n "$unsafe_definers" ]]; then
    while IFS= read -r function_name; do
      report "$file" "SECURITY DEFINER ${function_name} requires SET search_path = ''"
    done <<< "$unsafe_definers"
  fi
done

if [[ "$failed" == "true" ]]; then
  exit 1
fi

echo "Supabase migration security scan passed (${#migrations[@]} files)"
