import type { EntityKindV1 } from './entity-kinds.js'
import { telecomCapability } from './telecom-catalog.js'
import { validateTelecomInput } from './telecom-input-validation.js'

export type ReadBinding = { targetField: string; source: { type: 'node'; nodeId: string } | { type: 'reference'; handle: string } }
export type SemanticReadNode = {
  id: string; capability: string; arguments: Record<string, string | number | null>
  dependsOn: string[]; entityBinding: ReadBinding[]; resultAlias: string
  groundingPurpose: 'lookup' | 'summary' | 'comparison' | 'follow_up'
}
export type SemanticReadPlan = { version: 1; nodes: SemanticReadNode[] }
export const BINDING_KINDS: Readonly<Record<string, EntityKindV1>> = Object.freeze({
  customer_id: 'customer', contract_id: 'contract', service_id: 'service',
  operator_id: 'operator', assigned_user_id: 'user', assignee_id: 'user', owner_id: 'user',
})
export const READ_RESULT_KINDS: Readonly<Record<string, EntityKindV1>> = Object.freeze({
  'crm.customer.search': 'customer', 'crm.customer.get': 'customer', 'crm.customer.summary': 'customer',
  'crm.contract.list': 'contract', 'crm.contract.get': 'contract', 'crm.service.list': 'service',
  'crm.line.list': 'line', 'crm.renewal.list': 'renewal', 'crm.permanence.list': 'permanence',
  'crm.task.list': 'task', 'crm.meeting.list': 'meeting', 'crm.activity.list': 'activity', 'crm.opportunity.list': 'opportunity',
})
function object(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  return Reflect.ownKeys(value).length === Object.keys(value).length &&
    Object.values(Object.getOwnPropertyDescriptors(value)).every(field => 'value' in field)
}
const exact = (value: Record<string, unknown>, keys: string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(value)

function boundedJson(value: unknown, depth = 0, budget = { nodes: 0, bytes: 0 }): boolean {
  if (++budget.nodes > 1000 || depth > 8) return false
  if (typeof value === 'string') { budget.bytes += Buffer.byteLength(value, 'utf8'); return value.length <= 1024 && budget.bytes <= 16_384 }
  if (value === null || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (!value || typeof value !== 'object' || Object.getOwnPropertySymbols(value).length) return false
  if (Array.isArray(value)) {
    if (value.length > 32 || Object.keys(value).length !== value.length ||
      Object.keys(value).some((key, index) => key !== String(index))) return false
  } else if (!object(value)) return false
  for (const [key, field] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (Array.isArray(value) && key === 'length') continue
    if (!('value' in field) || !field.enumerable || !boundedJson(key, depth + 1, budget) || !boundedJson(field.value, depth + 1, budget)) return false
  }
  return true
}

/** Closed, bounded DAG parser. Array order is topological; no forward/cyclic dependencies. */
export function parseSemanticReadPlan(value: unknown): SemanticReadPlan | null {
  try {
    if (!boundedJson(value) || Buffer.byteLength(JSON.stringify(value), 'utf8') > 16_384 || !object(value) || !exact(value, ['version', 'nodes']) || value.version !== 1 ||
      !Array.isArray(value.nodes) || value.nodes.length < 1 || value.nodes.length > 8) return null
    const nodes: SemanticReadNode[] = []
    const prior = new Map<string, SemanticReadNode>()
    const aliases = new Set<string>()
    for (const candidate of value.nodes) {
      if (!object(candidate) || !exact(candidate, ['id', 'capability', 'arguments', 'dependsOn', 'entityBinding', 'resultAlias', 'groundingPurpose']) ||
        !identifier(candidate.id) || prior.has(candidate.id) || !identifier(candidate.resultAlias) || aliases.has(candidate.resultAlias) ||
        typeof candidate.capability !== 'string' || !object(candidate.arguments) ||
        !Array.isArray(candidate.dependsOn) || candidate.dependsOn.length > 7 ||
        !Array.isArray(candidate.entityBinding) || candidate.entityBinding.length > 4 ||
        !['lookup', 'summary', 'comparison', 'follow_up'].includes(String(candidate.groundingPurpose))) return null
      const capability = telecomCapability(candidate.capability)
      if (!capability || capability.accessClass !== 'READ') return null
      const dependencies = candidate.dependsOn as unknown[]
      if (new Set(dependencies).size !== dependencies.length || dependencies.some(id => typeof id !== 'string' || !prior.has(id))) return null
      if (Object.keys(candidate.arguments).some(key => Object.hasOwn(BINDING_KINDS, key)) ||
        (Object.hasOwn(candidate.arguments, 'continuation') && candidate.arguments.continuation !== null)) return null
      const args: Record<string, unknown> = { ...candidate.arguments }
      const bindings: ReadBinding[] = []
      for (const binding of candidate.entityBinding) {
        if (!object(binding) || !exact(binding, ['targetField', 'source']) || typeof binding.targetField !== 'string' ||
          !Object.hasOwn(BINDING_KINDS, binding.targetField) || !Object.hasOwn(capability.inputSchema.properties, binding.targetField) ||
          Object.hasOwn(args, binding.targetField) || !object(binding.source)) return null
        const source = binding.source
        if (source.type === 'node') {
          if (!exact(source, ['type', 'nodeId']) || typeof source.nodeId !== 'string' || !dependencies.includes(source.nodeId) ||
            READ_RESULT_KINDS[prior.get(source.nodeId)!.capability] !== BINDING_KINDS[binding.targetField]) return null
          bindings.push({ targetField: binding.targetField, source: { type: 'node', nodeId: source.nodeId } })
        } else if (source.type === 'reference') {
          if (!exact(source, ['type', 'handle']) || typeof source.handle !== 'string' || !/^ref_[A-Za-z0-9_-]{32}$/.test(source.handle)) return null
          bindings.push({ targetField: binding.targetField, source: { type: 'reference', handle: source.handle } })
        } else return null
        args[binding.targetField] = 'validated_binding_placeholder'
      }
      if (!validateTelecomInput(candidate.capability, args).ok) return null
      const node: SemanticReadNode = {
        id: candidate.id, capability: candidate.capability, arguments: { ...candidate.arguments } as SemanticReadNode['arguments'],
        dependsOn: [...dependencies] as string[], entityBinding: bindings,
        resultAlias: candidate.resultAlias, groundingPurpose: candidate.groundingPurpose as SemanticReadNode['groundingPurpose'],
      }
      nodes.push(node); prior.set(node.id, node); aliases.add(node.resultAlias)
    }
    return { version: 1, nodes }
  } catch { return null }
}
