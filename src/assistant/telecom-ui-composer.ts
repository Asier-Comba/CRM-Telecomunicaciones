import type { AssistantResponse } from './ui-contract.ts'
import type { ReadEvidence } from './telecom-service-adapter.ts'
import { isSafeEvidenceText } from './context-budget.ts'

/** Deterministic v1 UI projection from the request's validated read evidence.
 * No new UI fields, model HTML, arbitrary URL or hidden navigation grant.
 * Source descriptors are table data; full evidence remains server-side.
 */
export function composeTelecomEvidence(read: ReadEvidence, requestId: string): AssistantResponse {
  if (read.state !== 'available') return {
    contractVersion: 1, answer: read.state === 'not_found' ? 'No se ha encontrado el registro autorizado.' : 'No puedo confirmar esos datos con la información disponible.',
    status: read.state === 'not_authorized' ? 'FORBIDDEN' : read.state === 'not_found' ? 'NOT_FOUND' : 'UNAVAILABLE', grounded: false,
    blocks: { notice: { code: read.state, retryable: read.state === 'unavailable' } },
    meta: { requestId, capability: read.operation, partial: false },
  }
  const sections = Object.entries(read.sections)
  const partial = sections.some(([, s]) => s.availability !== 'available' || s.freshness !== 'fresh' || s.completeness !== 'complete' || s.truncated)
  return {
    contractVersion: 1, answer: partial ? 'Estos son los datos disponibles; algunas secciones están incompletas o no se pueden confirmar.' : 'Datos verificados en las fuentes del CRM.',
    status: partial ? 'PARTIAL' : 'SUCCESS', grounded: true,
    blocks: { ...(read.calendar ? { notice: { code: 'calendar_source_timezone', retryable: false, title: 'Zona horaria de la fuente', detail: read.calendar.timezone } } : {}), table: {
      columns: [
        { key: 'section', label: 'Sección', format: 'text' }, { key: 'availability', label: 'Disponibilidad', format: 'status' },
        { key: 'observed', label: 'Registros recibidos', format: 'number' }, { key: 'completeness', label: 'Cobertura', format: 'status' },
        { key: 'freshness', label: 'Vigencia', format: 'status' }, { key: 'as_of', label: 'Fecha de la fuente', format: 'datetime' },
        { key: 'source', label: 'Referencia de fuente', format: 'text' },
      ],
      rows: sections.map(([section, s]) => ({ section, availability: s.availability,
        observed: s.availability === 'available' ? s.projected_count : null, completeness: s.completeness,
        freshness: s.freshness, as_of: s.as_of, source: `${read.operation}#${section}` })),
      truncated: sections.some(([, s]) => s.truncated), ...(sections.some(([, s]) => s.truncated) ? { continuation: {} } : {}), rowIdentity: { key: 'section' },
    } },
    meta: { requestId, capability: read.operation, partial },
  }
}

/** Bounded factual table, always paired with coverage response above. IDs are
 * provenance only, never navigation/authority. W2 renders text as escaped text,
 * never HTML/Markdown or an instruction. No protected field is projected.
 */
export function composeTelecomFacts(read: ReadEvidence, requestId: string): AssistantResponse | null {
  if (read.state !== 'available') return null
  const rows: Array<Record<string, string | boolean | null>> = []
  let omitted = false
  for (const [section, evidence] of Object.entries(read.sections)) {
    if (evidence.availability !== 'available') continue
    for (const entity of evidence.rows) for (const [field, value] of Object.entries(entity.fields)) {
      if (rows.length >= 50) { omitted = true; continue }
      const safe = typeof value !== 'string' || isSafeEvidenceText(value)
      if (!safe) omitted = true
      rows.push({ source: `${read.operation}#${section}`, kind: entity.kind, entity: entity.id, field,
        value: safe ? value : null, freshness: evidence.freshness, as_of: evidence.as_of })
    }
  }
  if (!rows.length) return null
  const partial = omitted || Object.values(read.sections).some(s => s.availability !== 'available' || s.freshness !== 'fresh' || s.completeness !== 'complete' || s.truncated)
  return {
    contractVersion: 1, status: partial ? 'PARTIAL' : 'SUCCESS', grounded: true,
    answer: partial ? 'Detalle disponible; los campos desconocidos se muestran sin valor y la cobertura puede ser parcial.' : 'Detalle de los registros consultados.',
    blocks: { table: {
      columns: [{ key: 'source', label: 'Fuente', format: 'text' }, { key: 'kind', label: 'Tipo', format: 'text' },
        { key: 'entity', label: 'Registro', format: 'text' }, { key: 'field', label: 'Campo', format: 'text' },
        { key: 'value', label: 'Valor', format: 'text' }, { key: 'freshness', label: 'Vigencia', format: 'status' }, { key: 'as_of', label: 'Fecha de la fuente', format: 'datetime' }],
      rows, truncated: omitted, ...(omitted ? { continuation: {} } : {}),
    } }, meta: { requestId, capability: read.operation, partial },
  }
}
