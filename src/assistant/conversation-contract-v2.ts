import { snapshotProductJsonV1 } from '../lib/server/product-query-runtime-v1.ts'
import { isUuidV1, isClosedObjectV1 } from '../lib/server/product-work-runtime-v1.ts'
import { containsHighConfidenceSecret } from './schema.ts'

export const THREAD_OPERATIONS_V2 = Object.freeze(['thread.list', 'thread.create', 'thread.get', 'thread.rename', 'thread.archive', 'message.page', 'turn.start', 'turn.finish'] as const)
export type ThreadOperationV2 = typeof THREAD_OPERATIONS_V2[number]
export type ConversationInputV2 = Readonly<Record<string, string | number>>
export type ConversationRecordV2 = { id: string; title: string; archived: boolean; version: number; created_at: string; updated_at: string }
export type ConversationMessageV2 = { id: string; sequence: number; turn_id: string; role: 'user' | 'assistant'; content: string; created_at: string }
export type ConversationResultV2 =
  | { contract: 'assistant.thread.v2'; record: ConversationRecordV2 }
  | { contract: 'assistant.threads.v2'; items: ConversationRecordV2[]; next_id: string | null }
  | { contract: 'assistant.messages.v2'; items: ConversationMessageV2[]; next_sequence: number | null; historical: true }
  | { contract: 'assistant.turn.v2'; id: string; status: 'running' | 'completed' | 'cancelled' | 'failed'; replay: boolean }
const fields: Record<ThreadOperationV2, readonly string[]> = {
  'thread.list': ['limit', 'after_id'], 'thread.create': ['id', 'title'], 'thread.get': ['id'],
  'thread.rename': ['id', 'expected_version', 'title'], 'thread.archive': ['id', 'expected_version'],
  'message.page': ['id', 'limit', 'after_sequence'], 'turn.start': ['id', 'turn_id', 'text'],
  'turn.finish': ['id', 'turn_id', 'status', 'answer', 'failure_code'],
}
const integer = (value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
const text = (value: unknown, chars: number, bytes: number): value is string => typeof value === 'string' && !!value.trim() && value.length <= chars && Buffer.byteLength(value) <= bytes && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) && !containsHighConfidenceSecret(value)
const exact = (value: Record<string, unknown>, keys: string) => Object.keys(value).sort().join(',') === keys.split(',').sort().join(',')
const instant = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
export function isThreadOperationV2(value: unknown): value is ThreadOperationV2 { return typeof value === 'string' && (THREAD_OPERATIONS_V2 as readonly string[]).includes(value) }
export function parseConversationInputV2(operation: ThreadOperationV2, raw: unknown): ConversationInputV2 | null {
  try {
    const v = snapshotProductJsonV1(raw)
    if (!isClosedObjectV1(v) || Object.keys(v).some(k => !fields[operation].includes(k)) || containsHighConfidenceSecret(v)) return null
    if (operation !== 'thread.list' && !isUuidV1(v.id)) return null
    if ('limit' in v && !integer(v.limit, 1, 50) || 'after_id' in v && !isUuidV1(v.after_id) || 'after_sequence' in v && !integer(v.after_sequence, 0)) return null
    if (['thread.create', 'thread.rename'].includes(operation) && !text(v.title, 120, 480)) return null
    if (['thread.rename', 'thread.archive'].includes(operation) && !integer(v.expected_version)) return null
    if (operation.startsWith('turn.') && !isUuidV1(v.turn_id)) return null
    if (operation === 'turn.start' && !text(v.text, 4000, 8000)) return null
    if (operation === 'turn.finish') {
      if (!['completed', 'failed', 'cancelled'].includes(v.status as string)) return null
      if (v.status === 'completed' ? !text(v.answer, 4000, 8000) || 'failure_code' in v : 'answer' in v) return null
      if (v.status === 'failed' ? !['unavailable', 'access_changed', 'invalid_plan', 'not_configured'].includes(v.failure_code as string) : 'failure_code' in v) return null
    }
    return v as ConversationInputV2
  } catch { return null }
}
function record(value: unknown): value is ConversationRecordV2 {
  return isClosedObjectV1(value) && exact(value, 'id,title,archived,version,created_at,updated_at') && isUuidV1(value.id) && text(value.title, 120, 480) && typeof value.archived === 'boolean' && integer(value.version) && instant(value.created_at) && instant(value.updated_at)
}
export function parseConversationResultV2(operation: ThreadOperationV2, input: ConversationInputV2, raw: unknown): ConversationResultV2 | null {
  try {
    const v = snapshotProductJsonV1(raw)
    if (!isClosedObjectV1(v) || containsHighConfidenceSecret(v)) return null
    const limit = Number(input.limit ?? 50)
    if (operation === 'thread.list') {
      if (!exact(v, 'contract,items,next_id') || v.contract !== 'assistant.threads.v2' || !Array.isArray(v.items) || v.items.length > limit || !v.items.every(record) || v.items.some(r => r.archived)) return null
      let previous = String(input.after_id ?? '')
      for (const row of v.items) { if (row.id <= previous) return null; previous = row.id }
      if (v.next_id !== null && (v.items.length !== limit || v.next_id !== v.items.at(-1)?.id)) return null
    } else if (operation === 'message.page') {
      if (!exact(v, 'contract,items,next_sequence,historical') || v.contract !== 'assistant.messages.v2' || v.historical !== true || !Array.isArray(v.items) || v.items.length > limit) return null
      let previous = Number(input.after_sequence ?? 0)
      for (const row of v.items) {
        if (!isClosedObjectV1(row) || !exact(row, 'id,sequence,turn_id,role,content,created_at') || !isUuidV1(row.id) || !isUuidV1(row.turn_id) || !integer(row.sequence) || row.sequence <= previous || !['user', 'assistant'].includes(row.role as string) || !text(row.content, 4000, 8000) || !instant(row.created_at)) return null
        previous = row.sequence
      }
      if (v.next_sequence !== null && (v.items.length !== limit || v.next_sequence !== previous)) return null
    } else if (operation.startsWith('turn.')) {
      if (!exact(v, 'contract,id,status,replay') || v.contract !== 'assistant.turn.v2' || v.id !== input.turn_id || !['running', 'completed', 'cancelled', 'failed'].includes(v.status as string) || typeof v.replay !== 'boolean') return null
      if (operation === 'turn.start' && !v.replay && v.status !== 'running' || operation === 'turn.finish' && (v.replay || v.status !== input.status)) return null
    } else if (!exact(v, 'contract,record') || v.contract !== 'assistant.thread.v2' || !record(v.record) || v.record.id !== input.id
      || operation === 'thread.archive' && !v.record.archived || ['thread.create', 'thread.rename'].includes(operation) && v.record.title !== input.title
      || ['thread.rename', 'thread.archive'].includes(operation) && v.record.version !== Number(input.expected_version) + 1) return null
    return v as ConversationResultV2
  } catch { return null }
}
