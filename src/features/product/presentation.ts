/** Date-only values retain their calendar day; instants use the product's Madrid timezone. */
export function productDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value)
  if (!Number.isFinite(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(dateOnly ? {timeZone:'UTC'} : {timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'}),
  }).format(date)
}
