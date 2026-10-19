#!/usr/bin/env node
// Hosted P1 probe: changed-intent and stale-version commands must return a
// bounded HTTP error carrying SQLSTATE 40001 instead of hanging. Each request
// records time-to-headers, total time, status, SQLSTATE and correlation ids so
// a hang can be attributed to client, edge (cf-ray) or PostgREST (sb-request-id).
//
// No automatic write retry: every request is sent exactly once. The only
// effect is ONE synthetic customer per run (create), whose version is
// then used for the stale-version check.
//
//   PROBE_SUPABASE_URL=https://<ref>.supabase.co PROBE_ALLOWED_REF=<ref> \
//   PROBE_PUBLISHABLE_KEY=<public key> PROBE_FIXTURE_FILE=<private json outside Git> \
//   node scripts/security/hosted/http-conflict-probe.mjs
// Fixture: {"workspace_id":"<uuid>","owner":{"email":"","password":""},"parallel":4}
import {randomUUID} from 'node:crypto'
import {readFileSync, writeFileSync} from 'node:fs'
import {assertStagingTarget, classifyConflict, keptHeaders, requireEnv, scrub, summarize} from './probe-lib.mjs'

const TIMEOUT_MS = Number(process.env.PROBE_REQUEST_TIMEOUT_MS ?? 30_000)
const CONFLICT_BUDGET_MS = Number(process.env.PROBE_CONFLICT_BUDGET_MS ?? 5_000)
const env = requireEnv(process.env, ['PROBE_SUPABASE_URL', 'PROBE_ALLOWED_REF', 'PROBE_PUBLISHABLE_KEY', 'PROBE_FIXTURE_FILE'])
assertStagingTarget(env.PROBE_SUPABASE_URL, env.PROBE_ALLOWED_REF)
const base = env.PROBE_SUPABASE_URL.replace(/\/$/, '')
const fixture = JSON.parse(readFileSync(env.PROBE_FIXTURE_FILE, 'utf8'))
const parallel = Math.min(Math.max(Number(fixture.parallel ?? 4), 1), 8)
const checks = []
let jwt

async function rpc(name, input) {
  const started = performance.now()
  let headersMs = null
  try {
    const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {apikey: env.PROBE_PUBLISHABLE_KEY, authorization: `Bearer ${jwt}`, 'content-type': 'application/json', prefer: 'return=representation'},
      body: JSON.stringify({p_workspace_id: fixture.workspace_id, p_input: input}),
    })
    headersMs = Math.round(performance.now() - started)
    // Always drain the body so no pooled connection is left half-read.
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return {status: res.status, code: json && typeof json === 'object' && !Array.isArray(json) ? json.code ?? null : null, json, headers: keptHeaders(res.headers), headersMs, ms: Math.round(performance.now() - started), timedOut: false}
  } catch (error) {
    return {status: 0, code: null, json: null, headers: {}, headersMs, ms: Math.round(performance.now() - started), timedOut: error?.name === 'TimeoutError', transport: error?.name ?? 'Error'}
  }
}

function record(id, r, expectConflict) {
  const c = expectConflict
    ? classifyConflict({timedOut: r.timedOut, status: r.status, code: r.code, elapsedMs: r.ms, budgetMs: CONFLICT_BUDGET_MS})
    : {verdict: r.status >= 200 && r.status < 300 ? 'PASS' : 'FAIL', reason: r.timedOut ? 'timeout' : `status_${r.status}`}
  checks.push({id, status: r.status, code: r.code, headers_ms: r.headersMs, ms: r.ms, timed_out: r.timedOut, headers: r.headers, ...c})
  return r
}

const report = {probe: 'http-conflict-v1', target_ref: env.PROBE_ALLOWED_REF, started_at: new Date().toISOString(), timeout_ms: TIMEOUT_MS, conflict_budget_ms: CONFLICT_BUDGET_MS, parallel}
try {
  const auth = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {apikey: env.PROBE_PUBLISHABLE_KEY, 'content-type': 'application/json'},
    body: JSON.stringify({email: fixture.owner.email, password: fixture.owner.password}),
  })
  jwt = (await auth.json().catch(() => ({}))).access_token
  if (!jwt) throw new Error('PROBE_OWNER_LOGIN_FAILED')

  const commandId = randomUUID()
  const original = {command_id: commandId, account_kind: 'legal_entity', legal_name: `W5 PROBE ${commandId.slice(0, 8)}`}
  const created = record('create.original', await rpc('product_v1_customer_create', original), false)
  if (!(created.status >= 200 && created.status < 300) || !created.json?.id) throw new Error('PROBE_CREATE_FAILED')
  const replay = record('create.exact_replay', await rpc('product_v1_customer_create', original), false)
  checks.push({id: 'create.replay_same_receipt', verdict: replay.json?.id === created.json.id && replay.json?.version === created.json.version ? 'PASS' : 'FAIL', reason: 'receipt_identity'})

  // Sequential conflicts.
  record('conflict.changed_intent.sequential', await rpc('product_v1_customer_create', {...original, legal_name: `${original.legal_name} CHANGED`}), true)
  const stale = {command_id: randomUUID(), id: created.json.id, expected_version: Number(created.json.version) + 1, legal_name: `${original.legal_name} STALE`}
  record('conflict.stale_version.sequential', await rpc('product_v1_customer_update', stale), true)

  // Parallel conflicts: each distinct request is sent once, concurrently.
  const parallelChanged = Array.from({length: parallel}, (_, i) => rpc('product_v1_customer_create', {...original, legal_name: `${original.legal_name} P${i}`}))
  const parallelStale = Array.from({length: parallel}, (_, i) => rpc('product_v1_customer_update', {...stale, command_id: randomUUID(), legal_name: `${original.legal_name} S${i}`}))
  const [changedResults, staleResults] = await Promise.all([Promise.all(parallelChanged), Promise.all(parallelStale)])
  changedResults.forEach((r, i) => record(`conflict.changed_intent.parallel.${i}`, r, true))
  staleResults.forEach((r, i) => record(`conflict.stale_version.parallel.${i}`, r, true))

  // Single effect: replay again must still be the original receipt/version.
  const after = record('create.replay_after_conflicts', await rpc('product_v1_customer_create', original), false)
  checks.push({id: 'create.single_effect', verdict: after.json?.id === created.json.id && after.json?.version === created.json.version ? 'PASS' : 'FAIL', reason: 'no_second_effect'})
  report.synthetic_customer_id = created.json.id
} catch (error) {
  report.error = scrub(error?.message ?? 'PROBE_FAILURE').slice(0, 120)
}
report.finished_at = new Date().toISOString()
report.summary = summarize(checks)
if (report.error) report.summary.status = 'INCOMPLETE'
report.checks = checks
if (process.env.PROBE_REPORT_FILE) writeFileSync(process.env.PROBE_REPORT_FILE, JSON.stringify(report, null, 1))
console.log(scrub(JSON.stringify(report.summary)))
process.exitCode = report.summary.status === 'PASS' ? 0 : 1
