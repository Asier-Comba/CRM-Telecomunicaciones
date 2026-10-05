#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const validator = resolve('scripts/ci/validate-staging-evidence.mjs')
const roots = []
const resources = Object.fromEntries(['supabase', 'storage', 'n8n', 'oauth'].map((name) => [name, {
  stagingRef: `staging/${name}`,
  separateFromProduction: true,
}]))

function valid(overrides = {}) {
  return {
    version: 1,
    candidateSha: 'a'.repeat(40),
    artifactDigest: `sha256:${'b'.repeat(64)}`,
    environment: 'staging',
    dataClassification: 'synthetic',
    startedAt: '2026-09-26T10:00:00Z',
    completedAt: '2026-09-26T10:30:00Z',
    resources,
    secretBoundary: { managedStore: true, sharedWithProduction: false, plaintextInEvidence: false, leastPrivilegeReviewed: true },
    guards: { productionWriteDenied: true, destructiveTestsRestricted: true, qaSeedTargetVerified: true, assistantMutationTargetVerified: true },
    checks: { migrationFromZero: true, auth: true, tenantIsolation: true, storageIsolation: true, webhookSignature: true, assistantRead: true, assistantSafeMutation: true, loggingRedaction: true, rollbackReady: true },
    reviewerRole: 'security_reviewer',
    result: 'passed',
    evidenceRefs: ['staging/run-001'],
    ...overrides,
  }
}

function run(doc) {
  const dir = mkdtempSync(resolve(tmpdir(), 'w4-staging-evidence-'))
  roots.push(dir)
  const file = resolve(dir, 'evidence.json')
  writeFileSync(file, JSON.stringify(doc))
  return spawnSync(process.execPath, [validator, '--file', file], { encoding: 'utf8' })
}

try {
  assert.equal(run(valid()).status, 0)
  assert.notEqual(run(valid({ environment: 'production' })).status, 0)
  assert.notEqual(run(valid({ dataClassification: 'customer-data' })).status, 0)
  assert.notEqual(run(valid({ secretBoundary: { ...valid().secretBoundary, sharedWithProduction: true } })).status, 0)
  assert.notEqual(run(valid({ guards: { ...valid().guards, productionWriteDenied: false } })).status, 0)
  assert.notEqual(run(valid({ checks: { ...valid().checks, tenantIsolation: false } })).status, 0)
  assert.notEqual(run(valid({ startedAt: '2026-02-30T10:00:00Z' })).status, 0)
  assert.notEqual(run(valid({ resources: { ...resources, storage: resources.supabase } })).status, 0)
  assert.notEqual(run({ ...valid(), databasePassword: 'forbidden' }).status, 0)
  console.log('Staging evidence negative-control tests passed')
} finally {
  roots.forEach((dir) => rmSync(dir, { recursive: true, force: true }))
}
