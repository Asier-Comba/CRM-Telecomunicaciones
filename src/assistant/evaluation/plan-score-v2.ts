import type { ProductReadPlanV2 } from '../product-read-plan-v2.ts'

/** Authored expectations are evaluation data, never runtime authority. A
 * correct node hidden among extra queries must not earn a passing score. */
export type ReadPlanExpectationV2 = {
  id: string; text: string; decisions: readonly string[];
  capability?: string; arguments?: Readonly<Record<string, string | number>>
  references?: readonly string[]
  category?: string
  nodes?: readonly ReadNodeExpectationV2[]
}
export type ReadNodeExpectationV2 = {
  capability: string; arguments?: Readonly<Record<string, string | number>>
  bindings?: readonly { field: string; handle?: string; node?: number }[]
}
export function scoreReadPlanV2(plan: ProductReadPlanV2 | null, expected: ReadPlanExpectationV2) {
  const validPlan = !!plan
  const decisionCorrect = !!plan && expected.decisions.includes(plan.decision)
  const wantedNodes: readonly ReadNodeExpectationV2[] = expected.nodes ?? (expected.capability ? [{ capability: expected.capability, arguments: expected.arguments }] : [])
  const capabilityCorrect = decisionCorrect && (wantedNodes.length
    ? plan!.decision === 'plan' && plan!.nodes.length === wantedNodes.length
      && wantedNodes.every((node, index) => plan!.nodes[index].capability === node.capability)
    : plan!.decision !== 'plan' && plan!.nodes.length === 0)
  let argumentCorrect = false
  if (capabilityCorrect) {
    if (!wantedNodes.length) argumentCorrect = true
    else {
      argumentCorrect = wantedNodes.every((wantedNode, index) => {
        const node = plan!.nodes[index], wanted = wantedNode.arguments ?? {}
        const actual = Object.fromEntries(node.arguments.map(a => [a.field, a.value]))
        const bindings = wantedNode.bindings ?? []
        return node.arguments.length === Object.keys(actual).length
        && Object.entries(wanted).every(([field, value]) => actual[field] === value)
        && Object.entries(actual).every(([field, value]) => Object.hasOwn(wanted, field)
          || field === 'limit' && value === 100 || field === 'sort' && value === 'id_asc')
        && node.bindings.length === bindings.length
        && new Set(node.bindings.map(b => b.field)).size === node.bindings.length
        && bindings.every(binding => {
          const found = node.bindings.find(b => b.field === binding.field)
          if (!found) return false
          if (binding.handle !== undefined) return binding.node === undefined && found.handle === binding.handle && found.nodeId === null
          return binding.node !== undefined && Number.isInteger(binding.node) && binding.node >= 0 && binding.node < index
            && found.handle === null && found.nodeId === plan!.nodes[binding.node].id
        })
      })
    }
  }
  return { validPlan, decisionCorrect, capabilityCorrect, argumentCorrect }
}
