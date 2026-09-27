/**
 * Closed, presentation-safe activity text. Callers may choose a code but may
 * never supply rendered text or interpolation values to the v1 activity feed.
 */
export const ACTIVITY_SUMMARY_TEXT_V1 = {
  'entity.created': 'Elemento creado',
  'entity.updated': 'Elemento actualizado',
  'entity.contacted': 'Contacto registrado',
  'entity.status_changed': 'Estado actualizado',
  'system.imported': 'Importación registrada',
  'system.synchronized': 'Sincronización registrada',
} as const

export type ActivitySummaryCodeV1 = keyof typeof ACTIVITY_SUMMARY_TEXT_V1

export function renderActivitySummaryV1(code: string): string {
  return Object.prototype.hasOwnProperty.call(ACTIVITY_SUMMARY_TEXT_V1, code)
    ? ACTIVITY_SUMMARY_TEXT_V1[code as ActivitySummaryCodeV1]
    : 'Actividad registrada'
}
