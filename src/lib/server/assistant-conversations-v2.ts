import 'server-only'
import { createUserServerClient } from './supabase-user'
import { resolveTenantContext } from './tenant-context'
import { ConversationServiceV2 } from '../../assistant/conversation-service-v2.ts'
import type { ReadAuthorityV2 } from '../../assistant/product-read-executor-v2.ts'
import { boundedAwaitV2 } from '../../assistant/bounded-await-v2.ts'

/** Cookie authority is resolved independently of body, model or stored history.
 * No cross-request cache. Context handles are not implemented by this factory. */
export async function createAssistantConversationServicesV2() {
  const client = await createUserServerClient()
  if (!client) return null
  const authority = async (): Promise<ReadAuthorityV2 | null> => {
    const scope = await boundedAwaitV2(() => resolveTenantContext())
    if ('error' in scope) return null
    const { data, error } = await client.from('workspace_members')
      .select('id,user_id,workspace_id,role,status,version,workspace:workspaces!inner(status,updated_at)')
      .eq('id', scope.membershipId).eq('user_id', scope.userId).eq('workspace_id', scope.workspaceId).abortSignal(AbortSignal.timeout(10000)).maybeSingle()
    if (error || !data || data.status !== 'active' || data.role !== scope.role || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return null
    const joined: unknown = data.workspace
    const workspace = Array.isArray(joined) ? joined.length === 1 ? joined[0] : null : joined
    if (!workspace || typeof workspace !== 'object' || !('status' in workspace) || workspace.status !== 'active' || !('updated_at' in workspace) || typeof workspace.updated_at !== 'string') return null
    return { actorId: scope.userId, workspaceId: scope.workspaceId, role: scope.role, scopeEpoch: `${scope.membershipId}:${data.version}:${workspace.updated_at}` }
  }
  return { authority, conversations: new ConversationServiceV2({ authority, invoke: async (workspaceId, operation, input) => {
    const result = await client.rpc('assistant_thread_v2', { p_workspace_id: workspaceId, p_operation: operation, p_input: input }).abortSignal(AbortSignal.timeout(10000))
    return { data: result.data as unknown, error: result.error ? { code: result.error.code } : null }
  } }) }
}
