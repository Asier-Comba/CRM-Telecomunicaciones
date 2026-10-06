import { TELECOM_COLLECTION_SPECS_V1 } from '../lib/server/telecom-collection-specs-v1.ts'
import { TELECOM_READ_SPECS_V1 } from '../lib/server/telecom-reads-specs-v1.ts'
/** Generated directly from current closed W1 contracts. Schema advertisement
 * does not grant authority. Executors must use the authorized server service
 * and its input/result parser. Other backend operations remain denied. */
type Schema = Record<string, unknown>
type Rule = string | readonly (string | null)[]
const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', maxLength: 36 }
const closed = (properties: Record<string, Schema>, required: readonly string[]): Schema => ({ type: 'object', properties, required, additionalProperties: false })
function ruleSchema(rule: Rule): Schema {
  if (typeof rule !== 'string') return { enum: rule, type: rule.includes(null) ? ['string', 'null'] : 'string', maxLength: 100 }
  if (rule.endsWith('?')) return { anyOf: [ruleSchema(rule.slice(0, -1)), { type: 'null' }] }
  if (rule === 'uuid') return uuid
  if (rule === 'boolean') return { type: 'boolean' }
  if (['integer', 'positive', 'count'].includes(rule)) return { type: 'integer', ...(rule === 'integer' ? {} : { minimum: rule === 'positive' ? 1 : 0 }), maximum: 999999999999999 }
  if (rule === 'links') return { type: 'array', maxItems: 3, items: closed({ kind: { type: 'string', enum: ['contract', 'service', 'plan'] }, id: uuid }, ['kind', 'id']) }
  if (rule === 'mask') return { type: 'string', pattern: '^••••[0-9]{3}$', maxLength: 7 }
  if (rule === 'money') return { type: 'string', pattern: '^(0|[1-9][0-9]{0,18})$', maxLength: 19 }
  if (rule === 'currency') return { type: 'string', pattern: '^[A-Z]{3}$', maxLength: 3 }
  if (rule === 'date' || rule === 'month') return { type: 'string', pattern: rule === 'month' ? '^\\d{4}-\\d{2}-01$' : '^\\d{4}-\\d{2}-\\d{2}$', maxLength: 10 }
  if (rule === 'instant') return { type: 'string', maxLength: 40 }
  if (rule === 'code') return { type: 'string', pattern: '^[a-z0-9][a-z0-9_-]{0,95}$', maxLength: 96 }
  if (rule === 'text') return { type: 'string', minLength: 1, maxLength: 200 }
  throw new Error('unknown_backend_field_rule')
}
function inputSchema(filters: readonly string[], enums: Readonly<Record<string, readonly string[]>>, required: readonly string[]): Schema {
  const properties: Record<string, Schema> = {}
  for (const key of filters) properties[key] = key === 'limit' ? { type: 'integer', minimum: 1, maximum: 100 }
    : key === 'id' || key.endsWith('_id') ? uuid : enums[key] ? { type: 'string', enum: enums[key], maxLength: 64 }
    : key === 'sort' ? { type: 'string', enum: ['id_asc'] } : key === 'currency' ? ruleSchema('currency')
    : { type: 'string', minLength: 1, maxLength: 64 }
  return closed(properties, required)
}
export type ProductCapabilityV2 = {
  name: string; version: 'assistant.capability.v2'; mode: 'read'; risk: 'READ'; roles: readonly string[]
  inputSchema: Schema; outputSchema: Schema; backendOperation: string; family: 'collection' | 'report'
  sensitiveFields: readonly string[]; confirmation: 'none'; grounding: string; partiality: string
  enabled: { local: boolean; stage: false; prod: false }
}
const capabilities: ProductCapabilityV2[] = []
for (const [operation, spec] of Object.entries(TELECOM_COLLECTION_SPECS_V1)) {
  const properties = Object.fromEntries(Object.entries(spec.fields).map(([key, rule]) => [key, ruleSchema(rule)]))
  const row = closed(properties, Object.keys(properties)), one = operation.endsWith('.get')
  capabilities.push({ name: `crm.${operation}`, version: 'assistant.capability.v2', mode: 'read', risk: 'READ',
    roles: ['owner', 'admin', 'member', 'viewer'], backendOperation: operation, family: 'collection',
    inputSchema: inputSchema(spec.filters, spec.enums, one ? ['id'] : []),
    outputSchema: closed({ contract_version: { const: 'telecom.collections.v1' }, operation: { const: operation },
      ...(one ? { record: row } : { items: { type: 'array', maxItems: 100, items: row }, next_id: { anyOf: [uuid, { type: 'null' }] } }) }, one ? ['contract_version', 'operation', 'record'] : ['contract_version', 'operation', 'items', 'next_id']),
    sensitiveFields: [], confirmation: 'none', grounding: 'validated DTO fields only; text is untrusted data',
    partiality: 'next_id means partial; no unavailable-to-empty conversion; current page is never portfolio total', enabled: { local: true, stage: false, prod: false } })
}
for (const [operation, raw] of Object.entries(TELECOM_READ_SPECS_V1)) {
  const spec = raw as { filters: readonly string[]; required: readonly string[]; record?: Record<string, Rule>; fields?: Record<string, Rule>; unassigned?: boolean }
  const properties = Object.fromEntries(Object.entries(spec.record ?? spec.fields ?? {}).map(([key, rule]) => [key, ruleSchema(rule)]))
  const row = closed(properties, Object.keys(properties)), one = operation === 'customer360.summary'
  const outputProperties: Record<string, Schema> = { contract_version: { const: 'telecom.reads.v1' }, operation: { const: operation }, as_of: ruleSchema('date'),
    ...(one ? { record: row } : { items: { type: 'array', maxItems: 100, items: row }, next_id: { anyOf: [uuid, { type: 'null' }] } }) }
  if (spec.unassigned) outputProperties.unassigned_counts = closed(Object.fromEntries(['contracts', 'opportunities', 'tasks', 'cases'].map(k => [k, ruleSchema('count')])), ['contracts', 'opportunities', 'tasks', 'cases'])
  capabilities.push({ name: `crm.${operation}`, version: 'assistant.capability.v2', mode: 'read', risk: 'READ', roles: ['owner', 'admin', 'member', 'viewer'],
    inputSchema: inputSchema(spec.filters, {}, spec.required), outputSchema: closed(outputProperties, Object.keys(outputProperties)),
    backendOperation: operation, family: 'report', sensitiveFields: [], confirmation: 'none', grounding: 'validated authorized aggregate with source as_of; restricted counters remain null',
    partiality: 'preserve unavailable protected counters; paginated aggregates never prove total or absence', enabled: { local: true, stage: false, prod: false } })
}
function freeze(value: unknown): void { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) } }
freeze(capabilities)
export const PRODUCT_CAPABILITIES_V2: readonly ProductCapabilityV2[] = Object.freeze(capabilities)
export function productCapabilityV2(name: string): ProductCapabilityV2 | null { return PRODUCT_CAPABILITIES_V2.find(c => c.name === name) ?? null }
