import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizedReconciliationService } from '../../src/assistant/reconciliation.ts'
import type { CapabilityResult, ValueSchema } from '../../src/assistant/contracts.ts'
import type { ReconciliationPersistence, VerifiedReconciliationCommit } from '../../src/assistant/durable-db-contract.ts'
import type { DurableIdempotencyRecord, ReconciliationActor, ReconciliationAuditEvent } from '../../src/assistant/durable-contracts.ts'

const now = new Date('2026-10-11T05:00:00Z')
const actor: ReconciliationActor = { authentication: 'user_session', actorId: 'synthetic-reviewer', workspaceId: 'synthetic-workspace', requestId: 'synthetic-request', permissions: new Set(['assistant:operation:reconcile']) }
const result: CapabilityResult = { status: 'SUCCESS', capability: 'crm.task.create', data: { taskRef: 'synthetic-task' } }
const schema: ValueSchema = { type: 'object', properties: { taskRef: { type: 'string', minLength: 1, maxLength: 80 } }, required: ['taskRef'], additionalProperties: false }
const initial: DurableIdempotencyRecord = { operationRef: 'synthetic_operation_0000000001', idempotencyKey: 'synthetic-key', binding: { actorId: 'synthetic-originator', workspaceId: actor.workspaceId, capability: result.capability, argumentsDigest: 'synthetic-digest' }, state: 'reconciliation_required', version: 4, attempt: 1, effectReceiptRef: 'synthetic_original_receipt_0001', createdAt: now.toISOString(), updatedAt: now.toISOString(), leaseExpiresAt: now.toISOString() }
type Stage = 'initial' | 'verifier' | 'authorize' | 'commit' | 'reload' | 'reauthorize' | 'audit'
function fixture(options: { outcome?: 'completed' | 'failed_retryable' | 'failed_terminal'; mutate?: (record: DurableIdempotencyRecord) => void; receiptOnly?: boolean; hold?: Stage; beforeStage?: (stage: Stage) => void; revokeAfterCommit?: boolean; borrowedInitial?: boolean; mutateOriginal?: (record: DurableIdempotencyRecord) => void } = {}) {
 const outcome = options.outcome ?? 'completed'
 const request = { operationRef: initial.operationRef, expectedVersion: 4, requestedOutcome: outcome, reason: outcome === 'completed' ? 'provider_receipt' : 'verified_effect_absence' }
 let current = structuredClone(initial), reads = 0, checks = 0, commits = 0, late!: () => void, entered: Stage | undefined
 const intents: VerifiedReconciliationCommit[] = [], diagnostics: ReconciliationAuditEvent[] = []
 async function stage(name: Stage) {
  options.beforeStage?.(name)
  if (options.hold === name) { entered = name; await new Promise<void>(resolve => { late = resolve }) }
 }
 const persistence: ReconciliationPersistence = {
  async loadAuthorizedOperation() { await stage(++reads === 1 ? 'initial' : 'reload'); if (reads === 1 && options.borrowedInitial) return current; const copy = structuredClone(current); if (reads > 1 && !options.receiptOnly) options.mutate?.(copy); return copy },
  async commitVerifiedReconciliation(command) {
   await stage('commit'); commits++; intents.push(structuredClone(command)); options.mutateOriginal?.(current)
   current = { ...current, state: command.resolution.outcome, version: current.version + 1 }
   if (command.resolution.outcome === 'completed') { current.result = structuredClone(command.resolution.result); delete current.failureCode }
   else { current.failureCode = command.resolution.failureCode; delete current.result }
   const copy = structuredClone(current); if (options.receiptOnly) options.mutate?.(copy)
   return { status: 'applied', record: copy, eventRef: command.eventRef, auditIntentPersisted: true }
  },
 }
 const service = new AuthorizedReconciliationService({ persistence, outputSchemas: new Map([[result.capability, schema]]),
  verifier: { async verify() { await stage('verifier'); return outcome === 'completed' ? { outcome: 'effect_applied', result: structuredClone(result) } : { outcome: 'effect_absent' } } },
  async authorizeResult() { await stage(++checks === 1 ? 'authorize' : 'reauthorize'); return !(options.revokeAfterCommit && commits > 0) },
  audit: { async emit(event) { await stage('audit'); diagnostics.push(structuredClone(event)) } },
 })
 return { service, request, commits: () => commits, intents, diagnostics, checks: () => checks, entered: () => entered, release: () => late() }
}

test('completed reconciliation certifies the exact verified result in both commit receipt and authorized reread', async () => {
 for (const receiptOnly of [false, true]) for (const mutate of [
  (r: DurableIdempotencyRecord) => { delete r.result },
  (r: DurableIdempotencyRecord) => { r.result = { ...result, data: { taskRef: 'another-task' } } },
  (r: DurableIdempotencyRecord) => { r.result = { ...result, data: { taskRef: 'synthetic-task', privateField: 'unexpected' } } },
  (r: DurableIdempotencyRecord) => { r.failureCode = 'internal_safe' },
 ]) {
  const f = fixture({ mutate, receiptOnly }); const actual = await f.service.reconcile(actor, f.request, now)
  assert.equal(actual.status, 'UNAVAILABLE'); assert.equal(actual.error?.code, 'reconciliation_read_after_write_failed'); assert.equal(f.commits(), 1)
 }
 const valid = fixture(); assert.equal((await valid.service.reconcile(actor, valid.request, now)).status, 'SUCCESS')
 assert.equal(valid.checks(), 2); assert.deepEqual(valid.intents[0].resolution, { outcome: 'completed', result })
 assert.equal(valid.intents[0].auditIntent.decision, 'completed'); assert.equal(valid.diagnostics.length, 0)
})

test('verified absence preserves its exact failure code and never certifies an unexpected result', async () => {
 for (const outcome of ['failed_retryable', 'failed_terminal'] as const) {
  const valid = fixture({ outcome }); assert.equal((await valid.service.reconcile(actor, valid.request, now)).status, 'SUCCESS')
  for (const receiptOnly of [false, true]) for (const mutate of [
   (r: DurableIdempotencyRecord) => { delete r.failureCode },
   (r: DurableIdempotencyRecord) => { r.failureCode = 'different_failure' },
   (r: DurableIdempotencyRecord) => { r.result = structuredClone(result) },
  ]) { const f = fixture({ outcome, mutate, receiptOnly }); assert.equal((await f.service.reconcile(actor, f.request, now)).status, 'UNAVAILABLE') }
 }
})

test('reconciliation preserves original receipt attempt creation and lease in both terminal records', async () => {
 for (const receiptOnly of [false, true]) for (const mutate of [
  (r: DurableIdempotencyRecord) => { r.effectReceiptRef = 'another_receipt_00000000001' },
  (r: DurableIdempotencyRecord) => { delete r.effectReceiptRef },
  (r: DurableIdempotencyRecord) => { r.attempt++ },
  (r: DurableIdempotencyRecord) => { r.createdAt = new Date(now.getTime() - 1).toISOString() },
  (r: DurableIdempotencyRecord) => { r.leaseExpiresAt = new Date(now.getTime() + 1).toISOString() },
 ]) { const f = fixture({ mutate, receiptOnly }); assert.equal((await f.service.reconcile(actor, f.request, now)).status, 'UNAVAILABLE') }
})

test('resource revocation after reconciliation commit cannot certify success or replace its original intent', async () => {
 const f = fixture({ revokeAfterCommit: true }); const actual = await f.service.reconcile(actor, f.request, now)
 assert.equal(actual.status, 'FORBIDDEN'); assert.equal(actual.error?.code, 'reconciliation_result_forbidden')
 assert.equal(f.commits(), 1); assert.equal(f.intents.length, 1); assert.equal(f.intents[0].auditIntent.decision, 'completed')
})

test('an adapter cannot move a borrowed original receipt across the commit await', async () => {
 const f = fixture({ borrowedInitial: true, mutateOriginal(record) { record.effectReceiptRef = 'different_receipt_0000000001'; record.attempt++ } })
 const actual = await f.service.reconcile(actor, f.request, now)
 assert.equal(actual.status, 'UNAVAILABLE'); assert.equal(actual.error?.code, 'reconciliation_read_after_write_failed')
 assert.equal(f.commits(), 1); assert.equal(f.intents.length, 1)
})

test('every blocked reconciliation dependency is bounded and late verifier or lookup cannot start a commit', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] })
 for (const hold of ['initial', 'verifier', 'authorize', 'commit', 'reload', 'reauthorize', 'audit'] as const) {
  const f = fixture({ hold }); const task = f.service.reconcile(hold === 'audit' ? { ...actor, permissions: new Set() } : actor, f.request, now)
  for (let i = 0; i < 150; i++) await Promise.resolve()
  assert.equal(f.entered(), hold); t.mock.timers.tick(10000)
  assert.equal((await task).status, 'UNAVAILABLE'); const committedAtReturn = f.commits()
  f.release(); for (let i = 0; i < 150; i++) await Promise.resolve()
  if (['initial', 'verifier', 'authorize'].includes(hold)) assert.equal(f.commits(), 0)
  if (['reload', 'reauthorize', 'audit'].includes(hold)) assert.equal(f.commits(), committedAtReturn)
  // A timed out commit may already have happened: availability is never absence.
 }
})

test('reconciliation shares one deadline across dependency stages', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] })
 const f = fixture({ hold: 'authorize', beforeStage(stage) { if (stage === 'verifier') t.mock.timers.tick(6000) } })
 const task = f.service.reconcile(actor, f.request, now)
 let settled = false; void task.then(() => { settled = true })
 for (let i = 0; i < 150; i++) await Promise.resolve()
 assert.equal(f.entered(), 'authorize'); t.mock.timers.tick(4000)
 try {
  for (let i = 0; i < 150; i++) await Promise.resolve()
  assert.equal(settled, true, 'whole reconciliation deadline was replaced with a fresh stage deadline')
  assert.equal((await task).status, 'UNAVAILABLE')
 } finally { f.release(); t.mock.timers.tick(10000); await task }
 for (let i = 0; i < 150; i++) await Promise.resolve()
 assert.equal(f.commits(), 0)
})
