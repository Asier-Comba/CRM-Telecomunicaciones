import type { ProductOperationV1, ProductResultV1 } from '../contracts/product-v1'
import { isProductOperationV1, parseProductInputV1, parseProductReceiptV1, PRODUCT_RPC_V1, parseCustomerEditorV1, parseContactEditorPageV1 } from './product-runtime-v1.ts'
export interface ProductUserPortV1 {
  /** Must resolve an authenticated session + active server-selected membership on each call. */
  resolve(): Promise<{ workspaceId: string; role: 'owner' | 'admin' | 'member' | 'viewer' } | null>
  /** A user-JWT client only. Never inject a service-role/assistant client. */
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }>
}
export class ProductServiceV1 {
  readonly #port: ProductUserPortV1
  constructor(port: ProductUserPortV1) { this.#port = port }
  async execute(operation: ProductOperationV1, unknownInput: unknown): Promise<ProductResultV1> {
    try {
      if (!isProductOperationV1(operation)) return { ok: false, error: 'validation' }
      const input = parseProductInputV1(operation, unknownInput)
      if (input === null) return { ok: false, error: 'validation' }
      const context = await this.#port.resolve()
      if (context === null || !['owner', 'admin'].includes(context.role)) return { ok: false, error: 'access_denied' }
      const response = await this.#port.rpc(PRODUCT_RPC_V1[operation], { p_workspace_id: context.workspaceId, p_input: input })
      if (response.error !== null) {
        const code = response.error.code
        return { ok: false, error: code === '42501' ? 'access_denied' : code === 'P0002' ? 'not_found'
          : ['40001', '23505'].includes(code ?? '') ? 'conflict'
          : ['22023', '22P02', '22007', '23514', '23503'].includes(code ?? '') ? 'validation' : 'internal_safe' }
      }
      const receipt = parseProductReceiptV1(operation, input, response.data)
      return receipt === null ? { ok: false, error: 'internal_safe' } : { ok: true, receipt }
    } catch { return { ok: false, error: 'internal_safe' } }
  }
  async customerEditor(customerId: string) {
    return this.#read('product_v1_customer_editor', customerId, 1, null, value => parseCustomerEditorV1(customerId, value))
  }
  async contactEditors(customerId: string, limit = 20, afterId: string | null = null) {
    return this.#read('product_v1_contact_editors', customerId, limit, afterId, value => parseContactEditorPageV1(customerId, limit, afterId, value))
  }
  async #read<T>(name: string, id: string, limit: number, after: string | null, parse: (value: unknown) => T | null) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof id !== 'string' || !uuid.test(id) || !Number.isInteger(limit) || limit < 1 || limit > 100 || (after !== null && (typeof after !== 'string' || !uuid.test(after))))
      return { ok: false as const, error: 'validation' as const }
    try {
      const context = await this.#port.resolve()
      if (context === null || !['owner', 'admin'].includes(context.role)) return { ok: false as const, error: 'access_denied' as const }
      const response = await this.#port.rpc(name, { p_workspace_id: context.workspaceId, p_customer_id: id,
        ...(name === 'product_v1_contact_editors' ? { p_limit: limit, p_after_id: after } : {}) })
      if (response.error !== null) return { ok: false as const, error: response.error.code === '42501' ? 'access_denied' as const : 'internal_safe' as const }
      if (response.data === null) return { ok: false as const, error: 'not_found' as const }
      const data = parse(response.data)
      return data === null ? { ok: false as const, error: 'internal_safe' as const } : { ok: true as const, data }
    } catch { return { ok: false as const, error: 'internal_safe' as const } }
  }

}
