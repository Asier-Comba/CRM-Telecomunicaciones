import type { ConversationRecordV2, ConversationMessageV2 } from '@/assistant/conversation-contract-v2'

export type HistoryInputsV2 = {
  'thread.list': { limit: number; after_id?: string }
  'thread.create': { id: string; title: string }
  'thread.get': { id: string }
  'thread.rename': { id: string; expected_version: number; title: string }
  'thread.archive': { id: string; expected_version: number }
  'message.page': { id: string; limit: number; after_sequence?: number }
}
export type HistoryResultsV2 = {
  'thread.list': { contract: 'assistant.threads.v2'; items: ConversationRecordV2[]; next_id: string | null }
  'message.page': { contract: 'assistant.messages.v2'; items: ConversationMessageV2[]; next_sequence: number | null; historical: true }
  'thread.create': { contract: 'assistant.thread.v2'; record: ConversationRecordV2 }
  'thread.get': { contract: 'assistant.thread.v2'; record: ConversationRecordV2 }
  'thread.rename': { contract: 'assistant.thread.v2'; record: ConversationRecordV2 }
  'thread.archive': { contract: 'assistant.thread.v2'; record: ConversationRecordV2 }
}
type HistoryOperationV2 = keyof HistoryInputsV2
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
const plain = (v: unknown): v is Record<string, unknown> => {
  try { return !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype && Reflect.ownKeys(v).every(k => typeof k === 'string' && !!Object.getOwnPropertyDescriptor(v, k)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(v, k)!) } catch { return false }
}
const exact = (v: Record<string, unknown>, fields: string) => Object.keys(v).sort().join(',') === fields.split(',').sort().join(',')
const text = (v: unknown, max: number, bytes = max * 4): v is string => typeof v === 'string' && !!v.trim() && v.length <= max && new TextEncoder().encode(v).length <= bytes && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)
const instant = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))
function record(v: unknown): v is ConversationRecordV2 {
  return plain(v) && exact(v, 'id,title,archived,version,created_at,updated_at') && uuid(v.id) && text(v.title, 120) && typeof v.archived === 'boolean' && integer(v.version) && instant(v.created_at) && instant(v.updated_at)
}

/** Browser display validation only. The cookie API reauthorizes every call. */
export function parseHistoryDataV2<O extends HistoryOperationV2>(operation: O, input: HistoryInputsV2[O], value: unknown): HistoryResultsV2[O] | null {
  if (!plain(value)) return null
  if (operation === 'thread.list') {
    const q = input as HistoryInputsV2['thread.list']
    if (!exact(value, 'contract,items,next_id') || value.contract !== 'assistant.threads.v2' || !Array.isArray(value.items) || value.items.length > q.limit || !value.items.every(record) || value.items.some(r => r.archived)) return null
    let previous = q.after_id ?? ''
    for (const r of value.items) { if (r.id <= previous) return null; previous = r.id }
    if (value.next_id !== null && (value.items.length !== q.limit || value.next_id !== previous)) return null
  } else if (operation === 'message.page') {
    const q = input as HistoryInputsV2['message.page']
    if (!exact(value, 'contract,items,next_sequence,historical') || value.contract !== 'assistant.messages.v2' || value.historical !== true || !Array.isArray(value.items) || value.items.length > q.limit) return null
    let previous = q.after_sequence ?? 0
    const ids = new Set<string>()
    for (const row of value.items) {
      if (!plain(row) || !exact(row, 'id,sequence,turn_id,role,content,created_at') || !uuid(row.id) || ids.has(row.id) || !uuid(row.turn_id) || !integer(row.sequence) || row.sequence <= previous || !['user', 'assistant'].includes(row.role as string) || !text(row.content, 4000, 8000) || !instant(row.created_at)) return null
      ids.add(row.id)
      previous = row.sequence
    }
    if (value.next_sequence !== null && (value.items.length !== q.limit || value.next_sequence !== previous)) return null
  } else {
    const q = input as HistoryInputsV2['thread.rename']
    if (!exact(value, 'contract,record') || value.contract !== 'assistant.thread.v2' || !record(value.record) || value.record.id !== q.id) return null
    if (operation === 'thread.create' && (value.record.title !== q.title || value.record.archived)) return null
    if (operation === 'thread.rename' && (value.record.title !== q.title || value.record.archived || value.record.version !== q.expected_version + 1)) return null
    if (operation === 'thread.archive' && (!value.record.archived || value.record.version !== q.expected_version + 1)) return null
  }
  return value as unknown as HistoryResultsV2[O]
}

const errors = ['validation', 'access_denied', 'access_changed', 'conflict', 'unavailable'] as const
export class HistoryClientErrorV2 extends Error {
  readonly code: typeof errors[number] | 'invalid_response' | 'transport_uncertain'
  constructor(code: typeof errors[number] | 'invalid_response' | 'transport_uncertain') { super(code); this.code = code }
}
export function historyErrorTextV2(error: unknown) {
  const code = error instanceof HistoryClientErrorV2 ? error.code : 'unavailable'
  return ({ validation: 'Revisa el título introducido.', access_denied: 'No tienes acceso a este historial.', access_changed: 'Tu acceso ha cambiado. Vuelve a entrar.', conflict: 'La conversación ha cambiado. Actualiza el historial.', unavailable: 'El historial no está disponible ahora.', invalid_response: 'No se pudo validar el historial.', transport_uncertain: 'No se pudo confirmar el resultado. Actualiza el historial antes de continuar.' })[code]
}
export async function historyRequestV2<O extends HistoryOperationV2>(operation: O, input: HistoryInputsV2[O], signal: AbortSignal, request: typeof fetch = fetch): Promise<HistoryResultsV2[O]> {
  let response: Response
  try { response = await request('/api/assistant/v2/threads', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, input }), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }) }
  catch { throw new HistoryClientErrorV2('transport_uncertain') }
  let value: unknown
  try { value = await response.json() } catch { throw new HistoryClientErrorV2('invalid_response') }
  if (plain(value) && exact(value, 'ok,error') && value.ok === false && errors.includes(value.error as typeof errors[number])) throw new HistoryClientErrorV2(value.error as typeof errors[number])
  if (!response.ok || !plain(value) || !exact(value, 'ok,data') || value.ok !== true) throw new HistoryClientErrorV2('invalid_response')
  const data = parseHistoryDataV2(operation, input, value.data)
  if (!data) throw new HistoryClientErrorV2('invalid_response')
  return data
}
