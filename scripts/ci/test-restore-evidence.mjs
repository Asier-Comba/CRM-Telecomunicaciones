#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const validator = resolve('scripts/ci/validate-restore-evidence.mjs')
const roots = []

function valid(overrides = {}) {
  const base = {
    version: 1,
    exerciseId: 'restore-2026q3-001',
    environment: 'restore-test',
    dataClassification: 'synthetic',
    startedAt: '2026-09-25T10:00:00Z',
    completedAt: '2026-09-25T11:30:00Z',
    sourceSnapshotAt: '2026-09-25T09:00:00Z',
    targetRpoMinutes: 1440,
    targetRtoMinutes: 480,
    reportedRpoMinutes: 60,
    reportedRtoMinutes: 90,
    integrationsDisabled: true,
    secretsRestored: false,
    assets: Object.fromEntries(['postgres', 'storage', 'n8n', 'configuration'].map((name) => [name, {
      restored: true,
      verified: true,
      checksumVerified: true,
      evidenceId: `restore/${name}-check`,
    }])),
    checks: { authBootstrap: true, tenantIsolation: true, migrationForward: true, criticalSmoke: true },
    backupControls: { encrypted: true, separateFailureDomain: true, retentionVerified: true, accessReviewCurrent: true },
    restoreControls: { productionTargetDenied: true, disposableTarget: true, outboundNetworkDenied: true, destructiveCommandsScoped: true },
    operatorRole: 'platform_operator',
    reviewerRole: 'security_reviewer',
    result: 'passed',
    evidenceRefs: ['restore/run-log', 'restore/tenant-test'],
  }
  return { ...base, ...overrides }
}

function run(doc) {
  const root = mkdtempSync(resolve(tmpdir(), 'w4-restore-evidence-'))
  roots.push(root)
  const file = resolve(root, 'evidence.json')
  writeFileSync(file, JSON.stringify(doc))
  return spawnSync(process.execPath, [validator, '--file', file], { encoding: 'utf8' })
}

try {
  assert.equal(run(valid()).status, 0, 'complete non-production restore evidence must pass')
  assert.notEqual(run(valid({ environment: 'production' })).status, 0, 'production restore tests must fail')
  assert.notEqual(run(valid({ integrationsDisabled: false })).status, 0, 'live integrations must fail')
  assert.notEqual(run(valid({ reportedRtoMinutes: 89 })).status, 0, 'invented RTO must fail')
  assert.notEqual(run(valid({ startedAt: '2026-02-30T10:00:00Z' })).status, 0, 'impossible date must fail')
  assert.notEqual(run(valid({ targetRtoMinutes: 60 })).status, 0, 'missed RTO target must fail')
  assert.notEqual(run(valid({ checks: { ...valid().checks, tenantIsolation: false } })).status, 0, 'failed tenant attack must fail')
  assert.notEqual(run(valid({ assets: { ...valid().assets, storage: { ...valid().assets.storage, verified: false } } })).status, 0, 'unverified asset must fail')
  assert.notEqual(run(valid({ backupControls: { ...valid().backupControls, encrypted: false } })).status, 0, 'unencrypted backup evidence must fail')
  assert.notEqual(run(valid({ restoreControls: { ...valid().restoreControls, productionTargetDenied: false } })).status, 0, 'production-capable restore target must fail')
  assert.notEqual(run({ ...valid(), databasePassword: 'forbidden-even-in-test' }).status, 0, 'secret-bearing fields must fail')
  console.log('Restore evidence negative-control tests passed')
} finally {
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
}
