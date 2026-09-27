import type {
  CapabilityRefV1,
  CollectionEnvelopeV1,
  EntityKindV1,
  FieldClassV1,
  ReadOneResponseV1,
  TelecomV1ReadOperation,
} from '../contracts/telecom-v1'

type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject
type JsonObject = { [key: string]: JsonValue }
type Check = (value: JsonValue) => boolean

const ENTITY_KINDS: readonly EntityKindV1[] = [
  'user', 'customer', 'contact', 'operator', 'plan', 'contract', 'service',
  'line', 'commitment', 'permanence', 'renewal', 'opportunity',
  'opportunity_stage', 'task', 'meeting', 'activity', 'document', 'incident',
]
const FIELD_CLASSES: readonly FieldClassV1[] = [
  'tax_identifier', 'contact_email', 'contact_phone', 'contract_reference',
  'line_identifier', 'document_metadata',
]
const ITEM_KIND: Readonly<Record<TelecomV1ReadOperation, string>> = {
  'customer.search': 'customer',
  'customer.get': 'customer',
  'customer.summary': 'summary',
  'contract.list': 'contract',
  'contract.get': 'contract',
  'service.list': 'service',
  'line.list': 'line',
  'renewal.list': 'renewal',
  'permanence.list': 'permanence',
  'task.list': 'task',
  'meeting.list': 'meeting',
  'activity.list': 'activity',
  'opportunity.list': 'opportunity',
  'dashboard.get': 'dashboard',
}

export type TelecomRuntimePolicyV1 = {
  scopeEpoch: string
  now: string
  isCurrent(): boolean
  currentNow(): string
  authorizeReference(reference: Readonly<{ kind: EntityKindV1; id: string }>): Promise<boolean>
  authorizeCapability(capability: Readonly<CapabilityRefV1>): Promise<boolean>
}

export type TelecomRuntimeParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'invalid' | 'access_revoked' }

export function isStrictCalendarDateV1(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= (days[month - 1] ?? 0)
}

export function isStrictInstantV1(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value)
  if (!match || !isStrictCalendarDateV1(match[1])) return false
  const hour = Number(match[2])
  const minute = Number(match[3])
  const second = Number(match[4])
  if (hour > 23 || minute > 59 || second > 59) return false
  if (match[5] !== 'Z') {
    const offsetHour = Number(match[7])
    const offsetMinute = Number(match[8])
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return false
  }
  return Number.isFinite(Date.parse(value))
}

function snapshot(
  input: unknown,
  depth = 0,
  budget = { nodes: 0, chars: 0 },
  ancestors = new WeakSet<object>(),
): JsonValue {
  if (++budget.nodes > 20_000 || depth > 20) throw new Error('bounds')
  if (input === null || typeof input === 'boolean') return input
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (typeof input === 'string') {
    budget.chars += input.length
    if (input.length > 4_000 || budget.chars > 131_072) throw new Error('bounds')
    return input
  }
  if (typeof input !== 'object') throw new Error('json')
  if (ancestors.has(input)) throw new Error('cycle')
  ancestors.add(input)
  if (Array.isArray(input)) {
    if (input.length > 100 || Object.keys(input).length !== input.length || Reflect.ownKeys(input).length !== input.length + 1) throw new Error('array')
    const descriptors = Object.getOwnPropertyDescriptors(input)
    const result = Array.from({ length: input.length }, (_, index) => {
      const field = descriptors[String(index)]
      if (!field || !field.enumerable || !('value' in field)) throw new Error('accessor')
      return snapshot(field.value, depth + 1, budget, ancestors)
    })
    ancestors.delete(input)
    return result
  }
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) throw new Error('prototype')
  const descriptors = Object.getOwnPropertyDescriptors(input)
  if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.keys(descriptors).length > 40) throw new Error('keys')
  const result: JsonObject = Object.create(null)
  for (const [key, field] of Object.entries(descriptors)) {
    budget.chars += key.length
    if (key.length > 160 || budget.chars > 131_072 || !field.enumerable || !('value' in field) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('field')
    result[key] = snapshot(field.value, depth + 1, budget, ancestors)
  }
  ancestors.delete(input)
  return result
}

function freezeJson(value: JsonValue): void {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child)
    Object.freeze(value)
  }
}

const record = (value: JsonValue): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: JsonValue, max = 400): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(value)
const id: Check = (value) => text(value, 160) && value.length >= 16 && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value)
const enumeration = (...values: string[]): Check => (value) => typeof value === 'string' && values.includes(value)
const nil: Check = (value) => value === null
const nullable = (check: Check): Check => (value) => value === null || check(value)
const boolean: Check = (value) => typeof value === 'boolean'
const integer: Check = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const date: Check = (value) => isStrictCalendarDateV1(value)
const instant: Check = (value) => isStrictInstantV1(value)
const timezone: Check = (value) => {
  if (!text(value, 100)) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
}
const array = (check: Check, max = 100): Check => (value) => Array.isArray(value) && value.length <= max && value.every(check)

function closed(fields: Record<string, Check>, optional: readonly string[] = []): Check {
  return (value) => record(value)
    && Object.keys(value).every((key) => Object.hasOwn(fields, key))
    && Object.entries(fields).every(([key, check]) => Object.hasOwn(value, key) ? check(value[key]!) : optional.includes(key))
}

function ordered(value: JsonValue, from: string, to: string, timestamps = false): boolean {
  if (!record(value) || value[from] === null || value[to] === null) return record(value)
  if (typeof value[from] !== 'string' || typeof value[to] !== 'string') return false
  return timestamps ? Date.parse(value[from]) <= Date.parse(value[to]) : value[from] <= value[to]
}

function entityKind(value: JsonValue): value is EntityKindV1 {
  return typeof value === 'string' && ENTITY_KINDS.includes(value as EntityKindV1)
}

function parseWithChecks(input: unknown, operation: TelecomV1ReadOperation, policy: TelecomRuntimePolicyV1, readOne: boolean): Promise<TelecomRuntimeParseResult<unknown>> {
  return (async () => {
    try {
      if (!text(policy.scopeEpoch, 160) || !isStrictInstantV1(policy.now) || !policy.isCurrent()) return { ok: false, code: 'access_revoked' }
      const raw = snapshot(input)
      if (record(raw) && typeof raw.scope_epoch === 'string' && raw.scope_epoch !== policy.scopeEpoch) {
        return { ok: false, code: 'access_revoked' }
      }
      const references = new Map<string, Readonly<{ kind: EntityKindV1; id: string }>>()
      const capabilities: CapabilityRefV1[] = []
      const nowMs = Date.parse(policy.now)
      const entityId = (kind: EntityKindV1): Check => (value) => {
        if (!id(value) || typeof value !== 'string') return false
        references.set(`${kind}:${value}`, Object.freeze({ kind, id: value }))
        return true
      }
      const ref = (expected?: EntityKindV1): Check => (value) => record(value) && entityKind(value.kind)
        && (!expected || value.kind === expected)
        && closed({ kind: enumeration(value.kind), id: entityId(value.kind), display_name: (candidate) => text(candidate) })(value)
      const safeError = closed({
        code: enumeration('unauthorized', 'not_found', 'forbidden', 'validation', 'conflict', 'rate_limited', 'temporary_unavailable', 'stale', 'access_revoked', 'internal_safe'),
        retryable: boolean,
        correlation_id: (value) => text(value, 160),
      }, ['correlation_id'])
      const capability = (allowed: readonly string[], owner?: { kind: EntityKindV1; id: string }, fieldClass?: FieldClassV1): Check => (value) => {
        if (!record(value)) return false
        const target: Check = (candidate) => record(candidate) && entityKind(candidate.kind)
          && closed({
            kind: enumeration(candidate.kind),
            id: entityId(candidate.kind),
            field_class: enumeration(...FIELD_CLASSES),
          }, ['field_class'])(candidate)
          && (!owner || (candidate.kind === owner.kind && candidate.id === owner.id))
          && (fieldClass ? candidate.field_class === fieldClass : candidate.field_class === undefined)
        if (!closed({ ref: id, action: enumeration(...allowed), target, expires_at: instant })(value)) return false
        if (typeof value.expires_at !== 'string' || Date.parse(value.expires_at) <= nowMs) return false
        capabilities.push(value as unknown as CapabilityRefV1)
        return true
      }
      const protectedField = (fieldClass: FieldClassV1, owner: { kind: EntityKindV1; id: string }): Check => (value) => record(value) && (
        value.visibility === 'masked'
          ? closed({ field_class: enumeration(fieldClass), visibility: enumeration('masked'), masked_text: (candidate) => text(candidate), reveal_capability: capability(['reveal'], owner, fieldClass) })(value)
          : closed({ field_class: enumeration(fieldClass), visibility: enumeration('hidden', 'not_available') })(value)
      )
      const navigation: Check = (value) => {
        if (!record(value) || !entityKind(value.kind) || !['customer', 'contract', 'service', 'line', 'task', 'meeting', 'opportunity'].includes(value.kind)) return false
        return closed({ kind: enumeration(value.kind), [`${value.kind}_id`]: entityId(value.kind) })(value)
      }
      const freshness = (withNotice: boolean): Check => (value) => record(value) && (
        value.kind === 'fresh'
          ? closed({ kind: enumeration('fresh'), as_of: instant })(value)
          : value.kind === 'stale' && closed({ kind: enumeration('stale'), as_of: instant, ...(withNotice ? { notice: nullable(safeError) } : {}) })(value)
      )
      const scope = { contract_version: enumeration('telecom.v1'), scope_epoch: enumeration(policy.scopeEpoch) }
      const checks: Record<string, Check> = Object.create(null)
      const owned = (kind: EntityKindV1, actions: readonly string[], fields: (owner: { kind: EntityKindV1; id: string }) => Record<string, Check>, versioned = false): Check => (value) => record(value) && typeof value.id === 'string' && closed({
        ...(versioned ? scope : {}),
        id: entityId(kind),
        ...fields({ kind, id: value.id }),
        capabilities: array(capability(actions, { kind, id: value.id }), 16),
      })(value)

      checks.customer = owned('customer', ['edit', 'navigate'], (owner) => ({
        account_kind: enumeration('legal_entity', 'sole_trader'), legal_name: (value) => text(value), trade_name: nullable((value) => text(value)),
        tax_identifier: protectedField('tax_identifier', owner), lifecycle: enumeration('lead', 'prospect', 'customer', 'former_customer'),
        status: enumeration('active', 'inactive', 'archived'), assigned_user: nullable(ref('user')), primary_contact: nullable(ref('contact')),
      }), true)
      const contract = owned('contract', ['edit', 'navigate'], (owner) => ({
        customer: ref('customer'), operator: ref('operator'), plan: nullable(ref('plan')), external_reference: protectedField('contract_reference', owner),
        status: enumeration('draft', 'active', 'ended', 'cancelled'), start_date: date, signed_date: nullable(date), end_date: nullable(date),
        cancelled_at: nullable(instant), assigned_user: nullable(ref('user')),
      }), true)
      checks.contract = (value) => contract(value) && ordered(value, 'start_date', 'end_date')
      const lifecycle = enumeration('pending', 'active', 'suspended', 'ended', 'cancelled')
      const service = owned('service', ['edit', 'navigate'], () => ({
        customer: ref('customer'), contract: ref('contract'), operator: ref('operator'), plan: nullable(ref('plan')),
        service_kind: enumeration('mobile', 'fiber', 'fixed_voice', 'data_connectivity', 'other'), display_name: (value) => text(value),
        status: lifecycle, activated_on: nullable(date), ended_on: nullable(date),
      }), true)
      checks.service = (value) => service(value) && ordered(value, 'activated_on', 'ended_on')
      const line = owned('line', ['edit', 'navigate'], (owner) => ({
        service: ref('service'), identifier: protectedField('line_identifier', owner), status: lifecycle,
        activated_on: nullable(date), ended_on: nullable(date),
      }), true)
      checks.line = (value) => line(value) && ordered(value, 'activated_on', 'ended_on')
      const attentionBase = { customer: nullable(ref('customer')), title: (value: JsonValue) => text(value), destination: nullable(navigation) }
      checks.task = owned('task', ['complete', 'edit', 'navigate'], () => ({
        ...attentionBase, kind: enumeration('task'), status: enumeration('pending', 'in_progress', 'completed', 'cancelled'),
        priority: nullable(enumeration('low', 'normal', 'high')), due_at: nullable(instant), assignee: nullable(ref('user')), version: integer,
      }))
      const meeting = owned('meeting', ['join', 'edit', 'navigate'], () => ({
        ...attentionBase, kind: enumeration('meeting'), status: enumeration('scheduled', 'completed', 'cancelled', 'no_show'),
        starts_at: instant, ends_at: nullable(instant), all_day: boolean, timezone, channel: enumeration('in_person', 'phone', 'video', 'other'),
        assignee: nullable(ref('user')),
      }))
      checks.meeting = (value) => meeting(value) && ordered(value, 'starts_at', 'ends_at', true)
      const renewal = owned('renewal', ['edit', 'navigate'], () => ({
        ...attentionBase, kind: enumeration('renewal'), contract: ref('contract'), status: enumeration('upcoming', 'overdue', 'completed', 'dismissed', 'not_applicable'),
        target_on: date, opens_on: nullable(date), closes_on: nullable(date),
      }))
      checks.renewal = (value) => renewal(value) && ordered(value, 'opens_on', 'closes_on')
      const permanence = owned('permanence', ['navigate'], () => ({
        ...attentionBase, kind: enumeration('permanence'), contract: ref('contract'), service: nullable(ref('service')),
        status: enumeration('upcoming', 'active', 'ended', 'cancelled'), starts_on: date, ends_on: date,
        reason_code: enumeration('minimum_term', 'device', 'subsidy', 'discount', 'other'),
      }))
      checks.permanence = (value) => permanence(value) && ordered(value, 'starts_on', 'ends_on')
      checks.opportunity = owned('opportunity', ['edit', 'navigate'], () => ({
        ...attentionBase, kind: enumeration('opportunity'), stage: ref('opportunity_stage'), status: enumeration('open', 'won', 'lost', 'cancelled'),
        next_follow_up_at: nullable(instant), follow_up_state: enumeration('none', 'scheduled', 'overdue'),
        amount: nullable(closed({ minor_units: integer, currency: (value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value) })), owner: nullable(ref('user')),
      }))
      checks.activity = owned('activity', ['navigate'], () => ({
        kind: enumeration('activity'), customer: nullable(ref('customer')), activity_kind: enumeration('created', 'updated', 'contacted', 'status_changed', 'system'),
        safe_summary: (value) => text(value, 2_000), occurred_at: instant, actor: nullable(ref('user')), targets: array(ref(), 32),
      }))
      checks.alert = closed({ id, ...attentionBase, kind: enumeration('alert'), alert_class: enumeration('renewal', 'permanence', 'task', 'meeting', 'incident'), urgency: nullable(enumeration('low', 'normal', 'high')), raised_at: instant, capabilities: array(capability(['navigate']), 16) })

      const collection = (item: Check): Check => (value) => {
        if (!record(value)) return false
        const base = { ...scope, source_state: enumeration('available', 'unsupported', 'unavailable', 'not_authorized', 'error'), permission: enumeration('authorized', 'unknown', 'not_authorized') }
        if (value.source_state === 'available') {
          if (!closed({ ...base, permission: enumeration('authorized'), items: array(item), completeness: (candidate) => record(candidate) && (candidate.kind === 'complete' ? closed({ kind: enumeration('complete') })(candidate) : closed({ kind: enumeration('partial'), has_more: (flag) => flag === true })(candidate)), continuation: nullable((candidate) => text(candidate, 256) && candidate.length >= 16), freshness: freshness(true), error: nil })(value)) return false
          return !(record(value.completeness!) && value.completeness.kind === 'complete' && value.continuation !== null)
            && !(record(value.freshness!) && value.freshness.kind === 'stale' && value.continuation !== null)
        }
        return closed({ ...base, permission: enumeration(value.source_state === 'not_authorized' ? 'not_authorized' : 'unknown'), items: nil, completeness: nil, continuation: nil, freshness: nil, error: value.source_state === 'error' ? safeError : value.source_state === 'unavailable' ? nullable(safeError) : nil, ...(value.source_state === 'unsupported' ? { reason: enumeration('contract_not_published') } : {}) })(value)
      }

      const customerConsistent = (value: JsonValue, expected: string): boolean => {
        if (!value || typeof value !== 'object') return true
        if (record(value) && value.kind === 'customer' && value.id !== expected) return false
        return Object.values(value).every((child) => customerConsistent(child, expected))
      }
      checks.attention = (value) => closed({
        ...scope, customer_id: entityId('customer'), generated_at: instant,
        next_task: collection(checks.task!), next_meeting: collection(checks.meeting!), nearest_renewal: collection(checks.renewal!),
        nearest_permanence: collection(checks.permanence!), alerts: collection(checks.alert!), recent_activity: collection(checks.activity!),
      })(value) && record(value) && typeof value.customer_id === 'string' && customerConsistent(value, value.customer_id)
      checks.summary = (value) => closed({
        ...scope, customer: checks.customer!, contracts: collection(checks.contract!), services: collection(checks.service!),
        lines: collection(checks.line!), attention: checks.attention!,
      })(value) && record(value) && record(value.customer!) && record(value.attention!) && typeof value.customer.id === 'string'
        && value.customer.id === value.attention.customer_id && customerConsistent(value, value.customer.id)
      checks.dashboard = (value) => closed({
        ...scope, generated_at: instant,
        scope: closed({ audience: enumeration('personal', 'team', 'workspace'), timezone, scope_epoch: enumeration(policy.scopeEpoch) }),
        window: closed({ starts_at: instant, ends_at: instant }),
        today: collection((item) => record(item) && (item.kind === 'task' ? checks.task!(item) : item.kind === 'meeting' && checks.meeting!(item))),
        tasks: collection(checks.task!), meetings: collection(checks.meeting!), renewals: collection(checks.renewal!),
        permanence_alerts: collection(checks.permanence!), opportunities: collection(checks.opportunity!),
      })(value) && record(value) && ordered(value.window!, 'starts_at', 'ends_at', true)

      const item = checks[ITEM_KIND[operation]]
      if (!item) return { ok: false, code: 'invalid' }
      const valid = readOne
        ? record(raw) && closed({ ...scope, result: enumeration('found', 'not_found', 'not_authorized', 'unavailable', 'error'), data: raw.result === 'found' ? item : nil, freshness: raw.result === 'found' ? freshness(false) : nil, error: raw.result === 'error' ? safeError : raw.result === 'unavailable' ? nullable(safeError) : nil })(raw)
        : collection(item)(raw)
      if (!valid || !record(raw)) return { ok: false, code: 'invalid' }

      for (const reference of references.values()) {
        if (!policy.isCurrent() || await policy.authorizeReference(reference) !== true || !policy.isCurrent()) return { ok: false, code: 'access_revoked' }
      }
      for (const capabilityRef of capabilities) {
        const currentNow = policy.currentNow()
        if (!policy.isCurrent() || !isStrictInstantV1(currentNow) || Date.parse(capabilityRef.expires_at) <= Date.parse(currentNow) || await policy.authorizeCapability(Object.freeze({ ...capabilityRef })) !== true || !policy.isCurrent()) return { ok: false, code: 'access_revoked' }
      }
      if (!policy.isCurrent()) return { ok: false, code: 'access_revoked' }
      freezeJson(raw)
      return { ok: true, value: raw }
    } catch {
      return { ok: false, code: 'invalid' }
    }
  })()
}

export async function parseTelecomCollectionV1<T>(operation: TelecomV1ReadOperation, input: unknown, policy: TelecomRuntimePolicyV1): Promise<TelecomRuntimeParseResult<CollectionEnvelopeV1<T>>> {
  return parseWithChecks(input, operation, policy, false) as Promise<TelecomRuntimeParseResult<CollectionEnvelopeV1<T>>>
}

export async function parseTelecomReadOneV1<T>(operation: TelecomV1ReadOperation, input: unknown, policy: TelecomRuntimePolicyV1): Promise<TelecomRuntimeParseResult<ReadOneResponseV1<T>>> {
  return parseWithChecks(input, operation, policy, true) as Promise<TelecomRuntimeParseResult<ReadOneResponseV1<T>>>
}
