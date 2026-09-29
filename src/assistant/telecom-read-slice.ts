import { SemanticReadExecutor } from './semantic-read-executor.js'
import { SessionReferenceStore, type ReferenceScope } from './session-references.js'
import { createAuthorizedTelecomAdapter, type ReadEvidence } from './telecom-service-adapter.js'
import { BINDING_KINDS, parseSemanticReadPlan } from './semantic-read-plan.js'

/** Executable, request-scoped READ-only product seam. Caller obtains the plan
 * from the semantic planner and context ONLY from authenticated server state.
 * Evidence and entity selection share ONE validated read per node. No raw DTO,
 * provider result, credentials, HTTP registration or mutations leave this seam.
 */
export async function executeTelecomReadSlice(input: {
  plan: unknown
  adapter: ReturnType<typeof createAuthorizedTelecomAdapter>
  references: SessionReferenceStore
  currentScope(): ReferenceScope
  now(): number
  turn: number
  allowedDashboardAudiences: ReadonlySet<'personal' | 'team' | 'workspace'>
}) {
  const scope = { ...input.currentScope() }
  const guard = input.references.beginRead(scope)
  if (!guard) return { status: 'unavailable' as const, execution: null, evidence: [] }
  const evidence: Array<{ nodeRead: number; value: ReadEvidence }> = []
  const unchanged = () => {
    if (!guard.current()) return false
    const current = input.currentScope()
    return current.actorId === scope.actorId && current.workspaceId === scope.workspaceId && current.sessionId === scope.sessionId && current.scopeEpoch === scope.scopeEpoch
  }
  const executor = new SemanticReadExecutor(async (s, capability, args) => {
    const read = await input.adapter.readWithEvidence(s, capability, args)
    if (!unchanged()) return { status: 'forbidden' }
    evidence.push({ nodeRead: evidence.length, value: read.evidence })
    return read.selection
  }, input.references)
  try {
    const startedAt = input.now()
    const execution = await executor.execute(input.plan, { scope, currentTurn: input.turn, now: startedAt, clock: input.now, currentScope: input.currentScope,
      allowedDashboardAudiences: input.allowedDashboardAudiences })
    if (!unchanged()) return { status: 'access_changed' as const, execution: null, evidence: [] }
    const plan = parseSemanticReadPlan(input.plan)
    const live = input.now()
    if (!Number.isSafeInteger(live) || live < startedAt) return { status: 'unavailable' as const, execution: null, evidence: [] }
    if (plan && plan.nodes.some(node => node.entityBinding.some(binding => binding.source.type === 'reference' && !input.references.resolveEntity(binding.source.handle, scope, BINDING_KINDS[binding.targetField]!, input.turn, live)))) {
      return { status: 'access_changed' as const, execution, evidence: [] }
    }
    const denied = execution.outcomes.some(o => ['invalid_reference', 'forbidden', 'failure'].includes(o.status))
    return { status: 'completed' as const, execution, evidence: denied ? [] : evidence }
  } catch { return { status: 'unavailable' as const, execution: null, evidence: [] } }
  finally { guard.release() }
}
