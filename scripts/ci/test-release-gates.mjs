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
  assert.notEqual(run((value) => { value.releaseDecision = 'ready' }).status, 0, 'open P0 cannot be release-ready')
  assert.notEqual(run((value) => { value.gates.find((gate) => gate.id === 'ci.baseline').evidenceSatisfied = [] }).status, 0, 'passed gate requires complete evidence')
  assert.notEqual(run((value) => { value.gates.find((gate) => gate.id === 'frontend.read').status = 'passed' }).status, 0, 'gate cannot pass before its dependency')
  assert.notEqual(run((value) => { value.gates.find((gate) => gate.id === 'base.canonical').requires = ['release.production'] }).status, 0, 'dependency cycle must fail')
  assert.notEqual(run((value) => { value.gates[0].databasePassword = 'forbidden' }).status, 0, 'secret-bearing evidence fields must fail')
  console.log('Release gate negative-control tests passed')
} finally {
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
}
