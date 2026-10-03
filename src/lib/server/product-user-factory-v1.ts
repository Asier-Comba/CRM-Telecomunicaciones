import 'server-only'
import { createUserServerClient } from './supabase-user'
import { resolveTenantContext } from './tenant-context'
import { ProductServiceV1 } from './product-service-v1'
/** Server-only seam for W2 thin routes/actions. No browser/admin key or assistant registration. */
export async function createProductUserServiceV1() {
  const client = await createUserServerClient()
  if (client === null) return null
  return new ProductServiceV1({
    resolve: async () => {
      const context = await resolveTenantContext()
      return 'error' in context ? null : { workspaceId: context.workspaceId, role: context.role }
    },
    rpc: async (name, args) => {
      const result = await client.rpc(name, args)
      return { data: result.data as unknown, error: result.error === null ? null : { code: result.error.code } }
    },
  })
}
