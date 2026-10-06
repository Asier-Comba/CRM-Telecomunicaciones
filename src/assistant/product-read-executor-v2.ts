import { productCapabilityV2 } from './product-capabilities-v2.ts'
import { parseProductReadPlanV2 } from './product-read-plan-v2.ts'
import { containsHighConfidenceSecret } from './schema.ts'
import { parseTelecomCollectionInputV1, parseTelecomCollectionResultV1, isTelecomCollectionOperationV1 } from '../lib/server/telecom-collection-runtime-v1.ts'
import { parseTelecomReadInputV1, parseTelecomReadResultV1, isTelecomReadOperationV1 } from '../lib/server/telecom-reads-runtime-v1.ts'
import { snapshotProductJsonV1 } from '../lib/server/product-query-runtime-v1.ts'
import { boundedAwaitV2 } from './bounded-await-v2.ts'
export type ReadAuthorityV2 = Readonly<{ actorId: string; workspaceId: string; scopeEpoch: string; role: string }>
export type AuthorizedProductReadersV2 = {
  collection(operation: string, input: unknown): Promise<unknown>
  report(operation: string, input: unknown): Promise<unknown>
}
export type ProductEvidenceV2 = { nodeId: string; capability: string; readAt: string; asOf: string | null;
  partial: boolean; data: Record<string, unknown> }
export type ProductReadResultV2 = { status: 'completed'; evidence: ProductEvidenceV2[] }
  | { status: 'clarify' | 'abstain' | 'invalid_plan' | 'access_changed' | 'unavailable' | 'ambiguous'; evidence: [] }
const validatedResults = new WeakSet<object>()
export function isValidatedProductReadResultV2(value: object): boolean { return validatedResults.has(value) }
export type ProductReadDependenciesV2 = {
  readers: AuthorizedProductReadersV2
  /** Must resolve fresh server-authenticated membership before/after every await. */
  authority(): Promise<ReadAuthorityV2 | null>
  /** Server opaque binding; reauthorize referenced resource, never trust model IDs. */
  resolveReference(handle: string, targetField: string, authority: ReadAuthorityV2): Promise<string | null>
  offeredHandles: readonly string[]
  now(): Date
  signal?: AbortSignal
}
const same = (a: ReadAuthorityV2 | null, b: ReadAuthorityV2) => a !== null && a.actorId === b.actorId && a.workspaceId === b.workspaceId && a.scopeEpoch === b.scopeEpoch && a.role === b.role
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const bindingKinds: Readonly<Record<string, string>> = { customer_id: 'customer', contract_id: 'contract', service_id: 'service', line_id: 'line',
  operator_id: 'operator', plan_id: 'plan', assigned_user_id: 'assignee', owner_user_id: 'assignee', opportunity_id: 'opportunity', stage_id: 'opportunity_stage' }
/** Pure semantic runtime: registered authorized server readers only. No SDK,
 * SQL/RPC/HTTP, mutation path or recursive model tool loop. */
export async function executeProductReadPlanV2(raw: unknown, deps: ProductReadDependenciesV2): Promise<ProductReadResultV2> {
  const stop = (status: Exclude<ProductReadResultV2['status'], 'completed'>): ProductReadResultV2 => ({ status, evidence: [] })
  const plan = parseProductReadPlanV2(raw, deps.offeredHandles); if (!plan) return stop('invalid_plan')
  if (plan.decision !== 'plan') return stop(plan.decision)
  try {
    const fresh = () => boundedAwaitV2(() => deps.authority(), deps.signal)
    const authority = await fresh()
    if (!authority || !['owner', 'admin', 'member', 'viewer'].includes(authority.role)) return stop('access_changed')
    const evidence: ProductEvidenceV2[] = []
    for (const node of plan.nodes) {
      const cap = productCapabilityV2(node.capability)!; const input: Record<string, unknown> = Object.fromEntries(node.arguments.map(arg => [arg.field, arg.value]))
      for (const binding of node.bindings) {
        let id: string | null = null
        if (binding.handle !== null) id = await boundedAwaitV2(() => deps.resolveReference(binding.handle!, binding.field, authority), deps.signal)
        else {
          const source = evidence.find(e => e.nodeId === binding.nodeId), sourceCap = source && productCapabilityV2(source.capability)
          const expected = binding.field === 'id' ? cap.backendOperation.split('.')[0] : bindingKinds[binding.field]
          const sourceKind = sourceCap?.backendOperation.split('.')[0]
          if (!source || source.partial || !expected || sourceKind !== expected) return stop('ambiguous')
          const rows = Array.isArray(source.data.items) ? source.data.items : [source.data.record]
          if (rows.length !== 1 || !object(rows[0])) return stop('ambiguous')
          const candidate = rows[0][sourceKind === 'assignee' ? 'user_id' : 'id']; id = typeof candidate === 'string' ? candidate : null
        }
        if (!id || !same(await fresh(), authority)) return stop('access_changed')
        input[binding.field] = id
      }
      if (!same(await fresh(), authority)) return stop('access_changed')
      const op = cap.backendOperation
      const parsedInput = isTelecomCollectionOperationV1(op) ? parseTelecomCollectionInputV1(op, input) : isTelecomReadOperationV1(op) ? parseTelecomReadInputV1(op, input) : null
      if (!parsedInput) return stop('invalid_plan')
      const rawResult = await boundedAwaitV2(() => cap.family === 'collection' ? deps.readers.collection(op, parsedInput) : deps.readers.report(op, parsedInput), deps.signal)
      if (!same(await fresh(), authority)) return stop('access_changed')
      const result = snapshotProductJsonV1(rawResult)
      if (!object(result) || Object.keys(result).sort().join(',') !== 'data,ok' || result.ok !== true) return stop('unavailable')
      let data: Record<string, unknown> | null = null
      if (isTelecomCollectionOperationV1(op)) {
        const input = parseTelecomCollectionInputV1(op, parsedInput)
        if (input) data = parseTelecomCollectionResultV1(op, input, result.data)
      } else if (isTelecomReadOperationV1(op)) {
        const input = parseTelecomReadInputV1(op, parsedInput)
        if (input) data = parseTelecomReadResultV1(op, input, result.data) as Record<string, unknown> | null
      }
      if (!data || containsHighConfidenceSecret(data)) return stop('unavailable')
      // Role-specific protected counters must remain unknown even if a buggy reader returns them.
      if (op === 'customer360.summary' && !['owner', 'admin'].includes(authority.role) && object(data.record) && (data.record.billing !== null || data.record.documents !== null)) return stop('unavailable')
      evidence.push({ nodeId: node.id, capability: cap.name, readAt: deps.now().toISOString(), asOf: typeof data.as_of === 'string' ? data.as_of : null,
        partial: data.next_id !== undefined && data.next_id !== null, data })
    }
    if (!same(await fresh(), authority)) return stop('access_changed')
    const result: ProductReadResultV2 = Object.freeze({ status: 'completed', evidence: Object.freeze(evidence.map(e => Object.freeze(e))) as unknown as ProductEvidenceV2[] })
    validatedResults.add(result)
    return result
  } catch { return stop('unavailable') }
}
