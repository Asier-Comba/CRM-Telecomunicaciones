export const EVAL_CATEGORIES = [
  'exact_lookup',
  'fuzzy_lookup',
  'commitment',
  'dates',
  'renewal',
  'multiple_entities',
  'ambiguity',
  'follow_up',
  'pronouns',
  'tasks',
  'calendar',
  'typo_tolerance',
  'nonexistent_record',
  'authorization',
  'cross_tenant',
  'prompt_injection',
  'action_confirmation',
  'partial_data',
] as const

export type EvalCategory = typeof EVAL_CATEGORIES[number]

export type AssistantEvalCase = {
  id: string
  category: EvalCategory
  turns: Array<{ role: 'user' | 'assistant'; content: string }>
  expected: {
    mode: 'read' | 'write' | 'clarify' | 'deny'
    capabilityHint: string | null
    grounded: boolean
    confirmation: 'none' | 'required'
    tenantIsolation: boolean
  }
  status: 'executable' | 'blocked_on_w1_contract'
}

export function validateEvalCase(value: unknown): value is AssistantEvalCase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<AssistantEvalCase>
  if (typeof candidate.id !== 'string' || !EVAL_CATEGORIES.includes(candidate.category as EvalCategory)) return false
  if (!Array.isArray(candidate.turns) || candidate.turns.length === 0) return false
  if (!candidate.turns.every((turn) => turn && ['user', 'assistant'].includes(turn.role) && typeof turn.content === 'string')) return false
  if (!candidate.expected || !['read', 'write', 'clarify', 'deny'].includes(candidate.expected.mode)) return false
  if (typeof candidate.expected.grounded !== 'boolean' || typeof candidate.expected.tenantIsolation !== 'boolean') return false
  if (!['none', 'required'].includes(candidate.expected.confirmation)) return false
  return candidate.status === 'executable' || candidate.status === 'blocked_on_w1_contract'
}
