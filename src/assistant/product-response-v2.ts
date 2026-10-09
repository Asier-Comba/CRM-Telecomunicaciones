import { isValidatedProductReadResultV2, type ProductReadResultV2 } from './product-read-executor-v2.ts'
/** UI-facing typed facts. Business strings render as plain text, never markdown
 * instructions, links or executable actions. Model prose cannot supply blocks. */
export type ProductAssistantResponseV2 = { contract: 'assistant.response.v2'; requestId: string; status: ProductReadResultV2['status'];
  answer: string; grounded: boolean; blocks: { type: 'table'; title: string; columns: { field: string; label: string }[];
    rows: Record<string, string | number | boolean | null>[]; sourceRef: string; partial: boolean }[];
  sources: { ref: string; label: string; capability: string; readAt: string; asOf: string | null; partial: boolean }[] }
const labels: Record<string, string> = { display_name: 'Nombre', title: 'Título', status: 'Estado', lifecycle: 'Relación comercial', account_kind: 'Tipo de cliente', job_title: 'Cargo',
  is_primary: 'Principal', has_email: 'Email registrado', has_phone: 'Teléfono registrado', currency: 'Moneda', amount_minor: 'Importe en unidades mínimas',
  expected_close_date: 'Cierre previsto', next_follow_up_at: 'Próximo seguimiento', has_next_action: 'Con próxima acción', service_kind: 'Tipo de servicio',
  version_number: 'Versión comercial', valid_from: 'Válido desde', valid_until: 'Válido hasta', recurring_amount_minor: 'Cuota en unidades mínimas', plan_status: 'Estado del plan',
  start_date: 'Inicio', end_date: 'Fin', activated_on: 'Activación', ended_on: 'Finalización', due_on: 'Vencimiento', due_at: 'Vencimiento con hora',
  priority: 'Prioridad', starts_on: 'Fecha', starts_at: 'Inicio con hora', ends_at: 'Fin con hora', timezone: 'Zona horaria', all_day: 'Todo el día', channel: 'Canal',
  target_on: 'Renovación prevista', ends_on: 'Fin de permanencia', opens_on: 'Inicio de ventana', closes_on: 'Fin de ventana', month: 'Mes', count: 'Cantidad',
  contacts: 'Contactos', contracts: 'Contratos', services: 'Servicios', lines: 'Líneas', renewals: 'Renovaciones', permanences: 'Permanencias', opportunities: 'Oportunidades',
  tasks: 'Tareas', meetings: 'Reuniones', cases: 'Incidencias', documents: 'Documentos', billing: 'Facturas', activity: 'Actividad', portabilities: 'Portabilidades', sims: 'SIM',
  customers: 'Clientes', open: 'Abiertos', completed: 'Completados', cancelled: 'Cancelados', active: 'Activos', suspended: 'Suspendidos', pending: 'Pendientes',
  masked_msisdn: 'Número enmascarado', masked_iccid: 'ICCID enmascarado', masked_eid: 'EID enmascarado', sim_kind: 'Tipo de SIM', sim_status: 'Estado de SIM',
  portability_status: 'Estado de portabilidad', open_commitment_count: 'Compromisos abiertos', next_commitment_ends_on: 'Próximo fin de compromiso' }
const titles: Record<string, string> = { customer: 'Clientes', customer360: 'Resumen del cliente', contact: 'Contactos', contract: 'Contratos', service: 'Servicios', line: 'Líneas',
  renewal: 'Renovaciones', permanence: 'Permanencias', task: 'Tareas', meeting: 'Reuniones', activity: 'Actividad', opportunity: 'Oportunidades', operator: 'Operadores',
  plan: 'Planes', plan_version: 'Versiones de planes', assignee: 'Comerciales', report: 'Informe del CRM' }
export function composeProductResponseV2(result: ProductReadResultV2, requestId: string): ProductAssistantResponseV2 {
  if (result.status === 'completed' && !isValidatedProductReadResultV2(result)) result = { status: 'unavailable', evidence: [] }
  const answer = result.status === 'completed' ? 'Estos son los datos autorizados recuperados.' : result.status === 'clarify' || result.status === 'ambiguous' ? 'Necesito concretar el registro o el intervalo para continuar.'
    : result.status === 'abstain' ? 'Esta operación no está disponible en el asistente.' : result.status === 'access_changed' ? 'El contexto de acceso ha cambiado. Selecciona de nuevo el registro.' : 'No puedo confirmar esos datos ahora.'
  const response: ProductAssistantResponseV2 = { contract: 'assistant.response.v2', requestId, status: result.status, answer, grounded: result.status === 'completed', blocks: [], sources: [] }
  if (result.status !== 'completed') return response
  for (const [index, evidence] of result.evidence.entries()) {
    const sourceRef = `source_${index + 1}`, title = titles[evidence.capability.split('.')[1] ?? ''] ?? 'Datos del CRM'
    const raw = Array.isArray(evidence.data.items) ? evidence.data.items : [evidence.data.record]
    const rows: Record<string, string | number | boolean | null>[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const row: Record<string, string | number | boolean | null> = {}
      for (const [field, value] of Object.entries(item)) if (Object.hasOwn(labels, field) && (value === null || ['string', 'number', 'boolean'].includes(typeof value))) row[field] = value as string | number | boolean | null
      rows.push(row)
    }
    const fields = [...new Set(rows.flatMap(row => Object.keys(row)))]
    response.blocks.push({ type: 'table', title, columns: fields.map(field => ({ field, label: labels[field]! })), rows, sourceRef, partial: evidence.partial })
    response.sources.push({ ref: sourceRef, label: title, capability: evidence.capability, readAt: evidence.readAt, asOf: evidence.asOf, partial: evidence.partial })
  }
  return response
}
