import type { AssistantResponse } from './ui-contract.js'
import type { ReadEvidence } from './telecom-service-adapter.js'

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
    blocks: { table: {
      columns: [
        { key: 'section', label: 'Sección', format: 'text' }, { key: 'availability', label: 'Disponibilidad', format: 'status' },
        { key: 'observed', label: 'Registros recibidos', format: 'number' }, { key: 'completeness', label: 'Cobertura', format: 'status' },
        { key: 'freshness', label: 'Vigencia', format: 'status' }, { key: 'as_of', label: 'Fecha de la fuente', format: 'datetime' },
        { key: 'source', label: 'Referencia de fuente', format: 'text' },
      ],
      rows: sections.map(([section, s]) => ({ section, availability: s.availability,
        observed: s.availability === 'available' ? s.projected_count : null, completeness: s.completeness,
        freshness: s.freshness, as_of: s.as_of, source: `${read.operation}#${section}` })),
      truncated: sections.some(([, s]) => s.truncated), rowIdentity: { key: 'section' },
    } },
    meta: { requestId, capability: read.operation, partial },
  }
}
