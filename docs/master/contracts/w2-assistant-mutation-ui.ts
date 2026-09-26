/**
 * Release-gated assistant mutation presentation state.
 *
 * This module is architecture-only while W4 Issue #10 is open. It contains no
 * transport call and cannot authorize or execute a mutation.
 */

import type { SafeUiError } from './w2-presentation-v0.ts'

declare const confirmationBrand: unique symbol
export type OpaqueConfirmationRef = string & {
  readonly [confirmationBrand]: true
}

export type MutationReleaseGate =
  | { status: 'blocked'; reason: 'w4_issue_10_open' }
  | { status: 'accepted'; acceptedSha: string }

export type ServerConfirmationPreview = {
  confirmationId: OpaqueConfirmationRef
  expiresAt: string
  risk: 'safe_write' | 'sensitive_write' | 'irreversible'
  title: string
  summary: string
  allowedActions: readonly ['confirm', 'cancel']
}

export type MutationUiState =
  | { status: 'disabled'; reason: 'w4_issue_10_open' }
  | { status: 'idle'; acceptedSha: string }
  | {
      status: 'preview'
      acceptedSha: string
      preview: ServerConfirmationPreview
    }
  | {
      status: 'submitting'
      acceptedSha: string
      preview: ServerConfirmationPreview
      intent: 'confirm' | 'cancel'
    }
  | { status: 'expired'; title: string }
  | { status: 'cancelled'; title: string }
  | { status: 'succeeded'; title: string; resultSummary?: string }
  | { status: 'conflict'; title: string; error: SafeUiError }
  | {
      status: 'retryable_failure'
      title: string
      error: SafeUiError
      confirmationId: OpaqueConfirmationRef
      nextIntent: 'refresh_status'
    }
  | {
      status: 'reconciliation_pending'
      title: string
      confirmationId: OpaqueConfirmationRef
      correlationId?: string
      nextIntent: 'refresh_status'
    }
  | { status: 'terminal_failure'; title: string; error: SafeUiError }
  | { status: 'forbidden' }

export type MutationUiEvent =
  | { type: 'release_gate_changed'; gate: MutationReleaseGate }
  | { type: 'server_preview_received'; preview: ServerConfirmationPreview }
  | { type: 'confirm_requested' }
  | { type: 'cancel_requested' }
  | { type: 'server_expired'; title: string }
  | { type: 'server_cancelled'; title: string }
  | { type: 'server_succeeded'; title: string; resultSummary?: string }
  | { type: 'server_conflict'; title: string; error: SafeUiError }
  | { type: 'server_retryable_failure'; title: string; error: SafeUiError }
  | {
      type: 'server_reconciliation_pending'
      title: string
      correlationId?: string
    }
  | { type: 'server_terminal_failure'; title: string; error: SafeUiError }
  | { type: 'access_revoked' }

export const initialMutationUiState = (): MutationUiState => ({
  status: 'disabled',
  reason: 'w4_issue_10_open',
})

const isAcceptedState = (
  state: MutationUiState,
): state is Extract<MutationUiState, { acceptedSha: string }> =>
  'acceptedSha' in state

/**
 * The reducer consumes server lifecycle events only. It never creates or
 * changes a confirmation ID and never accepts a workspace selector.
 */
export function transitionMutationUi(
  current: MutationUiState,
  event: MutationUiEvent,
): MutationUiState {
  if (event.type === 'access_revoked') {
    return { status: 'forbidden' }
  }

  if (event.type === 'release_gate_changed') {
    return event.gate.status === 'accepted'
      ? { status: 'idle', acceptedSha: event.gate.acceptedSha }
      : { status: 'disabled', reason: event.gate.reason }
  }

  if (current.status === 'disabled' || current.status === 'forbidden') {
    return current
  }

  if (event.type === 'server_preview_received') {
    if (!isAcceptedState(current)) return current
    return {
      status: 'preview',
      acceptedSha: current.acceptedSha,
      preview: event.preview,
    }
  }

  if (event.type === 'confirm_requested' || event.type === 'cancel_requested') {
    if (current.status !== 'preview') return current
    return {
      status: 'submitting',
      acceptedSha: current.acceptedSha,
      preview: current.preview,
      intent: event.type === 'confirm_requested' ? 'confirm' : 'cancel',
    }
  }

  const confirmationId =
    current.status === 'preview' || current.status === 'submitting'
      ? current.preview.confirmationId
      : current.status === 'retryable_failure' ||
          current.status === 'reconciliation_pending'
        ? current.confirmationId
        : null

  if (confirmationId === null) {
    return current
  }

  switch (event.type) {
    case 'server_expired':
      return { status: 'expired', title: event.title }
    case 'server_cancelled':
      return { status: 'cancelled', title: event.title }
    case 'server_succeeded':
      return {
        status: 'succeeded',
        title: event.title,
        resultSummary: event.resultSummary,
      }
    case 'server_conflict':
      return { status: 'conflict', title: event.title, error: event.error }
    case 'server_retryable_failure':
      return {
        status: 'retryable_failure',
        title: event.title,
        error: event.error,
        confirmationId,
        nextIntent: 'refresh_status',
      }
    case 'server_reconciliation_pending':
      return {
        status: 'reconciliation_pending',
        title: event.title,
        confirmationId,
        correlationId: event.correlationId,
        nextIntent: 'refresh_status',
      }
    case 'server_terminal_failure':
      return {
        status: 'terminal_failure',
        title: event.title,
        error: event.error,
      }
    default:
      return current
  }
}

export type ConfirmationTransportIntent =
  | { type: 'confirm'; confirmationId: OpaqueConfirmationRef }
  | { type: 'cancel'; confirmationId: OpaqueConfirmationRef }
  | { type: 'refresh_status'; confirmationId: OpaqueConfirmationRef }

export function toConfirmationTransportIntent(
  state: MutationUiState,
): ConfirmationTransportIntent | null {
  if (
    state.status === 'retryable_failure' ||
    state.status === 'reconciliation_pending'
  ) {
    return {
      type: 'refresh_status',
      confirmationId: state.confirmationId,
    }
  }

  if (state.status !== 'submitting') return null

  return {
    type: state.intent,
    confirmationId: state.preview.confirmationId,
  }
}
