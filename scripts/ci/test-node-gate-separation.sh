#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
audit_job="$(sed -n '/^  dependency-audit:$/,/^  embedded-db:$/p' "$repo_root/.github/workflows/ci.yml")"
if ! grep -q 'run: bash scripts/ci/node-dependency-audit.sh' <<< "$audit_job" ||
   grep -Eq 'continue-on-error:|^    (if|needs):' <<< "$audit_job"; then
  echo 'FAIL dependency audit must be an independent mandatory CI job' >&2
  exit 1
fi
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT
mkdir -p "$test_root/bin" "$test_root/scripts/ci"
cat > "$test_root/package.json" <<'JSON'
{"scripts":{"lint":"synthetic","typecheck":"synthetic","test":"synthetic","build":"synthetic"}}
JSON
cat > "$test_root/scripts/ci/install-node.sh" <<'SH'
#!/usr/bin/env bash
exit "${FAKE_INSTALL_EXIT:-0}"
SH
cat > "$test_root/bin/npm" <<'SH'
#!/usr/bin/env bash
name="$(basename "$0")"
printf '%s %s\n' "$name" "$*" >> "$FAKE_LOG"
if [[ "$name $*" == "${FAKE_FAIL:-}" ]]; then exit 9; fi
SH
cp "$test_root/bin/npm" "$test_root/bin/pnpm"
cp "$test_root/bin/npm" "$test_root/bin/yarn"
chmod +x "$test_root/bin/"*
export PATH="$test_root/bin:$PATH" FAKE_LOG="$test_root/commands"
cd "$test_root"
checks=0

assert_run() {
  local script="$1" expected="$2" actual=0
  : > "$FAKE_LOG"
  bash "$repo_root/scripts/ci/$script" >/dev/null 2>&1 || actual=$?
  if [[ "$actual" -ne "$expected" ]]; then
    echo "FAIL $script: expected exit $expected, received $actual" >&2
    cat "$FAKE_LOG" >&2
    exit 1
  fi
  checks=$((checks + 1))
}
assert_log() {
  local expected="$1"
  if [[ "$(cat "$FAKE_LOG")" != "$expected" ]]; then
    echo "FAIL unexpected command sequence" >&2
    cat "$FAKE_LOG" >&2
    exit 1
  fi
  checks=$((checks + 1))
}

for manager in npm pnpm yarn; do
  rm -f package-lock.json pnpm-lock.yaml yarn.lock
  case "$manager" in
    npm) touch package-lock.json; audit='npm audit --audit-level=high'; prefix='npm run' ;;
    pnpm) touch pnpm-lock.yaml; audit='pnpm audit --audit-level high'; prefix='pnpm run' ;;
    yarn) touch yarn.lock; audit='yarn npm audit --severity high'; prefix='yarn' ;;
  esac
  expected_quality="$(printf '%s lint\n%s typecheck\n%s test\n%s build' "$prefix" "$prefix" "$prefix" "$prefix")"

  # A HIGH audit failure cannot disguise a successful functional result.
  export FAKE_FAIL="$audit"
  assert_run node-quality-gate.sh 0
  assert_log "$expected_quality"
  assert_run node-dependency-audit.sh 9
  assert_log "$audit"

  # Functional failure propagates and prevents later functional steps.
  export FAKE_FAIL="$prefix typecheck"
  assert_run node-quality-gate.sh 9
  assert_log "$(printf '%s lint\n%s typecheck' "$prefix" "$prefix")"
  # Audit has no dependency on the functional pipeline's result.
  assert_run node-dependency-audit.sh 0
  assert_log "$audit"

  export FAKE_FAIL='' FAKE_INSTALL_EXIT=17
  assert_run node-quality-gate.sh 17
  assert_log ''
  assert_run node-dependency-audit.sh 17
  assert_log ''
  unset FAKE_INSTALL_EXIT
done

echo "Node gate separation: $checks assertions PASS (synthetic commands; no dependency installation or live audit)."
