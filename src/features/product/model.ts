/** Presentation-only models. They confer no read, write or tenant authority. */
export type SearchItem = { id: string; kind: 'customer' | 'contract' | 'service' | 'line' | 'opportunity'; label: string; detail: string; customerId: string }
export type CustomerRow = {
  id: string; name: string; tradeName: string | null; owner: string; status: string; lifecycle: string;
  operators: string[]; services: number | null; lines: number | null;
  renewal: string | null; permanence: string | null; opportunity: string | null; nextAction: string | null;
}
export type CalendarEntry = { id: string; title: string; customerId: string | null; customer: string; owner: string; type: 'meeting' | 'task' | 'renewal' | 'permanence'; date: string; end: string | null; allDay: boolean }
export type Period = 'month' | 'quarter' | 'semester' | 'year' | 'all'
export const periods: ReadonlyArray<{ value: Period; label: string }> = [{ value: 'month', label: 'Mes' }, { value: 'quarter', label: 'Trimestre' }, { value: 'semester', label: 'Semestre' }, { value: 'year', label: 'Año' }, { value: 'all', label: 'Todo' }]
export const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
export function inPeriod(date: string, period: Period, asOf: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date) || !/^\d{4}-\d{2}-\d{2}/.test(asOf)) return false
  const d = date.slice(0, 10), anchor = asOf.slice(0, 10)
  if (new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) !== d) return false
  if (period === 'all') return true
  if (d.slice(0, 4) !== anchor.slice(0, 4)) return false
  const month = Number(d.slice(5, 7)) - 1, current = Number(anchor.slice(5, 7)) - 1
  return period === 'year' || (period === 'month' ? month === current : Math.floor(month / (period === 'quarter' ? 3 : 6)) === Math.floor(current / (period === 'quarter' ? 3 : 6)))
}
export function customerHref(id: string): string | null {
  return /^[A-Za-z0-9_-]{1,160}$/.test(id) ? `/clients/${id}` : null
}
export function filterCustomers(rows: readonly CustomerRow[], filters: { query: string; status: string; owner: string; operator: string; attention: string }) {
  const q = fold(filters.query)
  return rows.filter(row => (!q || fold(`${row.name} ${row.tradeName ?? ''}`).includes(q)) &&
    (!filters.status || row.status === filters.status) && (!filters.owner || row.owner === filters.owner) &&
    (!filters.operator || row.operators.includes(filters.operator)) &&
    (!filters.attention || (filters.attention === 'renewal' ? !!row.renewal : filters.attention === 'permanence' ? !!row.permanence : !!row.nextAction)))
}
export function addDays(value: string, days: number): string {
  const d = new Date(`${value.slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}
export function weekStart(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return addDays(value, -((d.getUTCDay() + 6) % 7))
}
export function calendarDate(value: string): string {
  if (value.length === 10) return value
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date(value))
}
