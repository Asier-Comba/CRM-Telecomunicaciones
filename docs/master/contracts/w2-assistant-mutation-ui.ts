/**
 * Release-disabled assistant mutation presentation and W3 operation-status
 * consumer. It contains no transport, reconciliation or execution logic.
 */

import {
  accept,
  isRecord,
  isStrictIsoUtcDateTime,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'

declare const confirmationBrand: unique symbol
declare const operationBrand: unique symbol

export type OpaqueConfirmationRef = string & {
  readonly [confirmationBrand]: true
}
export type OpaqueOperationRef = string & {
  readonly [operationBrand]: true
}

export type MutationReleaseGate =
  | { status: 'blocked'; reason: 'w4_issue_10_open' }
  | { status: 'accepted'; acceptedSha: string }

export type ServerConfirmationPreview = {
  operationRef: OpaqueOperationRef
  confirmationId: OpaqueConfirmationRef
  expiresAt: string
  risk: 'safe_write' | 'sensitive_write' | 'irreversible'
  title: string
  summary: string
  allowedActions: readonly ['confirm', 'cancel']
}

export type PublicOperationStatus =
  | 'pending'
  | 'review_required'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_terminal'

export type OperationStatusEnvelopeV1 = {
  readonly contractVersion: 1
  readonly operationRef: OpaqueOperationRef
  readonly status: PublicOperationStatus
  readonly terminal: boolean
  readonly updatedAt: string
  readonly resultAvailable: boolean
  readonly nextPollAfterMs?: number
  readonly notice?: Readonly<{ code: string; retryable: boolean }>
  readonly allowedActions: readonly ['refresh'] | readonly []
}

const operationEnvelopeKeys = [
  'contractVersion',
  'operationRef',
  'status',
  'terminal',
  'updatedAt',
  'resultAvailable',
  'nextPollAfterMs',
  'notice',
  'allowedActions',
] as const
const operationEnvelopeRequired = [
  'contractVersion',
  'operationRef',
  'status',
  'terminal',
  'updatedAt',
  'resultAvailable',
  'allowedActions',
] as const
const publicStatuses = new Set<PublicOperationStatus>([
  'pending',
  'review_required',
  'succeeded',
  'failed_retryable',
  'failed_terminal',
])
const validOperationRef = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{24,200}$/.test(value)

export const parseOperationStatusEnvelopeV1 = (
  value: unknown,
): RuntimeParseResult<OperationStatusEnvelopeV1> =>
  safelyParseUnknown(
    value,
    (candidate) => {
      if (!isRecord(candidate)) return reject('expected_object', '$')
      const unknown = Object.keys(candidate).find(
        (key) => !operationEnvelopeKeys.includes(key as never),
      )
      if (unknown) return reject('unknown_field', `$.${unknown}`)
      const missing = operationEnvelopeRequired.find(
        (key) => !Object.prototype.hasOwnProperty.call(candidate, key),
      )
      if (missing) return reject('missing_field', `$.${missing}`)
      if (candidate.contractVersion !== 1) {
        return reject('unknown_enum', '$.contractVersion')
      }
      if (!validOperationRef(candidate.operationRef)) {
        return reject('invalid_identifier', '$.operationRef')
      }
      if (
        typeof candidate.status !== 'string' ||
        !publicStatuses.has(candidate.status as PublicOperationStatus)
      ) {
        return reject('unknown_enum', '$.status')
      }
      if (
        typeof candidate.terminal !== 'boolean' ||
        typeof candidate.resultAvailable !== 'boolean'
      ) {
        return reject('wrong_type', '$.terminal')
      }
      if (!isStrictIsoUtcDateTime(candidate.updatedAt)) {
        return reject('invalid_datetime', '$.updatedAt')
      }

      const status = candidate.status as PublicOperationStatus
      const terminal =
        status === 'succeeded' ||
        status === 'failed_retryable' ||
        status === 'failed_terminal'
      if (
        candidate.terminal !== terminal ||
        candidate.resultAvailable !== (status === 'succeeded')
      ) {
        return reject('invalid_value', '$.status')
      }

      const polling = status === 'pending' || status === 'review_required'
      if (polling) {
        if (
          !Number.isInteger(candidate.nextPollAfterMs) ||
          Number(candidate.nextPollAfterMs) < 500 ||
          Number(candidate.nextPollAfterMs) > 60_000 ||
          !Array.isArray(candidate.allowedActions) ||
          candidate.allowedActions.length !== 1 ||
          candidate.allowedActions[0] !== 'refresh'
        ) {
          return reject('invalid_value', '$.allowedActions')
        }
      } else if (
        candidate.nextPollAfterMs !== undefined ||
        !Array.isArray(candidate.allowedActions) ||
        candidate.allowedActions.length !== 0
      ) {
        return reject('invalid_value', '$.allowedActions')
      }

      let notice: Readonly<{ code: string; retryable: boolean }> | undefined
      if (candidate.notice !== undefined) {
        if (
          !isRecord(candidate.notice) ||
          Object.keys(candidate.notice).length !== 2 ||
          !Object.prototype.hasOwnProperty.call(candidate.notice, 'code') ||
          !Object.prototype.hasOwnProperty.call(candidate.notice, 'retryable') ||
          typeof candidate.notice.code !== 'string' ||
          !/^operation_[a-z_]{1,55}$/.test(candidate.notice.code) ||
          typeof candidate.notice.retryable !== 'boolean'
        ) {
          return reject('invalid_value', '$.notice')
        }
        if (
          (status !== 'failed_retryable' && status !== 'failed_terminal') ||
          candidate.notice.retryable !== (status === 'failed_retryable')
        ) {
          return reject('invalid_value', '$.notice')
        }
        notice = Object.freeze({
          code: candidate.notice.code,
          retryable: candidate.notice.retryable,
        })
      } else if (
        status === 'failed_retryable' ||
        status === 'failed_terminal'
      ) {
        return reject('missing_field', '$.notice')
      }

      const allowedActions = Object.freeze(
        polling ? (['refresh'] as const) : ([] as const),
      )
      return accept(
        Object.freeze({
          contractVersion: 1 as const,
          operationRef: candidate.operationRef as OpaqueOperationRef,
          status,
          terminal,
          updatedAt: candidate.updatedAt,
          resultAvailable: status === 'succeeded',
          ...(polling
            ? { nextPollAfterMs: Number(candidate.nextPollAfterMs) }
            : {}),
          ...(notice ? { notice } : {}),
          allowedActions,
        }),
      )
    },
    16 * 1024,
  )

export type MutationUiState =
  | { status: 'release_disabled'; reason: 'w4_issue_10_open' }
  | { status: 'idle'; acceptedSha: string }
  | { status: 'requesting_preview'; acceptedSha: string }
  | {
      status: 'preview_ready'
      acceptedSha: string
      preview: ServerConfirmationPreview
    }
  | {
      status: 'submitting'
      acceptedSha: string
      preview: ServerConfirmationPreview
      intent: 'confirm' | 'cancel'
    }
  | {
      status: 'pending' | 'review_required'
      operationRef: OpaqueOperationRef
      updatedAt?: string
      nextPollAfterMs?: number
    }
  | {
      status: 'succeeded'
      operationRef: OpaqueOperationRef
      updatedAt: string
      resultAvailable: true
    }
  | {
      status: 'failed_retryable' | 'failed_terminal'
      operationRef: OpaqueOperationRef
      updatedAt: string
      notice: Readonly<{ code: string; retryable: boolean }>
    }
  | { status: 'expired'; operationRef: OpaqueOperationRef }
  | { status: 'cancelled'; operationRef: OpaqueOperationRef }
  | { status: 'access_revoked' }

export type MutationUiEvent =
  | { type: 'release_gate_changed'; gate: MutationReleaseGate }
  | { type: 'preview_requested' }
  | { type: 'server_preview_received'; preview: ServerConfirmationPreview }
  | { type: 'confirm_requested' }
  | { type: 'cancel_requested' }
  | { type: 'server_submit_accepted'; operationRef: OpaqueOperationRef }
  | { type: 'operation_status_received'; envelope: OperationStatusEnvelopeV1 }
  | { type: 'server_expired'; operationRef: OpaqueOperationRef }
  | { type: 'server_cancelled'; operationRef: OpaqueOperationRef }
  | { type: 'access_revoked' }

export const initialMutationUiState = (): MutationUiState => ({
  status: 'release_disabled',
  reason: 'w4_issue_10_open',
})

const currentOperationRef = (
  state: MutationUiState,
): OpaqueOperationRef | null => {
  if (state.status === 'preview_ready' || state.status === 'submitting') {
    return state.preview.operationRef
  }
  return 'operationRef' in state ? state.operationRef : null
}

const stateFromEnvelope = (
  envelope: OperationStatusEnvelopeV1,
): MutationUiState => {
  switch (envelope.status) {
    case 'pending':
    case 'review_required':
      return {
        status: envelope.status,
        operationRef: envelope.operationRef,
        updatedAt: envelope.updatedAt,
        nextPollAfterMs: envelope.nextPollAfterMs,
      }
    case 'succeeded':
      return {
        status: 'succeeded',
        operationRef: envelope.operationRef,
        updatedAt: envelope.updatedAt,
        resultAvailable: true,
      }
    case 'failed_retryable':
    case 'failed_terminal':
      return {
        status: envelope.status,
        operationRef: envelope.operationRef,
        updatedAt: envelope.updatedAt,
        notice: envelope.notice!,
      }
  }
}

/** Late events are ignored unless their operationRef matches the active one. */
export function transitionMutationUi(
  current: MutationUiState,
  event: MutationUiEvent,
): MutationUiState {
  if (event.type === 'access_revoked') return { status: 'access_revoked' }
  if (event.type === 'release_gate_changed') {
    return event.gate.status === 'accepted'
      ? { status: 'idle', acceptedSha: event.gate.acceptedSha }
      : { status: 'release_disabled', reason: event.gate.reason }
  }
  if (
    current.status === 'release_disabled' ||
    current.status === 'access_revoked'
  ) {
    return current
  }
  if (event.type === 'preview_requested') {
    return current.status === 'idle'
      ? { status: 'requesting_preview', acceptedSha: current.acceptedSha }
      : current
  }
  if (event.type === 'server_preview_received') {
    return current.status === 'requesting_preview'
      ? {
          status: 'preview_ready',
          acceptedSha: current.acceptedSha,
          preview: event.preview,
        }
      : current
  }
  if (event.type === 'confirm_requested' || event.type === 'cancel_requested') {
    return current.status === 'preview_ready'
      ? {
          status: 'submitting',
          acceptedSha: current.acceptedSha,
          preview: current.preview,
          intent: event.type === 'confirm_requested' ? 'confirm' : 'cancel',
        }
      : current
  }

  if (
    current.status === 'succeeded' ||
    current.status === 'failed_retryable' ||
    current.status === 'failed_terminal' ||
    current.status === 'expired' ||
    current.status === 'cancelled'
  ) {
    return current
  }

  const operationRef = currentOperationRef(current)
  if (operationRef === null) return current

  if (event.type === 'server_submit_accepted') {
    return current.status === 'submitting' && event.operationRef === operationRef
      ? { status: 'pending', operationRef }
      : current
  }
  if (event.type === 'operation_status_received') {
    return event.envelope.operationRef === operationRef
      ? stateFromEnvelope(event.envelope)
      : current
  }
  if (event.type === 'server_expired') {
    return event.operationRef === operationRef &&
      (current.status === 'preview_ready' || current.status === 'submitting')
      ? { status: 'expired', operationRef }
      : current
  }
  if (event.type === 'server_cancelled') {
    return event.operationRef === operationRef &&
      (current.status === 'preview_ready' || current.status === 'submitting')
      ? { status: 'cancelled', operationRef }
      : current
  }
  return current
}

export type ConfirmationTransportIntent =
  | {
      type: 'confirm' | 'cancel'
      operationRef: OpaqueOperationRef
      confirmationId: OpaqueConfirmationRef
    }
  | { type: 'refresh_status'; operationRef: OpaqueOperationRef }

export function toConfirmationTransportIntent(
  state: MutationUiState,
): ConfirmationTransportIntent | null {
  if (state.status === 'pending' || state.status === 'review_required') {
    return { type: 'refresh_status', operationRef: state.operationRef }
  }
  if (state.status !== 'submitting') return null
  return {
    type: state.intent,
    operationRef: state.preview.operationRef,
    confirmationId: state.preview.confirmationId,
  }
}
