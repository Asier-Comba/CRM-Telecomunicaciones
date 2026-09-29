import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTelecomDto, type TelecomDtoKind, type TelecomDtoPolicy, type JsonObject, type JsonValue } from '../src/assistant/telecom-dto-parser.js'

const now = '2026-09-27T10:00:00Z'
const scope = { contract_version: 'telecom.v1', scope_epoch: 'scope_epoch_00000001' }
const identifier = (kind: string) => `${kind}_0000000000000001`
const ref = (kind: string) => ({ kind, id: identifier(kind), display_name: kind })
const cap = (kind: string, action = 'navigate', field?: string) => ({ ref: 'capability_000000000001', action, target: { kind, id: identifier(kind), ...(field ? { field_class: field } : {}) }, expires_at: '2026-09-27T10:05:00Z' })
const hidden = (field_class: string) => ({ field_class, visibility: 'hidden' })
const base = (kind: string) => ({ id: identifier(kind), kind, customer: ref('customer'), title: kind, destination: null, capabilities: kind === 'alert' ? [] : [cap(kind)] })
const collection = (items: JsonValue[]) => ({ ...scope, source_state: 'available', permission: 'authorized', items, completeness: { kind: 'complete' }, continuation: null, freshness: { kind: 'fresh', as_of: now }, error: null })
const fixtures: Record<string, JsonObject> = {
  customer: { ...scope, id: identifier('customer'), account_kind: 'legal_entity', legal_name: 'ACME', trade_name: null, tax_identifier: hidden('tax_identifier'), lifecycle: 'customer', status: 'active', assigned_user: ref('user'), primary_contact: ref('contact'), capabilities: [cap('customer')] },
  contract: { ...scope, id: identifier('contract'), customer: ref('customer'), operator: ref('operator'), plan: ref('plan'), external_reference: hidden('contract_reference'), status: 'active', start_date: '2024-02-29', signed_date: null, end_date: null, cancelled_at: null, assigned_user: null, capabilities: [cap('contract')] },
  service: { ...scope, id: identifier('service'), customer: ref('customer'), contract: ref('contract'), operator: ref('operator'), plan: null, service_kind: 'mobile', display_name: 'Mobile', status: 'active', activated_on: '2026-09-01', ended_on: null, capabilities: [cap('service')] },
  line: { ...scope, id: identifier('line'), service: ref('service'), identifier: hidden('line_identifier'), status: 'active', activated_on: null, ended_on: null, capabilities: [cap('line')] },
  task: { ...base('task'), status: 'pending', priority: 'high', due_at: now, assignee: ref('user'), version: 1 },
  meeting: { ...base('meeting'), status: 'scheduled', starts_at: now, ends_at: null, all_day: false, timezone: 'Europe/Madrid', channel: 'video', assignee: null },
  renewal: { ...base('renewal'), contract: ref('contract'), status: 'upcoming', target_on: '2026-10-01', opens_on: null, closes_on: null },
  permanence: { ...base('permanence'), contract: ref('contract'), service: null, status: 'active', starts_on: '2026-01-01', ends_on: '2027-01-01', reason_code: 'minimum_term' },
  opportunity: { ...base('opportunity'), stage: ref('opportunity_stage'), status: 'open', next_follow_up_at: null, follow_up_state: 'none', amount: { minor_units: 2500, currency: 'EUR' }, owner: ref('user') },
  alert: { ...base('alert'), alert_class: 'renewal', urgency: 'normal', raised_at: now },
  activity: { id: identifier('activity'), kind: 'activity', customer: ref('customer'), activity_kind: 'contacted', safe_summary: 'Called customer', occurred_at: now, actor: ref('user'), targets: [ref('contract')], capabilities: [cap('activity')] },
}
fixtures.attention = { ...scope, customer_id: identifier('customer'), generated_at: now, next_task: collection([fixtures.task!]), next_meeting: collection([fixtures.meeting!]), nearest_renewal: collection([fixtures.renewal!]), nearest_permanence: collection([fixtures.permanence!]), alerts: collection([fixtures.alert!]), recent_activity: collection([fixtures.activity!]) }
fixtures.summary = { ...scope, customer: fixtures.customer!, contracts: collection([fixtures.contract!]), services: collection([fixtures.service!]), lines: collection([fixtures.line!]), attention: fixtures.attention! }
fixtures.dashboard = { ...scope, generated_at: now, scope: { audience: 'personal', timezone: 'Europe/Madrid', scope_epoch: scope.scope_epoch }, window: { starts_at: now, ends_at: '2026-09-28T10:00:00Z' }, today: collection([fixtures.task!, fixtures.meeting!]), tasks: collection([fixtures.task!]), meetings: collection([fixtures.meeting!]), renewals: collection([fixtures.renewal!]), permanence_alerts: collection([fixtures.permanence!]), opportunities: collection([fixtures.opportunity!]) }
const allow = { scopeEpoch: scope.scope_epoch, now, authorizeReference: () => true }
const clone = <T>(v: T): T => structuredClone(v)

test('all concrete W1 DTOs and their published envelopes parse from unknown into isolated frozen snapshots', async () => {
  for (const [kind, value] of Object.entries(fixtures)) {
    const parsed = await parseTelecomDto(kind as TelecomDtoKind, value, allow)
    assert.equal(parsed.ok, true, kind)
    if (parsed.ok) { assert.notEqual(parsed.value, value); assert.equal(Object.isFrozen(parsed.value), true) }
    if (!['attention', 'summary', 'dashboard'].includes(kind)) assert.equal((await parseTelecomDto(`collection:${kind}`, collection([value]), allow)).ok, true, kind)
  }
  for (const kind of ['customer', 'contract', 'summary', 'dashboard']) assert.equal((await parseTelecomDto(`readone:${kind}`, { ...scope, result: 'found', data: fixtures[kind]!, freshness: { kind: 'fresh', as_of: now }, error: null }, allow)).ok, true)
})

test('all reference identities require server authorization; foreign references and missing policy fail closed', async () => {
  assert.deepEqual(await parseTelecomDto('summary', fixtures.summary, { scopeEpoch: scope.scope_epoch, now }), { ok: false, code: 'UNVERIFIED_REFERENCE' })
  const visited: string[] = []
  assert.equal((await parseTelecomDto('summary', fixtures.summary, { ...allow, authorizeReference: ({ kind }) => { visited.push(kind); return kind !== 'operator' } })).ok, false)
  assert.ok(visited.includes('operator'))
  assert.equal((await parseTelecomDto('summary', fixtures.summary, { ...allow, authorizeReference: async () => { throw new Error('provider private error') } })).ok, false)
})

test('recursive mutation fuzz rejects every unknown field and missing required property', async () => {
  let mutations = 0
  function paths(v: JsonValue, prefix: (string | number)[] = []): (string | number)[][] {
    if (!v || typeof v !== 'object') return []
    return [prefix, ...Object.entries(v).flatMap(([k, child]) => paths(child, [...prefix, Array.isArray(v) ? Number(k) : k]))]
  }
  for (const kind of ['summary', 'dashboard']) {
    for (const path of paths(fixtures[kind]!)) {
      for (const key of ['workspace_id', 'tenantId', 'workspace', 'authorization', 'revealed_value', 'provider_error', 'raw_payload', 'unexpected']) {
        const changed = clone(fixtures[kind]!)
        let target: JsonValue = changed
        for (const component of path) target = (target as Record<string | number, JsonValue>)[component]!
        if (!target || typeof target !== 'object' || Array.isArray(target)) continue
        target[key] = 'forged'
        assert.equal((await parseTelecomDto(kind as TelecomDtoKind, changed, allow)).ok, false, `${kind}:${path.join('.')}:${key}`)
        mutations++
      }
    }
  }
  for (const [kind, fixture] of Object.entries(fixtures)) for (const key of Object.keys(fixture)) {
    const changed = clone(fixture); delete changed[key]
    assert.equal((await parseTelecomDto(kind as TelecomDtoKind, changed, allow)).ok, false, `${kind} missing ${key}`)
    mutations++
  }
  assert.ok(mutations > 800)
})

test('deep version/epoch mismatch, wrong entity kind, date rollover, expiry and capability tampering fail', async () => {
  const attacks: [TelecomDtoKind, JsonObject][] = []
  attacks.push(['customer', { ...fixtures.customer!, scope_epoch: 'foreign_epoch' }])
  attacks.push(['customer', { ...fixtures.customer!, assigned_user: ref('customer') }])
  attacks.push(['contract', { ...fixtures.contract!, start_date: '2026-02-30' }])
  attacks.push(['meeting', { ...fixtures.meeting!, starts_at: '2026-09-27T25:00:00Z' }])
  attacks.push(['meeting', { ...fixtures.meeting!, ends_at: '2026-09-26T10:00:00Z' }])
  attacks.push(['customer', { ...fixtures.customer!, capabilities: [{ ...cap('customer'), expires_at: now }] }])
  attacks.push(['customer', { ...fixtures.customer!, capabilities: [cap('contract')] }])
  attacks.push(['task', { ...fixtures.task!, capabilities: [cap('task', 'reveal')] }])
  attacks.push(['customer', { ...fixtures.customer!, tax_identifier: { field_class: 'tax_identifier', visibility: 'revealed', revealed_value: 'B12345678' } }])
  const summary = clone(fixtures.summary!); const contracts = summary.contracts as JsonObject; contracts.scope_epoch = 'foreign'; attacks.push(['summary', summary])
  const crossCustomer = clone(fixtures.contract!); crossCustomer.customer = { ...ref('customer'), id: 'customer_foreign_0000001' }; attacks.push(['summary', { ...fixtures.summary!, contracts: collection([crossCustomer]) }])
  for (const [kind, attack] of attacks) assert.equal((await parseTelecomDto(kind, attack, allow)).ok, false)
  const masked = { field_class: 'tax_identifier', visibility: 'masked', masked_text: 'B****5678', reveal_capability: cap('customer', 'reveal', 'tax_identifier') }
  assert.equal((await parseTelecomDto('customer', { ...fixtures.customer!, tax_identifier: masked }, allow)).ok, true)
  assert.equal((await parseTelecomDto('customer', { ...fixtures.customer!, tax_identifier: { ...masked, reveal_capability: cap('customer', 'reveal', 'contact_phone') } }, allow)).ok, false)
})

test('collection completeness, stale pagination and source failures stay discriminated', async () => {
  const empty = collection([])
  for (const source_state of ['unsupported', 'unavailable', 'not_authorized', 'error']) {
    const v = { ...scope, source_state, permission: source_state === 'not_authorized' ? 'not_authorized' : 'unknown', items: null, completeness: null, continuation: null, freshness: null, error: source_state === 'error' ? { code: 'internal_safe', retryable: false } : null, ...(source_state === 'unsupported' ? { reason: 'contract_not_published' } : {}) }
    assert.equal((await parseTelecomDto('collection:customer', v, allow)).ok, true)
    assert.equal((await parseTelecomDto('collection:customer', { ...v, items: [] }, allow)).ok, false)
  }
  assert.equal((await parseTelecomDto('collection:customer', { ...empty, continuation: 'continuation_0000001' }, allow)).ok, false)
  const partial = { ...empty, completeness: { kind: 'partial', has_more: true }, continuation: 'continuation_0000001' }
  assert.equal((await parseTelecomDto('collection:customer', partial, allow)).ok, true)
  assert.equal((await parseTelecomDto('collection:customer', { ...partial, freshness: { kind: 'stale', as_of: now, notice: null } }, allow)).ok, false)
})

test('resource limits, cyclic objects and accessors fail without reading getters', async () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle
  assert.equal((await parseTelecomDto('customer', cycle, allow)).ok, false)
  const getter = Object.defineProperty({}, 'id', { enumerable: true, get() { throw new Error('must not invoke') } })
  assert.equal((await parseTelecomDto('customer', getter, allow)).ok, false)
  assert.equal((await parseTelecomDto('collection:customer', collection(Array.from({ length: 101 }, () => fixtures.customer!)), allow)).ok, false)
  assert.equal((await parseTelecomDto('customer', { ...fixtures.customer!, legal_name: 'a'.repeat(4001) }, allow)).ok, false)
})

test('read-one failures cannot carry data, arbitrary safe-error extras or unsupported result states', async () => {
  for (const kind of ['customer', 'contract', 'summary', 'dashboard']) {
    for (const result of ['not_found', 'not_authorized', 'unavailable', 'error']) {
      const value = { ...scope, result, data: null, freshness: null, error: result === 'error' ? { code: 'internal_safe', retryable: false } : null }
      assert.equal((await parseTelecomDto(`readone:${kind}`, value, allow)).ok, true)
      assert.equal((await parseTelecomDto(`readone:${kind}`, { ...value, data: fixtures[kind] }, allow)).ok, false)
      assert.equal((await parseTelecomDto(`readone:${kind}`, { ...value, error: { code: 'internal_safe', retryable: false, message: 'private provider detail' } }, allow)).ok, false)
    }
  }
  assert.equal((await parseTelecomDto('readone:task', {}, allow)).ok, false)
  assert.equal((await parseTelecomDto('collection:summary', collection([]), allow)).ok, false)
})

test('standalone reference/error/capability/protected parsers require binding and reject prototype kind lookups', async () => {
  assert.equal((await parseTelecomDto('entity_ref', ref('customer'), allow)).ok, true)
  assert.equal((await parseTelecomDto('safe_error', { code: 'forbidden', retryable: false }, allow)).ok, true)
  const binding = { kind: 'customer' as const, id: identifier('customer'), fieldClass: 'tax_identifier', allowedActions: ['reveal'] }
  const capability = cap('customer', 'reveal', 'tax_identifier')
  const protectedValue = { field_class: 'tax_identifier', visibility: 'masked', masked_text: 'B****5678', reveal_capability: capability }
  for (const [kind, value] of [['capability_ref', capability], ['protected_field', protectedValue]] as const) {
    assert.equal((await parseTelecomDto(kind, value, { ...allow, binding })).ok, true)
    assert.equal((await parseTelecomDto(kind, value, allow)).ok, false)
    assert.equal((await parseTelecomDto(kind, value, { ...allow, binding: { ...binding, id: 'customer_foreign_0000001' } })).ok, false)
    assert.equal((await parseTelecomDto(kind, value, { ...allow, binding: { ...binding, fieldClass: 'contact_phone' } })).ok, false)
  }
  for (const kind of ['constructor', '__proto__', 'toString', 'collection:constructor', 'readone:constructor']) assert.equal((await parseTelecomDto(kind as TelecomDtoKind, {}, allow)).ok, false)
})

test('controls and blank text fail while accented company names and real business punctuation remain valid', async () => {
  for (const legal_name of ['   ', '\t', 'ACME\u0000', 'ACME\u007f', 'ACME\u0085', 'ACME\nCompany']) assert.equal((await parseTelecomDto('customer', { ...fixtures.customer!, legal_name }, allow)).ok, false)
  for (const legal_name of ['Arizan.net / Vodafone empresas', 'Oier Duñabeitia, S.L.', 'Mármoles & Hijos (Bizkaia)', 'Basic Empresas']) assert.equal((await parseTelecomDto('customer', { ...fixtures.customer!, legal_name }, allow)).ok, true)
  for (const id of ['customer_0000000\t0001', 'customer_0000000 0001', ' customer_00000000001', 'customer_00000000001\n']) assert.equal((await parseTelecomDto('entity_ref', { ...ref('customer'), id }, allow)).ok, false)
})

test('deep scalar replacement and required-field deletion mutations fail across all DTO fixtures', async () => {
  function leafPaths(value: JsonValue, prefix: (string | number)[] = []): (string | number)[][] {
    if (!value || typeof value !== 'object') return [prefix]
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, [...prefix, Array.isArray(value) ? Number(key) : key]))
  }
  let mutations = 0
  for (const [kind, fixture] of Object.entries(fixtures)) {
    for (const path of leafPaths(fixture)) {
      for (const change of ['delete', 'object', 'array'] as const) {
        const value = clone(fixture)
        let parent: JsonValue = value
        for (const key of path.slice(0, -1)) parent = (parent as Record<string | number, JsonValue>)[key]!
        const key = path[path.length - 1]!
        if (change === 'delete') delete (parent as Record<string | number, JsonValue>)[key]
        else (parent as Record<string | number, JsonValue>)[key] = change === 'object' ? { unexpected: true } : []
        assert.equal((await parseTelecomDto(kind as TelecomDtoKind, value, allow)).ok, false, `${kind}.${path.join('.')}:${change}`)
        mutations++
      }
    }
  }
  assert.ok(mutations > 800, `executed ${mutations} structural mutations`)
})

test('authorization awaits reject policy epoch/time/binding/action mutations before any DTO escapes', async () => {
  const changes: ((policy: TelecomDtoPolicy) => void)[] = [
    (p) => { p.scopeEpoch = 'epoch_foreign_0000001' },
    (p) => { p.now = '2026-09-27T10:01:00Z' },
    (p) => { p.binding!.id = 'customer_foreign_0000001' },
    (p) => { p.binding!.fieldClass = 'contact_phone' },
    (p) => { (p.binding!.allowedActions as string[]).push('copy') },
    (p) => { p.authorizeReference = () => true },
  ]
  for (const change of changes) {
    const policy: TelecomDtoPolicy = { scopeEpoch: scope.scope_epoch, now, binding: { kind: 'customer', id: identifier('customer'), fieldClass: 'tax_identifier', allowedActions: ['reveal'] } }
    policy.authorizeReference = async () => { change(policy); return true }
    assert.deepEqual(await parseTelecomDto('capability_ref', cap('customer', 'reveal', 'tax_identifier'), policy), { ok: false, code: 'UNVERIFIED_REFERENCE' })
  }
})

test('live scope revocation and capability expiry during asynchronous authorization fail closed', async () => {
  let epoch = scope.scope_epoch
  let calls = 0
  const revoked = await parseTelecomDto('summary', fixtures.summary, { scopeEpoch: scope.scope_epoch, now, currentScopeEpoch: () => epoch, authorizeReference: async () => { calls++; epoch = 'epoch_revoked_0000001'; return true } })
  assert.deepEqual(revoked, { ok: false, code: 'UNVERIFIED_REFERENCE' })
  assert.equal(calls, 1)
  let liveNow = now
  const expired = await parseTelecomDto('customer', fixtures.customer, { ...allow, currentNow: () => liveNow, authorizeReference: async () => { liveNow = '2026-09-27T10:05:00Z'; return true } })
  assert.deepEqual(expired, { ok: false, code: 'UNVERIFIED_REFERENCE' })
  const beforeExpiry = await parseTelecomDto('customer', fixtures.customer, { ...allow, currentScopeEpoch: () => scope.scope_epoch, currentNow: () => '2026-09-27T10:04:59.999Z' })
  assert.equal(beforeExpiry.ok, true)
  assert.equal((await parseTelecomDto('collection:customer', collection([]), { ...allow, currentScopeEpoch: () => 'wrong_epoch' })).ok, false)
  assert.equal((await parseTelecomDto('customer', fixtures.customer, { ...allow, currentNow: () => 'invalid' })).ok, false)
})
