#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'

const rootArg = process.argv.indexOf('--root')
const root = resolve(rootArg >= 0 ? process.argv[rootArg + 1] : process.cwd())
const registryPath = resolve(root, '.security/sensitive-routes.json')

const pathRisk = /(?:^|\/)(?:status|test|debug|admin|qa|internal|webhooks?|callbacks?|agent)(?:\/|$)|\/assistant\/confirm(?:\/|$)/i
const serviceRoleRisk = /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role|createAdminClient|createServiceRoleClient/i
const allowed = {
  exposure: new Set(['authenticated', 'internal', 'provider-callback']),
  authentication: new Set(['session', 'scoped-service-principal', 'signed-webhook']),
  tenantBinding: new Set(['session-membership', 'signed-scope', 'resource-derived']),
}

function posix(path) {
  return path.split(sep).join('/')
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, out)
    else if (/\/route\.(?:[cm]?[jt]sx?)$/.test(posix(path))) out.push(path)
  }
  return out
}

function fail(errors, message) {
  errors.push(message)
}

const routeFiles = [resolve(root, 'app/api'), resolve(root, 'src/app/api')]
  .flatMap((dir) => walk(dir))
const sensitive = new Map()

for (const absolute of routeFiles) {
  const path = posix(relative(root, absolute))
  const source = readFileSync(absolute, 'utf8')
  const reasons = []
  if (pathRisk.test(path)) reasons.push('sensitive path')
  if (serviceRoleRisk.test(source)) reasons.push('privileged/service-role client')
  if (reasons.length) sensitive.set(path, { reasons })
}

let registry = { version: 1, routes: [] }
const errors = []
if (existsSync(registryPath)) {
  try {
    registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  } catch {
    fail(errors, '.security/sensitive-routes.json must be valid JSON')
  }
} else if (sensitive.size) {
  fail(errors, '.security/sensitive-routes.json is required when sensitive routes exist')
}

if (registry.version !== 1 || !Array.isArray(registry.routes)) {
  fail(errors, 'sensitive route registry must have version=1 and a routes array')
}

const entries = new Map()
for (const entry of Array.isArray(registry.routes) ? registry.routes : []) {
  if (!entry || typeof entry.path !== 'string') {
    fail(errors, 'every sensitive route entry requires a path')
    continue
  }
  if (entries.has(entry.path)) fail(errors, `duplicate registry entry: ${entry.path}`)
  entries.set(entry.path, entry)
}

for (const [path, finding] of sensitive) {
  const entry = entries.get(path)
  if (!entry) {
    fail(errors, `${path}: unregistered (${finding.reasons.join(', ')})`)
    continue
  }

  if (typeof entry.owner !== 'string' || !entry.owner.trim()) fail(errors, `${path}: owner is required`)
  for (const field of ['exposure', 'authentication', 'tenantBinding']) {
    if (!allowed[field].has(entry[field])) fail(errors, `${path}: invalid or missing ${field}`)
  }
  for (const field of ['rateLimited', 'productionEnabled', 'outboundSideEffects', 'securityReviewed']) {
    if (typeof entry[field] !== 'boolean') fail(errors, `${path}: ${field} must be boolean`)
  }

  if (entry.productionEnabled && /(?:^|\/)(?:test|debug|qa)(?:\/|$)/i.test(path)) {
    fail(errors, `${path}: test/debug/QA routes cannot be production-enabled`)
  }
  if (entry.outboundSideEffects && !entry.rateLimited) {
    fail(errors, `${path}: outbound side effects require rate limiting`)
  }
  if (entry.outboundSideEffects && entry.authentication === 'session' && entry.tenantBinding !== 'resource-derived') {
    fail(errors, `${path}: session-authenticated side effects must derive tenant from the authorized resource`)
  }
  if (finding.reasons.includes('privileged/service-role client')) {
    if (!entry.securityReviewed) fail(errors, `${path}: privileged client requires securityReviewed=true`)
    if (entry.tenantBinding === 'session-membership') {
      fail(errors, `${path}: privileged client cannot rely only on session membership; bind a signed scope or authorized resource`)
    }
  }
}

for (const path of entries.keys()) {
  if (!sensitive.has(path)) fail(errors, `${path}: stale registry entry or route is not detected as sensitive`)
}

if (errors.length) {
  console.error('Sensitive route policy failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Sensitive route policy passed (${sensitive.size} registered route(s))`)
