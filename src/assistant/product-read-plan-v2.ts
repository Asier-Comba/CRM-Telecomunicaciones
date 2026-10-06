import { productCapabilityV2, PRODUCT_CAPABILITIES_V2 } from './product-capabilities-v2.ts'
import { snapshotProductJsonV1 } from '../lib/server/product-query-runtime-v1.ts'
import { parseTelecomCollectionInputV1, isTelecomCollectionOperationV1 } from '../lib/server/telecom-collection-runtime-v1.ts'
import { parseTelecomReadInputV1, isTelecomReadOperationV1 } from '../lib/server/telecom-reads-runtime-v1.ts'
export type ProductReadPlanV2 = { version: 2; decision: 'plan' | 'clarify' | 'abstain'; nodes: ProductReadNodeV2[] }
export type ProductReadNodeV2 = { id: string; capability: string; arguments: { field: string; value: string | number | null }[];
  bindings: { field: string; handle: string | null; nodeId: string | null }[] }
const exact = (v: Record<string, unknown>, fields: string[]) => Object.keys(v).sort().join(',') === fields.sort().join(',')
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const idField = (field: string) => field === 'id' || field.endsWith('_id')
const label = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(v)
export function parseProductReadPlanV2(value: unknown, offered: readonly string[]): ProductReadPlanV2 | null {
  try {
    const v = snapshotProductJsonV1(value)
    if (!object(v) || !exact(v, ['version', 'decision', 'nodes']) || v.version !== 2 || !['plan', 'clarify', 'abstain'].includes(String(v.decision)) || !Array.isArray(v.nodes) || v.nodes.length > 8) return null
    if (v.decision !== 'plan') return v.nodes.length === 0 ? v as ProductReadPlanV2 : null
    if (!v.nodes.length) return null
    const nodes: ProductReadNodeV2[] = []
    for (const node of v.nodes) {
      if (!object(node) || !exact(node, ['id', 'capability', 'arguments', 'bindings']) || !label(node.id) || nodes.some(n => n.id === node.id)
        || typeof node.capability !== 'string' || !Array.isArray(node.arguments) || node.arguments.length > 16 || !Array.isArray(node.bindings) || node.bindings.length > 4) return null
      const cap = productCapabilityV2(node.capability); if (!cap) return null
      const input: Record<string, unknown> = {}, fields = new Set<string>()
      for (const arg of node.arguments) {
        if (!object(arg) || !exact(arg, ['field', 'value']) || !label(arg.field) || fields.has(arg.field) || idField(arg.field)
          || !(typeof arg.value === 'string' && arg.value.length <= 64 || typeof arg.value === 'number' && Number.isSafeInteger(arg.value))) return null
        fields.add(arg.field); input[arg.field] = arg.value
      }
      for (const binding of node.bindings) {
        if (!object(binding) || !exact(binding, ['field', 'handle', 'nodeId']) || !label(binding.field) || !idField(binding.field)
          || binding.field === 'after_id' || fields.has(binding.field)) return null
        if (binding.handle !== null ? typeof binding.handle !== 'string' || !offered.includes(binding.handle) || binding.nodeId !== null
          : !label(binding.nodeId) || !nodes.some(n => n.id === binding.nodeId)) return null
        fields.add(binding.field); input[binding.field] = '00000000-0000-4000-8000-000000000001'
      }
      const op = cap.backendOperation
      if (isTelecomCollectionOperationV1(op) ? !parseTelecomCollectionInputV1(op, input) : isTelecomReadOperationV1(op) ? !parseTelecomReadInputV1(op, input) : true) return null
      nodes.push(node as ProductReadNodeV2)
    }
    return { version: 2, decision: 'plan', nodes }
  } catch { return null }
}
const text = (maxLength: number) => ({ type: 'string', maxLength })
const closed = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
/** Provider strict schema uses argument pairs, avoiding unbounded dictionaries.
 * Runtime parser still validates capability-specific filters, dates and DAG. */
export const PRODUCT_READ_PLAN_JSON_SCHEMA_V2 = closed({ version: { type: 'integer', enum: [2] }, decision: { type: 'string', enum: ['plan', 'clarify', 'abstain'] },
  nodes: { type: 'array', maxItems: 8, items: closed({ id: text(40), capability: { ...text(100), enum: PRODUCT_CAPABILITIES_V2.map(c => c.name) },
    arguments: { type: 'array', maxItems: 16, items: closed({ field: text(40), value: { anyOf: [text(64), { type: 'integer' }] } }) },
    bindings: { type: 'array', maxItems: 4, items: closed({ field: text(40), handle: { anyOf: [text(160), { type: 'null' }] }, nodeId: { anyOf: [text(40), { type: 'null' }] } }) } }) } })
