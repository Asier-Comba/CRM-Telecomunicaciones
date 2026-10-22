import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateEligibilityV1, validatePolicyV1 } from '../../scripts/platform/deploy-eligibility.mjs'

const committed = JSON.parse(readFileSync(new URL('../../infra/platform/staging-deploy-policy.json', import.meta.url), 'utf8'))
const sha = 'a'.repeat(40), today = '2026-10-22'
const policy = { contract: 'w5.staging-deploy-eligibility.v1', required_workflows: ['CI', 'Audit'], exceptions: [
  { workflow: 'CI', job: 'audit', finding: 'x', approved_by: null, approved_on: null, expires_on: null },
] }
const run = (id, name, conclusion, extra = {}) => ({ id, name, head_sha: sha, status: 'completed', conclusion, created_at: '2026-10-22T10:00:00Z', ...extra })
const approve = (p, expires_on = '2026-11-01', approved_on = '2026-10-22') => ({ ...p, exceptions: p.exceptions.map(e => ({ ...e, approved_by: 'Owner (decision #67)', approved_on, expires_on })) })

test('the committed policy is valid and admits no exception until someone else approves it', () => {
  validatePolicyV1(committed)
  assert.ok(committed.required_workflows.includes('CI') && committed.required_workflows.includes('Supabase local acceptance'))
  assert.ok(committed.exceptions.every(e => e.approved_by === null && e.approved_on === null && e.expires_on === null))
})
test('all required workflows succeeded on the exact SHA: eligible', () => {
  const r = evaluateEligibilityV1(policy, sha, [run(1, 'CI', 'success'), run(2, 'Audit', 'success')], {}, today)
  assert.equal(r.eligible, true); assert.deepEqual(r.blockers, [])
})
test('missing, running or other-SHA runs block', () => {
  assert.deepEqual(evaluateEligibilityV1(policy, sha, [run(1, 'CI', 'success')], {}, today).blockers, [{ workflow: 'Audit', reason: 'NOT_RUN' }])
  assert.equal(evaluateEligibilityV1(policy, sha, [run(1, 'CI', 'success'), run(2, 'Audit', null, { status: 'in_progress' })], {}, today).blockers[0].reason, 'NOT_COMPLETED')
  assert.equal(evaluateEligibilityV1(policy, sha, [run(1, 'CI', 'success'), run(2, 'Audit', 'success', { head_sha: 'b'.repeat(40) })], {}, today).blockers[0].reason, 'NOT_RUN')
})
test('the latest run of a workflow decides, so an older success cannot hide a newer failure', () => {
  const runs = [run(1, 'CI', 'success', { created_at: '2026-10-22T09:00:00Z' }), run(3, 'CI', 'failure', { created_at: '2026-10-22T11:00:00Z' }), run(2, 'Audit', 'success')]
  const r = evaluateEligibilityV1(policy, sha, runs, { 3: [{ name: 'tests', status: 'completed', conclusion: 'failure' }] }, today)
  assert.deepEqual(r.blockers, [{ workflow: 'CI', job: 'tests', reason: 'FAILED_NOT_EXCEPTED' }])
})
test('an unapproved exception proposal admits nothing; an approved unexpired one admits only its job', () => {
  const runs = [run(1, 'CI', 'failure'), run(2, 'Audit', 'success')]
  const jobs = { 1: [{ name: 'audit', status: 'completed', conclusion: 'failure' }, { name: 'build', status: 'completed', conclusion: 'success' }] }
  assert.equal(evaluateEligibilityV1(policy, sha, runs, jobs, today).eligible, false)
  const ok = evaluateEligibilityV1(approve(policy), sha, runs, jobs, today)
  assert.equal(ok.eligible, true); assert.deepEqual(ok.admitted_exceptions, [{ workflow: 'CI', job: 'audit', approved_by: 'Owner (decision #67)', expires_on: '2026-11-01' }])
  const other = { 1: [{ name: 'audit', status: 'completed', conclusion: 'failure' }, { name: 'build', status: 'completed', conclusion: 'failure' }] }
  assert.deepEqual(evaluateEligibilityV1(approve(policy), sha, runs, other, today).blockers, [{ workflow: 'CI', job: 'build', reason: 'FAILED_NOT_EXCEPTED' }])
  assert.deepEqual(evaluateEligibilityV1(approve(policy, '2026-10-21', '2026-10-01'), sha, runs, jobs, today).blockers, [{ workflow: 'CI', job: 'audit', reason: 'EXCEPTION_EXPIRED' }])
})
test('cancelled or timed-out jobs count as failed; a failed run without failed jobs is not trusted', () => {
  const runs = [run(1, 'CI', 'failure'), run(2, 'Audit', 'cancelled')]
  const r = evaluateEligibilityV1(approve(policy), sha, runs, { 1: [{ name: 'audit', status: 'completed', conclusion: 'failure' }], 2: [{ name: 'x', status: 'completed', conclusion: 'cancelled' }] }, today)
  assert.deepEqual(r.blockers, [{ workflow: 'Audit', job: 'x', reason: 'FAILED_NOT_EXCEPTED' }])
  assert.equal(evaluateEligibilityV1(policy, sha, [run(1, 'CI', 'success'), run(2, 'Audit', 'failure')], { 2: [{ name: 'y', status: 'completed', conclusion: 'success' }] }, today).blockers[0].reason, 'FAILED_WITHOUT_FAILED_JOB')
  assert.equal(evaluateEligibilityV1(policy, sha, [run(1, 'CI', 'success'), run(2, 'Audit', 'failure')], {}, today).blockers[0].reason, 'JOBS_UNAVAILABLE')
})
test('malformed policies and arguments are rejected', () => {
  for (const bad of [{}, { ...policy, contract: 'x' }, { ...policy, required_workflows: [] }, { ...policy, required_workflows: ['CI', 'CI'] },
    { ...policy, exceptions: [{ ...policy.exceptions[0], approved_by: 'X' }] },
    { ...policy, exceptions: [{ ...policy.exceptions[0], approved_by: ' ', approved_on: '2026-10-22', expires_on: '2026-11-01' }] },
    { ...policy, exceptions: [{ ...policy.exceptions[0], approved_by: 'X', approved_on: '2026-10-22', expires_on: '2026-10-22' }] },
    { ...policy, exceptions: [{ ...policy.exceptions[0], approved_on: '2026-10-22' }] }])
    assert.throws(() => validatePolicyV1(bad), /POLICY_INVALID/)
  assert.throws(() => evaluateEligibilityV1(policy, 'abc', [], {}, today), /ARGUMENTS_REJECTED/)
})
test('only required, completed, non-successful runs of the exact SHA are inspected', async () => {
  const { runsToInspectV1 } = await import('../../scripts/platform/deploy-eligibility.mjs')
  const runs = [run(1, 'CI', 'failure'), run(2, 'Audit', 'success'), run(3, 'Other', 'failure'), run(4, 'CI', 'failure', { head_sha: 'b'.repeat(40) }), run(5, 'Audit', null, { status: 'in_progress' })]
  assert.deepEqual(runsToInspectV1(policy, sha, runs), [1])
})
test('the evaluator reads no environment variable or credential', () => {
  const source = readFileSync(new URL('../../scripts/platform/deploy-eligibility.mjs', import.meta.url), 'utf8')
  assert.ok(!/process\.env|fetch\(|GITHUB_TOKEN|GH_TOKEN/.test(source))
})
