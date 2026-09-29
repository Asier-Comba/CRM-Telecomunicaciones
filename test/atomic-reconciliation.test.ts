import test from 'node:test'
import assert from 'node:assert/strict'
import { deliverReconciliationAudits, type AtomicAuditOutboxItem, type AtomicOperationSnapshot, type AtomicReconciliationAdapter, type AtomicReconciliationCommand, type AtomicReconciliationDecision, type IdempotentAuditSink } from '../src/assistant/atomic-reconciliation.js'

const CRASH_POINTS = ['before_read', 'after_read', 'after_transition_staged', 'after_audit_staged', 'before_commit', 'after_commit_before_reply', 'after_sink_accept_before_ack'] as const
type CrashPoint = typeof CRASH_POINTS[number]
const key = (workspaceId: string, ref: string): string => JSON.stringify([workspaceId, ref])
const initial: AtomicOperationSnapshot = { workspaceId: 'workspace-a', operationRef: 'operation_opaque_00000001', state: 'reconciliation_required', version: 4, binding: { actorId: 'actor-a', capability: 'crm.task.create', argumentsDigest: 'v1:digest-a' } }
const command: AtomicReconciliationCommand = {
  workspaceId: initial.workspaceId, operationRef: initial.operationRef, expectedVersion: 4, binding: { ...initial.binding },
  resolution: { state: 'completed', safeResultRef: 'safe_result_opaque_00001' }, eventRef: 'audit_event_opaque_000001',
  audit: { event: 'assistant.operation.reconciliation', requestId: 'request-a', actorId: 'reviewer-a', workspaceId: initial.workspaceId, operationRef: initial.operationRef, requestedOutcome: 'completed', decision: 'completed', reasonCode: 'reconciliation_applied' },
}
type Memory = { operations: Map<string, AtomicOperationSnapshot>; events: Map<string, AtomicAuditOutboxItem>; commands: Map<string, string> }
const memory = (): Memory => ({ operations: new Map([[key(initial.workspaceId, initial.operationRef), structuredClone(initial)]]), events: new Map(), commands: new Map() })

/** Synthetic synchronous transaction simulation only. Sharing this map on restart
 * is NOT crash durability, PostgreSQL, locks, RLS or multiprocess evidence.
 */
class SimulationAdapter implements AtomicReconciliationAdapter {
  constructor(readonly backing: Memory, private crash?: CrashPoint) {}
  #fault(point: CrashPoint): void { if (this.crash === point) { this.crash = undefined; throw new Error('simulated_outage') } }
  async commit(input: AtomicReconciliationCommand): Promise<AtomicReconciliationDecision> {
    const cmd = structuredClone(input)
    this.#fault('before_read')
    const operationKey = key(cmd.workspaceId, cmd.operationRef)
    const eventKey = key(cmd.workspaceId, cmd.eventRef)
    const operation = this.backing.operations.get(operationKey)
    if (!operation) return { status: 'not_found' }
    this.#fault('after_read')
    if (operation.binding.actorId !== cmd.binding.actorId || operation.binding.capability !== cmd.binding.capability || operation.binding.argumentsDigest !== cmd.binding.argumentsDigest ||
      cmd.audit.workspaceId !== cmd.workspaceId || cmd.audit.operationRef !== cmd.operationRef ||
      cmd.audit.decision !== cmd.resolution.state || cmd.audit.requestedOutcome !== cmd.resolution.state) return { status: 'binding_mismatch' }
    const original = this.backing.commands.get(eventKey)
    if (original) return original === JSON.stringify(cmd)
      ? { status: 'replayed', operation: structuredClone(operation), eventRef: cmd.eventRef } : { status: 'conflict' }
    if (operation.state !== 'reconciliation_required' || operation.version !== cmd.expectedVersion) return { status: 'conflict' }
    const next: AtomicOperationSnapshot = { ...operation, version: operation.version + 1, state: cmd.resolution.state }
    if (cmd.resolution.state === 'completed') next.safeResultRef = cmd.resolution.safeResultRef
    else next.failureCode = cmd.resolution.failureCode
    this.#fault('after_transition_staged')
    const event: AtomicAuditOutboxItem = { workspaceId: cmd.workspaceId, operationRef: cmd.operationRef, eventRef: cmd.eventRef, event: cmd.audit, status: 'pending' }
    this.#fault('after_audit_staged')
    this.#fault('before_commit')
    // All simulated assignments are synchronous; a real adapter needs one DB transaction.
    this.backing.operations.set(operationKey, next)
    this.backing.events.set(eventKey, event)
    this.backing.commands.set(eventKey, JSON.stringify(cmd))
    this.#fault('after_commit_before_reply')
    return { status: 'applied', operation: structuredClone(next), eventRef: cmd.eventRef }
  }
  async inspect(workspaceId: string, operationRef: string): Promise<AtomicOperationSnapshot | null> { return structuredClone(this.backing.operations.get(key(workspaceId, operationRef)) ?? null) }
  async pendingAudits(workspaceId: string, limit: number): Promise<AtomicAuditOutboxItem[]> { return [...this.backing.events.values()].filter(item => item.workspaceId === workspaceId && item.status === 'pending').slice(0, limit).map(item => structuredClone(item)) }
  async acknowledgeAudit(workspaceId: string, eventRef: string): Promise<void> {
    this.#fault('after_sink_accept_before_ack')
    const item = this.backing.events.get(key(workspaceId, eventRef))
    if (!item) throw new Error('event_not_found')
    item.status = 'delivered'
  }
}
class DedupeSink implements IdempotentAuditSink {
  readonly delivered = new Map<string, string>()
  attempts = 0
  async accept(item: AtomicAuditOutboxItem): Promise<void> {
    this.attempts++
    const eventKey = key(item.workspaceId, item.eventRef)
    const content = JSON.stringify(item.event)
    const previous = this.delivered.get(eventKey)
    if (previous && previous !== content) throw new Error('event_conflict')
    this.delivered.set(eventKey, content)
  }
}

for (const point of CRASH_POINTS) test(`atomic candidate simulation: ${point} preserves transition/audit coupling`, async () => {
  const backing = memory()
  const adapter = new SimulationAdapter(backing, point)
  const sink = new DedupeSink()
  if (point === 'after_sink_accept_before_ack') {
    assert.equal((await adapter.commit(command)).status, 'applied')
    assert.equal((await deliverReconciliationAudits(adapter, sink, command.workspaceId)).unavailable, true)
  } else {
    await assert.rejects(adapter.commit(command), /simulated_outage/)
  }
  const committed = point === 'after_commit_before_reply' || point === 'after_sink_accept_before_ack'
  assert.equal((await adapter.inspect(command.workspaceId, command.operationRef))!.state, committed ? 'completed' : 'reconciliation_required')
  assert.equal(backing.events.size, committed ? 1 : 0)
  const restarted = new SimulationAdapter(backing)
  assert.equal((await restarted.commit(command)).status, committed ? 'replayed' : 'applied')
  assert.deepEqual(await deliverReconciliationAudits(restarted, sink, command.workspaceId), { acknowledged: 1, unavailable: false })
  assert.equal(sink.delivered.size, 1)
  assert.equal(backing.events.size, 1)
  if (point === 'after_sink_accept_before_ack') assert.equal(sink.attempts, 2)
})
test('atomic candidate twenty-way same-command race has one transition and one original audit', async () => {
  const backing = memory(); const adapter = new SimulationAdapter(backing)
  const decisions = await Promise.all(Array.from({ length: 20 }, () => adapter.commit(command)))
  assert.equal(decisions.filter(result => result.status === 'applied').length, 1)
  assert.equal(decisions.filter(result => result.status === 'replayed').length, 19)
  assert.equal(backing.events.size, 1)
  assert.equal((await adapter.inspect(command.workspaceId, command.operationRef))!.version, 5)
})
test('atomic candidate rejects foreign workspace, changed binding/version and event-ref replay tampering', async () => {
  const adapter = new SimulationAdapter(memory())
  assert.equal((await adapter.commit({ ...command, workspaceId: 'workspace-b' })).status, 'not_found')
  assert.equal((await adapter.commit({ ...command, expectedVersion: 3 })).status, 'conflict')
  assert.equal((await adapter.commit({ ...command, binding: { ...command.binding, actorId: 'other' } })).status, 'binding_mismatch')
  assert.equal((await adapter.commit(command)).status, 'applied')
  assert.equal((await adapter.commit({ ...command, resolution: { state: 'completed', safeResultRef: 'forged' } })).status, 'conflict')
  assert.deepEqual(await adapter.pendingAudits('workspace-b', 20), [])
})
test('audit sink outage preserves pending original event and does not repeat operation transition', async () => {
  const adapter = new SimulationAdapter(memory())
  await adapter.commit(command)
  assert.equal((await deliverReconciliationAudits(adapter, { async accept() { throw new Error('private outage') } }, command.workspaceId)).unavailable, true)
  assert.equal((await adapter.pendingAudits(command.workspaceId, 20)).length, 1)
  assert.equal((await adapter.commit(command)).status, 'replayed')
  assert.equal((await adapter.inspect(command.workspaceId, command.operationRef))!.version, 5)
})

test('audit worker refuses foreign event scopes and raw provider fields before external delivery', async () => {
  for (const mutate of [
    (item: AtomicAuditOutboxItem) => { item.event.workspaceId = 'workspace-b' },
    (item: AtomicAuditOutboxItem) => { Object.assign(item.event, { providerPayload: 'raw' }) },
  ]) {
    const backing = memory(); const adapter = new SimulationAdapter(backing); const sink = new DedupeSink()
    await adapter.commit(command)
    mutate(backing.events.values().next().value!)
    assert.equal((await deliverReconciliationAudits(adapter, sink, command.workspaceId)).unavailable, true)
    assert.equal(sink.attempts, 0)
    assert.equal((await adapter.pendingAudits(command.workspaceId, 20)).length, 1)
  }
})
