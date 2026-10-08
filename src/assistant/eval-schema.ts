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
  'cif_lookup',
  'customer',
  'contract',
  'lines',
  'services',
  'operators',
  'plan_tariff',
  'assigned_commercial',
  'meetings',
  'opportunities',
  'recent_activity',
  'no_data',
  'stale_reference',
  'pagination',
  'large_customer',
  'permission_denied',
  'arbitrary_sql',
  'arbitrary_http',
  'hallucinated_capability',
  'hallucinated_entity',
  'malformed_plan',
  'provider_outage',
  'database_outage',
  'streaming_interruption',
  'unsafe_write',
  'duplicate_write',
  'confirmation_tampering',
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

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

export function validateEvalCase(value: unknown): value is AssistantEvalCase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<AssistantEvalCase>
  if (!exactKeys(candidate as Record<string, unknown>, ['id', 'category', 'turns', 'expected', 'status'])) return false
  if (typeof candidate.id !== 'string' || !/^[a-z0-9][a-z0-9-]{2,99}$/.test(candidate.id)) return false
  if (!EVAL_CATEGORIES.includes(candidate.category as EvalCategory)) return false
  if (!Array.isArray(candidate.turns) || candidate.turns.length === 0 || candidate.turns.length > 12) return false
  if (!candidate.turns.every((turn) => {
    if (!turn || typeof turn !== 'object' || Array.isArray(turn)) return false
    if (!exactKeys(turn as unknown as Record<string, unknown>, ['role', 'content'])) return false
    return ['user', 'assistant'].includes(turn.role) && typeof turn.content === 'string' && turn.content.length > 0 && turn.content.length <= 4_000
  })) return false
  if (!candidate.expected || typeof candidate.expected !== 'object' || Array.isArray(candidate.expected)) return false
  if (!exactKeys(candidate.expected as unknown as Record<string, unknown>, ['mode', 'capabilityHint', 'grounded', 'confirmation', 'tenantIsolation'])) return false
  if (!['read', 'write', 'clarify', 'deny'].includes(candidate.expected.mode)) return false
  if (candidate.expected.capabilityHint !== null && (typeof candidate.expected.capabilityHint !== 'string' || candidate.expected.capabilityHint.length > 200)) return false
  if (typeof candidate.expected.grounded !== 'boolean' || typeof candidate.expected.tenantIsolation !== 'boolean') return false
  if (!['none', 'required'].includes(candidate.expected.confirmation)) return false
  return candidate.status === 'executable' || candidate.status === 'blocked_on_w1_contract'
}
