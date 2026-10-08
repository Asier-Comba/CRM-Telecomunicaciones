import { isThreadOperationV2, parseConversationInputV2, parseConversationResultV2, type ConversationResultV2 } from './conversation-contract-v2.ts'
import type { ReadAuthorityV2 } from './product-read-executor-v2.ts'
import { boundedAwaitV2 } from './bounded-await-v2.ts'
export type ConversationPortV2 = {
  authority(): Promise<ReadAuthorityV2 | null>
  invoke(workspaceId: string, operation: string, input: Readonly<Record<string, string | number>>): Promise<{ data: unknown; error: { code?: string } | null }>
}
export type ConversationServiceResultV2 = { ok: true; data: ConversationResultV2 } | { ok: false; error: 'validation' | 'access_denied' | 'access_changed' | 'conflict' | 'unavailable' }
/** Narrow transactional repository boundary. No SDK/provider dependency. No
 * persisted history may become capability evidence or authorize a resource. */
export class ConversationServiceV2 {
  constructor(private readonly port: ConversationPortV2) {}
  async execute(operation: unknown, raw: unknown): Promise<ConversationServiceResultV2> {
    if (!isThreadOperationV2(operation)) return { ok: false, error: 'validation' }
    const input = parseConversationInputV2(operation, raw)
    if (!input) return { ok: false, error: 'validation' }
    try {
      const scope = await boundedAwaitV2(() => this.port.authority())
      if (!scope) return { ok: false, error: 'access_denied' }
      const result = await boundedAwaitV2(() => this.port.invoke(scope.workspaceId, operation, input))
      const fresh = await boundedAwaitV2(() => this.port.authority())
      if (!fresh || ['actorId', 'workspaceId', 'scopeEpoch', 'role'].some(k => fresh[k as keyof ReadAuthorityV2] !== scope[k as keyof ReadAuthorityV2])) return { ok: false, error: 'access_changed' }
      if (result.error) return { ok: false, error: result.error.code === '42501' ? 'access_denied' : ['40001', '23505'].includes(result.error.code ?? '') ? 'conflict' : ['22023', '22P02', '23514'].includes(result.error.code ?? '') ? 'validation' : 'unavailable' }
      const data = parseConversationResultV2(operation, input, result.data)
      return data ? { ok: true, data } : { ok: false, error: 'unavailable' }
    } catch { return { ok: false, error: 'unavailable' } }
  }
}
