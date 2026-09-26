import type { DurableIdempotencyRecord } from './durable-contracts.js'
import { validOperationRef } from './durable-contracts.js'
import { containsHighConfidenceSecret } from './schema.js'

export const OPERATION_STATUS_VERSION = 1 as const

export type PublicOperationState =
  | 'pending'
  | 'review_required'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_terminal'

export type OperationStatusEnvelope = {
  contractVersion: typeof OPERATION_STATUS_VERSION
  operationRef: string
  status: PublicOperationState
  terminal: boolean
  updatedAt: string
  resultAvailable: boolean
  nextPollAfterMs?: number
  notice?: {
    code: string
    retryable: boolean
  }
  allowedActions: Array<'refresh'>
}

const PUBLIC_STATES = new Set<PublicOperationState>([
  'pending',
  'review_required',
  'succeeded',
  'failed_retryable',
  'failed_terminal',
])

const INTERNAL_TO_PUBLIC: Record<DurableIdempotencyRecord['state'], PublicOperationState> = {
  reserved: 'pending',
  executing: 'pending',
  effect_applied: 'pending',
  completed: 'succeeded',
  failed_retryable: 'failed_retryable',
  failed_terminal: 'failed_terminal',
  reconciliation_required: 'review_required',
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed)
  return Object.keys(value).every((key) => keys.has(key))
}

function validIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
}

export function projectOperationStatus(record: DurableIdempotencyRecord): OperationStatusEnvelope {
  const status = INTERNAL_TO_PUBLIC[record.state]
  const polling = status === 'pending' || status === 'review_required'
  const failed = status === 'failed_retryable' || status === 'failed_terminal'

  return {
    contractVersion: OPERATION_STATUS_VERSION,
    operationRef: record.operationRef,
    status,
    terminal: status === 'succeeded' || failed,
    updatedAt: record.updatedAt,
    resultAvailable: status === 'succeeded',
    ...(polling ? { nextPollAfterMs: status === 'pending' ? 2_000 : 10_000 } : {}),
    ...(failed ? {
      notice: {
        code: status === 'failed_retryable' ? 'operation_failed_retryable' : 'operation_failed_terminal',
        retryable: status === 'failed_retryable',
      },
    } : {}),
    allowedActions: polling ? ['refresh'] : [],
  }
}

export function validateOperationStatus(value: unknown): OperationStatusEnvelope | null {
  const envelope = object(value)
  if (!envelope || !exactKeys(envelope, [
    'contractVersion',
    'operationRef',
    'status',
    'terminal',
    'updatedAt',
    'resultAvailable',
    'nextPollAfterMs',
    'notice',
    'allowedActions',
  ])) return null
  if (envelope.contractVersion !== OPERATION_STATUS_VERSION) return null
  if (typeof envelope.operationRef !== 'string' || !validOperationRef(envelope.operationRef)) return null
  if (typeof envelope.status !== 'string' || !PUBLIC_STATES.has(envelope.status as PublicOperationState)) return null
  if (typeof envelope.terminal !== 'boolean' || typeof envelope.resultAvailable !== 'boolean') return null
  if (!validIsoTimestamp(envelope.updatedAt)) return null

  const status = envelope.status as PublicOperationState
  const expectedTerminal = status === 'succeeded' || status === 'failed_retryable' || status === 'failed_terminal'
  if (envelope.terminal !== expectedTerminal) return null
  if (envelope.resultAvailable !== (status === 'succeeded')) return null

  const polling = status === 'pending' || status === 'review_required'
  if (polling) {
    if (!Number.isInteger(envelope.nextPollAfterMs) || Number(envelope.nextPollAfterMs) < 500 || Number(envelope.nextPollAfterMs) > 60_000) return null
    if (!Array.isArray(envelope.allowedActions) || envelope.allowedActions.join(',') !== 'refresh') return null
  } else {
    if (envelope.nextPollAfterMs !== undefined) return null
    if (!Array.isArray(envelope.allowedActions) || envelope.allowedActions.length !== 0) return null
  }

  if (envelope.notice !== undefined) {
    const notice = object(envelope.notice)
    if (!notice || !exactKeys(notice, ['code', 'retryable'])) return null
    if (typeof notice.code !== 'string' || !/^operation_[a-z_]{1,55}$/.test(notice.code)) return null
    if (typeof notice.retryable !== 'boolean') return null
    if (status !== 'failed_retryable' && status !== 'failed_terminal') return null
    if (notice.retryable !== (status === 'failed_retryable')) return null
  } else if (status === 'failed_retryable' || status === 'failed_terminal') {
    return null
  }

  if (containsHighConfidenceSecret(envelope)) return null
  return envelope as OperationStatusEnvelope
}
