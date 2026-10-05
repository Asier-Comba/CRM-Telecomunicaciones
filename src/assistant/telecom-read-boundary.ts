import type { EntityKindV1 } from './entity-kinds.ts'
import { isSafeEvidenceText } from './context-budget.ts'
import { parseTelecomDto, type JsonObject, type JsonValue, type TelecomDtoKind } from './telecom-dto-parser.ts'
import { validateTelecomInput } from './telecom-input-validation.ts'
import { BINDING_KINDS, READ_RESULT_KINDS } from './semantic-read-plan.ts'
import type { ReferenceScope } from './session-references.ts'
import type { SafeReader, SafeReadResult, SafeReadEntity } from './semantic-read-executor.ts'

export const TELECOM_READ_DTO_KINDS: Readonly<Record<string, TelecomDtoKind>> = Object.freeze({
  'crm.customer.search': 'collection:customer', 'crm.customer.get': 'readone:customer',
  'crm.customer.summary': 'readone:summary', 'crm.contract.list': 'collection:contract',
  'crm.contract.get': 'readone:contract', 'crm.service.list': 'collection:service',
  'crm.line.list': 'collection:line', 'crm.renewal.list': 'collection:renewal',
  'crm.permanence.list': 'collection:permanence', 'crm.task.list': 'collection:task',
  'crm.meeting.list': 'collection:meeting', 'crm.activity.list': 'collection:activity',
  'crm.opportunity.list': 'collection:opportunity', 'crm.dashboard.get': 'readone:dashboard',
})
type Input = Readonly<Record<string, string | number | null>>
type Reference = Readonly<{ kind: EntityKindV1; id: string }>
export type TelecomReadBoundaryDependencies = {
  rawRead(scope: Readonly<ReferenceScope>, capability: string, input: Input): Promise<unknown>
  authorizeOperation(scope: Readonly<ReferenceScope>, capability: string, input: Input): Promise<boolean>
  authorizeReference(scope: Readonly<ReferenceScope>, reference: Reference): Promise<boolean>
  /** Fresh server session scope; mandatory even for metadata reads. */
  currentScope(): ReferenceScope
  now(): number
  /** Optional server-owned cursor registry check. Absence rejects non-null
   * cursors; callback must bind actor/workspace/session/epoch/operation/filters. */
  authorizeContinuation?(scope: Readonly<ReferenceScope>, capability: string, filters: Input, cursor: string): Promise<boolean>
}
export type ValidatedRead = { status: 'ok'; value: Readonly<JsonObject> } | { status: 'forbidden' | 'failure' }
const isObject = (v: JsonValue | undefined): v is JsonObject => !!v && typeof v === 'object' && !Array.isArray(v)
const validScope = (scope: ReferenceScope): boolean => ['actorId', 'workspaceId', 'sessionId', 'scopeEpoch'].every(k => {
  const value = scope[k as keyof ReferenceScope]
  return typeof value === 'string' && value.length > 0 && value.length <= 160
})
const sameScope = (a: Readonly<ReferenceScope>, b: Readonly<ReferenceScope>): boolean =>
  a.actorId === b.actorId && a.workspaceId === b.workspaceId && a.sessionId === b.sessionId && a.scopeEpoch === b.scopeEpoch

/** Offline injectable bridge only; no routes, databases, credentials or adapter
 * registration. readDto is server-internal and must never be returned wholesale
 * to an LLM/browser: only reader's minimal selection may cross that boundary. */
export function createTelecomReadBoundary(deps: TelecomReadBoundaryDependencies): {
  readDto(scope: ReferenceScope, capability: string, input: unknown): Promise<ValidatedRead>
  reader: SafeReader
} {
  async function readDto(requestScope: ReferenceScope, capability: string, candidate: unknown): Promise<ValidatedRead> {
    try {
      if (!Object.hasOwn(TELECOM_READ_DTO_KINDS, capability) || !validateTelecomInput(capability, candidate).ok) return { status: 'failure' }
      const scope = Object.freeze({ ...requestScope })
      if (!validScope(scope)) return { status: 'forbidden' }
      const input: Input = Object.freeze({ ...candidate as Record<string, string | number | null> })
      const current = (): boolean => { try { return sameScope(scope, deps.currentScope()) } catch { return false } }
      if (!current()) return { status: 'forbidden' }
      const allowed = await deps.authorizeOperation(scope, capability, input)
      if (!current() || allowed !== true) return { status: 'forbidden' }
      if (typeof input.continuation === 'string') {
        if (!deps.authorizeContinuation) return { status: 'forbidden' }
        const filters = Object.freeze({ ...input, continuation: null })
        const accepted = await deps.authorizeContinuation(scope, capability, filters, input.continuation)
        if (!current() || accepted !== true) return { status: 'forbidden' }
      }
      for (const [field, kind] of Object.entries(BINDING_KINDS)) {
        if (!Object.hasOwn(input, field)) continue
        const id = input[field]
        if (typeof id !== 'string') return { status: 'failure' }
        const accepted = await deps.authorizeReference(scope, Object.freeze({ kind, id }))
        if (!current() || accepted !== true) return { status: 'forbidden' }
      }
      if (!current()) return { status: 'forbidden' }
      const raw = await deps.rawRead(scope, capability, input)
      if (!current()) return { status: 'forbidden' }
      const now = deps.now()
      if (!Number.isSafeInteger(now) || now < 0) return { status: 'failure' }
      let revoked = false
      const parsed = await parseTelecomDto(TELECOM_READ_DTO_KINDS[capability]!, raw, {
        scopeEpoch: scope.scopeEpoch, now: new Date(now).toISOString(),
        currentScopeEpoch: () => deps.currentScope().scopeEpoch,
        currentNow: () => new Date(deps.now()).toISOString(),
        authorizeReference: async reference => {
          if (!current()) { revoked = true; return false }
          const authorized = await deps.authorizeReference(scope, reference)
          if (!current()) { revoked = true; return false }
          return authorized === true
        },
      })
      if (!current() || revoked) return { status: 'forbidden' }
      if (!parsed.ok) return { status: parsed.code === 'UNVERIFIED_REFERENCE' ? 'forbidden' : 'failure' }
      const data = parsed.value.data
      if (parsed.value.result === 'found' && isObject(data)) {
        const entity = capability === 'crm.customer.summary' ? data.customer : data
        const expected = input.customer_id ?? input.contract_id
        if (expected !== undefined && (!isObject(entity) || entity.id !== expected)) return { status: 'failure' }
        if (capability === 'crm.dashboard.get' && (!isObject(data.scope) || data.scope.audience !== input.audience)) return { status: 'failure' }
      }
      return { status: 'ok', value: parsed.value }
    } catch { return { status: 'failure' } }
  }

  const reader: SafeReader = async (scope, capability, input) => {
    const snapshot = { ...scope }
    const result = await readDto(snapshot, capability, input)
    // readDto's result is another await boundary. Check again before projection.
    try {
      if (!sameScope(snapshot, deps.currentScope())) return { status: 'forbidden' }
      if (result.status !== 'ok') return result
      return projectValidatedTelecomMetadata(capability, result.value, snapshot.scopeEpoch)
    } catch { return { status: 'failure' } }
  }
  return { readDto, reader }
}

/** Walk validated nested collection states conservatively. Missing/forbidden
 * sections turn summaries partial; never mistake an empty projection for zero. */
function nestedState(value: JsonValue, state: { stale: boolean; partial: boolean }): void {
  if (!value || typeof value !== 'object') return
  if (isObject(value)) {
    if (isObject(value.freshness) && value.freshness.kind === 'stale') state.stale = true
    if (value.source_state !== undefined && value.source_state !== 'available') state.partial = true
    if (isObject(value.completeness) && value.completeness.kind === 'partial') state.partial = true
  }
  for (const child of Object.values(value)) nestedState(child, state)
}
/** Server-internal projection. Caller MUST use the closed authorized DTO parser first. */
export function projectValidatedTelecomMetadata(capability: string, dto: Readonly<JsonObject>, epoch: string): SafeReadResult {
  if (dto.source_state === 'not_authorized' || dto.result === 'not_authorized') return { status: 'forbidden' }
  if (['unsupported', 'unavailable', 'error'].includes(String(dto.source_state)) || ['unavailable', 'error'].includes(String(dto.result))) return { status: 'failure' }
  const flags = { stale: false, partial: false }
  nestedState(dto as JsonObject, flags)
  const rows = Array.isArray(dto.items) ? dto.items : dto.result === 'found' && isObject(dto.data)
    ? [capability === 'crm.customer.summary' ? dto.data.customer! : dto.data] : []
  const kind = READ_RESULT_KINDS[capability]
  const entities: SafeReadEntity[] = []
  if (kind) for (const row of rows.slice(0, 50)) {
    if (!isObject(row) || typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{16,160}$/.test(row.id)) return { status: 'failure' }
    // Labels identify business customers only. Other entities get generic labels;
    // notes, phone numbers, contact fields, tokens and capability refs are omitted.
    const label = kind === 'customer' ? row.legal_name : `${kind} ${entities.length + 1}`
    if (!isSafeEvidenceText(label)) return { status: 'failure' }
    entities.push({ kind, id: row.id, label })
  }
  if (rows.length > 50) flags.partial = true
  if (new Set(entities.map(entity => entity.id)).size !== entities.length) return { status: 'failure' }
  return { status: 'ok', scopeEpoch: epoch, freshness: flags.stale ? 'stale' : 'fresh', completeness: flags.partial ? 'partial' : 'complete', entities }
}
