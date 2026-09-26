#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const runner = resolve('scripts/ci/run-doc-contract-tests.mjs')
const roots = []

function fixture(source) {
  const root = mkdtempSync(resolve(tmpdir(), 'w4-doc-contract-'))
  roots.push(root)
  const dir = resolve(root, 'docs/master/contracts')
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'fixture.test.ts'), source)
  return root
}

function run(root) {
  return spawnSync(process.execPath, [runner, '--root', root], { encoding: 'utf8' })
}

try {
  assert.equal(run(fixture("import test from 'node:test'; import assert from 'node:assert/strict'; const value: number = 2; test('safe', () => assert.equal(value, 2))")).status, 0)
  assert.notEqual(run(fixture("import test from 'node:test'; import assert from 'node:assert/strict'; test('negative control', () => assert.equal(1, 2))")).status, 0)
  const emptyRoot = mkdtempSync(resolve(tmpdir(), 'w4-doc-contract-empty-'))
  roots.push(emptyRoot)
  assert.equal(run(emptyRoot).status, 0)
  console.log('Documentation contract runner negative controls passed')
} finally {
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
}
