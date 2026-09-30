import type { CollectionEvidence, GroundedRow } from './grounding.ts'
import { containsHighConfidenceSecret } from './schema.ts'

/** Plain CRM text remains data. This is a transport constraint, not an LLM
 * injection detector: business text passing it never acquires instruction authority. */
export function isSafeEvidenceText(value: unknown, maxLength = 240): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
    && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>`]/u.test(value)
    && !/(?:https?|ftp|file|javascript|data):|www\.|!?\[[^\]]*\]\(|(?:^|\s)#{1,6}\s/iu.test(value)
    && !containsHighConfidenceSecret(value)
}

export const CONTEXT_PRIORITIES = ['relevance', 'attention', 'portfolio', 'activity'] as const
export type ContextPriority = typeof CONTEXT_PRIORITIES[number]
export type ContextSection = { id: string; priority: ContextPriority; evidence: CollectionEvidence }
export type BudgetedContext = {
  trust: 'untrusted_crm_data'
  sections: ContextSection[]
  omitted_sections: number
  truncated: boolean
}
export type ContextBudgetResult =
  | { ok: true; context: BudgetedContext; bytes: number }
  | { ok: false; code: 'invalid_context' | 'budget_too_small' }

const bytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), 'utf8')

function safeRow(row: GroundedRow): boolean {
  if (!isSafeEvidenceText(row.id, 160)) return false
  if (!Object.values(row.fields).every(value => value === null || typeof value === 'boolean' || isSafeEvidenceText(value))) return false
  return Object.values(row.protected_fields).every(field => field.visibility === 'hidden' || field.visibility === 'not_available'
    || field.visibility === 'masked' && isSafeEvidenceText(field.masked_text))
}

function projectRow(row: GroundedRow): GroundedRow {
  return {
    id: row.id, kind: row.kind, fields: { ...row.fields },
    protected_fields: Object.fromEntries(Object.entries(row.protected_fields).map(([key, field]) => [key,
      field.visibility === 'masked' ? { visibility: 'masked', masked_text: field.masked_text } : { visibility: field.visibility },
    ])),
  }
}

/** Input is already-authorized server evidence, not browser/LLM output. The
 * byte bound covers the entire JSON context, including notices and metadata.
 * Sections are admitted in priority order, then rows greedily in source order.
 * No total is inferred from the number of records that fit the context. */
export function budgetContext(sections: readonly ContextSection[], maxBytes: number): ContextBudgetResult {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1024 * 1024 || sections.length > 64
    || new Set(sections.map(section => section.id)).size !== sections.length
    || sections.some(section => !isSafeEvidenceText(section.id, 160) || !CONTEXT_PRIORITIES.includes(section.priority)
      || !section.evidence || !Array.isArray(section.evidence.rows)
      || !Number.isSafeInteger(section.evidence.projected_count)
      || section.evidence.projected_count !== section.evidence.rows.length
      || (section.evidence.availability !== 'available' && section.evidence.rows.length !== 0))) {
    return { ok: false, code: 'invalid_context' }
  }
  const context: BudgetedContext = { trust: 'untrusted_crm_data', sections: [], omitted_sections: sections.length, truncated: sections.length > 0 }
  if (bytes(context) > maxBytes) return { ok: false, code: 'budget_too_small' }
  const ordered = [...sections].sort((a, b) => CONTEXT_PRIORITIES.indexOf(a.priority) - CONTEXT_PRIORITIES.indexOf(b.priority))
  for (const section of ordered) {
    const source = section.evidence
    const evidence: CollectionEvidence = {
      contract_version: 'assistant.grounding.v1', trust: 'untrusted_crm_data', availability: source.availability,
      freshness: source.freshness, as_of: source.as_of, completeness: source.completeness,
      can_assert_empty: source.availability === 'available' && source.freshness === 'fresh'
        && source.completeness === 'complete' && !source.truncated && source.rows.length === 0,
      projected_count: 0, truncated: source.truncated || source.rows.length > 0, rows: [],
    }
    if (source.rows.length > 0) evidence.completeness = 'partial'
    const output: ContextSection = { id: section.id, priority: section.priority, evidence }
    context.sections.push(output)
    context.omitted_sections--
    // Keep the pessimistic boolean until all omissions are known: `false` is
    // one byte larger than `true`, so reserve that byte in every fit check.
    if (bytes({ ...context, truncated: false }) > maxBytes) {
      context.sections.pop(); context.omitted_sections++; continue
    }
    let dropped = false
    const seen = new Set<string>()
    if (source.availability === 'available') {
      for (const row of source.rows) {
        if (seen.has(row.id) || !safeRow(row)) { dropped = true; continue }
        seen.add(row.id)
        evidence.rows.push(projectRow(row))
        evidence.projected_count = evidence.rows.length
        if (bytes({ ...context, truncated: false }) > maxBytes) {
          evidence.rows.pop(); evidence.projected_count = evidence.rows.length; dropped = true
        }
      }
    } else if (source.rows.length) dropped = true
    evidence.truncated = source.truncated || dropped
    evidence.completeness = dropped ? 'partial' : source.completeness
    evidence.can_assert_empty = evidence.can_assert_empty && !dropped
    // A final false flag can grow JSON by one byte. If necessary remove a row;
    // this makes the omission truthful without exceeding the declared budget.
    if (bytes({ ...context, truncated: false }) > maxBytes) {
      evidence.rows.pop(); evidence.projected_count = evidence.rows.length
      evidence.truncated = true; evidence.completeness = 'partial'; evidence.can_assert_empty = false
    }
  }
  context.truncated = context.omitted_sections > 0 || context.sections.some(section => section.evidence.truncated)
  const size = bytes(context)
  return size <= maxBytes ? { ok: true, context, bytes: size } : { ok: false, code: 'budget_too_small' }
}
