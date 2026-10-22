#!/usr/bin/env bash
set -euo pipefail

bash scripts/ci/install-node.sh

if [[ -f package-lock.json ]]; then
  npm audit --audit-level=high
elif [[ -f pnpm-lock.yaml ]]; then
  pnpm audit --audit-level high
else
  yarn npm audit --severity high
fi
