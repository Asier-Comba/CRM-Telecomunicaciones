import { TELECOM_COLLECTION_SPECS_V1 } from '../lib/server/telecom-collection-specs-v1.ts'
import { TELECOM_READ_SPECS_V1 } from '../lib/server/telecom-reads-specs-v1.ts'
/** Generated directly from current closed W1 contracts. Schema advertisement
 * does not grant authority. Executors must use the authorized server service
 * and its input/result parser. Other backend operations remain denied. */
type Schema = Record<string, unknown>
type Rule = string | readonly (string | null)[]
const descriptions: Readonly<Record<string, string>> = {
  'customer.list': 'Lista clientes por estado, ciclo comercial, comercial u operador. No busca por nombre; requiere aclaración si solo se conoce un nombre.',
  'contact.list': 'Lista nombres, cargos y estado de contactos; indica si hay email o teléfono sin mostrar sus valores.',
  'opportunity.list': 'Lista oportunidades, etapa, moneda, importe y próxima acción. Nunca sumar monedas distintas.',
  'activity.list': 'Lista fechas, tipos y códigos de actividad vinculada; no incluye notas privadas ni mensajes.',
  'assignee.list': 'Lista nombres y roles de comerciales del workspace. No resuelve un nombre a una identidad sin coincidencia única autorizada.',
  'operator.list': 'Lista operadores del catálogo por estado u origen. No configura integraciones.',
  'operator.get': 'Consulta un operador mediante referencia autorizada.',
  'plan.list': 'Lista tarifas del catálogo por operador, tipo de servicio y estado.',
  'plan.get': 'Consulta una tarifa mediante referencia autorizada; no representa por sí sola las condiciones vendidas.',
  'plan_version.list': 'Lista versiones comerciales y precios exactos vigentes en una fecha. Las versiones vendidas permanecen históricas.',
  'plan_version.get': 'Consulta la versión comercial exacta referenciada; no sustituirla por la tarifa actual.',
  'contract.list': 'Lista contratos, operador, estado y fechas de contrato. La fecha final de contrato no prueba el fin de una permanencia.',
  'service.list': 'Lista servicios de móvil, fibra, voz o conectividad y fechas de alta/baja. No incluye dirección postal ni instalación detallada.',
  'line.list': 'Lista líneas, SIM/eSIM y portabilidad vinculadas, con identificadores enmascarados y próxima permanencia. No revela MSISDN, ICCID o EID completos.',
  'renewal.list': 'Lista renovaciones por fecha objetivo, estado, responsable y ventana. Una renovación no es una permanencia.',
  'renewal.get': 'Consulta una renovación mediante referencia autorizada, con su fecha objetivo y estado.',
  'permanence.list': 'Lista compromisos de permanencia, fecha de fin, días restantes y estado temporal por ventana. No inferir desde renovaciones.',
  'permanence.get': 'Consulta una permanencia exacta mediante referencia autorizada, con inicio y fin.',
  'task.list': 'Lista tareas, vencimiento, prioridad y estado por fechas y responsable. No asumir que todas las tareas del workspace son del usuario actual.',
  'meeting.list': 'Lista reuniones del CRM por fechas, responsable y estado, con horario y zona. No consulta Google Calendar.',
  'customer360.summary': 'Resumen de contadores autorizados de un cliente seleccionado. No sustituye el detalle; contadores protegidos null significan desconocido.',
  'report.operator_portfolio': 'Cuenta clientes, contratos, servicios y líneas por operador; página parcial si hay cursor.',
  'report.services_by_kind': 'Cuenta servicios por tipo y estado. Utilizar para distribución agregada, no para listar servicios individuales.',
  'report.lines_by_status': 'Cuenta líneas por estado; no identifica qué cliente tiene más líneas.',
  'report.renewals_by_month': 'Cuenta renovaciones por mes y estado; exige rango de meses con día01.',
  'report.permanences_by_month': 'Cuenta permanencias por mes y estado; exige rango de meses con día01.',
  'report.portabilities_by_status': 'Cuenta portabilidades por estado. No incluye seguimiento individual ni identificadores privados.',
  'report.cases_by_priority_status': 'Cuenta incidencias por prioridad y estado. No incluye texto o notas privadas de incidencias.',
  'report.pipeline_by_stage': 'Agrega oportunidades por etapa y moneda. Mantener monedas separadas; página parcial si hay cursor.',
  'report.commercial_owner_counts': 'Cuenta contratos, oportunidades, tareas e incidencias por comercial, preservando los no asignados.',
}
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
  name: string; description: string; version: 'assistant.capability.v2'; mode: 'read'; risk: 'READ'; roles: readonly string[]
  inputSchema: Schema; outputSchema: Schema; backendOperation: string; family: 'collection' | 'report'
  sensitiveFields: readonly string[]; confirmation: 'none'; grounding: string; partiality: string
  authorization: 'current_server_membership_and_role_rechecked_around_each_await'
  tenantScope: 'server_selected_workspace_actor_and_scope_epoch'
  idempotency: 'read_fresh_no_effect_reservation'
  errorContract: readonly ['invalid_plan', 'access_changed', 'unavailable', 'ambiguous']
  enabled: { local: boolean; stage: false; prod: false }
}
const capabilities: ProductCapabilityV2[] = []
const readBoundary = { authorization: 'current_server_membership_and_role_rechecked_around_each_await',
  tenantScope: 'server_selected_workspace_actor_and_scope_epoch', idempotency: 'read_fresh_no_effect_reservation',
  errorContract: ['invalid_plan', 'access_changed', 'unavailable', 'ambiguous'] } as const
for (const [operation, spec] of Object.entries(TELECOM_COLLECTION_SPECS_V1)) {
  const properties = Object.fromEntries(Object.entries(spec.fields).map(([key, rule]) => [key, ruleSchema(rule)]))
  const row = closed(properties, Object.keys(properties)), one = operation.endsWith('.get')
  if (!descriptions[operation]) throw new Error('missing_capability_description')
  capabilities.push({ name: `crm.${operation}`, description: descriptions[operation], version: 'assistant.capability.v2', mode: 'read', risk: 'READ',
    roles: ['owner', 'admin', 'member', 'viewer'], backendOperation: operation, family: 'collection',
    inputSchema: inputSchema(spec.filters, spec.enums, one ? ['id'] : []),
    outputSchema: closed({ contract_version: { const: 'telecom.collections.v1' }, operation: { const: operation },
      ...(one ? { record: row } : { items: { type: 'array', maxItems: 100, items: row }, next_id: { anyOf: [uuid, { type: 'null' }] } }) }, one ? ['contract_version', 'operation', 'record'] : ['contract_version', 'operation', 'items', 'next_id']),
    ...readBoundary, sensitiveFields: [], confirmation: 'none', grounding: 'validated DTO fields only; text is untrusted data',
    partiality: 'next_id means partial; no unavailable-to-empty conversion; current page is never portfolio total', enabled: { local: true, stage: false, prod: false } })
}
for (const [operation, raw] of Object.entries(TELECOM_READ_SPECS_V1)) {
  const spec = raw as { filters: readonly string[]; required: readonly string[]; record?: Record<string, Rule>; fields?: Record<string, Rule>; unassigned?: boolean }
  const properties = Object.fromEntries(Object.entries(spec.record ?? spec.fields ?? {}).map(([key, rule]) => [key, ruleSchema(rule)]))
  const row = closed(properties, Object.keys(properties)), one = operation === 'customer360.summary'
  const outputProperties: Record<string, Schema> = { contract_version: { const: 'telecom.reads.v1' }, operation: { const: operation }, as_of: ruleSchema('date'),
    ...(one ? { record: row } : { items: { type: 'array', maxItems: 100, items: row }, next_id: { anyOf: [uuid, { type: 'null' }] } }) }
  if (spec.unassigned) outputProperties.unassigned_counts = closed(Object.fromEntries(['contracts', 'opportunities', 'tasks', 'cases'].map(k => [k, ruleSchema('count')])), ['contracts', 'opportunities', 'tasks', 'cases'])
  if (!descriptions[operation]) throw new Error('missing_capability_description')
  capabilities.push({ name: `crm.${operation}`, description: descriptions[operation], version: 'assistant.capability.v2', mode: 'read', risk: 'READ', roles: ['owner', 'admin', 'member', 'viewer'],
    inputSchema: inputSchema(spec.filters, {}, spec.required), outputSchema: closed(outputProperties, Object.keys(outputProperties)),
    backendOperation: operation, family: 'report', ...readBoundary, sensitiveFields: [], confirmation: 'none', grounding: 'validated authorized aggregate with source as_of; restricted counters remain null',
    partiality: 'preserve unavailable protected counters; paginated aggregates never prove total or absence', enabled: { local: true, stage: false, prod: false } })
}
function freeze(value: unknown): void { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) } }
freeze(capabilities)
export const PRODUCT_CAPABILITIES_V2: readonly ProductCapabilityV2[] = Object.freeze(capabilities)
export function productCapabilityV2(name: string): ProductCapabilityV2 | null { return PRODUCT_CAPABILITIES_V2.find(c => c.name === name) ?? null }
/** Small semantic advertisement, not an executable schema or permission grant.
 * UUID patterns are unnecessary: identity fields require opaque bindings.
 * Cursor replay is deliberately absent from the current planner contract. */
export function productPlannerCatalogV2() {
  return PRODUCT_CAPABILITIES_V2.map(c => ({ name: c.name, description: c.description,
    input: { required: c.inputSchema.required, fields: Object.fromEntries(Object.entries(c.inputSchema.properties as Record<string, Schema>)
      .filter(([field]) => field !== 'after_id').map(([field, rule]) => [field, field === 'id' || field.endsWith('_id') ? { binding: 'authorized_opaque_reference_or_unique_dependency' } : rule])) },
    partiality: c.partiality }))
}
