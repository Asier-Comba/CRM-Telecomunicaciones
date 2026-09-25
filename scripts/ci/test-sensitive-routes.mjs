#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = resolve('scripts/ci/check-sensitive-routes.mjs')
const roots = []

function fixture(files, routes = []) {
  const root = mkdtempSync(resolve(tmpdir(), 'w4-sensitive-routes-'))
  roots.push(root)
  for (const [path, contents] of Object.entries(files)) {
    const target = resolve(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contents)
  }
  mkdirSync(resolve(root, '.security'), { recursive: true })
  writeFileSync(resolve(root, '.security/sensitive-routes.json'), JSON.stringify({ version: 1, routes }))
  return root
}

function run(root) {
  return spawnSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' })
}

function secure(path, overrides = {}) {
  return {
    path,
    owner: 'W4',
    exposure: 'internal',
    authentication: 'scoped-service-principal',
    tenantBinding: 'signed-scope',
    rateLimited: true,
    productionEnabled: true,
    outboundSideEffects: false,
    securityReviewed: true,
    ...overrides,
  }
}

try {
  let root = fixture({ 'src/app/api/customers/route.ts': 'export async function GET() {}' })
  assert.equal(run(root).status, 0, 'ordinary routes do not require sensitive registry entries')

  root = fixture({ 'src/app/api/automations/n8n/test/route.ts': 'export async function POST() { return fetch("https://example.invalid") }' })
  assert.notEqual(run(root).status, 0, 'unregistered test route must fail')

  const testPath = 'src/app/api/automations/n8n/test/route.ts'
  root = fixture(
    { [testPath]: 'export async function POST() { return fetch("https://example.invalid") }' },
    [secure(testPath, { productionEnabled: true, outboundSideEffects: true })],
  )
  assert.notEqual(run(root).status, 0, 'production-enabled test route must fail')

  const internalPath = 'src/app/api/internal/sync/route.ts'
  root = fixture(
    { [internalPath]: 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY; export async function POST() {}' },
    [secure(internalPath, { outboundSideEffects: true })],
  )
  assert.equal(run(root).status, 0, 'scoped and reviewed privileged route may pass')

  root = fixture(
    { [internalPath]: 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY; export async function POST() {}' },
    [secure(internalPath, { tenantBinding: 'session-membership' })],
  )
  assert.notEqual(run(root).status, 0, 'service role cannot rely only on session membership')

  const webhookPath = 'app/api/webhooks/provider/route.ts'
  root = fixture(
    { [webhookPath]: 'export async function POST() {}' },
    [secure(webhookPath, {
      exposure: 'provider-callback',
      authentication: 'signed-webhook',
      tenantBinding: 'resource-derived',
      outboundSideEffects: true,
    })],
  )
  assert.equal(run(root).status, 0, 'signed, bounded provider callback may pass')

  root = fixture({}, [secure('src/app/api/debug/route.ts', { productionEnabled: false })])
  assert.notEqual(run(root).status, 0, 'stale registry entries must fail')

  console.log('Sensitive route negative-control tests passed')
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
}
