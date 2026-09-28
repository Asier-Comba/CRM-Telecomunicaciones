import type { TelecomReadServiceV1, ServerReadContextV1 } from './telecom-service-contract.v1.js'
import { TELECOM_CAPABILITY_CATALOG } from './telecom-catalog.js'
import { createTelecomReadBoundary, projectValidatedTelecomMetadata, TELECOM_READ_DTO_KINDS, type ValidatedRead, type TelecomReadBoundaryDependencies } from './telecom-read-boundary.js'
import type { SafeReadResult } from './semantic-read-executor.js'
import { projectCollectionEvidence, type GroundingEntityKind, type CollectionEvidence } from './grounding.js'
import type { ReferenceScope } from './session-references.js'
import type { JsonObject } from './telecom-dto-parser.js'

export const TELECOM_SOURCE_SHA = '9f0e85130bfcfde8b8c60150bc2aa07f5e6b65fb'
export const TELECOM_CHECKPOINTS: Readonly<Record<string, readonly string[]>> = {
  '8de57dc2f84634156655f6c79047d545bbb86a6c': ['customer.search', 'customer.get', 'customer.summary'],
  '79845673646556ef30485469a80b1c6151bac85e': ['customer.search', 'customer.get', 'customer.summary', 'contract.list', 'contract.get', 'service.list', 'line.list'],
  '458a6fdd4b39e47cf9f508e8b1239a96bfa74281': ['customer.search', 'customer.get', 'customer.summary', 'contract.list', 'contract.get', 'service.list', 'line.list', 'task.list', 'meeting.list', 'activity.list', 'opportunity.list'],
  '9f0e85130bfcfde8b8c60150bc2aa07f5e6b65fb': ['customer.search', 'customer.get', 'customer.summary', 'contract.list', 'contract.get', 'service.list', 'line.list', 'task.list', 'meeting.list', 'activity.list', 'opportunity.list', 'renewal.list', 'permanence.list', 'dashboard.get'],
}
/** Snapshot is data only; availability does not grant execution permission. */
export function telecomIntegrationMatrix(sourceSha: string) {
  if (!Object.hasOwn(TELECOM_CHECKPOINTS, sourceSha)) throw new Error('unreviewed_checkpoint')
  const implemented = new Set(TELECOM_CHECKPOINTS[sourceSha])
  return TELECOM_CAPABILITY_CATALOG.map(c => ({
  operation: c.operation, capability: c.name, serviceMethod: c.serviceMethod,
  expectedInput: c.inputSchema, expectedOutput: c.outputSchema.ref,
  parser: TELECOM_READ_DTO_KINDS[c.name], semanticIntent: c.description,
  groundingProjection: c.operation === 'customer.summary' ? 'customer360_sections' : c.operation === 'dashboard.get' ? 'dashboard_sections' : 'collection_evidence',
  integrationState: implemented.has(c.operation) ? 'repository_published_route_disabled' : 'repository_unavailable',
    sourceSha,
  }))
}
export const TELECOM_INTEGRATION_MATRIX = telecomIntegrationMatrix(TELECOM_SOURCE_SHA)

type Dependencies = Omit<TelecomReadBoundaryDependencies, 'rawRead'> & {
  /** Must be AuthorizedTelecomReadServiceV1, NEVER its raw repository. */
  service: TelecomReadServiceV1
}
export type ReadEvidence = {
  operation: string
  state: 'available' | 'not_found' | 'not_authorized' | 'unavailable' | 'error'
  sections: Readonly<Record<string, CollectionEvidence>>
  relations: Readonly<Record<string, { customerId?: string; contractId?: string; serviceId?: string }>>
  calendar?: { timezone: string; startsAt: string; endsAt: string }
}
const object = (v: unknown): v is JsonObject => !!v && typeof v === 'object' && !Array.isArray(v)
const same = (a: ReferenceScope, b: ReferenceScope): boolean =>
  a.actorId === b.actorId && a.workspaceId === b.workspaceId && a.sessionId === b.sessionId && a.scopeEpoch === b.scopeEpoch

/** Server-only dependency injection: no routes, environment, SDK, credentials,
 * endpoint selection or dynamic raw repository operation. Scope is server-owned.
 * The pinned type-only snapshot is byte-identical to W2's published contract.
 */
export function createAuthorizedTelecomAdapter(deps: Dependencies) {
  const boundary = createTelecomReadBoundary({ ...deps, rawRead: async (scope, capability, input) => {
    const descriptor = TELECOM_CAPABILITY_CATALOG.find(c => c.name === capability)
    if (!descriptor) throw new Error('unregistered_read')
    const context: ServerReadContextV1 = Object.freeze({ actor_id: scope.actorId, workspace_id: scope.workspaceId,
      principal_kind: 'user', scope_epoch: scope.scopeEpoch })
    const method = descriptor.serviceMethod as keyof TelecomReadServiceV1
    // Input already passed the matching closed W3 validator. Service repeats
    // operation authorization and its own validation before touching a repository.
    const call = deps.service[method] as (context: ServerReadContextV1, input: unknown) => Promise<unknown>
    return call.call(deps.service, context, input)
  } })
    function projectEvidence(captured: ReferenceScope, capability: string, read: ValidatedRead): ReadEvidence {
      const failure = (state: ReadEvidence['state']): ReadEvidence => ({ operation: capability, state, sections: {}, relations: {} })
      try {
        if (!same(captured, deps.currentScope()) || read.status === 'forbidden') return failure('not_authorized')
        if (read.status !== 'ok') return failure('error')
        const dto = read.value
        const state = dto.result ?? dto.source_state
        if (state !== 'found' && state !== 'available') return failure(state === 'not_found' || state === 'not_authorized' || state === 'unavailable' ? state : 'error')
        const sections: Record<string, CollectionEvidence> = {}
        const relations: Record<string, { customerId?: string; contractId?: string; serviceId?: string }> = {}
        let calendar: ReadEvidence['calendar']
        const add = (key: string, value: unknown, kind: GroundingEntityKind) => {
          const evidence = projectCollectionEvidence(value, kind, captured.scopeEpoch, 50)
          // Model context needs no protected identifiers, including masked ones.
          evidence.rows = evidence.rows.map(row => ({ ...row, protected_fields: {} }))
          if (object(value) && Array.isArray(value.items)) for (const row of value.items) {
            if (!object(row) || typeof row.id !== 'string' || !evidence.rows.some(r => r.id === row.id)) continue
            const links: { customerId?: string; contractId?: string; serviceId?: string } = {}
            for (const [field, target] of [['customer', 'customerId'], ['contract', 'contractId'], ['service', 'serviceId']] as const) {
              const ref = row[field]
              if (object(ref) && typeof ref.id === 'string') links[target] = ref.id
            }
            relations[`${kind}:${row.id}`] = links
          }
          if (object(dto.freshness) && dto.freshness.kind === 'stale') {
            evidence.freshness = 'stale'; evidence.can_assert_empty = false
          }
          sections[key] = evidence
        }
        const one = (value: unknown) => ({ contract_version: 'telecom.v1', scope_epoch: captured.scopeEpoch,
          source_state: 'available', permission: 'authorized', items: [value], completeness: { kind: 'complete' },
          continuation: null, freshness: dto.freshness, error: null })
        if (capability === 'crm.customer.summary' && object(dto.data)) {
          const data = dto.data
          add('customer', one(data.customer), 'customer')
          for (const [key, kind] of [['contracts', 'contract'], ['services', 'service'], ['lines', 'line']] as const) add(key, data[key], kind)
          if (object(data.attention)) for (const [key, kind] of [
            ['next_task', 'task'], ['next_meeting', 'meeting'], ['nearest_renewal', 'renewal'],
            ['nearest_permanence', 'permanence'], ['recent_activity', 'activity'],
          ] as const) add(key, data.attention[key], kind)
          // telecom.v1 summary publishes neither all tasks nor opportunities.
          // Preserve absence as unsupported, never infer an empty opportunity list.
          const unsupported = { contract_version: 'telecom.v1', scope_epoch: captured.scopeEpoch,
            source_state: 'unsupported', reason: 'contract_not_published', permission: 'unknown',
            items: null, completeness: null, freshness: null, continuation: null, error: null }
          add('opportunities', unsupported, 'opportunity')
          // Alerts have no approved grounding entity kind; don't silently drop it.
          add('alerts', object(data.attention) ? data.attention.alerts : unsupported, 'activity')
        } else if (capability === 'crm.dashboard.get' && object(dto.data)) {
          for (const [key, kind] of [['tasks', 'task'], ['meetings', 'meeting'], ['renewals', 'renewal'], ['permanence_alerts', 'permanence'], ['opportunities', 'opportunity']] as const) add(key, dto.data[key], kind)
          const today = dto.data.today
          if (object(today) && Array.isArray(today.items)) for (const kind of ['task', 'meeting'] as const) {
            add(`today_${kind}s`, { ...today, items: today.items.filter(row => object(row) && row.kind === kind) }, kind)
          }
          if (object(dto.data.scope) && object(dto.data.window)) calendar = {
            timezone: String(dto.data.scope.timezone), startsAt: String(dto.data.window.starts_at), endsAt: String(dto.data.window.ends_at),
          }
        } else {
          const kind = TELECOM_READ_DTO_KINDS[capability]!.split(':')[1] as GroundingEntityKind
          add('items', dto.result === 'found' ? one(dto.data) : dto, kind)
        }
        return { operation: capability, state: 'available', sections, relations, ...(calendar ? { calendar } : {}) }
      } catch { return failure('error') }
    }
  async function readWithEvidence(scope: ReferenceScope, capability: string, input: unknown): Promise<{ selection: SafeReadResult; evidence: ReadEvidence }> {
    const captured = { ...scope }
    const read = await boundary.readDto(captured, capability, input)
    const evidence = projectEvidence(captured, capability, read)
    const selection: SafeReadResult = evidence.state === 'not_authorized' ? { status: 'forbidden' }
      : read.status === 'ok' ? projectValidatedTelecomMetadata(capability, read.value, captured.scopeEpoch) : { status: 'failure' }
    return { selection, evidence }
  }
  return {
    reader: boundary.reader,
    readWithEvidence,
    async readEvidence(scope: ReferenceScope, capability: string, input: unknown): Promise<ReadEvidence> {
      return (await readWithEvidence(scope, capability, input)).evidence
    },
  }
}
