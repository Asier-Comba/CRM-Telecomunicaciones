import { isSafeEvidenceText } from './context-budget.js'
import { SessionReferenceStore, type ReferenceScope, type ReferenceReadGuard } from './session-references.js'
import type { EntityKindV1 } from './entity-kinds.js'
import { BINDING_KINDS, READ_RESULT_KINDS, parseSemanticReadPlan } from './semantic-read-plan.js'
import { validateTelecomInput } from './telecom-input-validation.js'

export type SafeReadEntity = { kind: EntityKindV1; id: string; label: string }
/** The injected adapter MUST freshly authorize operation/resources and project its
 * DTO before constructing this boundary. It must not pass raw provider results.
 * This executor deliberately does not implement a live adapter or SQL transport.
 */
export type SafeReadResult =
  | { status: 'ok'; scopeEpoch: string; freshness: 'fresh' | 'stale'; completeness: 'complete' | 'partial'; entities: SafeReadEntity[] }
  | { status: 'forbidden' | 'failure' }
export type SafeReader = (context: ReferenceScope, capability: string, input: Record<string, string | number | null>) => Promise<SafeReadResult>
export type ReadExecutionContext = {
  scope: ReferenceScope; currentTurn: number; now: number
  /** Server policy, never a planner/browser choice. */
  allowedDashboardAudiences: ReadonlySet<'personal' | 'team' | 'workspace'>
  /** Required by a future production route; optional only for static offline tests.
   * Resolve the current server scope epoch before/after reads, never model state.
   */
  currentScope?: () => ReferenceScope
  /** Live server clock; production slices always supply it. */
  clock?: () => number
}
export type ReadNodeOutcome = {
  nodeId: string; resultAlias: string
  status: 'zero' | 'one' | 'multiple' | 'read' | 'forbidden' | 'partial' | 'stale' | 'failure' | 'blocked' | 'invalid_reference'
  count?: number
  clarification?: { kind: 'select_entity'; candidates: Array<{ reference: string; kind: EntityKindV1; label: string }> }
}
export type ReadExecution = { status: 'completed' | 'invalid_plan'; outcomes: ReadNodeOutcome[] }

function validResult(value: SafeReadResult, capability: string, epoch: string): boolean {
  if (!value || typeof value !== 'object') return false
  if (value.status === 'forbidden' || value.status === 'failure') return Object.keys(value).length === 1
  if (value.status !== 'ok' || Object.keys(value).sort().join(',') !== 'completeness,entities,freshness,scopeEpoch,status' ||
    value.scopeEpoch !== epoch || !['fresh', 'stale'].includes(value.freshness) || !['complete', 'partial'].includes(value.completeness) ||
    !Array.isArray(value.entities) || value.entities.length > 50) return false
  const expectedKind = READ_RESULT_KINDS[capability]
  if (!expectedKind) return value.entities.length === 0 && capability === 'crm.dashboard.get'
  const ids = new Set<string>()
  return value.entities.every(entity => {
    if (!entity || typeof entity !== 'object' || Object.keys(entity).sort().join(',') !== 'id,kind,label' ||
      entity.kind !== expectedKind || typeof entity.id !== 'string' || !/^[A-Za-z0-9_-]{16,160}$/.test(entity.id) ||
      !isSafeEvidenceText(entity.label, 240) || ids.has(entity.id)) return false
    ids.add(entity.id); return true
  })
}

export class SemanticReadExecutor {
  constructor(private readonly reader: SafeReader, private readonly references: SessionReferenceStore) {}
  async execute(value: unknown, context: ReadExecutionContext): Promise<ReadExecution> {
    const guard = this.references.beginRead(context.scope)
    if (!guard) return { status: 'invalid_plan', outcomes: [] }
    try { return await this.executeGuarded(value, context, guard) } finally { guard.release() }
  }
  private async executeGuarded(value: unknown, context: ReadExecutionContext, guard: ReferenceReadGuard): Promise<ReadExecution> {
    const plan = parseSemanticReadPlan(value)
    if (!plan || !Number.isSafeInteger(context.currentTurn) || context.currentTurn < 0 || !Number.isSafeInteger(context.now) || context.now < 0) return { status: 'invalid_plan', outcomes: [] }
    const scope = { ...context.scope }
    const currentTurn = context.currentTurn
    const now = context.now
    const liveNow = (): number => {
      const value = context.clock?.() ?? now
      return Number.isSafeInteger(value) && value >= now ? value : Number.NaN
    }
    const audiences = new Set(context.allowedDashboardAudiences)
    const currentScope = context.currentScope
    const unchangedScope = (): boolean => {
      try {
        if (!guard.current()) return false
        const live = currentScope ? currentScope() : context.scope
        return ['actorId', 'workspaceId', 'sessionId', 'scopeEpoch'].every(key =>
          scope[key as keyof ReferenceScope] === live[key as keyof ReferenceScope])
      } catch { return false }
    }
    const outcomes: ReadNodeOutcome[] = []
    const results = new Map<string, SafeReadResult>()
    const scopeChanged = (): ReadExecution => ({ status: 'completed', outcomes: plan.nodes.map(node => ({ nodeId: node.id, resultAlias: node.resultAlias, status: 'forbidden' })) })
    for (const node of plan.nodes) {
      const outcome: ReadNodeOutcome = { nodeId: node.id, resultAlias: node.resultAlias, status: 'failure' }
      outcomes.push(outcome)
      if (!unchangedScope()) return scopeChanged()
      if (!Number.isSafeInteger(liveNow())) continue
      // Explicit prerequisites may only continue from fresh, complete evidence.
      if (node.dependsOn.some(id => {
        const previous = results.get(id)
        const priorOutcome = outcomes.find(item => item.nodeId === id)
        return previous?.status !== 'ok' || previous.freshness !== 'fresh' || previous.completeness !== 'complete' ||
          (priorOutcome?.status !== 'one' && priorOutcome?.status !== 'read')
      })) { outcome.status = 'blocked'; continue }
      const args = { ...node.arguments }
      let bindingFailed = false
      for (const binding of node.entityBinding) {
        const kind = BINDING_KINDS[binding.targetField]!
        if (binding.source.type === 'reference') {
          const entity = this.references.resolveEntity(binding.source.handle, scope, kind, currentTurn, liveNow())
          if (!entity) { outcome.status = 'invalid_reference'; bindingFailed = true; break }
          args[binding.targetField] = entity.id
        } else {
          const previous = results.get(binding.source.nodeId)
          if (previous?.status !== 'ok' || previous.entities.length !== 1 || previous.entities[0]!.kind !== kind) {
            outcome.status = 'blocked'; bindingFailed = true; break
          }
          args[binding.targetField] = previous.entities[0]!.id
        }
      }
      if (bindingFailed) continue
      if (node.capability === 'crm.dashboard.get' && !audiences.has(args.audience as 'personal' | 'team' | 'workspace')) {
        outcome.status = 'forbidden'; continue
      }
      if (!validateTelecomInput(node.capability, args).ok) continue
      let result: SafeReadResult
      try {
        result = await this.reader({ ...scope }, node.capability, { ...args })
        if (!unchangedScope()) return scopeChanged()
        if (!Number.isSafeInteger(liveNow())) continue
        if (node.entityBinding.some(binding => binding.source.type === 'reference' && !this.references.resolveEntity(binding.source.handle, scope, BINDING_KINDS[binding.targetField]!, currentTurn, liveNow()))) {
          outcome.status = 'invalid_reference'; continue
        }
        if (!validResult(result, node.capability, scope.scopeEpoch)) continue
        result = structuredClone(result)
      } catch { continue }
      results.set(node.id, result)
      if (result.status !== 'ok') {
        if (result.status === 'forbidden') for (const binding of node.entityBinding) {
          const id = args[binding.targetField]
          if (typeof id === 'string') this.references.revokeEntity(scope, BINDING_KINDS[binding.targetField]!, id)
        }
        outcome.status = result.status; continue
      }
      if (node.capability === 'crm.dashboard.get') {
        outcome.status = result.freshness === 'stale' ? 'stale' : result.completeness === 'partial' ? 'partial' : 'read'
        continue
      }
      outcome.count = result.entities.length
      outcome.status = result.freshness === 'stale' ? 'stale' : result.completeness === 'partial' ? 'partial'
        : result.entities.length === 0 ? 'zero' : result.entities.length === 1 ? 'one' : 'multiple'
      if (outcome.status === 'multiple') {
        const candidates: NonNullable<ReadNodeOutcome['clarification']>['candidates'] = []
        for (const entity of result.entities) {
          const reference = this.references.issueEntity(scope, { kind: entity.kind, id: entity.id, sourceTurn: currentTurn, sourceOperation: node.capability }, liveNow())
          if (!reference) { candidates.length = 0; outcome.status = 'failure'; results.delete(node.id); break }
          candidates.push({ reference, kind: entity.kind, label: entity.label })
        }
        if (candidates.length) outcome.clarification = { kind: 'select_entity', candidates }
      }
    }
    return { status: 'completed', outcomes }
  }
}
