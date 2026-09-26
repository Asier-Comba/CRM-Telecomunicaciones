#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const fileIndex = process.argv.indexOf('--file')
const forbiddenKey = /(?:password|credential|authorization|cookie|private.?key|access.?token|refresh.?token)/i
const requiredResources = ['supabase', 'storage', 'n8n', 'oauth']
const requiredGuards = [
  'productionWriteDenied',
  'destructiveTestsRestricted',
  'qaSeedTargetVerified',
  'assistantMutationTargetVerified',
]
const requiredChecks = [
  'migrationFromZero', 'auth', 'tenantIsolation', 'storageIsolation',
  'webhookSignature', 'assistantRead', 'assistantSafeMutation',
  'loggingRedaction', 'rollbackReady',
]
const rootKeys = new Set([
  'version', 'candidateSha', 'artifactDigest', 'environment', 'dataClassification',
  'startedAt', 'completedAt', 'resources', 'secretBoundary', 'guards', 'checks',
  'reviewerRole', 'result', 'evidenceRefs',
])

function files() {
  if (fileIndex >= 0) {
    if (!process.argv[fileIndex + 1]) throw new Error('--file requires a path')
    return [resolve(root, process.argv[fileIndex + 1])]
  }
  const dir = resolve(root, 'ops/staging-evidence')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    .map((name) => resolve(dir, name))
}

function exactObject(value, keys, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: must be an object`)
    return false
  }
  for (const key of Object.keys(value)) if (!keys.has(key)) errors.push(`${path}.${key}: unknown field`)
  for (const key of keys) if (!(key in value)) errors.push(`${path}.${key}: required field missing`)
  return true
}

function walk(value, path, errors) {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${path}[${index}]`, errors))
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) errors.push(`${path}.${key}: secret-bearing fields are forbidden`)
    walk(child, `${path}.${key}`, errors)
  }
}

function timestamp(value, field, errors) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    errors.push(`${field}: explicit UTC seconds required`)
    return Number.NaN
  }
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value.replace('Z', '.000Z')) {
    errors.push(`${field}: invalid calendar timestamp`)
  }
  return parsed
}

function safeRef(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._/-]{2,100}$/.test(value) && !value.includes('..')
}

function validate(path) {
  const errors = []
  let doc
  try { doc = JSON.parse(readFileSync(path, 'utf8')) } catch { return [`${path}: invalid JSON`] }
  walk(doc, '$', errors)
  exactObject(doc, rootKeys, '$', errors)
  if (doc.version !== 1) errors.push('version: must equal 1')
  if (typeof doc.candidateSha !== 'string' || !/^[0-9a-f]{40}$/.test(doc.candidateSha)) errors.push('candidateSha: full Git SHA required')
  if (typeof doc.artifactDigest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(doc.artifactDigest)) errors.push('artifactDigest: sha256 digest required')
  if (doc.environment !== 'staging') errors.push('environment: must be staging')
  if (doc.dataClassification !== 'synthetic') errors.push('dataClassification: staging requires synthetic data')
  if (doc.result !== 'passed') errors.push('result: only passed evidence is accepted')
  const started = timestamp(doc.startedAt, 'startedAt', errors)
  const completed = timestamp(doc.completedAt, 'completedAt', errors)
  if (Number.isFinite(started) && Number.isFinite(completed) && completed < started) errors.push('completedAt: precedes startedAt')

  if (exactObject(doc.resources, new Set(requiredResources), 'resources', errors)) {
    const refs = []
    for (const resource of requiredResources) {
      const value = doc.resources[resource]
      if (!exactObject(value, new Set(['stagingRef', 'separateFromProduction']), `resources.${resource}`, errors)) continue
      if (!safeRef(value.stagingRef)) errors.push(`resources.${resource}.stagingRef: invalid safe reference`)
      else refs.push(value.stagingRef)
      if (value.separateFromProduction !== true) errors.push(`resources.${resource}.separateFromProduction: must be true`)
    }
    if (new Set(refs).size !== refs.length) errors.push('resources: staging references must be distinct')
  }

  if (exactObject(doc.secretBoundary, new Set(['managedStore', 'sharedWithProduction', 'plaintextInEvidence', 'leastPrivilegeReviewed']), 'secretBoundary', errors)) {
    if (doc.secretBoundary.managedStore !== true) errors.push('secretBoundary.managedStore: must be true')
    if (doc.secretBoundary.sharedWithProduction !== false) errors.push('secretBoundary.sharedWithProduction: must be false')
    if (doc.secretBoundary.plaintextInEvidence !== false) errors.push('secretBoundary.plaintextInEvidence: must be false')
    if (doc.secretBoundary.leastPrivilegeReviewed !== true) errors.push('secretBoundary.leastPrivilegeReviewed: must be true')
  }

  for (const [field, names] of [['guards', requiredGuards], ['checks', requiredChecks]]) {
    if (!exactObject(doc[field], new Set(names), field, errors)) continue
    for (const name of names) if (doc[field][name] !== true) errors.push(`${field}.${name}: must be true`)
  }
  if (typeof doc.reviewerRole !== 'string' || !/^[a-z][a-z0-9_-]{2,40}$/.test(doc.reviewerRole)) errors.push('reviewerRole: safe role required')
  if (!Array.isArray(doc.evidenceRefs) || doc.evidenceRefs.length < 1 || doc.evidenceRefs.length > 20 || doc.evidenceRefs.some((ref) => !safeRef(ref))) {
    errors.push('evidenceRefs: require 1-20 safe references')
  }
  return errors.map((error) => `${path}: ${error}`)
}

const selected = files()
const errors = selected.flatMap(validate)
if (errors.length) {
  console.error('Staging evidence validation failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}
if (!selected.length) console.log('No staging evidence present; staging release gate remains unproven')
else console.log(`Staging evidence validation passed (${selected.length} candidate(s))`)
