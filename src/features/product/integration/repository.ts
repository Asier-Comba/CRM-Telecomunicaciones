import type { ProductCommandInputsV1, ProductOperationV1, ProductReceiptV1, CustomerEditorV1, ContactEditorPageV1, ProductErrorV1 } from '@/lib/contracts/product-v1'
import type { DashboardInputV2, DashboardV2, GlobalSearchV1 } from '@/lib/contracts/product-dashboard-v2'
import { parseProductInputV1, parseProductReceiptV1, parseCustomerEditorV1, parseContactEditorPageV1 } from '../../../lib/server/product-runtime-v1.ts'
import { parseDashboardV2, parseGlobalSearchV1 } from '../../../lib/server/product-dashboard-runtime-v2.ts'
import type { CalendarInputV1, CalendarPageV1, WorkGetV1 } from '@/lib/contracts/product-queries-v1'
import { parseCalendarPageV1, parseWorkGetV1 } from '../../../lib/server/product-query-runtime-v1.ts'

export type UiError = ProductErrorV1 | 'transport_uncertain'
export class ProductUiError extends Error {
  readonly code: UiError
  constructor(code: UiError) { super(code); this.code = code }
}
export const errorText: Record<UiError, string> = {
  validation: 'Revisa los datos introducidos.', access_denied: 'No tienes permiso para esta acción.',
  not_found: 'El registro ya no está disponible.', conflict: 'El registro ha cambiado desde que lo abriste.',
  unavailable: 'Esta función no está disponible ahora.', internal_safe: 'No se pudo completar la acción.',
  transport_uncertain: 'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.',
}
export function safeMessage(error: unknown) {
  return errorText[error instanceof ProductUiError ? error.code : 'internal_safe']
}
export interface ProductRepository {
  readonly mode: 'synthetic' | 'integrated_local'
  command<O extends ProductOperationV1>(operation: O, input: ProductCommandInputsV1[O]): Promise<ProductReceiptV1>
  customer(id: string): Promise<CustomerEditorV1>
  contacts(customerId: string, after?: string | null): Promise<ContactEditorPageV1>
  dashboard(input: DashboardInputV2): Promise<DashboardV2>
  search(query: string): Promise<GlobalSearchV1>
  calendar(input: CalendarInputV1): Promise<CalendarPageV1>
  work(kind: 'task'|'meeting'|'opportunity', id: string): Promise<WorkGetV1>
}
const errors: readonly string[] = ['validation','access_denied','not_found','conflict','unavailable','internal_safe']
function object(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
/** All consumers validate the closed W1 success envelope and operation-specific DTO. */
export class IntegratedLocalProductRepository implements ProductRepository {
  readonly mode = 'integrated_local' as const
  private readonly request: typeof fetch
  constructor(request: typeof fetch = fetch) { this.request = request }
  private async post<T>(kind: 'commands' | 'queries', operation: string, input: unknown, parse: (value: unknown) => T | null): Promise<T> {
    let response: Response
    try {
      response = await this.request(`/api/product/v1/${kind}`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, input }),
        signal: AbortSignal.timeout(15000),
      })
    } catch { throw new ProductUiError('transport_uncertain') }
    let value: unknown
    try { value = await response.json() } catch { throw new ProductUiError('internal_safe') }
    if (!object(value)) throw new ProductUiError('internal_safe')
    if (value.ok === false && Object.keys(value).sort().join(',') === 'error,ok' && errors.includes(value.error as string)) {
      throw new ProductUiError(value.error as ProductErrorV1)
    }
    const field = kind === 'commands' ? 'receipt' : 'data'
    if (!response.ok || value.ok !== true || Object.keys(value).sort().join(',') !== [field,'ok'].sort().join(',')) throw new ProductUiError('internal_safe')
    const parsed = parse(value[field])
    if (parsed === null) throw new ProductUiError('internal_safe')
    return parsed
  }
  command<O extends ProductOperationV1>(operation: O, value: ProductCommandInputsV1[O]) {
    const input = parseProductInputV1(operation, value)
    if (!input) return Promise.reject(new ProductUiError('validation'))
    return this.post('commands', operation, input, data => parseProductReceiptV1(operation, input, data))
  }
  customer(id: string) { return this.post('queries','customer.editor',{ id },v => parseCustomerEditorV1(id,v)) }
  contacts(customerId: string, after: string | null = null) {
    return this.post('queries','contact.editors',{ customer_id: customerId, limit: 20, after_id: after },v => parseContactEditorPageV1(customerId,20,after,v))
  }
  dashboard(input: DashboardInputV2) { return this.post('queries','dashboard.get',input,v => parseDashboardV2(input,v)) }
  search(query: string) { const input = { query: query.trim(), limit: 50 }; return this.post('queries','global.search',input,v => parseGlobalSearchV1(input,v)) }
  calendar(input: CalendarInputV1) { return this.post('queries','calendar.list',input,v=>parseCalendarPageV1(input,v)) }
  work(kind: 'task'|'meeting'|'opportunity', id: string) { return this.post('queries','work.get',{kind,id},v=>parseWorkGetV1(kind,id,v)) }
}
/** Preview never impersonates a successful persistent write. */
export class SyntheticProductRepository implements ProductRepository {
  readonly mode = 'synthetic' as const
  private unavailable<T>(): Promise<T> { return Promise.reject(new ProductUiError('unavailable')) }
  command<O extends ProductOperationV1>(_operation: O, _input: ProductCommandInputsV1[O]) { void _operation; void _input; return this.unavailable<ProductReceiptV1>() }
  customer(_id: string) { void _id; return this.unavailable<CustomerEditorV1>() }
  contacts(_id: string) { void _id; return this.unavailable<ContactEditorPageV1>() }
  dashboard(_input: DashboardInputV2) { void _input; return this.unavailable<DashboardV2>() }
  search(_query: string) { void _query; return this.unavailable<GlobalSearchV1>() }
  calendar(_input: CalendarInputV1) { void _input; return this.unavailable<CalendarPageV1>() }
  work(_kind: 'task'|'meeting'|'opportunity', _id: string) { void _kind; void _id; return this.unavailable<WorkGetV1>() }
}
/** Keep in the mounted action/editor only. Never persist this object or contact PII. */
export function commandIntent<O extends ProductOperationV1>(operation: O, fields: Omit<ProductCommandInputsV1[O], 'command_id'>) {
  const input = Object.freeze({ ...fields, command_id: crypto.randomUUID() }) as ProductCommandInputsV1[O]
  return { input, execute: (repository: ProductRepository) => repository.command(operation, input) }
}
