#!/usr/bin/env node

import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = resolve('scripts/ci/check-observability.mjs')
const policy = resolve('.security/observability-policy.json')
const roots = []

function fixture(files, mutatePolicy) {
  const root = mkdtempSync(resolve(tmpdir(), 'w4-observability-'))
  roots.push(root)
  mkdirSync(resolve(root, '.security'), { recursive: true })
  cpSync(policy, resolve(root, '.security/observability-policy.json'))
  if (mutatePolicy) {
    const value = JSON.parse(readFileSync(resolve(root, '.security/observability-policy.json'), 'utf8'))
    mutatePolicy(value)
    writeFileSync(resolve(root, '.security/observability-policy.json'), JSON.stringify(value))
  }
  for (const [path, contents] of Object.entries(files)) {
    const target = resolve(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contents)
  }
  return root
}

function run(root) {
  return spawnSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' })
}

try {
  let root = fixture({
    'src/server/audit.ts': "logger.info({ event: 'auth.denied', correlation_id, workspace_id, outcome: 'denied' })",
  })
  assert.equal(run(root).status, 0, 'bounded identifiers and stable event metadata must pass')

  root = fixture({ 'src/server/bad.ts': 'console.error(process.env)' })
  assert.notEqual(run(root).status, 0, 'logging the environment must fail')

  root = fixture({ 'app/api/bad/route.ts': 'logger.info({ authorization: request.headers.get("authorization") })' })
  assert.notEqual(run(root).status, 0, 'logging authorization headers must fail')

  root = fixture({ 'src/jobs/import.ts': 'logger.debug({ importRows })' })
  assert.notEqual(run(root).status, 0, 'logging imported rows must fail')

  root = fixture({ 'src/ai/run.ts': 'logger.info({ modelOutput })' })
  assert.notEqual(run(root).status, 0, 'logging model output must fail')

  root = fixture({ 'src/server/bad.ts': 'logger.info(JSON.stringify(payload))' })
  assert.notEqual(run(root).status, 0, 'logging an unbounded payload must fail')

  root = fixture({ 'src/server/bad.ts': "console.log('[request]', request)" })
  assert.notEqual(run(root).status, 0, 'logging a raw request object must fail')

  root = fixture({}, (value) => value.forbiddenFields.splice(value.forbiddenFields.indexOf('secret'), 1))
  assert.notEqual(run(root).status, 0, 'weakening the forbidden-field contract must fail')

  root = fixture({ 'tests/fixture.ts': 'console.error(process.env)' })
  assert.equal(run(root).status, 0, 'test fixtures are not treated as production telemetry')

  console.log('Observability negative-control tests passed')
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
}
