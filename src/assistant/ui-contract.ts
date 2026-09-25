import type { JsonScalar, ResultStatus } from './contracts.js'

export const ASSISTANT_RESPONSE_VERSION = 1 as const
const TABLE_FORMATS = new Set(['text', 'number', 'currency', 'date', 'datetime', 'status'])
const FOLLOW_UP_KINDS = new Set(['suggestion', 'refine'])
const SENSITIVE_KEY = /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i

export type AssistantUiTaxonomy = {
  version: string
  modules: ReadonlySet<string>
  entityTypes: ReadonlySet<string>
}

export type EntityReference = {
  entityType: string
  entityId: string
  label: string
  subtitle?: string
}

export type TableBlock = {
  columns: Array<{
    key: string
    label: string
    format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'status'
    currency?: string
  }>
  rows: Array<Record<string, JsonScalar>>
  rowIdentity?: { key: string }
  truncated: boolean
  continuation?: { cursor?: string; total?: number }
}

export type FollowUpAction = {
  label: string
  prompt: string
  kind: 'suggestion' | 'refine'
}

export type ConfirmationCard = {
  confirmationId: string
  capability: string
  status: 'pending'
  title: string
  summary: string
  risk: 'safe_write' | 'sensitive_write' | 'irreversible'
  expiresAt: string
  allowedActions: ['confirm', 'cancel']
}

export type AssistantNotice = {
  code: string
  retryable: boolean
  title?: string
  detail?: string
}

export type NavigationTarget = {
  module: string
  entityType?: string
  entityId?: string
  view?: string
}

export type AssistantResponse = {
  contractVersion: typeof ASSISTANT_RESPONSE_VERSION
  answer: string
  status: ResultStatus
  grounded: boolean
  blocks: {
    entities?: EntityReference[]
    table?: TableBlock
    confirmation?: ConfirmationCard
    followUps?: FollowUpAction[]
    navigation?: NavigationTarget
    notice?: AssistantNotice
  }
  meta: {
    requestId: string
    capability?: string
    partial: boolean
    taxonomyVersion?: string
  }
}

export type AssistantStreamEvent =
  | { contractVersion: 1; sequence: number; type: 'started'; requestId: string }
  | { contractVersion: 1; sequence: number; type: 'answer_delta'; text: string }
  | { contractVersion: 1; sequence: number; type: 'final'; response: AssistantResponse }
  | { contractVersion: 1; sequence: number; type: 'cancelled' }
  | { contractVersion: 1; sequence: number; type: 'failed'; notice: AssistantNotice }

const STATUS = new Set<ResultStatus>([
  'SUCCESS', 'EMPTY', 'PARTIAL', 'AMBIGUOUS', 'NOT_FOUND', 'FORBIDDEN',
  'CONFIRMATION_REQUIRED', 'INVALID_CONFIRMATION', 'INVALID_INPUT', 'CONFLICT',
  'POLICY_BLOCK', 'UNAVAILABLE', 'INTERNAL_ERROR',
])

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed)
  return Object.keys(value).every((key) => keys.has(key))
}

function safeText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

function validNotice(value: unknown): value is AssistantNotice {
  const notice = object(value)
  return Boolean(
    notice &&
    exactKeys(notice, ['code', 'retryable', 'title', 'detail']) &&
    typeof notice.code === 'string' && /^[a-z][a-z0-9_]{1,63}$/.test(notice.code) &&
    typeof notice.retryable === 'boolean' &&
    (notice.title === undefined || safeText(notice.title, 120)) &&
    (notice.detail === undefined || safeText(notice.detail, 500)),
  )
}

function validTable(value: unknown): value is TableBlock {
  const table = object(value)
  if (!table || !exactKeys(table, ['columns', 'rows', 'rowIdentity', 'truncated', 'continuation'])) return false
  if (!Array.isArray(table.columns) || table.columns.length === 0 || table.columns.length > 20) return false
  if (!Array.isArray(table.rows) || table.rows.length > 100 || typeof table.truncated !== 'boolean') return false

  const columnKeys = new Set<string>()
  for (const candidate of table.columns) {
    const column = object(candidate)
    if (!column || !exactKeys(column, ['key', 'label', 'format', 'currency'])) return false
    if (!safeText(column.key, 64) || !safeText(column.label, 120)) return false
    if (column.format !== undefined && !TABLE_FORMATS.has(String(column.format))) return false
    if (column.format === 'currency' && (typeof column.currency !== 'string' || !/^[A-Z]{3}$/.test(column.currency))) return false
    if (column.format !== 'currency' && column.currency !== undefined) return false
    if (columnKeys.has(column.key)) return false
    columnKeys.add(column.key)
  }

  for (const candidate of table.rows) {
    const row = object(candidate)
    if (!row || Object.keys(row).some((key) => !columnKeys.has(key))) return false
    if (Object.values(row).some((cell) => cell !== null && !['string', 'number', 'boolean'].includes(typeof cell))) return false
    if (Object.values(row).some((cell) => typeof cell === 'string' && cell.length > 2_000)) return false
  }

  if (table.rowIdentity !== undefined) {
    const identity = object(table.rowIdentity)
    if (!identity || !exactKeys(identity, ['key']) || typeof identity.key !== 'string' || !columnKeys.has(identity.key)) return false
    const identityKey = identity.key
    const identities = table.rows.map((row) => object(row)?.[identityKey])
    if (identities.some((id) => typeof id !== 'string' && typeof id !== 'number')) return false
    if (new Set(identities.map(String)).size !== identities.length) return false
  }

  if (table.continuation !== undefined) {
    const continuation = object(table.continuation)
    if (!continuation || !exactKeys(continuation, ['cursor', 'total'])) return false
    if (continuation.cursor !== undefined && !safeText(continuation.cursor, 256)) return false
    if (continuation.total !== undefined && (!Number.isInteger(continuation.total) || Number(continuation.total) < 0)) return false
  }
  if (table.truncated && table.continuation === undefined) return false
  return true
}

export function validateAssistantResponse(value: unknown, taxonomy?: AssistantUiTaxonomy): AssistantResponse | null {
  const response = object(value)
  if (!response || !exactKeys(response, ['contractVersion', 'answer', 'status', 'grounded', 'blocks', 'meta'])) return null
  if (response.contractVersion !== ASSISTANT_RESPONSE_VERSION) return null
  if (typeof response.answer !== 'string' || response.answer.length > 12_000) return null
  if (!STATUS.has(response.status as ResultStatus) || typeof response.grounded !== 'boolean') return null

  const blocks = object(response.blocks)
  const meta = object(response.meta)
  if (!blocks || !exactKeys(blocks, ['entities', 'table', 'confirmation', 'followUps', 'navigation', 'notice'])) return null
  if (!meta || !exactKeys(meta, ['requestId', 'capability', 'partial', 'taxonomyVersion'])) return null
  if (!safeText(meta.requestId, 128) || typeof meta.partial !== 'boolean') return null
  if (meta.capability !== undefined && !safeText(meta.capability, 160)) return null

  if (blocks.entities) {
    if (!taxonomy || !Array.isArray(blocks.entities) || blocks.entities.length > 50 || response.grounded !== true) return null
    for (const candidate of blocks.entities) {
      const entity = object(candidate)
      if (!entity || !exactKeys(entity, ['entityType', 'entityId', 'label', 'subtitle'])) return null
      if (!safeText(entity.entityType, 80) || !taxonomy.entityTypes.has(entity.entityType)) return null
      if (!safeText(entity.entityId, 160) || !safeText(entity.label, 200)) return null
      if (entity.subtitle !== undefined && !safeText(entity.subtitle, 300)) return null
    }
  }

  if (blocks.table && (!validTable(blocks.table) || response.grounded !== true)) return null

  if (blocks.followUps) {
    if (!Array.isArray(blocks.followUps) || blocks.followUps.length > 6) return null
    for (const candidate of blocks.followUps) {
      const followUp = object(candidate)
      if (!followUp || !exactKeys(followUp, ['label', 'prompt', 'kind'])) return null
      if (!safeText(followUp.label, 100) || !safeText(followUp.prompt, 500) || !FOLLOW_UP_KINDS.has(String(followUp.kind))) return null
    }
  }

  if (blocks.navigation) {
    const navigation = object(blocks.navigation)
    if (!taxonomy || !navigation || !exactKeys(navigation, ['module', 'entityType', 'entityId', 'view'])) return null
    if (typeof navigation.module !== 'string' || !taxonomy.modules.has(navigation.module)) return null
    if (navigation.entityType !== undefined && (typeof navigation.entityType !== 'string' || !taxonomy.entityTypes.has(navigation.entityType))) return null
    if (navigation.entityId !== undefined && !safeText(navigation.entityId, 160)) return null
    if (navigation.view !== undefined && !safeText(navigation.view, 80)) return null
  }

  if (blocks.confirmation) {
    const confirmation = object(blocks.confirmation)
    if (!confirmation || !exactKeys(confirmation, ['confirmationId', 'capability', 'status', 'title', 'summary', 'risk', 'expiresAt', 'allowedActions'])) return null
    if (!safeText(confirmation.confirmationId, 200) || confirmation.confirmationId.length < 16) return null
    if (!safeText(confirmation.capability, 160) || confirmation.status !== 'pending') return null
    if (!safeText(confirmation.title, 160) || !safeText(confirmation.summary, 1_000)) return null
    if (!['safe_write', 'sensitive_write', 'irreversible'].includes(String(confirmation.risk))) return null
    if (!Number.isFinite(Date.parse(String(confirmation.expiresAt)))) return null
    if (!Array.isArray(confirmation.allowedActions) || confirmation.allowedActions.join(',') !== 'confirm,cancel') return null
  }

  if (blocks.notice && !validNotice(blocks.notice)) return null
  if (taxonomy && meta.taxonomyVersion !== taxonomy.version) return null
  if (SENSITIVE_KEY.test(JSON.stringify(response))) return null
  return response as AssistantResponse
}

export function validateAssistantStreamEvent(value: unknown, taxonomy?: AssistantUiTaxonomy): AssistantStreamEvent | null {
  const event = object(value)
  if (!event || event.contractVersion !== 1 || !Number.isInteger(event.sequence) || Number(event.sequence) < 0) return null

  if (event.type === 'started') {
    return exactKeys(event, ['contractVersion', 'sequence', 'type', 'requestId']) && safeText(event.requestId, 128)
      ? event as AssistantStreamEvent
      : null
  }
  if (event.type === 'answer_delta') {
    return exactKeys(event, ['contractVersion', 'sequence', 'type', 'text']) && safeText(event.text, 2_000)
      ? event as AssistantStreamEvent
      : null
  }
  if (event.type === 'final') {
    const response = validateAssistantResponse(event.response, taxonomy)
    return exactKeys(event, ['contractVersion', 'sequence', 'type', 'response']) && response
      ? { contractVersion: 1, sequence: Number(event.sequence), type: 'final', response }
      : null
  }
  if (event.type === 'cancelled') {
    return exactKeys(event, ['contractVersion', 'sequence', 'type']) ? event as AssistantStreamEvent : null
  }
  if (event.type === 'failed') {
    return exactKeys(event, ['contractVersion', 'sequence', 'type', 'notice']) && validNotice(event.notice)
      ? event as AssistantStreamEvent
      : null
  }
  return null
}
