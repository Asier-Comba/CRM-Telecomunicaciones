import type { ProductReadPlanV2 } from '../product-read-plan-v2.ts'

/** Authored expectations are evaluation data, never runtime authority. A
 * correct node hidden among extra queries must not earn a passing score. */
export type ReadPlanExpectationV2 = {
  id: string; text: string; decisions: readonly string[];
  capability?: string; arguments?: Readonly<Record<string, string | number>>
}
export function scoreReadPlanV2(plan: ProductReadPlanV2 | null, expected: ReadPlanExpectationV2) {
  const validPlan = !!plan
  const decisionCorrect = !!plan && expected.decisions.includes(plan.decision)
  const capabilityCorrect = decisionCorrect && (expected.capability
    ? plan!.decision === 'plan' && plan!.nodes.length === 1 && plan!.nodes[0].capability === expected.capability
    : plan!.decision !== 'plan' && plan!.nodes.length === 0)
  let argumentCorrect = false
  if (capabilityCorrect) {
    if (!expected.capability) argumentCorrect = true
    else {
      const node = plan!.nodes[0], wanted = expected.arguments ?? {}
      const actual = Object.fromEntries(node.arguments.map(a => [a.field, a.value]))
      argumentCorrect = node.bindings.length === 0 && node.arguments.length === Object.keys(actual).length
        && Object.entries(wanted).every(([field, value]) => actual[field] === value)
        && Object.entries(actual).every(([field, value]) => Object.hasOwn(wanted, field)
          || field === 'limit' && value === 100 || field === 'sort' && value === 'id_asc')
    }
  }
  return { validPlan, decisionCorrect, capabilityCorrect, argumentCorrect }
}
