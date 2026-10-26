import {test} from 'node:test'
import assert from 'node:assert/strict'
import {assertStagingTarget, classifyConflict, classifyStorageRead, keptHeaders, requireEnv, scrub, summarize} from '../../scripts/security/hosted/probe-lib.mjs'

const sha = 'a'.repeat(64)

test('storage read classification flags revoked cache hits as confirmed leaks', () => {
  assert.deepEqual(classifyStorageRead({expect: 'allow', status: 200, bodySha256: sha, expectedSha256: sha}).verdict, 'PASS')
  assert.equal(classifyStorageRead({expect: 'allow', status: 400, bodySha256: null, expectedSha256: sha}).reason, 'denied_authorized')
  assert.deepEqual(classifyStorageRead({expect: 'deny', status: 400, bodySha256: null, expectedSha256: sha}), {verdict: 'PASS', leak: false, reason: 'denied'})
  const leak = classifyStorageRead({expect: 'deny', status: 200, bodySha256: sha, expectedSha256: sha})
  assert.deepEqual(leak, {verdict: 'FAIL', leak: true, reason: 'private_bytes_delivered'})
  assert.equal(classifyStorageRead({expect: 'deny', status: 200, bodySha256: 'b'.repeat(64), expectedSha256: sha}).reason, 'unexpected_2xx')
})

test('conflict classification never accepts timeouts, success or slow conflicts', () => {
  assert.equal(classifyConflict({timedOut: true, status: 0, code: null, elapsedMs: 20000, budgetMs: 5000}).reason, 'timeout')
  assert.equal(classifyConflict({timedOut: false, status: 200, code: null, elapsedMs: 10, budgetMs: 5000}).reason, 'unexpected_success')
  assert.equal(classifyConflict({timedOut: false, status: 500, code: '57014', elapsedMs: 8000, budgetMs: 5000}).verdict, 'FAIL')
  assert.equal(classifyConflict({timedOut: false, status: 409, code: 'PT409', elapsedMs: 9000, budgetMs: 5000}).reason, 'slow_conflict')
  assert.deepEqual(classifyConflict({timedOut: false, status: 409, code: 'PT409', elapsedMs: 120, budgetMs: 5000}), {verdict: 'PASS', reason: 'conflict_pt409'})
  assert.equal(classifyConflict({timedOut: false, status: 500, code: '40001', elapsedMs: 120, budgetMs: 5000}).verdict, 'FAIL')
  assert.equal(classifyConflict({timedOut: false, status: 500, code: 'PT409', elapsedMs: 120, budgetMs: 5000}).verdict, 'FAIL')
})

test('summary counts leaks and keeps failing ids', () => {
  const s = summarize([{id: 'a', verdict: 'PASS'}, {id: 'b', verdict: 'FAIL', leak: true}, {id: 'c', verdict: 'FAIL'}])
  assert.deepEqual(s, {total: 3, pass: 1, fail: 2, leaks: 1, status: 'FAIL', first_failures: ['b', 'c']})
  assert.equal(summarize([]).status, 'PASS')
})

test('output scrubbing removes tokens, keys and e-mail addresses', () => {
  const text = scrub('Bearer abc eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl sb_secret_XYZ123 sb_publishable_abc owner@example.test')
  for (const secret of ['abc ', 'eyJhbGciOi', 'sb_secret_XYZ123', 'sb_publishable_abc', 'owner@example.test']) assert.ok(!text.includes(secret), secret)
})

test('only kept transport headers are reported', () => {
  const headers = new Headers({'cf-cache-status': 'HIT', age: '12', authorization: 'Bearer x', 'set-cookie': 'sb=1'})
  assert.deepEqual(keptHeaders(headers), {'cf-cache-status': 'HIT', age: '12'})
})

test('probes refuse non-staging targets and missing configuration', () => {
  assert.equal(assertStagingTarget('https://zgwotxnyqzfuzcnmgvtn.supabase.co', 'zgwotxnyqzfuzcnmgvtn'), 'zgwotxnyqzfuzcnmgvtn.supabase.co')
  assert.throws(() => assertStagingTarget('https://other.supabase.co', 'zgwotxnyqzfuzcnmgvtn'), /NOT_ALLOWED/)
  assert.throws(() => assertStagingTarget('https://zgwotxnyqzfuzcnmgvtn.supabase.co.evil.test', 'zgwotxnyqzfuzcnmgvtn'), /NOT_ALLOWED/)
  assert.throws(() => assertStagingTarget('not a url', 'x'), /INVALID/)
  assert.throws(() => requireEnv({A: 'x', B: ' '}, ['A', 'B']), /PROBE_CONFIGURATION_REQUIRED:B/)
})
