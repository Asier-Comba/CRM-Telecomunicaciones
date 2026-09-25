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
  bash "$repo_root/scripts/ci/detect-project.sh" | grep -q 'node_project=false'
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

checkout_count="$(grep -hEc '^[[:space:]]*uses:[[:space:]]+actions/checkout@' "$repo_root"/.github/workflows/*.yml)"
credential_guard_count="$(grep -hEc '^[[:space:]]+persist-credentials:[[:space:]]+false([[:space:]]|$)' "$repo_root"/.github/workflows/*.yml)"
if [[ "$checkout_count" -ne "$credential_guard_count" ]]; then
  echo "Every checkout step must disable persisted GitHub credentials" >&2
  exit 1
fi

echo "Guardrail self-tests passed"
