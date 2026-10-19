// Pure helpers shared by the hosted staging probes. No network, no secrets.
// Reports keep only bounded, non-sensitive transport facts: status, SQLSTATE,
// cache headers, request correlation ids, timings and a byte-hash match flag.
import {createHash} from 'node:crypto'

export const KEPT_HEADERS = ['cf-cache-status', 'age', 'cache-control', 'cf-ray', 'sb-request-id', 'x-request-id', 'content-type', 'content-length', 'vary']

export function keptHeaders(headers) {
  const out = {}
  for (const name of KEPT_HEADERS) {
    const value = headers?.get?.(name)
    if (value != null) out[name] = String(value).slice(0, 200)
  }
  return out
}

export const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex')

// A storage read is a leak when the expected private bytes were delivered to
// a principal that must be denied. Any 2xx with other bytes is still a FAIL
// (unexpected content) but is reported separately from a confirmed leak.
export function classifyStorageRead({expect, status, bodySha256, expectedSha256}) {
  const delivered = status >= 200 && status < 300
  const sameBytes = delivered && bodySha256 === expectedSha256
  if (expect === 'allow') {
    return {verdict: sameBytes ? 'PASS' : 'FAIL', leak: false, reason: sameBytes ? 'expected_bytes' : delivered ? 'unexpected_bytes' : 'denied_authorized'}
  }
  if (!delivered) return {verdict: 'PASS', leak: false, reason: 'denied'}
  return {verdict: 'FAIL', leak: sameBytes, reason: sameBytes ? 'private_bytes_delivered' : 'unexpected_2xx'}
}

// HTTP conflict contract: changed intent and stale version must answer quickly
// with a transport error carrying SQLSTATE 40001 (PostgREST maps 40* to 500),
// never hang, never succeed and never create a second effect.
export function classifyConflict({timedOut, status, code, elapsedMs, budgetMs}) {
  if (timedOut) return {verdict: 'FAIL', reason: 'timeout'}
  if (status >= 200 && status < 300) return {verdict: 'FAIL', reason: 'unexpected_success'}
  if (code !== '40001') return {verdict: 'FAIL', reason: `unexpected_code_${String(code ?? 'none').slice(0, 12)}`}
  if (elapsedMs > budgetMs) return {verdict: 'FAIL', reason: 'slow_conflict'}
  return {verdict: 'PASS', reason: 'conflict_40001'}
}

export function summarize(checks) {
  const failed = checks.filter((c) => c.verdict !== 'PASS')
  return {
    total: checks.length,
    pass: checks.length - failed.length,
    fail: failed.length,
    leaks: checks.filter((c) => c.leak).length,
    status: failed.length ? 'FAIL' : 'PASS',
    first_failures: failed.slice(0, 10).map((c) => c.id),
  }
}

// Defensive scrub for anything that may be printed: JWT-shaped strings, sb_*
// keys, bearer values and e-mail addresses are replaced before output.
export function scrub(text) {
  return String(text)
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/sb_(?:publishable|secret)_[\w-]+/g, '[key]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
}

export function requireEnv(env, names) {
  const missing = names.filter((n) => !env[n] || !String(env[n]).trim())
  if (missing.length) throw new Error(`PROBE_CONFIGURATION_REQUIRED:${missing.join(',')}`)
  return Object.fromEntries(names.map((n) => [n, String(env[n]).trim()]))
}

// Only the exclusive staging project may be probed. Production/other refs are refused.
export function assertStagingTarget(url, allowedRef) {
  let host
  try { host = new URL(url).host } catch { throw new Error('PROBE_TARGET_INVALID') }
  if (host !== `${allowedRef}.supabase.co`) throw new Error('PROBE_TARGET_NOT_ALLOWED')
  return host
}
