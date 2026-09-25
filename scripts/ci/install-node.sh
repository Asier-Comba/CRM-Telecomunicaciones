#!/usr/bin/env bash
set -euo pipefail

if [[ -f package-lock.json ]]; then
  npm ci
elif [[ -f pnpm-lock.yaml ]]; then
  corepack enable
  pnpm install --frozen-lockfile
elif [[ -f yarn.lock ]]; then
  corepack enable
  yarn install --immutable
else
  echo "No supported lockfile found" >&2
  exit 1
fi
