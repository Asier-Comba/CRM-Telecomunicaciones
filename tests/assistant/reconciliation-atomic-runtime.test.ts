import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizedReconciliationService } from '../../src/assistant/reconciliation.ts'
import type { ReconciliationPersistence, VerifiedReconciliationCommit, ReconciliationCommitDecision } from '../../src/assistant/durable-db-contract.ts'
import type { DurableIdempotencyRecord, ReconciliationActor } from '../../src/assistant/durable-contracts.ts'

const now = new Date('2026-09-27T15:00:00Z')
const actor: ReconciliationActor = { actorId: 'reviewer', workspaceId: 'workspace-a', authentication: 'user_session', permissions: new Set(['assistant:operation:reconcile']), requestId: 'request-a' }
const initial: DurableIdempotencyRecord = {
  operationRef: 'operation_opaque_000000000001', idempotencyKey: 'idem-a',
  binding: { actorId: 'originator', workspaceId: 'workspace-a', capability: 'crm.task.create', argumentsDigest: 'digest-a' },
  state: 'reconciliation_required', attempt: 1, version: 4, leaseExpiresAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
}
const request = { operationRef: initial.operationRef, expectedVersion: 4, requestedOutcome: 'failed_terminal', reason: 'verified_effect_absence' }
type Backing = { record: DurableIdempotencyRecord; intents: Map<string, VerifiedReconciliationCommit>; commits: number }
const backing = (): Backing => ({ record: structuredClone(initial), intents: new Map(), commits: 0 })

/** In-process fault model. No database, disk, process restart or RLS claim. */
class ReferencePort implements ReconciliationPersistence {
  crash: 'before_commit' | 'after_commit' | undefined
  authorized = true
  constructor(readonly memory: Backing) {}
  async loadAuthorizedOperation(principal: ReconciliationActor, ref: string) {
    return principal.workspaceId === this.memory.record.binding.workspaceId && ref === this.memory.record.operationRef && this.authorized ? structuredClone(this.memory.record) : null
  }
  async commitVerifiedReconciliation(cmd: VerifiedReconciliationCommit): Promise<ReconciliationCommitDecision> {
    if (!this.authorized) return { status: 'forbidden' }
    if (cmd.actor.workspaceId !== this.memory.record.binding.workspaceId || JSON.stringify(cmd.binding) !== JSON.stringify(this.memory.record.binding)) return { status: 'binding_mismatch' }
    if (cmd.expectedVersion !== this.memory.record.version) return { status: 'version_conflict' }
    const next = structuredClone(this.memory.record)
    next.state = cmd.resolution.outcome; next.version++
    const intent = structuredClone(cmd)
    if (this.crash === 'before_commit') throw new Error('precommit')
    this.memory.record = next
    this.memory.intents.set(cmd.eventRef, intent)
    this.memory.commits++
    if (this.crash === 'after_commit') throw new Error('reply_lost')
    return { status: 'applied', record: structuredClone(next), eventRef: cmd.eventRef, auditIntentPersisted: true }
  }
}
const service = (persistence: ReferencePort, audit: { emit(): Promise<void> } = { async emit() {} }) => new AuthorizedReconciliationService({
  persistence, verifier: { async verify() { return { outcome: 'effect_absent' } } }, audit,
})

test('runtime success depends on committed audit intent, not audit delivery availability', async () => {
  const port = new ReferencePort(backing()); let deliveries = 0
  const runtime = service(port, { async emit() { deliveries++; throw new Error('sink_down') } })
  assert.equal((await runtime.reconcile(actor, request, now)).status, 'SUCCESS')
  assert.equal(deliveries, 0)
  assert.equal(port.memory.intents.size, 1)
  assert.equal([...port.memory.intents.values()][0]?.auditIntent.decision, 'failed_terminal')
  assert.equal((await runtime.reconcile(actor, request, now)).status, 'UNAVAILABLE') // diagnostic sink fails
  assert.equal(port.memory.intents.size, 1) // original intent remains, independent of diagnostic
})

test('rollback and lost commit reply preserve deterministic recovery without another transition', async () => {
  for (const crash of ['before_commit', 'after_commit'] as const) {
    const memory = backing(); const port = new ReferencePort(memory); port.crash = crash
    assert.equal((await service(port).reconcile(actor, request, now)).status, 'UNAVAILABLE')
    assert.equal(memory.intents.size, crash === 'before_commit' ? 0 : 1)
    const reconstructed = service(new ReferencePort(memory))
    assert.equal((await reconstructed.reconcile(actor, request, now)).status, crash === 'before_commit' ? 'SUCCESS' : 'CONFLICT')
    assert.equal(memory.commits, 1); assert.equal(memory.intents.size, 1)
  }
})

test('concurrent reconcilers commit one original intent and reauthorize at commit', async () => {
  const memory = backing(); const port = new ReferencePort(memory)
  const results = await Promise.all(Array.from({ length: 20 }, () => service(port).reconcile(actor, request, now)))
  assert.equal(results.filter(result => result.status === 'SUCCESS').length, 1)
  assert.equal(memory.intents.size, 1)
  const revoked = new ReferencePort(backing())
  const runtime = new AuthorizedReconciliationService({ persistence: revoked, audit: { async emit() {} }, verifier: { async verify() { revoked.authorized = false; return { outcome: 'effect_absent' } } } })
  assert.notEqual((await runtime.reconcile(actor, request, now)).status, 'SUCCESS')
  assert.equal(revoked.memory.commits, 0)
})
