import type { TelecomReadServiceV1, ServerReadContextV1 } from './telecom-service-contract.v1.js'
import { TELECOM_CAPABILITY_CATALOG } from './telecom-catalog.js'
import { createTelecomReadBoundary, TELECOM_READ_DTO_KINDS, type TelecomReadBoundaryDependencies } from './telecom-read-boundary.js'
import { projectCollectionEvidence, type GroundingEntityKind, type CollectionEvidence } from './grounding.js'
import type { ReferenceScope } from './session-references.js'
import type { JsonObject } from './telecom-dto-parser.js'

export const TELECOM_SOURCE_SHA = '8de57dc2f84634156655f6c79047d545bbb86a6c'
const implemented = new Set(['customer.search', 'customer.get', 'customer.summary'])
/** Snapshot is data only; availability does not grant execution permission. */
export const TELECOM_INTEGRATION_MATRIX = TELECOM_CAPABILITY_CATALOG.map(c => ({
  operation: c.operation, capability: c.name, serviceMethod: c.serviceMethod,
  expectedInput: c.inputSchema, expectedOutput: c.outputSchema.ref,
  parser: TELECOM_READ_DTO_KINDS[c.name], semanticIntent: c.description,
  groundingProjection: c.operation === 'customer.summary' ? 'customer360_sections' : c.operation === 'dashboard.get' ? 'dashboard_sections' : 'collection_evidence',
  integrationState: implemented.has(c.operation) ? 'repository_published_route_disabled' : 'repository_unavailable',
  sourceSha: TELECOM_SOURCE_SHA,
}))

type Dependencies = Omit<TelecomReadBoundaryDependencies, 'rawRead'> & {
  /** Must be AuthorizedTelecomReadServiceV1, NEVER its raw repository. */
  service: TelecomReadServiceV1
}
export type ReadEvidence = {
  operation: string
  state: 'available' | 'not_found' | 'not_authorized' | 'unavailable' | 'error'
  sections: Readonly<Record<string, CollectionEvidence>>
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
  return {
    reader: boundary.reader,
    async readEvidence(scope: ReferenceScope, capability: string, input: unknown): Promise<ReadEvidence> {
      const captured = { ...scope }
      const read = await boundary.readDto(captured, capability, input)
      const failure = (state: ReadEvidence['state']): ReadEvidence => ({ operation: capability, state, sections: {} })
      try {
        if (!same(captured, deps.currentScope()) || read.status === 'forbidden') return failure('not_authorized')
        if (read.status !== 'ok') return failure('error')
        const dto = read.value
        const state = dto.result ?? dto.source_state
        if (state !== 'found' && state !== 'available') return failure(state === 'not_found' || state === 'not_authorized' || state === 'unavailable' ? state : 'error')
        const sections: Record<string, CollectionEvidence> = {}
        const add = (key: string, value: unknown, kind: GroundingEntityKind) => {
          const evidence = projectCollectionEvidence(value, kind, captured.scopeEpoch, 50)
          // Model context needs no protected identifiers, including masked ones.
          evidence.rows = evidence.rows.map(row => ({ ...row, protected_fields: {} }))
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
        } else {
          const kind = TELECOM_READ_DTO_KINDS[capability]!.split(':')[1] as GroundingEntityKind
          add('items', dto.result === 'found' ? one(dto.data) : dto, kind)
        }
        return { operation: capability, state: 'available', sections }
      } catch { return failure('error') }
    },
  }
}
