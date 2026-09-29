/** Exact-source EMBEDDED-engine storage review. No native/adapter acceptance.
 * Usage: node scripts/review-w2-durable-alignment.mjs <40hexSHA> <detached-checkout>
 * Install the checkpoint's pinned ephemeral-postgres package with npm ci first.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
const [sha, checkout] = process.argv.slice(2)
if (!/^[a-f0-9]{40}$/.test(sha ?? '') || !checkout?.startsWith('/')) { console.error('exact_SHA_and_absolute_checkout_required'); process.exit(2) }
let temporary
let created = false
try {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim(), sha)
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: checkout, encoding: 'utf8' }).trim(), '', 'dirty_checkout_rejected')
  const path = 'scripts/security/ephemeral-postgres/domain.mjs'
  const source = execFileSync('git', ['show', `${sha}:${path}`], { cwd: checkout, encoding: 'utf8' })
  const marker = '  // Embedded-engine recovery probe only:'
  assert.equal(source.split(marker).length, 2, 'source_shape_review_required')
  // Insert measured assertions after the source's synthetic operation fixture.
  // No SQL schema/production provider or adapter implementation is supplied.
  const assertions = `
  const beforeLease = await db.query("select lease_expires_at::text as lease from public.assistant_operations where operation_ref='operationSyntheticRef0000001'")
  assert.equal(typeof beforeLease.rows[0]?.lease, 'string')
  for (const code of ['effect_absence_verified_retryable','effect_absence_verified_terminal']) {
    await db.query("update public.assistant_operations set failure_code=$1 where operation_ref='operationSyntheticRef0000001'", [code])
    const roundTrip = await db.query("select failure_code,lease_expires_at::text as lease from public.assistant_operations where operation_ref='operationSyntheticRef0000001'")
    assert.equal(roundTrip.rows[0].failure_code, code)
    assert.equal(roundTrip.rows[0].lease, beforeLease.rows[0].lease)
  }
  await assert.rejects(db.exec("update public.assistant_operations set lease_expires_at=null where operation_ref='operationSyntheticRef0000001'"), e => e.code === '23502')
  console.log('W3 EXACT ABSENCE-CODE ROUNDTRIPS + STABLE NONNULL LEASE PASS (PGlite only)')
`
  temporary = resolve(checkout, `scripts/security/ephemeral-postgres/w3-review-${process.pid}.mjs`)
  writeFileSync(temporary, source.replace(marker, assertions + marker), { flag: 'wx' })
  created = true
  const result = spawnSync(process.execPath, [temporary], { cwd: checkout, encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024 })
  if (result.status !== 0) throw new Error('embedded_review_failed')
  const lines = result.stdout.split('\n').filter(line => /PASS/.test(line))
  assert.ok(lines.some(line => line.startsWith('W3 EXACT ABSENCE-CODE')))
  console.log(JSON.stringify({ sourceSha: sha, evidence: 'exact_source_plus_W3_assertions_PGlite_only', checks: lines, nativeProcessExecuted: false, adapterAccepted: false }, null, 2))
} catch { console.error('EMBEDDED_REVIEW_FAILED_OR_SOURCE_CHANGED: no acceptance conclusion'); process.exitCode = 1 }
finally { if (created) unlinkSync(temporary) }
