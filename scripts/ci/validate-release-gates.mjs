#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootIndex = process.argv.indexOf('--root')
const fileIndex = process.argv.indexOf('--file')
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd())
const file = resolve(root, fileIndex >= 0 ? process.argv[fileIndex + 1] : '.security/release-gates.json')
const rootKeys = new Set(['version', 'acceptedBase', 'releaseDecision', 'decisions', 'environments', 'gates'])
const gateKeys = new Set(['id', 'phase', 'severity', 'owners', 'status', 'requires', 'evidenceRequired', 'evidenceSatisfied', 'evidenceRefs'])
const forbiddenKey = /(?:secret|password|credential|authorization|cookie|private.?key|access.?token|refresh.?token)/i
const safeRef = /^(?:issue|pr|run):#[1-9][0-9]*$|^commit:[0-9a-f]{7,40}$|^doc:[A-Za-z0-9._/-]+$/
const errors = []

function exactKeys(value, expected, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: must be an object`)
    return false
  }
  for (const key of Object.keys(value)) if (!expected.has(key)) errors.push(`${path}.${key}: unknown field`)
  for (const key of expected) if (!(key in value)) errors.push(`${path}.${key}: required field missing`)
  return true
}

function walkKeys(value, path = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => walkKeys(item, `${path}[${index}]`))
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) errors.push(`${path}.${key}: secret-bearing fields are forbidden`)
    walkKeys(child, `${path}.${key}`)
  }
}

function stringArray(value, path, pattern) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || (pattern && !pattern.test(item)))) {
    errors.push(`${path}: invalid string array`)
    return []
  }
  if (new Set(value).size !== value.length) errors.push(`${path}: duplicate values`)
  return value
}

let document
try {
  document = JSON.parse(readFileSync(file, 'utf8'))
} catch {
  console.error(`Release gate validation failed:\n- ${file}: invalid or unreadable JSON`)
  process.exit(1)
}

walkKeys(document)
if (!exactKeys(document, rootKeys, '$')) {
  console.error('Release gate validation failed: root must be an object')
  process.exit(1)
}
if (document.version !== 2) errors.push('$.version: must equal 2')
if (document.acceptedBase !== null && !/^[0-9a-f]{40}$/.test(document.acceptedBase)) errors.push('$.acceptedBase: must be null or a full commit SHA')
if (!['blocked', 'ready'].includes(document.releaseDecision)) errors.push('$.releaseDecision: invalid value')
if (exactKeys(document.environments, new Set(['development', 'staging', 'production']), '$.environments')) {
  if (!['active', 'inactive'].includes(document.environments.development)) errors.push('$.environments.development: invalid value')
  if (!['unprovisioned', 'isolated', 'validated'].includes(document.environments.staging)) errors.push('$.environments.staging: invalid value')
  if (!['untouched', 'configured', 'active'].includes(document.environments.production)) errors.push('$.environments.production: invalid value')
}
if (!Array.isArray(document.gates) || document.gates.length === 0) errors.push('$.gates: require at least one gate')

const gates = new Map()
for (const [index, gate] of (Array.isArray(document.gates) ? document.gates : []).entries()) {
  const path = `$.gates[${index}]`
  if (!exactKeys(gate, gateKeys, path)) continue
  if (typeof gate.id !== 'string' || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/.test(gate.id)) errors.push(`${path}.id: invalid stable identifier`)
  else if (gates.has(gate.id)) errors.push(`${path}.id: duplicate gate`)
  else gates.set(gate.id, gate)
  if (!['integration', 'staging', 'production'].includes(gate.phase)) errors.push(`${path}.phase: invalid value`)
  if (!['P0', 'P1', 'P2', 'P3'].includes(gate.severity)) errors.push(`${path}.severity: invalid value`)
  if (!['blocked', 'pending', 'passed'].includes(gate.status)) errors.push(`${path}.status: invalid value`)
  const owners = stringArray(gate.owners, `${path}.owners`, /^[A-Z][A-Z0-9_-]{1,30}$/)
  if (owners.length === 0) errors.push(`${path}.owners: require at least one owner`)
  stringArray(gate.requires, `${path}.requires`, /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/)
  const required = stringArray(gate.evidenceRequired, `${path}.evidenceRequired`, /^[a-z][a-z0-9_]{2,60}$/)
  const satisfied = stringArray(gate.evidenceSatisfied, `${path}.evidenceSatisfied`, /^[a-z][a-z0-9_]{2,60}$/)
  for (const item of satisfied) if (!required.includes(item)) errors.push(`${path}.evidenceSatisfied: ${item} is not required evidence`)
  const refs = stringArray(gate.evidenceRefs, `${path}.evidenceRefs`, safeRef)
  if (gate.status === 'passed' && required.some((item) => !satisfied.includes(item))) errors.push(`${path}: passed gate lacks required evidence`)
  if (gate.status === 'passed' && refs.length === 0) errors.push(`${path}: passed gate requires evidence references`)
}

// Never traverse dependencies or derive decisions from rejected structural input.
if (errors.length) {
  console.error('Release gate validation failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

function visit(id, stack = new Set(), complete = new Set()) {
  if (complete.has(id)) return
  if (stack.has(id)) {
    errors.push(`$.gates: dependency cycle at ${id}`)
    return
  }
  stack.add(id)
  const gate = gates.get(id)
  for (const dependency of gate?.requires ?? []) {
    if (!gates.has(dependency)) errors.push(`$.gates.${id}: unknown dependency ${dependency}`)
    else visit(dependency, stack, complete)
  }
  stack.delete(id)
  complete.add(id)
}
for (const id of gates.keys()) visit(id)

for (const [id, gate] of gates) {
  if (gate.status === 'passed') {
    for (const dependency of gate.requires) {
      if (gates.get(dependency)?.status !== 'passed') errors.push(`$.gates.${id}: passed before dependency ${dependency}`)
    }
  }
}

const productionGate = gates.get('release.production')
if (!productionGate) errors.push('$.gates: release.production is required')
const computedReady = Boolean(
  document.acceptedBase &&
  productionGate?.status === 'passed' &&
  document.environments.staging === 'validated' &&
  document.environments.production !== 'untouched',
)
const computedIntegrate = Boolean(document.acceptedBase && gates.get('base.canonical')?.status === 'passed' && gates.get('ci.baseline')?.status === 'passed')
const computedStage = Boolean(computedIntegrate && document.environments.staging === 'validated' && gates.get('platform.auth_rls')?.status === 'passed' && gates.get('staging.isolated')?.status === 'passed')
if (exactKeys(document.decisions, new Set(['CAN_INTEGRATE', 'CAN_STAGE', 'CAN_PRODUCE']), '$.decisions')) {
  if (document.decisions.CAN_INTEGRATE !== (computedIntegrate ? 'YES' : 'NO')) errors.push('CAN_INTEGRATE contradicts canonical/CI evidence')
  const stage = computedStage ? 'YES' : document.environments.staging === 'isolated' ? 'PARTIAL' : 'NO'
  if (document.decisions.CAN_STAGE !== stage) errors.push('CAN_STAGE contradicts platform/environment evidence')
  if (document.decisions.CAN_PRODUCE !== (computedReady ? 'YES' : 'NO')) errors.push('CAN_PRODUCE contradicts production evidence')
}
if (computedIntegrate && !gates.get('base.canonical').evidenceRefs.includes(`commit:${document.acceptedBase}`)) errors.push('acceptedBase requires exact commit evidence reference')
if ((document.releaseDecision === 'ready') !== computedReady) errors.push('$.releaseDecision: contradicts gate/environment evidence')
if ([...gates.values()].some((gate) => gate.severity === 'P0' && gate.status !== 'passed') && document.releaseDecision !== 'blocked') {
  errors.push('$.releaseDecision: open P0 requires blocked')
}

if (errors.length) {
  console.error('Release gate validation failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

const passed = [...gates.values()].filter((gate) => gate.status === 'passed').length
console.log(`Release gate validation passed (${passed}/${gates.size}; CAN_INTEGRATE=${document.decisions.CAN_INTEGRATE}; CAN_STAGE=${document.decisions.CAN_STAGE}; CAN_PRODUCE=${document.decisions.CAN_PRODUCE})`)
