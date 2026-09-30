import { randomUUID } from 'node:crypto'
import { AuthorizedTelecomReadServiceV1 } from '../server/telecom-read-service-v1.ts'
import { TELECOM_CAPABILITY_CATALOG } from '../../assistant/telecom-catalog.ts'
import { createAuthorizedTelecomAdapter } from '../../assistant/telecom-service-adapter.ts'
import { runTelecomReadTurn } from '../../assistant/telecom-read-turn.ts'
import { SessionReferenceStore } from '../../assistant/session-references.ts'
import { PREVIEW_AS_OF, PREVIEW_SCOPE_EPOCH } from './data.ts'
import { previewReferenceAllowed, previewRepository } from './repository.ts'
import { planPreviewRead } from './planner.ts'

/** Request-scoped references; no client identity or cross-request memory. */
export async function runPreviewRead(text: string, requestId: string) {
  const scope = { actorId: 'actor_demo_preview_01', workspaceId: 'workspace_demo_preview_01',
    sessionId: randomUUID(), scopeEpoch: PREVIEW_SCOPE_EPOCH }
  const currentScope = () => ({ ...scope })
  const now = () => Date.parse(PREVIEW_AS_OF)
  const current = (context: { actor_id: string; workspace_id: string; scope_epoch: string; principal_kind: string }) =>
    context.actor_id === scope.actorId && context.workspace_id === scope.workspaceId && context.scope_epoch === scope.scopeEpoch && context.principal_kind === 'user'
  const service = new AuthorizedTelecomReadServiceV1(previewRepository, {
    isCurrent: current, now: () => PREVIEW_AS_OF,
    authorize: async (context, operation) => current(context) && TELECOM_CAPABILITY_CATALOG.some(c => c.operation === operation),
    authorizeReference: async (context, ref) => current(context) && previewReferenceAllowed(ref),
    authorizeCapability: async () => false,
  })
  const adapter = createAuthorizedTelecomAdapter({ service, currentScope, now,
    authorizeOperation: async (candidate, capability) => candidate.workspaceId === scope.workspaceId && candidate.actorId === scope.actorId && TELECOM_CAPABILITY_CATALOG.some(c => c.name === capability),
    authorizeReference: async (candidate, ref) => candidate.workspaceId === scope.workspaceId && candidate.actorId === scope.actorId && previewReferenceAllowed(ref),
  })
  const result = await runTelecomReadTurn(text, requestId, { adapter, currentScope, now,
    references: new SessionReferenceStore(), turn: 0, offeredReferences: [],
    calendar: { date: PREVIEW_AS_OF.slice(0, 10), timezone: 'Europe/Madrid' },
    allowedDashboardAudiences: new Set(['workspace']), plan: planPreviewRead,
  })
  // Internal execution metadata is not browser authority. Only closed UI leaves.
  return { contract: 'assistant.preview-read.v1' as const, responses: result.responses, request_id: requestId }
}
