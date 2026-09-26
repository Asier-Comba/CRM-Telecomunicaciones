import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialMutationUiState,
  parseOperationStatusEnvelopeV1,
  toConfirmationTransportIntent,
  transitionMutationUi,
  type OpaqueConfirmationRef,
  type OpaqueOperationRef,
  type OperationStatusEnvelopeV1,
  type ServerConfirmationPreview,
} from './w2-assistant-mutation-ui.ts'

const operationA = 'operation_reference_fixture_0001' as OpaqueOperationRef
const operationB = 'operation_reference_fixture_0002' as OpaqueOperationRef
const preview: ServerConfirmationPreview = {
  operationRef: operationA,
  confirmationId: 'server-issued-confirmation-0001' as OpaqueConfirmationRef,
  expiresAt: '2026-09-26T10:05:00Z',
  risk: 'sensitive_write',
  title: 'Actualizar tarea',
  summary: 'Vista previa sintética.',
  allowedActions: ['confirm', 'cancel'],
}

const accepted = () =>
  transitionMutationUi(initialMutationUiState(), {
    type: 'release_gate_changed',
    gate: { status: 'accepted', acceptedSha: 'accepted-sha-fixture' },
  })

const previewReady = () => {
  const requesting = transitionMutationUi(accepted(), {
    type: 'preview_requested',
  })
  return transitionMutationUi(requesting, {
    type: 'server_preview_received',
    preview,
  })
}

const statusEnvelope = (
  status: OperationStatusEnvelopeV1['status'],
  operationRef = operationA,
): OperationStatusEnvelopeV1 => {
  const polling = status === 'pending' || status === 'review_required'
  const failed = status === 'failed_retryable' || status === 'failed_terminal'
  return {
    contractVersion: 1,
    operationRef,
    status,
    terminal: status === 'succeeded' || failed,
    updatedAt: '2026-09-26T10:06:00Z',
    resultAvailable: status === 'succeeded',
    ...(polling ? { nextPollAfterMs: 2_000 } : {}),
    ...(failed
      ? {
          notice: {
            code:
              status === 'failed_retryable'
                ? 'operation_failed_retryable'
                : 'operation_failed_terminal',
            retryable: status === 'failed_retryable',
          },
        }
      : {}),
    allowedActions: polling ? (['refresh'] as const) : ([] as const),
  }
}

test('Issue #10 keeps preview and transport release-disabled by default', () => {
  const initial = initialMutationUiState()
  assert.equal(initial.status, 'release_disabled')
  assert.deepEqual(
    transitionMutationUi(initial, { type: 'preview_requested' }),
    initial,
  )
  assert.equal(toConfirmationTransportIntent(initial), null)
})

test('preview and submit reuse exact server refs without workspace or payload', () => {
  const state = transitionMutationUi(previewReady(), {
    type: 'confirm_requested',
  })
  const intent = toConfirmationTransportIntent(state)
  assert.deepEqual(intent, {
    type: 'confirm',
    operationRef: operationA,
    confirmationId: preview.confirmationId,
  })
  assert.equal(Object.hasOwn(intent ?? {}, 'workspaceId'), false)
  assert.equal(Object.hasOwn(intent ?? {}, 'payload'), false)
})

test('access revocation clears every operation and transport intent', () => {
  const revoked = transitionMutationUi(previewReady(), {
    type: 'access_revoked',
  })
  assert.deepEqual(revoked, { status: 'access_revoked' })
  assert.equal(toConfirmationTransportIntent(revoked), null)
})

test('pending and review states allow status refresh only', () => {
  const submitting = transitionMutationUi(previewReady(), {
    type: 'confirm_requested',
  })
  const pending = transitionMutationUi(submitting, {
    type: 'server_submit_accepted',
    operationRef: operationA,
  })
  const review = transitionMutationUi(pending, {
    type: 'operation_status_received',
    envelope: statusEnvelope('review_required'),
  })

  assert.equal(review.status, 'review_required')
  assert.deepEqual(toConfirmationTransportIntent(review), {
    type: 'refresh_status',
    operationRef: operationA,
  })
})

test('late status for an old operation cannot affect the current operation', () => {
  const submitting = transitionMutationUi(previewReady(), {
    type: 'confirm_requested',
  })
  const pending = transitionMutationUi(submitting, {
    type: 'server_submit_accepted',
    operationRef: operationA,
  })
  const late = transitionMutationUi(pending, {
    type: 'operation_status_received',
    envelope: statusEnvelope('succeeded', operationB),
  })
  assert.deepEqual(late, pending)
})

test('a stale same-operation event cannot regress a terminal result', () => {
  const submitting = transitionMutationUi(previewReady(), {
    type: 'confirm_requested',
  })
  const succeeded = transitionMutationUi(submitting, {
    type: 'operation_status_received',
    envelope: statusEnvelope('succeeded'),
  })
  const stale = transitionMutationUi(succeeded, {
    type: 'operation_status_received',
    envelope: statusEnvelope('pending'),
  })
  assert.deepEqual(stale, succeeded)
})

test('failed_retryable is terminal UI state and never retries the write', () => {
  const submitting = transitionMutationUi(previewReady(), {
    type: 'confirm_requested',
  })
  const failed = transitionMutationUi(submitting, {
    type: 'operation_status_received',
    envelope: statusEnvelope('failed_retryable'),
  })
  assert.equal(failed.status, 'failed_retryable')
  assert.equal(toConfirmationTransportIntent(failed), null)
})

test('operation-status parser accepts W3 v1 and returns detached frozen data', () => {
  const source = statusEnvelope('pending') as unknown as Record<string, unknown>
  const result = parseOperationStatusEnvelopeV1(source)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.notEqual(result.value, source)
  assert.equal(Object.isFrozen(result.value), true)
  assert.equal(Object.isFrozen(result.value.allowedActions), true)
})

test('operation-status parser rejects malformed, extra and inconsistent input without throwing', () => {
  const valid = statusEnvelope('pending')
  const cases: unknown[] = [
    null,
    [],
    {},
    { ...valid, workspaceId: 'workspace-forbidden' },
    { ...valid, operationRef: '../operation' },
    { ...valid, status: 'reconciled' },
    { ...valid, terminal: true },
    { ...valid, allowedActions: ['refresh', 'retry'] },
    { ...valid, updatedAt: '2026-02-31T10:00:00Z' },
    { ...valid, updatedAt: '2026-09-26T12:00:00+02:00' },
  ]

  for (const candidate of cases) {
    assert.doesNotThrow(() => parseOperationStatusEnvelopeV1(candidate))
    assert.equal(parseOperationStatusEnvelopeV1(candidate).ok, false)
  }
})
