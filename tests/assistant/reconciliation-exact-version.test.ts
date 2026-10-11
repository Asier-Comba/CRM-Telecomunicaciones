import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizedReconciliationService } from '../../src/assistant/reconciliation.ts'
import type { ReconciliationPersistence } from '../../src/assistant/durable-db-contract.ts'
import type { DurableIdempotencyRecord, ReconciliationActor } from '../../src/assistant/durable-contracts.ts'

const now = new Date('2026-10-10T01:30:00Z')
const actor: ReconciliationActor = {
  actorId: 'synthetic-reviewer', workspaceId: 'synthetic-workspace', authentication: 'user_session',
  permissions: new Set(['assistant:operation:reconcile']), requestId: 'synthetic-request',
}

/** Deliberately inconsistent in-process adapter. No physical durability claim. */
function fixture(initialVersion: number, reportedVersion: number) {
  let reads = 0
  let commits = 0
  let current: DurableIdempotencyRecord = {
    operationRef: 'synthetic_operation_0000000001', idempotencyKey: 'synthetic_idempotency',
    binding: { actorId: 'synthetic-originator', workspaceId: actor.workspaceId,
      capability: 'crm.task.create', argumentsDigest: 'synthetic-digest' },
    state: 'reconciliation_required', attempt: 1, version: initialVersion,
    leaseExpiresAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
  }
  const request = { operationRef: current.operationRef, expectedVersion: initialVersion,
    requestedOutcome: 'failed_terminal', reason: 'verified_effect_absence' }
  const persistence: ReconciliationPersistence = {
    async loadAuthorizedOperation() { reads++; return structuredClone(current) },
    async commitVerifiedReconciliation(command) {
      commits++
      current = { ...current, state: 'failed_terminal', version: reportedVersion }
      return { status: 'applied', record: structuredClone(current), eventRef: command.eventRef, auditIntentPersisted: true }
    },
  }
  const service = new AuthorizedReconciliationService({ persistence,
    verifier: { async verify() { return { outcome: 'effect_absent' } } }, audit: { async emit() {} } })
  return { service, request, reads: () => reads, commits: () => commits }
}

test('matching adapter receipt and reread cannot certify a skipped reconciliation version', async () => {
  const valid = fixture(4, 5)
  assert.equal((await valid.service.reconcile(actor, valid.request, now)).status, 'SUCCESS')
  const skipped = fixture(4, 6)
  const result = await skipped.service.reconcile(actor, skipped.request, now)
  assert.equal(result.status, 'UNAVAILABLE')
  assert.equal(result.error?.code, 'reconciliation_read_after_write_failed')
  assert.equal(skipped.commits(), 1)
  assert.equal(skipped.reads(), 2)
})

test('a reconciliation with no safe next version is rejected before lookup or commit', async () => {
  const exhausted = fixture(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1)
  const result = await exhausted.service.reconcile(actor, exhausted.request, now)
  assert.equal(result.status, 'INVALID_INPUT')
  assert.equal(result.operationRef, 'invalid_operation_reference')
  assert.equal(exhausted.reads(), 0)
  assert.equal(exhausted.commits(), 0)
  const lastSafe = fixture(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER)
  assert.equal((await lastSafe.service.reconcile(actor, lastSafe.request, now)).status, 'SUCCESS')
})
