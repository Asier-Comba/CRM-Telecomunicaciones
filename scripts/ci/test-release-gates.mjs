#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = resolve('scripts/ci/validate-release-gates.mjs')
const source = JSON.parse(readFileSync('.security/release-gates.json', 'utf8'))
const roots = []

function run(mutate) {
  const root = mkdtempSync(resolve(tmpdir(), 'w4-release-gates-'))
  roots.push(root)
  mkdirSync(resolve(root, '.security'), { recursive: true })
  const value = structuredClone(source)
  mutate?.(value)
  writeFileSync(resolve(root, '.security/release-gates.json'), JSON.stringify(value))
  return spawnSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' })
}

try {
  assert.equal(run().status, 0, 'current release evidence must be internally consistent')
  assert.equal(source.decisions.CAN_INTEGRATE, 'YES', 'current accepted base permits composition')
  assert.equal(source.decisions.CAN_PRODUCE, 'NO', 'composition does not imply production readiness')
  assert.notEqual(run(v => { v.decisions.CAN_STAGE = 'YES' }).status,0,'no platform evidence cannot claim staging')
  assert.notEqual(run(v => { v.decisions.CAN_PRODUCE = 'YES' }).status,0,'no production evidence cannot claim production')
  assert.notEqual(run(v => { v.acceptedBase = null }).status,0,'integration requires exact accepted SHA')
  assert.notEqual(run(v => { v.acceptedBase = '0'.repeat(40) }).status,0,'accepted SHA must match gate evidence')
  for (const [name, mutate] of [
    ['null gate', v => { v.gates.push(null) }],
    ['null environment', v => { v.environments = null }],
    ['non-array dependencies', v => { v.gates[0].requires = 42 }],
    ['null evidence references', v => { v.gates[0].evidenceRefs = null }],
    ['object evidence requirements', v => { v.gates[0].evidenceRequired = {} }],
  ]) {
    const result = run(mutate)
    assert.equal(result.status, 1, `${name}: controlled rejection`)
    assert.match(result.stderr, /Release gate validation failed/, name)
    assert.doesNotMatch(result.stderr, /TypeError|ReferenceError|\n\s+at /, `${name}: no implementation stack trace`)
  }
  assert.notEqual(run((value) => { value.releaseDecision = 'ready' }).status, 0, 'open P0 cannot be release-ready')
  assert.notEqual(run((value) => { value.gates.find((gate) => gate.id === 'ci.baseline').evidenceSatisfied = [] }).status, 0, 'passed gate requires complete evidence')
  assert.notEqual(run((value) => { value.gates.find((gate) => gate.id === 'frontend.read').evidenceSatisfied = [] }).status, 0, 'frontend acceptance requires complete evidence')
  assert.notEqual(run((value) => { value.gates.find((gate) => gate.id === 'base.canonical').requires = ['release.production'] }).status, 0, 'dependency cycle must fail')
  assert.notEqual(run((value) => { value.gates[0].databasePassword = 'forbidden' }).status, 0, 'secret-bearing evidence fields must fail')
  console.log('Release gate negative-control tests passed')
} finally {
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
}
