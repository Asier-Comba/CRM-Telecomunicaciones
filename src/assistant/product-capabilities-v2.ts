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
  inputSchema: Schema; outputSchema: Schema; backendOperation: string; family: 'collection' | 'report' | 'billing_analytics' | 'sim_inventory' | 'billing_invoice' | 'portability_read' | 'case_read' | 'equipment_read' | 'document_metadata'
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
const billingOperation = 'billing.monthly_series'
const billingMonths = { type: 'string', pattern: '^\\d{4}-\\d{2}-01$', maxLength: 10 }
const billingAmounts = Object.fromEntries(['issued_minor', 'paid_minor', 'outstanding_minor', 'overdue_minor']
  .map(field => [field, { type: 'string', pattern: '^(0|[1-9][0-9]{0,39})$', maxLength: 40 }]))
const billingRow = closed({ month: billingMonths, ...billingAmounts }, ['month', ...Object.keys(billingAmounts)])
capabilities.push({ name: `crm.${billingOperation}`, version: 'assistant.capability.v2', mode: 'read', risk: 'READ',
  description: 'Facturas por mes de emisión y estado actual: emitido, marcado pagado, pendiente y vencido. No representa movimientos de cobro. Exige una moneda EUR/USD/GBP y meses inclusivos con día01, máximo24. Solo titular/administrador.',
  roles: ['owner', 'admin'], backendOperation: billingOperation, family: 'billing_analytics',
  inputSchema: closed({ currency: { type: 'string', enum: ['EUR', 'USD', 'GBP'] }, from_month: billingMonths,
    to_month: billingMonths, customer_id: uuid }, ['currency', 'from_month', 'to_month']),
  outputSchema: closed({ contract_version: { const: 'billing.analytics.v1' }, operation: { const: billingOperation },
    basis: { const: 'issue_month_cohort_current_status' }, as_of: ruleSchema('date'),
    currency: { type: 'string', enum: ['EUR', 'USD', 'GBP'] }, from_month: billingMonths, to_month: billingMonths,
    items: { type: 'array', minItems: 1, maxItems: 24, items: billingRow } },
    ['contract_version', 'operation', 'basis', 'as_of', 'currency', 'from_month', 'to_month', 'items']),
  ...readBoundary, sensitiveFields: [], confirmation: 'none',
  grounding: 'validated dense monthly cohort; exact integer-string amounts; current invoice status at as_of, never cash ledger',
  partiality: 'complete requested range only; missing months, currency mismatch or invalid amount equations are unavailable',
  enabled: { local: true, stage: false, prod: false } })
const maskedSim = { anyOf: [{ type: 'string', pattern: '^••••[0-9]{3}$', maxLength: 7 }, { type: 'null' }] }
const simRow = closed({ id: uuid, display_label: { type: 'string', maxLength: 200 }, kind: { type: 'string', enum: ['physical', 'esim'] },
  status: { type: 'string', enum: ['prepared', 'assigned', 'active', 'replaced', 'inactive', 'cancelled'] },
  source: { type: 'string', enum: ['manual', 'import', 'integration'] }, masked_iccid: maskedSim, masked_eid: maskedSim },
['id', 'display_label', 'kind', 'status', 'source', 'masked_iccid', 'masked_eid'])
capabilities.push({ name: 'crm.sim.list', version: 'assistant.capability.v2', mode: 'read', risk: 'READ',
  description: 'Lista SIM/eSIM registradas por cliente, operador, línea, tipo, estado y origen. Identificadores solo enmascarados o desconocidos; no PIN/PUK, ICCID/EID completos, QR ni activación. No prueba conectividad ni total de inventario.',
  roles: ['owner', 'admin', 'member', 'viewer'], backendOperation: 'sim.list', family: 'sim_inventory',
  inputSchema: inputSchema(['limit', 'after_id', 'customer_id', 'operator_id', 'line_id', 'kind', 'status', 'source'], {
    kind: ['physical', 'esim'], status: ['prepared', 'assigned', 'active', 'replaced', 'inactive', 'cancelled'], source: ['manual', 'import', 'integration'] }, []),
  outputSchema: closed({ contract_version: { const: 'assistant.sim-list.v1' }, operation: { const: 'sim.list' },
    items: { type: 'array', maxItems: 100, items: simRow }, next_id: { anyOf: [uuid, { type: 'null' }] } }, ['contract_version', 'operation', 'items', 'next_id']),
  ...readBoundary, sensitiveFields: ['masked_iccid', 'masked_eid'], confirmation: 'none',
  grounding: 'Validated W1 DTO then minimized projection; registered status is not provider activation or current connectivity',
  partiality: 'next_id means partial; unknown masks stay null; no unavailable-to-empty conversion or current-page inventory total',
  enabled: { local: true, stage: false, prod: false } })
capabilities.push({name:'crm.invoice.list',version:'assistant.capability.v2',mode:'read',risk:'READ',roles:['owner','admin'],backendOperation:'invoice.list',family:'billing_invoice',
  description:'Lista hasta veinte facturas de un cliente autorizado: estado, fechas, moneda e importe exacto. Solo titular/administrador. Sin datos fiscales ni números; pagada indica estado registrado, no un cobro bancario. Conserva parcialidad.',
  inputSchema:closed({customer_id:uuid,status:{type:'string',enum:['draft','trashed','issued','paid','overdue']},from:ruleSchema('date'),to:ruleSchema('date'),
    limit:{type:'integer',minimum:1,maximum:20},after_id:uuid},['customer_id']),
  outputSchema:closed({contract_version:{const:'assistant.invoice-list.v1'},operation:{const:'invoice.list'},items:{type:'array',maxItems:20,
    items:closed({id:uuid,status:{type:'string',enum:['draft','trashed','issued','paid']},issue_on:ruleSchema('date'),due_on:ruleSchema('date?'),currency:ruleSchema('currency'),total_minor:ruleSchema('money'),overdue:{type:'boolean'}},
      ['id','status','issue_on','due_on','currency','total_minor','overdue'])},next_id:{anyOf:[uuid,{type:'null'}]}},['contract_version','operation','items','next_id']),
  ...readBoundary,sensitiveFields:['customer_id','number','series','version','totals.subtotal_minor','totals.tax_minor','totals.withholding_minor','lines','notes','issuer','customer_fiscal'],confirmation:'none',
  grounding:'validated current invoice list for the authorized customer and requested status/issue-date slice; exact integer minor units, separate currencies; paid is recorded status only',
  partiality:'at most20 rows; next_id means partial, never infer customer totals, bank collections or absence from an incomplete page',enabled:{local:true,stage:false,prod:false}})
capabilities.push({name:'crm.portability.list',version:'assistant.capability.v2',mode:'read',risk:'READ',roles:['owner','admin','member','viewer'],backendOperation:'portability.list',family:'portability_read',
 description:'Lista hasta veinte portabilidades del cliente seleccionado: número enmascarado, dirección, estado, fechas y motivo registrados. No acredita una transferencia real del operador. Conserva parcialidad, sin números completos ni asociaciones privadas.',
 inputSchema:closed({customer_id:uuid,status:{type:'string',enum:['draft','requested','scheduled','in_progress','completed','rejected','cancelled']},direction:{type:'string',enum:['inbound','outbound']},
  window_from:ruleSchema('date'),window_to:ruleSchema('date'),limit:{type:'integer',minimum:1,maximum:20},after_id:uuid},['customer_id']),
 outputSchema:closed({contract_version:{const:'assistant.portability-list.v1'},operation:{const:'portability.list'},items:{type:'array',maxItems:20,
  items:closed({id:uuid,masked_display:{type:'string',pattern:'^••••[0-9]{3}$'},direction:{type:'string',enum:['inbound','outbound']},status:{type:'string',enum:['draft','requested','scheduled','in_progress','completed','rejected','cancelled']},
   requested_on:ruleSchema('date'),submitted_on:ruleSchema('date?'),scheduled_on:ruleSchema('date?'),started_on:ruleSchema('date?'),completed_on:ruleSchema('date?'),closed_on:ruleSchema('date?'),
   reason_code:{anyOf:[{type:'string',enum:['subscriber_mismatch','number_not_found','authorization_missing','ineligible_contract','donor_rejected','technical_failure','customer_withdrew','duplicate_request']},{type:'null'}]},source:{type:'string',enum:['manual','import','integration']}},
   ['id','masked_display','direction','status','requested_on','submitted_on','scheduled_on','started_on','completed_on','closed_on','reason_code','source'])},next_id:{anyOf:[uuid,{type:'null'}]}},['contract_version','operation','items','next_id']),
 ...readBoundary,sensitiveFields:['customer_id','contract_id','service_id','line_id','number_identifier_id','donor_operator_id','target_operator_id','owner_user_id','version','created_at','updated_at','complete_number'],confirmation:'none',
 grounding:'validated current W1 status/dates/reason and masked number for the authorized customer and requested slice; no carrier-confirmation or line-effect claim',
 partiality:'at most20 rows; next_id means partial, never infer customer totals, successful physical transfer or absence from an incomplete page',enabled:{local:true,stage:false,prod:false}})
capabilities.push({name:'crm.case.list',description:'Lista hasta20 incidencias registradas del cliente seleccionado: tipo, prioridad, estado, vencimiento y códigos de resolución/cancelación. Sin títulos, notas ni vínculos privados; un código no confirma una resolución independiente.',
 version:'assistant.capability.v2',mode:'read',risk:'READ',roles:['owner','admin','member','viewer'],backendOperation:'case.list',family:'case_read',
 inputSchema:closed({customer_id:uuid,case_type:{type:'string',enum:['activation','portability','technical','billing','renewal','cancellation','documentation','other']},
  priority:{type:'string',enum:['low','normal','high','urgent']},status:{type:'string',enum:['open','in_progress','waiting_customer','waiting_operator','resolved','closed','cancelled']},
  due_from:ruleSchema('date'),due_to:ruleSchema('date'),limit:{type:'integer',minimum:1,maximum:20},after_id:uuid},['customer_id']),
 outputSchema:closed({contract_version:{const:'assistant.case-list.v1'},operation:{const:'case.list'},items:{type:'array',maxItems:20,items:closed({
  id:uuid,case_type:{type:'string',enum:['activation','portability','technical','billing','renewal','cancellation','documentation','other']},
  priority:{type:'string',enum:['low','normal','high','urgent']},status:{type:'string',enum:['open','in_progress','waiting_customer','waiting_operator','resolved','closed','cancelled']},
  due_on:ruleSchema('date?'),resolved_at:ruleSchema('instant?'),closed_at:ruleSchema('instant?'),overdue:{type:'boolean'},source:{type:'string',enum:['manual','import','integration','system']},
  resolution_code:{enum:['issue_fixed','request_fulfilled','customer_confirmed','no_action_required',null]},cancellation_code:{enum:['customer_withdrew','duplicate','no_longer_needed','entered_in_error',null]}},
  ['id','case_type','priority','status','due_on','resolved_at','closed_at','resolution_code','cancellation_code','overdue','source'])},next_id:{anyOf:[uuid,{type:'null'}]}},['contract_version','operation','items','next_id']),
 ...readBoundary,sensitiveFields:['title','internal_note_count','customer_id','contract_id','service_id','line_id','assigned_user_id','version','created_at','updated_at','note_body'],confirmation:'none',
 grounding:'current authorized W1 case status/dates/codes only; no private notes, SLA inference or independent resolution confirmation',
 partiality:'at most20 selected-customer rows; cursor means partial, no inferred total or absence outside the selected filter',enabled:{local:true,stage:false,prod:false}})
capabilities.push({name:'crm.equipment.list',description:'Lista hasta20 equipos registrados del cliente seleccionado: tipo, estado y fechas de asignación/devolución/sustitución/cancelación. No acredita instalación física; sin fabricantes, modelos, texto libre, compra ni asociaciones privadas.',
 version:'assistant.capability.v2',mode:'read',risk:'READ',roles:['owner','admin','member','viewer'],backendOperation:'equipment.list',family:'equipment_read',
 inputSchema:closed({customer_id:uuid,kind:{type:'string',enum:['router','ont','mobile_terminal','other']},status:{type:'string',enum:['prepared','assigned','returned','replaced','cancelled']},limit:{type:'integer',minimum:1,maximum:20},after_id:uuid},['customer_id']),
 outputSchema:closed({contract_version:{const:'assistant.equipment-list.v1'},operation:{const:'equipment.list'},items:{type:'array',maxItems:20,items:closed({
  id:uuid,kind:{type:'string',enum:['router','ont','mobile_terminal','other']},status:{type:'string',enum:['prepared','assigned','returned','replaced','cancelled']},
  assigned_on:ruleSchema('date?'),returned_on:ruleSchema('date?'),replaced_on:ruleSchema('date?'),cancelled_on:ruleSchema('date?'),source:{type:'string',enum:['manual','import','integration']}},
  ['id','kind','status','assigned_on','returned_on','replaced_on','cancelled_on','source'])},next_id:{anyOf:[uuid,{type:'null'}]}},['contract_version','operation','items','next_id']),
 ...readBoundary,sensitiveFields:['manufacturer','model','commercial_description','purchased_on','customer_id','contract_id','service_id','line_id','commitment_id','replaces_equipment_id','replaced_by_id','version','history.actor_user_id'],confirmation:'none',
 grounding:'validated current W1 equipment list for the selected authorized customer; registered state/dates only, not installation/connectivity/ownership or complete inventory proof',
 partiality:'at most20 rows, next_id means partial; never infer totals, physical installation or absence outside the selected page/filter',enabled:{local:true,stage:false,prod:false}})
capabilities.push({name:'crm.document.list',description:'Lista hasta20 metadatos de documentos directos del cliente: tipo, estado, formato y tamaño registrados. Titular/administrador; sin nombres, rutas, enlaces o contenido. No prueba disponibilidad del archivo, revisión, indexación ni RAG.',
 version:'assistant.capability.v2',mode:'read',risk:'READ',roles:['owner','admin'],backendOperation:'document.list',family:'document_metadata',
 inputSchema:closed({customer_id:uuid,status:{type:'string',enum:['active','archived']},limit:{type:'integer',minimum:1,maximum:20},after_id:uuid},['customer_id']),
 outputSchema:closed({contract_version:{const:'assistant.document-metadata-list.v1'},operation:{const:'document.list'},items:{type:'array',maxItems:20,items:closed({id:uuid,
  document_kind:{type:'string',enum:['general','identity','contract','service','incident','billing','other']},status:{type:'string',enum:['active','archived']},
  media_type:{anyOf:[{type:'string',maxLength:127},{type:'null'}]},size_bytes:{anyOf:[{type:'integer',minimum:0,maximum:1073741824},{type:'null'}]}},['id','document_kind','status','media_type','size_bytes'])},next_id:{anyOf:[uuid,{type:'null'}]}},['contract_version','operation','items','next_id']),
 ...readBoundary,sensitiveFields:['file_name','storage_path','storage_bucket','object_ref','sha256_hex','target','version','ticket_id','signed_url','content','indexingApproved','contentClass'],confirmation:'none',
 grounding:'validated current W1 selected-customer direct metadata collection; registered facts only, no file availability/content/integrity/review/indexing or RAG admission claim',
 partiality:'at most20 direct selected-customer rows; cursor means partial, no total or absence outside this target/page/filter',enabled:{local:true,stage:false,prod:false}})
function freeze(value: unknown): void { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) } }
freeze(capabilities)
export const PRODUCT_CAPABILITIES_V2: readonly ProductCapabilityV2[] = Object.freeze(capabilities)
export function productCapabilityV2(name: string): ProductCapabilityV2 | null { return PRODUCT_CAPABILITIES_V2.find(c => c.name === name) ?? null }
/** Small semantic advertisement, not an executable schema or permission grant.
 * UUID patterns are unnecessary: identity fields require authorized opaque
 * references or a unique authorized dependency; ref/dep are abbreviations only.
 * Cursor replay is deliberately absent from the current planner contract. */
export function productPlannerCatalogV2(role?: string) {
  return PRODUCT_CAPABILITIES_V2.filter(c => role === undefined || c.roles.includes(role)).map(c => ({ name: c.name, description: c.description,
    input: { required: c.inputSchema.required, fields: Object.fromEntries(Object.entries(c.inputSchema.properties as Record<string, Schema>)
      .filter(([field]) => field !== 'after_id').map(([field, rule]) => [field, field === 'id' || field.endsWith('_id') ? { binding: 'authorized_opaque_ref_or_unique_dep' } : rule])) },
    partiality: c.partiality }))
}
