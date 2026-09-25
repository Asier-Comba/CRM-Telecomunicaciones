#!/usr/bin/env bash
set -euo pipefail

bash scripts/ci/install-node.sh

required_scripts=(lint typecheck test build)
for script_name in "${required_scripts[@]}"; do
  node -e 'const p=require("./package.json"); if (!p.scripts?.[process.argv[1]]) process.exit(1)' "$script_name" || {
    echo "::error::package.json must define the '$script_name' script"
    exit 1
  }
done

if [[ -f package-lock.json ]]; then
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  npm audit --audit-level=high
elif [[ -f pnpm-lock.yaml ]]; then
  pnpm run lint
  pnpm run typecheck
  pnpm run test
  pnpm run build
  pnpm audit --audit-level high
else
  yarn lint
  yarn typecheck
  yarn test
  yarn build
  yarn npm audit --severity high
fi
