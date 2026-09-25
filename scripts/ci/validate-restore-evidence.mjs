#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const fileArg = process.argv.indexOf('--file')
const requiredAssets = ['postgres', 'storage', 'n8n', 'configuration']
const requiredChecks = ['authBootstrap', 'tenantIsolation', 'migrationForward', 'criticalSmoke']
const forbiddenKey = /(?:secret|password|credential|authorization|cookie|private.?key|access.?token|refresh.?token)/i
const allowedRootKeys = new Set([
  'version', 'exerciseId', 'environment', 'dataClassification', 'startedAt', 'completedAt',
  'sourceSnapshotAt', 'targetRpoMinutes', 'targetRtoMinutes', 'reportedRpoMinutes',
  'reportedRtoMinutes', 'integrationsDisabled', 'secretsRestored', 'assets', 'checks',
  'operatorRole', 'reviewerRole', 'result', 'evidenceRefs',
])

function collectFiles() {
  if (fileArg >= 0) {
    if (!process.argv[fileArg + 1]) throw new Error('--file requires a path')
    return [resolve(root, process.argv[fileArg + 1])]
  }
  const dir = resolve(root, 'ops/restore-evidence')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => resolve(dir, name))
}

function walkKeys(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkKeys(item, `${path}[${index}]`, errors))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'secretsRestored' && forbiddenKey.test(key)) {
      errors.push(`${path}.${key}: secret-bearing fields are forbidden`)
    }
    walkKeys(child, `${path}.${key}`, errors)
  }
}

function utcMillis(value, field, errors) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    errors.push(`${field}: must be an explicit UTC ISO timestamp`)
    return Number.NaN
  }
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) errors.push(`${field}: invalid timestamp`)
  return parsed
}

function exactKeys(value, expected, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: must be an object`)
    return false
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) errors.push(`${path}.${key}: unknown field`)
  }
  for (const key of expected) {
    if (!(key in value)) errors.push(`${path}.${key}: required field missing`)
  }
  return true
}

function validate(file) {
  const errors = []
  let doc
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return [`${file}: invalid JSON or unreadable file`]
  }

  walkKeys(doc, '$', errors)
  exactKeys(doc, allowedRootKeys, '$', errors)
  if (doc.version !== 1) errors.push('version: must equal 1')
  if (typeof doc.exerciseId !== 'string' || !/^[a-z0-9][a-z0-9-]{5,79}$/.test(doc.exerciseId)) {
    errors.push('exerciseId: use a stable lowercase non-sensitive identifier')
  }
  if (!['restore-test', 'staging'].includes(doc.environment)) errors.push('environment: production is forbidden')
  if (!['synthetic', 'approved-anonymized'].includes(doc.dataClassification)) {
    errors.push('dataClassification: must be synthetic or approved-anonymized')
  }
  if (doc.integrationsDisabled !== true) errors.push('integrationsDisabled: must be true')
  if (doc.secretsRestored !== false) errors.push('secretsRestored: must be false')
  if (doc.result !== 'passed') errors.push('result: only a passed exercise is release evidence')

  const started = utcMillis(doc.startedAt, 'startedAt', errors)
  const completed = utcMillis(doc.completedAt, 'completedAt', errors)
  const snapshot = utcMillis(doc.sourceSnapshotAt, 'sourceSnapshotAt', errors)
  if (Number.isFinite(started) && Number.isFinite(completed) && completed < started) {
    errors.push('completedAt: must not precede startedAt')
  }
  if (Number.isFinite(snapshot) && Number.isFinite(started) && snapshot > started) {
    errors.push('sourceSnapshotAt: must not be after restore start')
  }

  const computedRpo = Math.ceil((started - snapshot) / 60000)
  const computedRto = Math.ceil((completed - started) / 60000)
  for (const field of ['targetRpoMinutes', 'targetRtoMinutes', 'reportedRpoMinutes', 'reportedRtoMinutes']) {
    if (!Number.isInteger(doc[field]) || doc[field] < 0) errors.push(`${field}: must be a non-negative integer`)
  }
  if (Number.isFinite(computedRpo) && doc.reportedRpoMinutes !== computedRpo) {
    errors.push(`reportedRpoMinutes: expected ${computedRpo} from timestamps`)
  }
  if (Number.isFinite(computedRto) && doc.reportedRtoMinutes !== computedRto) {
    errors.push(`reportedRtoMinutes: expected ${computedRto} from timestamps`)
  }
  if (doc.reportedRpoMinutes > doc.targetRpoMinutes) errors.push('RPO target missed')
  if (doc.reportedRtoMinutes > doc.targetRtoMinutes) errors.push('RTO target missed')

  if (exactKeys(doc.assets, new Set(requiredAssets), 'assets', errors)) {
    for (const asset of requiredAssets) {
      const item = doc.assets[asset]
      const keys = new Set(['restored', 'verified', 'checksumVerified', 'evidenceId'])
      if (!exactKeys(item, keys, `assets.${asset}`, errors)) continue
      for (const field of ['restored', 'verified', 'checksumVerified']) {
        if (item[field] !== true) errors.push(`assets.${asset}.${field}: must be true`)
      }
      if (typeof item.evidenceId !== 'string' || !/^[a-z0-9][a-z0-9._/-]{2,100}$/.test(item.evidenceId) || item.evidenceId.includes('..')) {
        errors.push(`assets.${asset}.evidenceId: invalid safe reference`)
      }
    }
  }

  if (exactKeys(doc.checks, new Set(requiredChecks), 'checks', errors)) {
    for (const check of requiredChecks) {
      if (doc.checks[check] !== true) errors.push(`checks.${check}: must be true`)
    }
  }

  for (const field of ['operatorRole', 'reviewerRole']) {
    if (typeof doc[field] !== 'string' || !/^[a-z][a-z0-9_-]{2,40}$/.test(doc[field])) {
      errors.push(`${field}: use a role, not a person's identity`)
    }
  }
  if (doc.operatorRole === doc.reviewerRole) errors.push('operatorRole and reviewerRole must be separated')
  if (!Array.isArray(doc.evidenceRefs) || doc.evidenceRefs.length < 1 || doc.evidenceRefs.length > 20) {
    errors.push('evidenceRefs: require 1-20 safe references')
  } else {
    for (const ref of doc.evidenceRefs) {
      if (typeof ref !== 'string' || !/^[a-z0-9][a-z0-9._/-]{2,120}$/.test(ref) || ref.includes('..')) {
        errors.push('evidenceRefs: invalid safe reference')
      }
    }
  }

  return errors.map((error) => `${file}: ${error}`)
}

const files = collectFiles()
const errors = files.flatMap(validate)
if (errors.length) {
  console.error('Restore evidence validation failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

if (files.length === 0) console.log('No restore exercise evidence present; release claim remains unproven')
else console.log(`Restore evidence validation passed (${files.length} exercise(s))`)
