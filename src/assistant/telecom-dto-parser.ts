import { isEntityKindV1, type EntityKindV1 } from './entity-kinds.js'
import { isCalendarDate } from './telecom-input-validation.js'
import { containsHighConfidenceSecret } from './schema.js'

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject
export type JsonObject = { [key: string]: JsonValue }
export type TelecomDtoKind = 'entity_ref' | 'safe_error' | 'capability_ref' | 'protected_field' | 'customer' | 'contract' | 'service' | 'line' | 'task' | 'meeting' | 'renewal' | 'permanence' | 'opportunity' | 'alert' | 'activity' | 'attention' | 'summary' | 'dashboard' | `collection:${string}` | `readone:${string}`
export type TelecomDtoPolicy = {
  scopeEpoch: string; now: string
  /** Server-owned binding; never derive this authority from the DTO being validated. */
  binding?: { kind: EntityKindV1; id: string; fieldClass?: string; allowedActions?: readonly string[] }
  authorizeReference?: (reference: Readonly<{ kind: EntityKindV1; id: string }>) => boolean | Promise<boolean>
  /** Trusted live authorization generation and clock; captured once and checked after each await. */
  currentScopeEpoch?: () => string
  currentNow?: () => string
}
export type TelecomDtoParseResult = { ok: true; value: Readonly<JsonObject> } | { ok: false; code: 'INVALID_DTO' | 'UNVERIFIED_REFERENCE' }
type Check = (v: JsonValue) => boolean
const str = (v: JsonValue, max = 400): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(v) && !containsHighConfidenceSecret(v)
const id: Check = (v) => str(v, 160) && v.length >= 16 && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(v)
const en = (...values: string[]): Check => (v) => typeof v === 'string' && values.includes(v)
const nil: Check = (v) => v === null
const nullable = (check: Check): Check => (v) => v === null || check(v)
const bool: Check = (v) => typeof v === 'boolean'
const integer: Check = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const date: Check = (v) => typeof v === 'string' && isCalendarDate(v)
const instant: Check = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && isCalendarDate(v.slice(0, 10)) && Number(v.slice(11, 13)) < 24 && Number(v.slice(14, 16)) < 60 && Number(v.slice(17, 19)) < 60 && (v.endsWith('Z') || (Number(v.slice(-5, -3)) <= 23 && Number(v.slice(-2)) <= 59)) && Number.isFinite(Date.parse(v))
const timezone: Check = (v) => { if (!str(v, 100)) return false; try { new Intl.DateTimeFormat('en', { timeZone: v }); return true } catch { return false } }
const array = (check: Check, max = 100): Check => (v) => Array.isArray(v) && v.length <= max && v.every(check)
function object(fields: Record<string, Check>, optional: string[] = []): Check {
  return (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => Object.hasOwn(fields, k)) && Object.entries(fields).every(([k, check]) => Object.hasOwn(v, k) ? check(v[k]!) : optional.includes(k))
}
const record = (v: JsonValue): v is JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v)
const ordered = (v: JsonValue, a: string, b: string, timestamps = false): boolean => record(v) && (v[a] === null || v[b] === null || (typeof v[a] === 'string' && typeof v[b] === 'string' && (timestamps ? Date.parse(v[a]) <= Date.parse(v[b]) : v[a] <= v[b])))
const error = object({ code: en('unauthorized', 'not_found', 'forbidden', 'validation', 'conflict', 'rate_limited', 'temporary_unavailable', 'stale', 'access_revoked', 'internal_safe'), retryable: bool, correlation_id: (v) => str(v, 160) }, ['correlation_id'])

/** Produces an isolated bounded JSON snapshot without invoking getters/toJSON. */
function snapshot(input: unknown, depth = 0, budget = { nodes: 0, chars: 0 }): JsonValue {
  if (++budget.nodes > 20000 || depth > 20) throw new Error('bounds')
  if (input === null || typeof input === 'boolean') return input
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (typeof input === 'string') { budget.chars += input.length; if (budget.chars > 131072 || input.length > 4000) throw new Error('bounds'); return input }
  if (typeof input !== 'object' || input === null) throw new Error('json')
  if (Array.isArray(input)) {
    if (input.length > 100 || Object.keys(input).length !== input.length || Reflect.ownKeys(input).length !== input.length + 1) throw new Error('array')
    const descriptors = Object.getOwnPropertyDescriptors(input)
    return Array.from({ length: input.length }, (_, index) => { const field = descriptors[String(index)]; if (!field || !('value' in field)) throw new Error('accessor'); return snapshot(field.value, depth + 1, budget) })
  }
  if (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) throw new Error('prototype')
  const descriptors = Object.getOwnPropertyDescriptors(input)
  if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.keys(descriptors).length > 40) throw new Error('keys')
  const out: JsonObject = Object.create(null)
  for (const [key, field] of Object.entries(descriptors)) { budget.chars += key.length; if (key.length > 160 || budget.chars > 131072 || !field.enumerable || !('value' in field) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('field'); out[key] = snapshot(field.value, depth + 1, budget) }
  return out
}
function freezeJson(value: JsonValue): void {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freezeJson(child); Object.freeze(value) }
}
function customerConsistent(value: JsonValue, expected: string): boolean {
  if (!value || typeof value !== 'object') return true
  if (record(value) && value.kind === 'customer' && value.id !== expected) return false
  return Object.values(value).every((child) => customerConsistent(child, expected))
}

export async function parseTelecomDto(kind: TelecomDtoKind, input: unknown, policy: TelecomDtoPolicy): Promise<TelecomDtoParseResult> {
  try {
    const scopeEpoch = policy.scopeEpoch
    const now = policy.now
    if (!str(scopeEpoch, 160) || !instant(now)) return { ok: false, code: 'INVALID_DTO' }
    const binding = policy.binding ? Object.freeze({ ...policy.binding, ...(policy.binding.allowedActions ? { allowedActions: Object.freeze([...policy.binding.allowedActions]) } : {}) }) : undefined
    const authorizeReference = policy.authorizeReference
    const currentScopeEpoch = policy.currentScopeEpoch
    const currentNow = policy.currentNow
    let lastNowMs = Date.parse(now)
    let earliestCapabilityExpiry = Infinity
    const authorityCurrent = (): boolean => {
      const liveEpoch = currentScopeEpoch ? currentScopeEpoch() : scopeEpoch
      const liveNow = currentNow ? currentNow() : now
      if (!instant(liveNow)) return false
      const liveNowMs = Date.parse(liveNow)
      const originalBinding = policy.binding
      const bindingUnchanged = binding === undefined ? originalBinding === undefined : originalBinding !== undefined && originalBinding.kind === binding.kind && originalBinding.id === binding.id && originalBinding.fieldClass === binding.fieldClass && (binding.allowedActions === undefined ? originalBinding.allowedActions === undefined : originalBinding.allowedActions !== undefined && originalBinding.allowedActions.length === binding.allowedActions.length && binding.allowedActions.every((action, index) => originalBinding.allowedActions![index] === action))
      if (liveEpoch !== scopeEpoch || policy.scopeEpoch !== scopeEpoch || policy.now !== now || policy.authorizeReference !== authorizeReference || policy.currentScopeEpoch !== currentScopeEpoch || policy.currentNow !== currentNow || !bindingUnchanged || liveNowMs < lastNowMs || liveNowMs >= earliestCapabilityExpiry) return false
      lastNowMs = liveNowMs
      return true
    }
    if (!authorityCurrent()) return { ok: false, code: 'UNVERIFIED_REFERENCE' }
    const value = snapshot(input)
    const references = new Map<string, Readonly<{ kind: EntityKindV1; id: string }>>()
    const entityId = (kind: EntityKindV1): Check => (v) => { if (!id(v) || typeof v !== 'string') return false; references.set(`${kind}:${v}`, Object.freeze({ kind, id: v })); return true }
    const ref = (expected?: EntityKindV1): Check => (v) => record(v) && isEntityKindV1(v.kind) && (!expected || v.kind === expected) && object({ kind: en(v.kind), id: entityId(v.kind), display_name: (x) => str(x) })(v)
    const scope = { contract_version: en('telecom.v1'), scope_epoch: en(scopeEpoch) }
    const cap = (allowed: string[], owner?: { kind: EntityKindV1; id: string }, field?: string): Check => (v) => {
      if (!record(v) || !object({ ref: id, action: en(...allowed), target: (target) => record(target) && isEntityKindV1(target.kind) && object({ kind: en(target.kind), id: entityId(target.kind), field_class: en('tax_identifier', 'contact_email', 'contact_phone', 'contract_reference', 'line_identifier', 'document_metadata') }, ['field_class'])(target) && (!owner || (target.kind === owner.kind && target.id === owner.id)) && (field ? target.field_class === field : target.field_class === undefined), expires_at: instant })(v)) return false
      if (typeof v.expires_at !== 'string' || Date.parse(v.expires_at) <= lastNowMs) return false
      earliestCapabilityExpiry = Math.min(earliestCapabilityExpiry, Date.parse(v.expires_at))
      return true
    }
    const protectedField = (field: string, owner: { kind: EntityKindV1; id: string }): Check => (v) => record(v) && (v.visibility === 'masked'
      ? object({ field_class: en(field), visibility: en('masked'), masked_text: (x) => str(x), reveal_capability: cap(['reveal'], owner, field) })(v)
      : object({ field_class: en(field), visibility: en('hidden', 'not_available') })(v))
    const navigation: Check = (v) => record(v) && typeof v.kind === 'string' && ['customer', 'contract', 'service', 'line', 'task', 'meeting', 'opportunity'].includes(v.kind) && isEntityKindV1(v.kind) && object({ kind: en(v.kind), [`${v.kind}_id`]: entityId(v.kind) })(v)
    const freshness = (notice: boolean): Check => (v) => record(v) && object({ kind: en('fresh', 'stale'), as_of: instant, ...(v.kind === 'stale' && notice ? { notice: nullable(error) } : {}) })(v)
    const checks: Record<string, Check> = Object.create(null)
    checks.entity_ref = ref()
    checks.safe_error = error
    const validBinding = binding && isEntityKindV1(binding.kind) && id(binding.id)
    checks.capability_ref = (v) => Boolean(validBinding && binding?.allowedActions?.length && binding.allowedActions.every((a) => ['edit', 'reveal', 'copy', 'complete', 'join', 'navigate'].includes(a)) && cap([...binding.allowedActions], binding, binding.fieldClass)(v))
    checks.protected_field = (v) => Boolean(validBinding && binding?.fieldClass && ['tax_identifier', 'contact_email', 'contact_phone', 'contract_reference', 'line_identifier', 'document_metadata'].includes(binding.fieldClass) && entityId(binding.kind)(binding.id) && protectedField(binding.fieldClass, binding)(v))
    const collection = (item: Check): Check => (v) => {
      if (!record(v)) return false
      const base = { ...scope, source_state: en('available', 'unsupported', 'unavailable', 'not_authorized', 'error'), permission: en('authorized', 'unknown', 'not_authorized') }
      if (v.source_state === 'available') {
        if (!object({ ...base, permission: en('authorized'), items: array(item), completeness: (x) => record(x) && (x.kind === 'complete' ? object({ kind: en('complete') })(x) : object({ kind: en('partial'), has_more: (y) => y === true })(x)), continuation: nullable((x) => str(x, 256) && x.length >= 16), freshness: freshness(true), error: nil })(v)) return false
        return !(record(v.completeness!) && v.completeness.kind === 'complete' && v.continuation !== null) && !(record(v.freshness!) && v.freshness.kind === 'stale' && v.continuation !== null)
      }
      return object({ ...base, permission: en(v.source_state === 'not_authorized' ? 'not_authorized' : 'unknown'), items: nil, completeness: nil, continuation: nil, freshness: nil, error: v.source_state === 'error' ? error : v.source_state === 'unavailable' ? nullable(error) : nil, ...(v.source_state === 'unsupported' ? { reason: en('contract_not_published') } : {}) })(v)
    }
    const owned = (kind: EntityKindV1, allowed: string[], fields: (owner: { kind: EntityKindV1; id: string }) => Record<string, Check>, versioned = false): Check => (v) => record(v) && typeof v.id === 'string' && object({ ...(versioned ? scope : {}), id: entityId(kind), ...fields({ kind, id: v.id }), capabilities: array(cap(allowed, { kind, id: v.id }), 16) })(v)
    checks.customer = owned('customer', ['edit', 'navigate'], (owner) => ({ account_kind: en('legal_entity', 'sole_trader'), legal_name: (v) => str(v), trade_name: nullable((v) => str(v)), tax_identifier: protectedField('tax_identifier', owner), lifecycle: en('lead', 'prospect', 'customer', 'former_customer'), status: en('active', 'inactive', 'archived'), assigned_user: nullable(ref('user')), primary_contact: nullable(ref('contact')) }), true)
    const contract = owned('contract', ['edit', 'navigate'], (owner) => ({ customer: ref('customer'), operator: ref('operator'), plan: nullable(ref('plan')), external_reference: protectedField('contract_reference', owner), status: en('draft', 'active', 'ended', 'cancelled'), start_date: date, signed_date: nullable(date), end_date: nullable(date), cancelled_at: nullable(instant), assigned_user: nullable(ref('user')) }), true)
    checks.contract = (v) => contract(v) && ordered(v, 'start_date', 'end_date')
    const lifecycle = en('pending', 'active', 'suspended', 'ended', 'cancelled')
    const service = owned('service', ['edit', 'navigate'], () => ({ customer: ref('customer'), contract: ref('contract'), operator: ref('operator'), plan: nullable(ref('plan')), service_kind: en('mobile', 'fiber', 'fixed_voice', 'data_connectivity', 'other'), display_name: (v) => str(v), status: lifecycle, activated_on: nullable(date), ended_on: nullable(date) }), true)
    checks.service = (v) => service(v) && ordered(v, 'activated_on', 'ended_on')
    const line = owned('line', ['edit', 'navigate'], (owner) => ({ service: ref('service'), identifier: protectedField('line_identifier', owner), status: lifecycle, activated_on: nullable(date), ended_on: nullable(date) }), true)
    checks.line = (v) => line(v) && ordered(v, 'activated_on', 'ended_on')
    const attentionBase = { customer: nullable(ref('customer')), title: (v: JsonValue) => str(v), destination: nullable(navigation) }
    checks.task = owned('task', ['complete', 'edit', 'navigate'], () => ({ ...attentionBase, kind: en('task'), status: en('pending', 'in_progress', 'completed', 'cancelled'), priority: nullable(en('low', 'normal', 'high')), due_at: nullable(instant), assignee: nullable(ref('user')), version: integer }))
    const meeting = owned('meeting', ['join', 'edit', 'navigate'], () => ({ ...attentionBase, kind: en('meeting'), status: en('scheduled', 'completed', 'cancelled', 'no_show'), starts_at: instant, ends_at: nullable(instant), all_day: bool, timezone, channel: en('in_person', 'phone', 'video', 'other'), assignee: nullable(ref('user')) }))
    checks.meeting = (v) => meeting(v) && ordered(v, 'starts_at', 'ends_at', true)
    const renewal = owned('renewal', ['edit', 'navigate'], () => ({ ...attentionBase, kind: en('renewal'), contract: ref('contract'), status: en('upcoming', 'overdue', 'completed', 'dismissed', 'not_applicable'), target_on: date, opens_on: nullable(date), closes_on: nullable(date) }))
    checks.renewal = (v) => renewal(v) && ordered(v, 'opens_on', 'closes_on')
    const permanence = owned('permanence', ['navigate'], () => ({ ...attentionBase, kind: en('permanence'), contract: ref('contract'), service: nullable(ref('service')), status: en('upcoming', 'active', 'ended', 'cancelled'), starts_on: date, ends_on: date, reason_code: en('minimum_term', 'device', 'subsidy', 'discount', 'other') }))
    checks.permanence = (v) => permanence(v) && ordered(v, 'starts_on', 'ends_on')
    checks.opportunity = owned('opportunity', ['edit', 'navigate'], () => ({ ...attentionBase, kind: en('opportunity'), stage: ref('opportunity_stage'), status: en('open', 'won', 'lost', 'cancelled'), next_follow_up_at: nullable(instant), follow_up_state: en('none', 'scheduled', 'overdue'), amount: nullable(object({ minor_units: integer, currency: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v) })), owner: nullable(ref('user')) }))
    checks.activity = owned('activity', ['navigate'], () => ({ kind: en('activity'), customer: nullable(ref('customer')), activity_kind: en('created', 'updated', 'contacted', 'status_changed', 'system'), safe_summary: (v) => str(v, 2000), occurred_at: instant, actor: nullable(ref('user')), targets: array(ref(), 32) }))
    // Alert is a DTO discriminator, not an EntityKindV1; its capabilities bind their own authorized targets.
    checks.alert = object({ id, ...attentionBase, kind: en('alert'), alert_class: en('renewal', 'permanence', 'task', 'meeting', 'incident'), urgency: nullable(en('low', 'normal', 'high')), raised_at: instant, capabilities: array(cap(['navigate']), 16) })
    const attention = object({ ...scope, customer_id: entityId('customer'), generated_at: instant, next_task: collection(checks.task), next_meeting: collection(checks.meeting), nearest_renewal: collection(checks.renewal), nearest_permanence: collection(checks.permanence), alerts: collection(checks.alert), recent_activity: collection(checks.activity) })
    checks.attention = (v) => attention(v) && record(v) && typeof v.customer_id === 'string' && customerConsistent(v, v.customer_id)
    checks.summary = (v) => object({ ...scope, customer: checks.customer!, contracts: collection(checks.contract!), services: collection(checks.service!), lines: collection(checks.line!), attention: checks.attention! })(v) && record(v) && record(v.customer!) && record(v.attention!) && typeof v.customer.id === 'string' && v.customer.id === v.attention.customer_id && customerConsistent(v, v.customer.id)
    checks.dashboard = (v) => object({ ...scope, generated_at: instant, scope: object({ audience: en('personal', 'team', 'workspace'), timezone, scope_epoch: en(scopeEpoch) }), window: object({ starts_at: instant, ends_at: instant }), today: collection((x) => record(x) && (x.kind === 'task' ? checks.task!(x) : x.kind === 'meeting' && checks.meeting!(x))), tasks: collection(checks.task!), meetings: collection(checks.meeting!), renewals: collection(checks.renewal!), permanence_alerts: collection(checks.permanence!), opportunities: collection(checks.opportunity!) })(v) && record(v) && ordered(v.window!, 'starts_at', 'ends_at', true)
    let check = checks[kind]
    if (kind.startsWith('collection:')) { const item = checks[kind.slice(11)]; if (item && ['customer', 'contract', 'service', 'line', 'task', 'meeting', 'renewal', 'permanence', 'opportunity', 'alert', 'activity'].includes(kind.slice(11))) check = collection(item) }
    if (kind.startsWith('readone:')) {
      const item = checks[kind.slice(8)]
      if (item && ['customer', 'contract', 'summary', 'dashboard'].includes(kind.slice(8))) check = (v) => record(v) && object({ ...scope, result: en('found', 'not_found', 'not_authorized', 'unavailable', 'error'), data: v.result === 'found' ? item : nil, freshness: v.result === 'found' ? freshness(false) : nil, error: v.result === 'error' ? error : v.result === 'unavailable' ? nullable(error) : nil })(v)
    }
    if (!check || !check(value) || !record(value)) return { ok: false, code: 'INVALID_DTO' }
    if (references.size && !authorizeReference) return { ok: false, code: 'UNVERIFIED_REFERENCE' }
    for (const reference of references.values()) {
      if (!authorityCurrent() || !authorizeReference || await authorizeReference(reference) !== true || !authorityCurrent()) return { ok: false, code: 'UNVERIFIED_REFERENCE' }
    }
    if (!authorityCurrent()) return { ok: false, code: 'UNVERIFIED_REFERENCE' }
    freezeJson(value)
    return { ok: true, value }
  } catch { return { ok: false, code: 'INVALID_DTO' } }
}
