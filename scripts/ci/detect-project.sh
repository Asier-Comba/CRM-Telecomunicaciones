#!/usr/bin/env bash
set -euo pipefail

node_project=false
playwright=false

if [[ -f package.json ]]; then
  node_project=true
  [[ -f .nvmrc ]] || {
    echo "::error::A Node project must pin its runtime in .nvmrc"
    exit 1
  }

  lock_count=0
  for lock in package-lock.json pnpm-lock.yaml yarn.lock; do
    [[ -f "$lock" ]] && lock_count=$((lock_count + 1))
  done
  [[ "$lock_count" -eq 1 ]] || {
    echo "::error::A Node project must commit exactly one supported lockfile"
    exit 1
  }

  if compgen -G 'playwright.config.*' >/dev/null; then
    playwright=true
  fi
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "node_project=$node_project"
    echo "playwright=$playwright"
  } >> "$GITHUB_OUTPUT"
else
  echo "node_project=$node_project"
  echo "playwright=$playwright"
fi
