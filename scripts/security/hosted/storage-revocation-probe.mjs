#!/usr/bin/env node
// Hosted P0 probe: private document reads must stop as soon as permission is
// revoked, including the SAME still-valid JWT against the SAME URL.
//
// Usage (synthetic fixtures only, exclusive staging only):
//   PROBE_SUPABASE_URL=https://<ref>.supabase.co PROBE_ALLOWED_REF=<ref> \
//   PROBE_PUBLISHABLE_KEY=<public key> PROBE_FIXTURE_FILE=<private json outside Git> \
//   node scripts/security/hosted/storage-revocation-probe.mjs
//
// The fixture file (never committed) holds synthetic accounts and the object:
// {"bucket":"telecom-documents","object_path":"<ws>/documents/<doc>/<ref>","sha256":"<hex>",
//  "actors":{"authorized":{"email":"","password":""},"same_company_denied":{...},
//            "foreign_company":{...}},
//  "revoke_command":"<operator command that suspends/demotes the authorized actor>",
//  "restore_command":"<optional operator command>"}
// Tokens and bytes stay in memory; the report contains no credential, token or content.
import {readFileSync, writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {assertStagingTarget, classifyStorageRead, keptHeaders, requireEnv, scrub, sha256Hex, summarize} from './probe-lib.mjs'

const TIMEOUT_MS = 20_000
const env = requireEnv(process.env, ['PROBE_SUPABASE_URL', 'PROBE_ALLOWED_REF', 'PROBE_PUBLISHABLE_KEY', 'PROBE_FIXTURE_FILE'])
assertStagingTarget(env.PROBE_SUPABASE_URL, env.PROBE_ALLOWED_REF)
const base = env.PROBE_SUPABASE_URL.replace(/\/$/, '')
const fixture = JSON.parse(readFileSync(env.PROBE_FIXTURE_FILE, 'utf8'))
const windowMs = Number(process.env.PROBE_REVOKED_WINDOW_MS ?? 90_000)
const intervalMs = Number(process.env.PROBE_REVOKED_INTERVAL_MS ?? 5_000)
const bucket = fixture.bucket ?? 'telecom-documents'
const objectPath = String(fixture.object_path).split('/').map(encodeURIComponent).join('/')
const checks = []

async function timed(url, init) {
  const started = performance.now()
  try {
    const res = await fetch(url, {...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store'})
    const body = new Uint8Array(await res.arrayBuffer())
    return {status: res.status, headers: keptHeaders(res.headers), bytes: body, ms: Math.round(performance.now() - started)}
  } catch (error) {
    return {status: 0, headers: {}, bytes: new Uint8Array(), ms: Math.round(performance.now() - started), error: error?.name === 'TimeoutError' ? 'timeout' : 'network'}
  }
}

async function login(actor) {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {apikey: env.PROBE_PUBLISHABLE_KEY, 'content-type': 'application/json'},
    body: JSON.stringify({email: actor.email, password: actor.password}),
  })
  const json = await r.json().catch(() => ({}))
  return r.ok && typeof json.access_token === 'string' ? json.access_token : null
}

const routes = {
  authenticated: `${base}/storage/v1/object/authenticated/${bucket}/${objectPath}`,
  sdk_download: `${base}/storage/v1/object/${bucket}/${objectPath}`,
  public: `${base}/storage/v1/object/public/${bucket}/${objectPath}`,
}

async function read(id, phase, actorLabel, route, jwt, expect) {
  const headers = {apikey: env.PROBE_PUBLISHABLE_KEY, 'cache-control': 'no-cache'}
  if (jwt) headers.authorization = `Bearer ${jwt}`
  const r = await timed(routes[route], {headers})
  const bodySha256 = r.bytes.byteLength ? sha256Hex(r.bytes) : null
  const c = classifyStorageRead({expect, status: r.status, bodySha256, expectedSha256: fixture.sha256})
  checks.push({id, phase, actor: actorLabel, route, expect, status: r.status, ms: r.ms, transport_error: r.error ?? null, headers: r.headers, ...c})
}

async function sign(id, phase, actorLabel, jwt, expect) {
  const r = await timed(`${base}/storage/v1/object/sign/${bucket}/${objectPath}`, {
    method: 'POST', headers: {apikey: env.PROBE_PUBLISHABLE_KEY, authorization: `Bearer ${jwt}`, 'content-type': 'application/json'},
    body: JSON.stringify({expiresIn: 30}),
  })
  const issued = r.status >= 200 && r.status < 300
  const verdict = (expect === 'allow') === issued ? 'PASS' : 'FAIL'
  checks.push({id, phase, actor: actorLabel, route: 'sign', expect, status: r.status, ms: r.ms, headers: r.headers, verdict, leak: expect === 'deny' && issued, reason: issued ? 'signed_url_issued' : 'denied'})
}

function hook(name) {
  const command = fixture[name]
  if (!command) {
    if (name === 'restore_command') return 'SKIPPED'
    throw new Error('PROBE_REVOKE_COMMAND_REQUIRED')
  }
  const r = spawnSync(command, {shell: true, stdio: ['ignore', 'ignore', 'ignore'], timeout: 60_000})
  if (r.status !== 0) throw new Error(`PROBE_${name.toUpperCase()}_FAILED`)
  return 'OK'
}

const report = {probe: 'storage-revocation-v1', target_ref: env.PROBE_ALLOWED_REF, started_at: new Date().toISOString(), object_sha256_prefix: String(fixture.sha256).slice(0, 12)}
try {
  const jwt = {}
  for (const [label, actor] of Object.entries(fixture.actors)) jwt[label] = await login(actor)
  if (!jwt.authorized) throw new Error('PROBE_AUTHORIZED_LOGIN_FAILED')
  report.logins = Object.fromEntries(Object.entries(jwt).map(([k, v]) => [k, Boolean(v)]))

  // Phase A: baseline. Two authorized reads per route to warm any edge cache on purpose.
  for (const route of ['authenticated', 'sdk_download']) {
    await read(`A.authorized.${route}.1`, 'before', 'authorized', route, jwt.authorized, 'allow')
    await read(`A.authorized.${route}.2`, 'before', 'authorized', route, jwt.authorized, 'allow')
    for (const label of Object.keys(jwt).filter((l) => l !== 'authorized' && jwt[l])) {
      await read(`A.${label}.${route}`, 'before', label, route, jwt[label], 'deny')
    }
    await read(`A.anon.${route}`, 'before', 'anon', route, null, 'deny')
  }
  await read('A.anon.public', 'before', 'anon', 'public', null, 'deny')
  for (const label of Object.keys(jwt).filter((l) => l !== 'authorized' && jwt[l])) await sign(`A.${label}.sign`, 'before', label, jwt[label], 'deny')

  // Phase B: revoke, then hammer the SAME JWT and SAME URLs across the window.
  report.revoke = hook('revoke_command')
  report.revoked_at = new Date().toISOString()
  const deadline = Date.now() + windowMs
  for (let i = 1; Date.now() < deadline; i++) {
    for (const route of ['authenticated', 'sdk_download']) await read(`B.same_jwt.${route}.${i}`, 'after_revoke', 'authorized', route, jwt.authorized, 'deny')
    if (i === 1) await sign('B.same_jwt.sign', 'after_revoke', 'authorized', jwt.authorized, 'deny')
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  const fresh = await login(fixture.actors.authorized)
  report.fresh_login_after_revoke = Boolean(fresh)
  if (fresh) for (const route of ['authenticated', 'sdk_download']) await read(`B.fresh_jwt.${route}`, 'after_revoke', 'authorized', route, fresh, 'deny')
  report.restore = hook('restore_command')
} catch (error) {
  report.error = scrub(error?.message ?? 'PROBE_FAILURE').slice(0, 120)
}
report.finished_at = new Date().toISOString()
report.summary = summarize(checks)
if (report.error) report.summary.status = 'INCOMPLETE'
report.checks = checks
const out = JSON.stringify(report, null, 1)
if (process.env.PROBE_REPORT_FILE) writeFileSync(process.env.PROBE_REPORT_FILE, out)
console.log(scrub(JSON.stringify(report.summary)))
process.exitCode = report.summary.status === 'PASS' ? 0 : 1
