import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialMutationUiState,
  toConfirmationTransportIntent,
  transitionMutationUi,
  type OpaqueConfirmationRef,
  type ServerConfirmationPreview,
} from './w2-assistant-mutation-ui.ts'

const preview: ServerConfirmationPreview = {
  confirmationId: 'server-issued-confirmation-0001' as OpaqueConfirmationRef,
  expiresAt: '2026-09-26T10:05:00Z',
  risk: 'sensitive_write',
  title: 'Actualizar tarea',
  summary: 'Vista previa sintética.',
  allowedActions: ['confirm', 'cancel'],
}

const safeError = {
  code: 'temporarily_unavailable' as const,
  message: 'No se ha podido comprobar el estado.',
  retryable: true,
}

test('Issue #10 gate blocks every preview by default', () => {
  const initial = initialMutationUiState()
  const attemptedPreview = transitionMutationUi(initial, {
    type: 'server_preview_received',
    preview,
  })

  assert.deepEqual(attemptedPreview, initial)
  assert.equal(toConfirmationTransportIntent(attemptedPreview), null)
})

test('accepted gate is required before a server preview can appear', () => {
  const accepted = transitionMutationUi(initialMutationUiState(), {
    type: 'release_gate_changed',
    gate: { status: 'accepted', acceptedSha: 'accepted-sha-fixture' },
  })
  const previewState = transitionMutationUi(accepted, {
    type: 'server_preview_received',
    preview,
  })

  assert.equal(previewState.status, 'preview')
})

test('confirm intent reuses the exact opaque server ID and no workspace scope', () => {
  const accepted = transitionMutationUi(initialMutationUiState(), {
    type: 'release_gate_changed',
    gate: { status: 'accepted', acceptedSha: 'accepted-sha-fixture' },
  })
  const previewState = transitionMutationUi(accepted, {
    type: 'server_preview_received',
    preview,
  })
  const submitting = transitionMutationUi(previewState, {
    type: 'confirm_requested',
  })
  const intent = toConfirmationTransportIntent(submitting)

  assert.deepEqual(intent, {
    type: 'confirm',
    confirmationId: preview.confirmationId,
  })
  assert.equal(Object.hasOwn(intent ?? {}, 'workspaceId'), false)
  assert.equal(Object.hasOwn(intent ?? {}, 'payload'), false)
})

test('access revocation discards preview and transport intent', () => {
  const accepted = transitionMutationUi(initialMutationUiState(), {
    type: 'release_gate_changed',
    gate: { status: 'accepted', acceptedSha: 'accepted-sha-fixture' },
  })
  const previewState = transitionMutationUi(accepted, {
    type: 'server_preview_received',
    preview,
  })
  const forbidden = transitionMutationUi(previewState, {
    type: 'access_revoked',
  })

  assert.deepEqual(forbidden, { status: 'forbidden' })
  assert.equal(toConfirmationTransportIntent(forbidden), null)
})

test('uncertain results offer status refresh, never blind confirmation retry', () => {
  const accepted = transitionMutationUi(initialMutationUiState(), {
    type: 'release_gate_changed',
    gate: { status: 'accepted', acceptedSha: 'accepted-sha-fixture' },
  })
  const previewState = transitionMutationUi(accepted, {
    type: 'server_preview_received',
    preview,
  })
  const submitting = transitionMutationUi(previewState, {
    type: 'confirm_requested',
  })
  const reconciliation = transitionMutationUi(submitting, {
    type: 'server_reconciliation_pending',
    title: 'Comprobando el resultado',
    correlationId: 'fixture-correlation-1',
  })

  assert.deepEqual(reconciliation, {
    status: 'reconciliation_pending',
    title: 'Comprobando el resultado',
    confirmationId: preview.confirmationId,
    correlationId: 'fixture-correlation-1',
    nextIntent: 'refresh_status',
  })
  assert.deepEqual(toConfirmationTransportIntent(reconciliation), {
    type: 'refresh_status',
    confirmationId: preview.confirmationId,
  })
})

test('retryable failure is safe and does not re-enable confirm/cancel', () => {
  const accepted = transitionMutationUi(initialMutationUiState(), {
    type: 'release_gate_changed',
    gate: { status: 'accepted', acceptedSha: 'accepted-sha-fixture' },
  })
  const previewState = transitionMutationUi(accepted, {
    type: 'server_preview_received',
    preview,
  })
  const submitting = transitionMutationUi(previewState, {
    type: 'confirm_requested',
  })
  const failure = transitionMutationUi(submitting, {
    type: 'server_retryable_failure',
    title: 'Estado no disponible',
    error: safeError,
  })

  assert.equal(failure.status, 'retryable_failure')
  assert.deepEqual(toConfirmationTransportIntent(failure), {
    type: 'refresh_status',
    confirmationId: preview.confirmationId,
  })
})
