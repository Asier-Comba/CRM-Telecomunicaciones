import type { ResultStatus, StructuredValue } from './contracts.js'

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
  }>
  rows: Array<Record<string, StructuredValue>>
  truncated: boolean
}

export type FollowUpAction = {
  label: string
  prompt: string
  kind: 'suggestion' | 'refine' | 'action'
}

export type ConfirmationCard = {
  capability: string
  argumentsDigest: string
  title: string
  summary: string
  risk: 'safe_write' | 'sensitive_write' | 'irreversible'
  expiresAt: string
}

export type AssistantResponse = {
  answer: string
  status: ResultStatus
  grounded: boolean
  blocks: {
    entities?: EntityReference[]
    table?: TableBlock
    confirmation?: ConfirmationCard
    followUps?: FollowUpAction[]
    navigation?: { module: string; entityType?: string; entityId?: string }
  }
  meta: {
    requestId: string
    capability?: string
    partial: boolean
  }
}

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

export function validateAssistantResponse(value: unknown): AssistantResponse | null {
  const response = object(value)
  if (!response || typeof response.answer !== 'string' || response.answer.length > 12_000) return null
  if (!STATUS.has(response.status as ResultStatus) || typeof response.grounded !== 'boolean') return null

  const blocks = object(response.blocks)
  const meta = object(response.meta)
  if (!blocks || !meta || typeof meta.requestId !== 'string' || typeof meta.partial !== 'boolean') return null

  if (blocks.entities) {
    if (!Array.isArray(blocks.entities) || blocks.entities.length > 50) return null
    for (const candidate of blocks.entities) {
      const entity = object(candidate)
      if (!entity || typeof entity.entityType !== 'string' || typeof entity.entityId !== 'string' || typeof entity.label !== 'string') return null
    }
  }

  if (blocks.table) {
    const table = object(blocks.table)
    if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return null
    if (table.columns.length > 20 || table.rows.length > 100 || typeof table.truncated !== 'boolean') return null
  }

  if (blocks.followUps) {
    if (!Array.isArray(blocks.followUps) || blocks.followUps.length > 6) return null
  }

  if (/"[^"\\]*(?:token|secret|authorization)[^"\\]*"\s*:/i.test(JSON.stringify(response))) return null
  return response as AssistantResponse
}
