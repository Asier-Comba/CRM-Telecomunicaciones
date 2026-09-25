#!/usr/bin/env bash
set -euo pipefail

case "${PLAYWRIGHT_TARGET:-}" in
  local|staging) ;;
  *)
    echo "::error::Critical E2E may target only local or staging"
    exit 1
    ;;
esac

[[ "${ALLOW_PRODUCTION_TESTS:-false}" == "false" ]] || {
  echo "::error::Production E2E override is forbidden in CI"
  exit 1
}

node -e 'const p=require("./package.json"); if (!p.scripts?.["test:e2e:critical"]) process.exit(1)' || {
  echo "::error::Playwright configuration requires a test:e2e:critical script"
  exit 1
}

if [[ -f package-lock.json ]]; then
  npm run test:e2e:critical
elif [[ -f pnpm-lock.yaml ]]; then
  pnpm run test:e2e:critical
else
  yarn test:e2e:critical
fi
