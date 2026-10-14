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

(
  cd "$tmp_root"
  touch package.json package-lock.json pnpm-lock.yaml
  assert_fails bash "$repo_root/scripts/ci/detect-project.sh"
)

(
  cd "$tmp_root"
  rm -f package.json package-lock.json pnpm-lock.yaml
  project_output="$tmp_root/github-output"
  GITHUB_OUTPUT="$project_output" bash "$repo_root/scripts/ci/detect-project.sh"
  grep -q '^node_project=false$' "$project_output"
  grep -q '^playwright=false$' "$project_output"
)

assert_fails env PLAYWRIGHT_TARGET=production ALLOW_PRODUCTION_TESTS=false \
  bash "$repo_root/scripts/ci/run-critical-e2e.sh"

if grep -E '^[[:space:]]*uses:[[:space:]]+[^@[:space:]]+@(main|master|v?[0-9]+([.][0-9]+){0,2})([[:space:]]|$)' \
  "$repo_root"/.github/workflows/*.yml; then
  echo "GitHub Actions must be pinned to immutable commit SHAs" >&2
  exit 1
fi

while IFS= read -r action_ref; do
  action_version="${action_ref##*@}"
  action_version="${action_version%% *}"
  if [[ ! "$action_version" =~ ^[0-9a-f]{40}$ ]]; then
    echo "GitHub Action is not pinned to a full commit SHA: $action_ref" >&2
    exit 1
  fi
done < <(grep -hE '^[[:space:]]*uses:[[:space:]]+' "$repo_root"/.github/workflows/*.yml | sed -E 's/^[[:space:]]*uses:[[:space:]]+//')

node "$repo_root/scripts/ci/check-checkout-credentials.mjs" "$repo_root/.github/workflows"

if grep -q 'DEPENDENCY_REVIEW_ENABLED !=' "$repo_root/.github/workflows/ci.yml"; then
  echo "Disabled Dependency Review must not report a misleading successful job" >&2
  exit 1
fi

grep -q "github.event_name == 'pull_request' && vars.DEPENDENCY_REVIEW_ENABLED == 'true'" \
  "$repo_root/.github/workflows/ci.yml" || {
    echo "Dependency Review must execute only when repository support is enabled" >&2
    exit 1
  }

echo "Guardrail self-tests passed"
