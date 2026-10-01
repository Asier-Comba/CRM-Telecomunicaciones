import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(path, 'utf8')
const review = JSON.parse(read('.security/reviews/iteration-6.json'))
const gates = JSON.parse(read('.security/release-gates.json'))
const documents = [read('docs/master/SYSTEM_STATE.md'), read('docs/master/agents/W4_STATUS.md')]
assert.equal(gates.acceptedBase, review.heads.base)
for (const [name, decision] of Object.entries(review.decisions)) {
  if (name !== 'CAN_TEST_SYNTHETIC_PREVIEW') assert.equal(gates.decisions[name], decision)
  for (const doc of documents) assert.ok(doc.includes(`${name}: ${decision}`), name)
}
for (const sha of Object.values(review.heads)) {
  assert.match(sha, /^[0-9a-f]{40}$/)
  for (const doc of documents) assert.ok(doc.includes(sha), 'current heads must agree')
}
const frontend = gates.gates.find(gate => gate.id === 'frontend.read')
assert.equal(frontend.status, 'passed')
assert.ok(frontend.evidenceRefs.includes(`commit:${review.heads.preview}`))
for (const name of ['assistant.mutations', 'ci.dependency_review', 'staging.isolated', 'recovery.restore', 'release.production']) {
  assert.equal(gates.gates.find(gate => gate.id === name).status, 'blocked', name)
}
assert.deepEqual(review.openIssues, [10,12,22])
assert.equal(review.production, 'untouched')
assert.equal(review.upstreamCI.browserReport.expected, 4)
assert.equal(review.upstreamCI.browserReport.unexpected, 0)
assert.equal(review.upstreamCI.dependencyReview, 'skipped')
console.log('Current W4 state/heads/preview/release decisions agree; blocked gates remain explicit')
