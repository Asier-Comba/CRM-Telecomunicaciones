import type { ProductUserPortV1 } from './product-service-v1'
import { isTelecomCollectionOperationV1, parseTelecomCollectionInputV1, parseTelecomCollectionResultV1 } from './telecom-collection-runtime-v1.ts'

export class TelecomCollectionServiceV1 {
  readonly port: ProductUserPortV1
  constructor(port: ProductUserPortV1) { this.port = port }
  async read(operation: unknown, value: unknown) {
    if (!isTelecomCollectionOperationV1(operation)) return { ok: false as const, error: 'validation' as const }
    const input = parseTelecomCollectionInputV1(operation, value)
    if (input === null) return { ok: false as const, error: 'validation' as const }
    try {
      const context = await this.port.resolve()
      if (!context || !['owner', 'admin', 'member', 'viewer'].includes(context.role)) return { ok: false as const, error: 'access_denied' as const }
      const r = await this.port.rpc('telecom_collection_v1_query', { p_workspace_id: context.workspaceId, p_operation: operation, p_input: input })
      if (r.error) return { ok: false as const, error: r.error.code === '42501' ? 'access_denied' as const : ['22023', '22P02', '22007', '22008'].includes(r.error.code ?? '') ? 'validation' as const : 'internal_safe' as const }
      if (r.data === null) return { ok: false as const, error: 'not_found' as const }
      const data = parseTelecomCollectionResultV1(operation, input, r.data)
      return data === null ? { ok: false as const, error: 'internal_safe' as const } : { ok: true as const, data }
    } catch { return { ok: false as const, error: 'internal_safe' as const } }
  }
}
