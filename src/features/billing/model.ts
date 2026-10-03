/** Local form schema only; not a database or API contract. */
export type InvoiceFormItem = {
  description: string
  quantity: number
  unitPrice: number
  discountRate: number
  taxRate: number
  withholdingRate: number
  sortOrder: number
}
export type InvoiceFormData = {
  clientId: string | null
  opportunityId: string | null
  contractId: string | null
  serviceId: string | null
  series: string
  issueDate: string
  dueDate: string | null
  currency: string
  exchangeRateToEur: number | null
  exchangeRateSource: string
  exchangeRateDate: string | null
  notes: string
  internalNotes: string
  items: InvoiceFormItem[]
}
export type Draft = {
  id: string
  form: InvoiceFormData
  customerName: string
  issuerName: string
  trashed: boolean
  accountingExcluded: boolean
}
export const blankForm = (): InvoiceFormData => ({
  clientId: null,
  opportunityId: null,
  contractId: null,
  serviceId: null,
  series: 'A',
  issueDate: '2026-09-30',
  dueDate: null,
  currency: 'EUR',
  exchangeRateToEur: null,
  exchangeRateSource: 'Manual',
  exchangeRateDate: null,
  notes: '',
  internalNotes: '',
  items: [
    {
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 21,
      withholdingRate: 0,
      discountRate: 0,
      sortOrder: 0,
    },
  ],
})
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  )
}
export function validateDraft(
  form: InvoiceFormData,
  customerIds: readonly string[],
): string[] {
  const errors: string[] = []
  if (!form.clientId || !customerIds.includes(form.clientId))
    errors.push('Selecciona un cliente de la muestra.')
  if (
    !validDate(form.issueDate) ||
    (form.dueDate !== null &&
      (!validDate(form.dueDate) || form.dueDate < form.issueDate))
  )
    errors.push('Comprueba las fechas de emisión y vencimiento.')
  if (!/^[A-Z0-9-]{1,8}$/.test(form.series))
    errors.push('La serie admite hasta 8 letras, números o guiones.')
  if (!['EUR', 'USD', 'GBP'].includes(form.currency))
    errors.push('Selecciona una divisa admitida.')
  if (
    form.currency !== 'EUR' &&
    (!Number.isFinite(form.exchangeRateToEur) ||
      Number(form.exchangeRateToEur) <= 0 ||
      !form.exchangeRateDate ||
      !validDate(form.exchangeRateDate) ||
      !form.exchangeRateSource.trim())
  )
    errors.push('Completa tipo de cambio, fecha y fuente.')
  if (form.items.length < 1 || form.items.length > 50)
    errors.push('Añade de 1 a 50 conceptos.')
  if (
    form.items.some(
      (i) =>
        !i.description.trim() ||
        i.description.length > 300 ||
        !Number.isFinite(i.quantity) ||
        i.quantity <= 0 ||
        i.quantity > 100000 ||
        !Number.isFinite(i.unitPrice) ||
        i.unitPrice < 0 ||
        i.unitPrice > 10000000 ||
        [i.taxRate, i.discountRate, i.withholdingRate].some(
          (v) => !Number.isFinite(v) || v < 0 || v > 100,
        ),
    )
  )
    errors.push('Revisa conceptos, cantidades, precios e impuestos.')
  return errors
}
/** Future extraction is untrusted and can propose one reviewed line only. */
export function validateExtraction(
  value: unknown,
  customerIds: readonly string[],
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.values(descriptors).some((d) => !('value' in d))) return null
  const p = value as Record<string, unknown>,
    keys = [
      'customerId',
      'concept',
      'amount',
      'vat',
      'withholding',
      'discount',
      'currency',
      'dueDate',
    ]
  if (Object.keys(p).sort().join(',') !== keys.sort().join(',')) return null
  if (
    typeof p.customerId !== 'string' ||
    !customerIds.includes(p.customerId) ||
    typeof p.concept !== 'string' ||
    !p.concept.trim() ||
    p.concept.length > 300
  )
    return null
  if (
    typeof p.amount !== 'number' ||
    !Number.isFinite(p.amount) ||
    p.amount <= 0 ||
    p.amount > 10000000
  )
    return null
  if (
    ['vat', 'withholding', 'discount'].some(
      (k) =>
        typeof p[k] !== 'number' ||
        !Number.isFinite(p[k]) ||
        Number(p[k]) < 0 ||
        Number(p[k]) > 100,
    )
  )
    return null
  if (
    !['EUR', 'USD', 'GBP'].includes(String(p.currency)) ||
    (p.dueDate !== null &&
      (typeof p.dueDate !== 'string' || !validDate(p.dueDate)))
  )
    return null
  return { ...p }
}
