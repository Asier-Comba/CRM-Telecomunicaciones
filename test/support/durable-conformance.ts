import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  DurableConfirmationStore,
  DurableIdempotencyStore,
  DurableOutbox,
} from '../../src/assistant/durable-contracts.js'
import type { IdempotencyBinding } from '../../src/assistant/contracts.js'

export type DurableFaultPoint =
  | 'confirmation.cancel'
  | 'idempotency.reserve'
  | 'idempotency.complete'
  | 'outbox.claim'

export type DurableAdapterHarness = {
  confirmations: DurableConfirmationStore
  idempotency: DurableIdempotencyStore
  outbox: DurableOutbox
  failNext(point: DurableFaultPoint): void
  restart(): Promise<DurableAdapterHarness>
}

export type DurableAdapterFactory = () => Promise<DurableAdapterHarness>

const now = new Date('2026-09-26T10:00:00.000Z')
const later = new Date('2026-09-26T10:06:00.000Z')
const lease = new Date('2026-09-26T10:05:00.000Z')
const binding: IdempotencyBinding = {
  actorId: 'actor-a',
  workspaceId: 'workspace-a',
  capability: 'crm.task.create',
  argumentsDigest: 'digest-a',
}

export function registerDurableAdapterConformance(name: string, factory: DurableAdapterFactory): void {
  test(`${name}: confirmation consume is atomic under a twenty-way race`, async () => {
    const harness = await factory()
    const issued = await harness.confirmations.issue(binding, now, lease)
    const decisions = await Promise.all(Array.from({ length: 20 }, () => (
      harness.confirmations.consume(issued.operationRef, binding, now)
    )))

    assert.equal(decisions.filter((decision) => decision.status === 'applied').length, 1)
    assert.equal(decisions.filter((decision) => decision.status === 'already_terminal').length, 19)
    assert.equal((await harness.confirmations.inspect(issued.operationRef, now))?.state, 'consumed')
  })

  test(`${name}: confirmation binding, cancellation outage and expiry fail closed`, async () => {
    const harness = await factory()
    const issued = await harness.confirmations.issue(binding, now, lease)
    const crossActor = { ...binding, actorId: 'actor-b' }
    const crossWorkspace = { ...binding, workspaceId: 'workspace-b' }

    assert.equal((await harness.confirmations.consume(issued.operationRef, crossActor, now)).status, 'binding_mismatch')
    assert.equal((await harness.confirmations.consume(issued.operationRef, crossWorkspace, now)).status, 'binding_mismatch')
    harness.failNext('confirmation.cancel')
    await assert.rejects(harness.confirmations.cancel(issued.operationRef, binding, now), /injected_failure/)
    assert.equal((await harness.confirmations.inspect(issued.operationRef, later))?.state, 'expired')
    assert.equal((await harness.confirmations.consume(issued.operationRef, binding, later)).status, 'expired')
  })

  test(`${name}: idempotency reserve is atomic and binds actor, workspace, capability and arguments`, async () => {
    const harness = await factory()
    const decisions = await Promise.all(Array.from({ length: 20 }, () => (
      harness.idempotency.reserve(binding, 'idem-key-00000001', now, lease)
    )))

    assert.equal(decisions.filter((decision) => decision.status === 'reserved').length, 1)
    assert.equal(decisions.filter((decision) => decision.status === 'existing').length, 19)
    assert.equal((await harness.idempotency.reserve(
      { ...binding, argumentsDigest: 'digest-b' },
      'idem-key-00000001',
      now,
      lease,
    )).status, 'conflict')
    assert.equal((await harness.idempotency.reserve(
      { ...binding, actorId: 'actor-b' },
      'idem-key-00000001',
      now,
      lease,
    )).status, 'conflict')
    assert.equal((await harness.idempotency.reserve(
      { ...binding, workspaceId: 'workspace-b' },
      'idem-key-00000001',
      now,
      lease,
    )).status, 'reserved')
  })

  test(`${name}: reservation outage happens before any business effect`, async () => {
    const harness = await factory()
    let effects = 0
    harness.failNext('idempotency.reserve')
    await assert.rejects(
      harness.idempotency.reserve(binding, 'idem-key-00000001', now, lease),
      /injected_failure/,
    )
    assert.equal(effects, 0)
    effects += 0
  })

  test(`${name}: completed operations replay after process restart`, async () => {
    const harness = await factory()
    const reserved = await harness.idempotency.reserve(binding, 'idem-key-00000001', now, lease)
    assert.equal(reserved.status, 'reserved')
    if (reserved.status !== 'reserved') return
    const executing = await harness.idempotency.startExecution(
      reserved.record.operationRef,
      binding,
      reserved.record.version,
      now,
      lease,
    )
    assert.equal(executing.status, 'applied')
    if (executing.status !== 'applied') return
    const effected = await harness.idempotency.recordEffectApplied(
      executing.record.operationRef,
      binding,
      executing.record.version,
      'receipt-0000000000000001',
      now,
    )
    assert.equal(effected.status, 'applied')
    if (effected.status !== 'applied') return
    const completed = await harness.idempotency.complete(
      effected.record.operationRef,
      binding,
      effected.record.version,
      { status: 'SUCCESS', capability: binding.capability, data: { created: true } },
      now,
    )
    assert.equal(completed.status, 'applied')

    const restarted = await harness.restart()
    const replay = await restarted.idempotency.inspectByKey(binding, 'idem-key-00000001', later)
    assert.equal(replay.status, 'existing')
    if (replay.status === 'existing') {
      assert.equal(replay.record.state, 'completed')
      assert.deepEqual(replay.record.result?.data, { created: true })
    }
  })

  test(`${name}: a pre-effect handler failure can retry with the same operation`, async () => {
    const harness = await factory()
    const reserved = await harness.idempotency.reserve(binding, 'idem-key-00000001', now, lease)
    assert.equal(reserved.status, 'reserved')
    if (reserved.status !== 'reserved') return
    const executing = await harness.idempotency.startExecution(reserved.record.operationRef, binding, reserved.record.version, now, lease)
    assert.equal(executing.status, 'applied')
    if (executing.status !== 'applied') return
    const failed = await harness.idempotency.failBeforeEffect(
      executing.record.operationRef,
      binding,
      executing.record.version,
      'provider_unavailable',
      true,
      now,
    )
    assert.equal(failed.status, 'applied')
    if (failed.status !== 'applied') return
    assert.equal(failed.record.state, 'failed_retryable')
    const retried = await harness.idempotency.retry(failed.record.operationRef, binding, failed.record.version, later, new Date(later.getTime() + 300_000))
    assert.equal(retried.status, 'applied')
    if (retried.status === 'applied') {
      assert.equal(retried.record.state, 'reserved')
      assert.equal(retried.record.attempt, 2)
    }
  })

  test(`${name}: post-effect completion uncertainty requires reconciliation after restart`, async () => {
    const harness = await factory()
    const reserved = await harness.idempotency.reserve(binding, 'idem-key-00000001', now, lease)
    assert.equal(reserved.status, 'reserved')
    if (reserved.status !== 'reserved') return
    const executing = await harness.idempotency.startExecution(reserved.record.operationRef, binding, reserved.record.version, now, lease)
    assert.equal(executing.status, 'applied')
    if (executing.status !== 'applied') return
    const effected = await harness.idempotency.recordEffectApplied(
      executing.record.operationRef,
      binding,
      executing.record.version,
      'receipt-0000000000000001',
      now,
    )
    assert.equal(effected.status, 'applied')
    if (effected.status !== 'applied') return
    harness.failNext('idempotency.complete')
    await assert.rejects(harness.idempotency.complete(
      effected.record.operationRef,
      binding,
      effected.record.version,
      { status: 'SUCCESS', capability: binding.capability, data: { created: true } },
      now,
    ), /injected_failure/)

    const restarted = await harness.restart()
    const pending = await restarted.idempotency.inspectByKey(binding, 'idem-key-00000001', now)
    assert.equal(pending.status, 'existing')
    if (pending.status === 'existing') assert.equal(pending.record.state, 'effect_applied')
    const expired = await restarted.idempotency.inspectByKey(binding, 'idem-key-00000001', later)
    assert.equal(expired.status, 'existing')
    if (expired.status === 'existing') assert.equal(expired.record.state, 'reconciliation_required')
  })

  test(`${name}: outbox claim race permits at most one external effect`, async () => {
    const harness = await factory()
    const reserved = await harness.idempotency.reserve(binding, 'idem-key-00000001', now, lease)
    assert.equal(reserved.status, 'reserved')
    if (reserved.status !== 'reserved') return
    const outbox = await harness.outbox.enqueue(
      reserved.record.operationRef,
      binding,
      { dispatcher: 'crm.task.create', commandRef: 'command-0000000000000001' },
      now,
    )

    const claims = await Promise.all(Array.from({ length: 20 }, (_, index) => (
      harness.outbox.claim(outbox.outboxRef, outbox.version, `worker-${index}`, now, lease)
    )))
    const winners = claims.filter((decision) => decision.status === 'applied')
    assert.equal(winners.length, 1)
    let effects = 0
    effects += winners.length
    assert.equal(effects, 1)
    const winner = winners[0]
    if (!winner || winner.status !== 'applied') return
    const delivered = await harness.outbox.recordDelivered(
      winner.record.outboxRef,
      winner.record.version,
      'receipt-0000000000000001',
      now,
    )
    assert.equal(delivered.status, 'applied')
    const restarted = await harness.restart()
    assert.equal((await restarted.outbox.inspect(outbox.outboxRef, later))?.state, 'delivered')
  })
}
