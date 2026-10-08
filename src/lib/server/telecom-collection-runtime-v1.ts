import type { TelecomCollectionInputsV1, TelecomCollectionOperationV1 } from '../contracts/telecom-collections-v1'
import { TELECOM_COLLECTION_SPECS_V1 } from './telecom-collection-specs-v1.ts'
import { snapshotProductJsonV1 } from './product-query-runtime-v1.ts'
import { isClosedObjectV1 as plain, isUuidV1 as uuid } from './product-work-runtime-v1.ts'
import { isStrictCalendarDateV1, isStrictInstantV1 } from './telecom-runtime-v1.ts'

type Rule = string | readonly (string | null)[]
type Spec = Readonly<{ fields: Readonly<Record<string, Rule>>; filters: readonly string[]; enums: Readonly<Record<string, readonly string[]>> }>
const specs: Readonly<Record<string, Spec>> = TELECOM_COLLECTION_SPECS_V1
const date = (v: unknown) => isStrictCalendarDateV1(v) && v >= '1900-01-01' && v <= '2199-12-31'
const keys = (v: Record<string, unknown>, wanted: readonly string[]) => Object.keys(v).sort().join(',') === [...wanted].sort().join(',')

export function isTelecomCollectionOperationV1(op: unknown): op is TelecomCollectionOperationV1 {
  return typeof op === 'string' && Object.hasOwn(specs, op)
}

export function parseTelecomCollectionInputV1<O extends TelecomCollectionOperationV1>(op: O, value: unknown): TelecomCollectionInputsV1[O] | null {
  try {
    if (!isTelecomCollectionOperationV1(op)) return null
    const v = snapshotProductJsonV1(value)
    if (!plain(v) || Object.keys(v).some(k => !specs[op].filters.includes(k))) return null
    if (op.endsWith('.get') && !keys(v, ['id'])) return null
    for (const [k, x] of Object.entries(v)) {
      if (k === 'limit') {
        if (typeof x !== 'number' || !Number.isInteger(x) || x < 1 || x > 100) return null
      } else {
        if (typeof x !== 'string' || x.length < 1 || x.length > 64 || /[\u0000-\u001f\u007f-\u009f]/.test(x)) return null
        if ((k === 'id' || k.endsWith('_id')) && !uuid(x)) return null
        if (k === 'sort' && x !== 'id_asc') return null
        if (k === 'currency' && !/^[A-Z]{3}$/.test(x)) return null
        if (['valid_on', 'expected_close_from', 'expected_close_to', 'date_from', 'date_to', 'window_from', 'window_to'].includes(k) && !date(x)) return null
        if (specs[op].enums[k] && !specs[op].enums[k].includes(x)) return null
      }
    }
    if (Object.hasOwn(v, 'entity_kind') !== Object.hasOwn(v, 'entity_id')) return null
    for (const prefix of ['expected_close', 'date', 'window']) {
      const from = v[prefix + '_from'], to = v[prefix + '_to']
      if ((from === undefined) !== (to === undefined)) return null
      if (from !== undefined && (Date.parse(to as string) < Date.parse(from as string) || Date.parse(to as string) - Date.parse(from as string) > 366 * 86400000)) return null
    }
    return Object.freeze(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, (k === 'id' || k.endsWith('_id')) && typeof x === 'string' ? x.toLowerCase() : x]))) as TelecomCollectionInputsV1[O]
  } catch { return null }
}

function field(rule: Rule, value: unknown): boolean {
  if (typeof rule !== 'string') return (typeof value === 'string' || value === null) && rule.includes(value)
  if (rule.endsWith('?')) return value === null || field(rule.slice(0, -1), value)
  if (rule === 'uuid') return uuid(value)
  if (rule === 'date') return date(value)
  if (rule === 'instant') return typeof value === 'string' && isStrictInstantV1(value.replace(/(\.\d{3})\d{1,3}(Z|[+-]\d{2}:\d{2})$/, '$1$2'))
  if (rule === 'mask') return typeof value === 'string' && /^••••[0-9]{3}$/.test(value)
  if (rule === 'count') return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < 1e15
  if (rule === 'boolean') return typeof value === 'boolean'
  if (rule === 'positive') return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value < 1e15
  if (rule === 'integer') return typeof value === 'number' && Number.isSafeInteger(value)
  if (rule === 'currency') return typeof value === 'string' && /^[A-Z]{3}$/.test(value)
  if (rule === 'money') return typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value) && BigInt(value) <= BigInt('9223372036854775807')
  if (rule === 'code') return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,95}$/.test(value)
  if (rule === 'links') {
    if (!Array.isArray(value) || value.length > 3) return false
    const kinds = new Set()
    for (const link of value) {
      if (!plain(link) || !keys(link, ['kind', 'id']) || !['contract', 'service', 'plan'].includes(link.kind as string) || !uuid(link.id) || kinds.has(link.kind)) return false
      kinds.add(link.kind)
    }
    return true
  }
  return rule === 'text' && typeof value === 'string' && value.trim().length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f-\u009f]/.test(value)
}

export function parseTelecomCollectionResultV1(op: TelecomCollectionOperationV1, input: TelecomCollectionInputsV1[TelecomCollectionOperationV1], value: unknown) {
  try {
    if (!isTelecomCollectionOperationV1(op)) return null
    const v = snapshotProductJsonV1(value), one = op.endsWith('.get')
    if (!plain(v) || !keys(v, one ? ['contract_version', 'operation', 'record'] : ['contract_version', 'operation', 'items', 'next_id']) || v.contract_version !== 'telecom.collections.v1' || v.operation !== op) return null
    const i = input as Readonly<Record<string, unknown>>, limit = (i.limit as number | undefined) ?? 50
    const rows = one ? [v.record] : v.items
    if (!Array.isArray(rows) || rows.length > (one ? 1 : limit)) return null
    let previous = (i.after_id as string | undefined) ?? ''
    for (const r of rows) {
      if (!plain(r) || !keys(r, Object.keys(specs[op].fields)) || Object.entries(specs[op].fields).some(([k, rule]) => !field(rule, r[k]))) return null
      const id = (op === 'assignee.list' ? r.user_id : r.id) as string
      if (one ? id !== i.id : id <= previous) return null
      previous = id
      for (const k of ['customer_id', 'contract_id', 'service_id', 'operator_id', 'assigned_user_id', 'owner_user_id', 'stage_id', 'opportunity_id', 'priority', 'status', 'source', 'currency', 'service_kind', 'role']) {
        // Catalog kind filters include sealed base components; the DTO keeps the primary kind.
        if (k === 'service_kind' && ['plan.list', 'plan_version.list'].includes(op)) continue
        if (k in i && k in r && i[k] !== r[k]) return null
      }
      if (op === 'opportunity.list' && ((r.amount_minor === null) !== (r.currency === null))) return null
      if (op === 'activity.list' && i.kind !== undefined && r.activity_kind !== i.kind) return null
      if (op === 'service.list' && i.kind !== undefined && r.service_kind !== i.kind) return null
      if (op === 'plan_version.list' && i.status !== undefined && r.plan_status !== i.status) return null
      if (op === 'task.list' || op === 'meeting.list') {
        const at=op==='task.list'?r.due_at:r.starts_at,on=op==='task.list'?r.due_on:r.starts_on
        if ((at===null)!==(on===null))return null
        if (at!==null) {
          const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at as string)).map(p=>[p.type,p.value]))
          if ([parts.year,parts.month,parts.day].join('-')!==on)return null
        }
        if (r.opportunity_id!==null&&r.customer_id===null)return null
        if (op==='meeting.list') {
          if (r.ends_at!==null&&Date.parse(r.ends_at as string)<=Date.parse(r.starts_at as string))return null
          try{new Intl.DateTimeFormat('en',{timeZone:r.timezone as string})}catch{return null}
        }
      }
      if (op === 'line.list') {
        if ((r.sim_id === null) !== (r.sim_kind === null) || (r.sim_id === null) !== (r.sim_status === null) || (r.sim_id === null) !== (r.masked_iccid === null)) return null
        if ((r.sim_kind === null || r.sim_kind === 'physical') && r.masked_eid !== null) return null
        if ((r.portability_id === null) !== (r.portability_status === null)) return null
      }
      if (op === 'plan_version.list' && i.valid_on !== undefined && ((r.valid_from as string) > (i.valid_on as string) || r.valid_until !== null && (r.valid_until as string) < (i.valid_on as string))) return null
      const range = op === 'task.list' ? ['date', r.due_on] : op === 'meeting.list' ? ['date', r.starts_on] : op === 'opportunity.list' ? ['expected_close', r.expected_close_date] : op === 'renewal.list' ? ['window', r.target_on] : op === 'permanence.list' ? ['window', r.ends_on] : null
      if (range && i[range[0] as string + '_from'] !== undefined) {
        const from = i[range[0] as string + '_from'] as string, to = i[range[0] as string + '_to'] as string
        if (typeof range[1] !== 'string' || range[1] < from || range[1] > to) return null
      }
    }
    if (!one && v.next_id !== null && (!uuid(v.next_id) || rows.length !== limit || v.next_id !== previous)) return null
    return v
  } catch { return null }
}
