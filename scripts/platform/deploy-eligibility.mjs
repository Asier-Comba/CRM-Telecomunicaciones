// Staging deploy eligibility for one exact commit (w5.staging-deploy-eligibility.v1).
// The policy is read from the trusted workflow ref, never from the candidate.
// A source is eligible only when every required workflow completed on that SHA
// and every failed job is covered by an exception that names an approver and has
// not expired. Unapproved exception proposals (approved_by null) admit nothing.
import { readFileSync } from 'node:fs'

const sha40 = /^[0-9a-f]{40}$/
const day = /^\d{4}-\d{2}-\d{2}$/
const failedJob = job => job.status === 'completed' && !['success', 'skipped', 'neutral'].includes(job.conclusion)

export function validatePolicyV1(policy) {
  if (policy?.contract !== 'w5.staging-deploy-eligibility.v1' || !Array.isArray(policy.required_workflows) || !policy.required_workflows.length
    || new Set(policy.required_workflows).size !== policy.required_workflows.length || !Array.isArray(policy.exceptions)) throw new Error('POLICY_INVALID')
  for (const e of policy.exceptions) {
    if (typeof e?.workflow !== 'string' || typeof e.job !== 'string' || typeof e.finding !== 'string') throw new Error('POLICY_INVALID')
    const approved = e.approved_by !== null
    if (approved && (typeof e.approved_by !== 'string' || !e.approved_by.trim() || !day.test(e.approved_on ?? '') || !day.test(e.expires_on ?? '') || e.expires_on <= e.approved_on)) throw new Error('POLICY_INVALID')
    if (!approved && (e.approved_on !== null || e.expires_on !== null)) throw new Error('POLICY_INVALID')
  }
  return policy
}

/** runs: workflow runs for the SHA ({id,name,status,conclusion,run_attempt,created_at});
 * jobsByRun: {runId: [{name,status,conclusion}]}; today: YYYY-MM-DD (UTC). */
export function evaluateEligibilityV1(policy, sha, runs, jobsByRun, today) {
  validatePolicyV1(policy)
  if (!sha40.test(sha ?? '') || !day.test(today ?? '')) throw new Error('ARGUMENTS_REJECTED')
  const blockers = [], admitted = []
  for (const name of policy.required_workflows) {
    const latest = runs.filter(r => r.name === name && r.head_sha === sha).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
    if (!latest) { blockers.push({ workflow: name, reason: 'NOT_RUN' }); continue }
    if (latest.status !== 'completed') { blockers.push({ workflow: name, reason: 'NOT_COMPLETED' }); continue }
    if (latest.conclusion === 'success') continue
    const jobs = jobsByRun[latest.id]
    if (!Array.isArray(jobs) || !jobs.length) { blockers.push({ workflow: name, reason: 'JOBS_UNAVAILABLE' }); continue }
    const failed = jobs.filter(failedJob)
    if (!failed.length) { blockers.push({ workflow: name, reason: 'FAILED_WITHOUT_FAILED_JOB' }); continue }
    for (const job of failed) {
      const exception = policy.exceptions.find(e => e.workflow === name && e.job === job.name && e.approved_by !== null && today <= e.expires_on)
      if (exception) admitted.push({ workflow: name, job: job.name, approved_by: exception.approved_by, expires_on: exception.expires_on })
      else blockers.push({ workflow: name, job: job.name, reason: policy.exceptions.some(e => e.workflow === name && e.job === job.name && e.approved_by !== null) ? 'EXCEPTION_EXPIRED' : 'FAILED_NOT_EXCEPTED' })
    }
  }
  return { contract: policy.contract, sha, eligible: blockers.length === 0, blockers, admitted_exceptions: admitted }
}

/** Required workflow runs on this SHA whose jobs must be inspected (not success). */
export function runsToInspectV1(policy, sha, runs) {
  validatePolicyV1(policy)
  return runs.filter(r => r.head_sha === sha && policy.required_workflows.includes(r.name) && r.status === 'completed' && r.conclusion !== 'success').map(r => r.id)
}

// CLI reads only files fetched by the workflow with its ephemeral token; it reads
// no environment variable or credential itself.
//   deploy-eligibility.mjs inspect <policy.json> <sha> <runs.json>        -> run ids, space separated
//   deploy-eligibility.mjs evaluate <policy.json> <sha> <runs.json> <dir>  -> dir holds jobs-<runId>.json
if (process.argv[1]?.endsWith('deploy-eligibility.mjs')) {
  try {
    const [command, policyPath, sha, runsPath, jobsDir] = process.argv.slice(2)
    if (!['inspect', 'evaluate'].includes(command) || !policyPath || !sha40.test(sha ?? '') || !runsPath) throw new Error('ARGUMENTS_REJECTED')
    const policy = validatePolicyV1(JSON.parse(readFileSync(policyPath, 'utf8')))
    const runs = JSON.parse(readFileSync(runsPath, 'utf8')).workflow_runs ?? []
    if (command === 'inspect') console.log(runsToInspectV1(policy, sha, runs).join(' '))
    else {
      if (!jobsDir) throw new Error('ARGUMENTS_REJECTED')
      const jobsByRun = Object.fromEntries(runsToInspectV1(policy, sha, runs).map(id => [id, JSON.parse(readFileSync(jobsDir + '/jobs-' + id + '.json', 'utf8')).jobs ?? []]))
      const result = evaluateEligibilityV1(policy, sha, runs, jobsByRun, new Date().toISOString().slice(0, 10))
      console.log(JSON.stringify(result, null, 2))
      if (!result.eligible) process.exitCode = 1
    }
  } catch (error) {
    console.error(/^[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'ELIGIBILITY_UNAVAILABLE'); process.exitCode = 1
  }
}
