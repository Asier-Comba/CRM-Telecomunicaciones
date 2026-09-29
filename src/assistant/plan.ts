import { CapabilityRegistry } from './registry.js'
import { containsTenantSelector, validateObject } from './schema.js'

export const PLAN_VERSION = 1 as const
const MAX_GOALS = 4
const GOAL_ID = /^g[1-9][0-9]?$/

export type PlannedGoal = {
  id: string
  capability: string
  input: Record<string, unknown>
  dependsOn: string[]
}

export type AssistantPlan = {
  version: typeof PLAN_VERSION
  speechAct: 'read' | 'write' | 'explain' | 'clarify'
  goals: PlannedGoal[]
}

export type PlanValidation =
  | { ok: true; plan: AssistantPlan }
  | { ok: false; code: string }

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

function cyclic(goals: readonly PlannedGoal[]): boolean {
  const dependencies = new Map(goals.map((goal) => [goal.id, goal.dependsOn]))
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(id: string): boolean {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const dependency of dependencies.get(id) ?? []) {
      if (visit(dependency)) return true
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }

  return goals.some((goal) => visit(goal.id))
}

export function validatePlan(registry: CapabilityRegistry, value: unknown): PlanValidation {
  const plan = record(value)
  if (!plan || !exactKeys(plan, ['version', 'speechAct', 'goals'])) return { ok: false, code: 'invalid_plan_shape' }
  if (plan.version !== PLAN_VERSION) return { ok: false, code: 'unsupported_plan_version' }
  if (!['read', 'write', 'explain', 'clarify'].includes(String(plan.speechAct))) {
    return { ok: false, code: 'invalid_speech_act' }
  }
  if (!Array.isArray(plan.goals) || plan.goals.length === 0 || plan.goals.length > MAX_GOALS) {
    return { ok: false, code: 'invalid_goal_count' }
  }

  const goals: PlannedGoal[] = []
  for (const candidate of plan.goals) {
    const goal = record(candidate)
    if (!goal || !exactKeys(goal, ['id', 'capability', 'input', 'dependsOn'])) {
      return { ok: false, code: 'invalid_goal_shape' }
    }
    if (typeof goal.id !== 'string' || !GOAL_ID.test(goal.id)) return { ok: false, code: 'invalid_goal_id' }
    if (typeof goal.capability !== 'string') return { ok: false, code: 'invalid_capability' }
    if (!Array.isArray(goal.dependsOn) || !goal.dependsOn.every((dependency) => typeof dependency === 'string')) {
      return { ok: false, code: 'invalid_dependencies' }
    }
    const input = record(goal.input)
    if (!input) return { ok: false, code: 'invalid_goal_input' }

    const capability = registry.get(goal.capability)
    if (!capability) return { ok: false, code: 'unknown_capability' }
    if (containsTenantSelector(input)) return { ok: false, code: 'tenant_selector_forbidden' }
    const validation = validateObject(capability.inputSchema, input)
    if (!validation.ok) return { ok: false, code: validation.code }

    goals.push({ id: goal.id, capability: goal.capability, input, dependsOn: [...goal.dependsOn] })
  }

  const ids = new Set(goals.map((goal) => goal.id))
  if (ids.size !== goals.length) return { ok: false, code: 'duplicate_goal_id' }
  if (goals.some((goal) => goal.dependsOn.some((dependency) => !ids.has(dependency) || dependency === goal.id))) {
    return { ok: false, code: 'invalid_dependency_reference' }
  }
  if (cyclic(goals)) return { ok: false, code: 'cyclic_dependencies' }

  const writes = goals.filter((goal) => registry.get(goal.capability)?.accessClass !== 'READ')
  if (writes.length > 1) return { ok: false, code: 'multiple_writes_forbidden' }
  if (writes.length === 1 && goals.at(-1)?.id !== writes[0]?.id) return { ok: false, code: 'write_must_be_last' }
  if ((writes.length > 0) !== (plan.speechAct === 'write')) return { ok: false, code: 'speech_act_access_mismatch' }

  return {
    ok: true,
    plan: {
      version: PLAN_VERSION,
      speechAct: plan.speechAct as AssistantPlan['speechAct'],
      goals,
    },
  }
}
