#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const rootIndex = process.argv.indexOf('--root')
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd())
const contractRoot = resolve(root, 'docs/master/contracts')

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir).sort()) {
    const path = resolve(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.test\.(?:[cm]?js|ts)$/.test(name)) out.push(path)
  }
  return out
}

const files = walk(contractRoot)
if (files.length === 0) {
  console.log('No documentation contract tests present')
  process.exit(0)
}

for (const file of files) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', file], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    console.error(`Documentation contract test failed: ${relative(root, file)}`)
    process.exit(result.status ?? 1)
  }
}

console.log(`Documentation contract tests passed (${files.length} file(s))`)
