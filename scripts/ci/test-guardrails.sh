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

echo "Guardrail self-tests passed"
