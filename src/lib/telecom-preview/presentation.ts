import { PREVIEW_AS_OF } from './data'

export function previewDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha disponible'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(dateOnly ? { timeZone: 'UTC' } : { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }),
  }).format(new Date(dateOnly ? `${value}T00:00:00Z` : value))
}

export function daysFromPreview(value: string): number {
  return Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${PREVIEW_AS_OF.slice(0, 10)}T00:00:00Z`)) / 86_400_000)
}

export function urgencyLabel(value: string): string {
  const days = daysFromPreview(value)
  return days < 0 ? `Hace ${Math.abs(days)} días` : days === 0 ? 'Hoy' : `En ${days} días`
}

export const previewStatus: Readonly<Record<string, string>> = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', pending: 'Pendiente',
  in_progress: 'En curso', draft: 'Borrador', ended: 'Finalizado', cancelled: 'Cancelado',
  customer: 'Cliente', prospect: 'Prospecto', former_customer: 'Antiguo cliente', lead: 'Contacto',
}
