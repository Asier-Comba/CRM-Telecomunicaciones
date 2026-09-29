import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from './durable-contracts.js'

export const DURABLE_FOUNDATION_PATH = 'supabase/migrations/20260927183000_assistant_durable_foundation.sql'
type Migration = { path: string; sql: string }
const strings = (value: string): string[] => [...value.matchAll(/'([a-z_]+)'/g)].map(m => m[1]!)
const same = (a: readonly string[], b: readonly string[]): boolean => [...a].sort().join(',') === [...b].sort().join(',')

/** Narrow source review, NOT SQL evaluation. New forward DDL is explicit
 * REVIEW_REQUIRED, never ignored or interpreted as final database state.
 * W2/native introspection owns that proof. False positives stay visible.
 */
export function reviewDurableSource(migrations: readonly Migration[], runtimeFailureCodes: readonly string[]) {
  const foundation = migrations.find(m => m.path === DURABLE_FOUNDATION_PATH)
  const later = migrations.filter(m => m.path > DURABLE_FOUNDATION_PATH && /\bassistant_[a-z_]+\b/i.test(m.sql)).map(m => m.path)
  const base = { evidence: 'static_source_only_no_database', nativeDurabilityAccepted: false,
    forwardMigrationsRequiringReview: later,
    adapterChecks: { safeResultSchemaVersion: 'requires_adapter', originalAuditEvent: 'requires_adapter', transactionAuthorization: 'requires_adapter' } }
  if (!foundation || runtimeFailureCodes.length !== 2 || new Set(runtimeFailureCodes).size !== 2) return { ...base, status: 'review_required', reason: 'unrecognized_source_shape' }
  const sql = foundation.sql.replace(/--[^\n]*/g, '')
  const tables = ['assistant_confirmations', 'assistant_operations', 'assistant_effect_outbox'].map(name => {
    const block = sql.split(`create table public.${name} (`)[1]?.split('\n);')[0]
    return { name, block, states: block?.match(/state text not null default '[a-z_]+' check \(state in \(([\s\S]*?)\)\)/)?.[1] }
  })
  const operation = tables[1]?.block
  const whitelist = operation?.match(/failure_code text check \(failure_code is null or failure_code in \(([\s\S]*?)\)\)/)?.[1]
  const lease = operation?.match(/\blease_expires_at timestamptz( not null)?\s*,/)
  if (tables.some(t => !t.states) || !whitelist || !lease) return { ...base, status: 'review_required', reason: 'unrecognized_source_shape' }
  const states = tables.map((t, i) => ({ table: t.name, declared: strings(t.states!), expected: [CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES][i]!,
    compatible: same(strings(t.states!), [CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES][i]!) }))
  const accepted = strings(whitelist)
  const missing = runtimeFailureCodes.filter(code => !accepted.includes(code))
  const nullableLease = !lease[1]
  const digestCompatible = tables.every(t => t.name === 'assistant_effect_outbox' || t.block?.includes("check (digest_algorithm='w3-canonical-json-localeCompare-sha256-v1')"))
  return { ...base,
    status: later.length ? 'review_required' : missing.length || nullableLease || !digestCompatible || states.some(s => !s.compatible) ? 'mismatch' : 'foundation_shape_compatible',
    // ORIGINAL foundation, not the post-migration schema.
    foundation: { states, digestCompatible,
      failureCodeCompatibility: { runtimeEmits: runtimeFailureCodes, ddlAccepts: accepted, missing, compatible: missing.length === 0 },
      leaseMapping: { ddlAllowsNull: nullableLease, w3RecordRequiresTimestamp: true, explicitMappingRequired: nullableLease } },
  }
}
