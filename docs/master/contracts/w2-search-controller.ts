import {
  isAppRouteDescriptor,
  type AppRouteDescriptor,
  type OpaqueId,
} from './w2-presentation-v0.ts'
import {
  accept,
  hasExactKeys,
  hasOnlyKeys,
  isBoundedString,
  isRecord,
  isSafeOpaqueReference,
  isStrictIsoUtcDateTime,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'
import type {
  ProtectedRequestRef,
  TenantEpoch,
} from './w2-tenant-boundary.ts'

declare const searchContinuationBrand: unique symbol
export type SearchContinuation = string & {
  readonly [searchContinuationBrand]: true
}

export const W2_SEARCH_PRESENTATION_VERSION =
  'w2.search.v0-candidate' as const

export type SearchResultPresentation = Readonly<{
  entityRef: OpaqueId
  kind: 'customer' | 'contract' | 'service_line' | 'opportunity' | 'task' | 'meeting'
  label: string
  supportingLabel?: string
  destination: AppRouteDescriptor
}>

export type SearchPagePresentation = Readonly<{
  contractVersion: typeof W2_SEARCH_PRESENTATION_VERSION
  asOf: string
  items: readonly SearchResultPresentation[]
  completeness:
    | { kind: 'complete' }
    | { kind: 'partial'; continuation: SearchContinuation | null }
}>

const resultKeys = [
  'entityRef',
  'kind',
  'label',
  'supportingLabel',
  'destination',
] as const
const kinds = new Set([
  'customer',
  'contract',
  'service_line',
  'opportunity',
  'task',
  'meeting',
])

export const parseSearchPagePresentation = (
  input: unknown,
): RuntimeParseResult<SearchPagePresentation> =>
  safelyParseUnknown(input, (candidate) => {
    if (!isRecord(candidate)) return reject('expected_object', '$')
    if (!hasExactKeys(candidate, ['contractVersion', 'asOf', 'items', 'completeness'])) {
      return reject('unknown_field', '$')
    }
    if (candidate.contractVersion !== W2_SEARCH_PRESENTATION_VERSION) {
      return reject('unknown_enum', '$.contractVersion')
    }
    if (!isStrictIsoUtcDateTime(candidate.asOf)) {
      return reject('invalid_datetime', '$.asOf')
    }
    if (!Array.isArray(candidate.items) || candidate.items.length > 50) {
      return reject('limit_exceeded', '$.items')
    }

    const items: SearchResultPresentation[] = []
    const refs = new Set<string>()
    for (const [index, item] of candidate.items.entries()) {
      const path = `$.items[${index}]`
      if (!isRecord(item) || !hasOnlyKeys(item, resultKeys)) {
        return reject('expected_object', path)
      }
      if (
        !Object.prototype.hasOwnProperty.call(item, 'entityRef') ||
        !Object.prototype.hasOwnProperty.call(item, 'kind') ||
        !Object.prototype.hasOwnProperty.call(item, 'label') ||
        !Object.prototype.hasOwnProperty.call(item, 'destination')
      ) {
        return reject('missing_field', path)
      }
      if (!isSafeOpaqueReference(item.entityRef)) {
        return reject('invalid_identifier', `${path}.entityRef`)
      }
      if (refs.has(item.entityRef)) {
        return reject('invalid_value', `${path}.entityRef`)
      }
      if (typeof item.kind !== 'string' || !kinds.has(item.kind)) {
        return reject('unknown_enum', `${path}.kind`)
      }
      if (!isBoundedString(item.label, 1, 200) || !item.label.trim()) {
        return reject('invalid_value', `${path}.label`)
      }
      if (
        Object.prototype.hasOwnProperty.call(item, 'supportingLabel') &&
        (!isBoundedString(item.supportingLabel, 1, 240) ||
          !item.supportingLabel.trim())
      ) {
        return reject('invalid_value', `${path}.supportingLabel`)
      }
      if (!isAppRouteDescriptor(item.destination)) {
        return reject('invalid_value', `${path}.destination`)
      }
      refs.add(item.entityRef)
      items.push(
        Object.freeze({
          entityRef: item.entityRef as OpaqueId,
          kind: item.kind as SearchResultPresentation['kind'],
          label: item.label,
          ...(typeof item.supportingLabel === 'string'
            ? { supportingLabel: item.supportingLabel }
            : {}),
          destination: Object.freeze({ ...item.destination }),
        }),
      )
    }

    if (!isRecord(candidate.completeness)) {
      return reject('expected_object', '$.completeness')
    }
    let completeness: SearchPagePresentation['completeness']
    if (
      candidate.completeness.kind === 'complete' &&
      hasExactKeys(candidate.completeness, ['kind'])
    ) {
      completeness = { kind: 'complete' }
    } else if (
      candidate.completeness.kind === 'partial' &&
      hasExactKeys(candidate.completeness, ['kind', 'continuation']) &&
      (candidate.completeness.continuation === null ||
        isSafeOpaqueReference(candidate.completeness.continuation))
    ) {
      completeness = {
        kind: 'partial',
        continuation:
          candidate.completeness.continuation as SearchContinuation | null,
      }
    } else {
      return reject('invalid_value', '$.completeness')
    }

    return accept(
      Object.freeze({
        contractVersion: W2_SEARCH_PRESENTATION_VERSION,
        asOf: candidate.asOf,
        items: Object.freeze(items),
        completeness: Object.freeze(completeness),
      }),
    )
  })

export type SearchState =
  | { status: 'unsupported' }
  | { status: 'idle'; query: '' }
  | { status: 'debouncing'; query: string }
  | {
      status: 'loading'
      query: string
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    }
  | {
      status: 'ready' | 'partial'
      query: string
      requestRef: ProtectedRequestRef
      page: SearchPagePresentation
    }
  | {
      status: 'empty'
      query: string
      requestRef: ProtectedRequestRef
      asOf: string
    }
  | { status: 'error'; query: string; retryable: boolean }
  | { status: 'access_revoked'; query: '' }

export type SearchEvent =
  | { type: 'contract_published' }
  | { type: 'query_changed'; query: string }
  | {
      type: 'request_started'
      query: string
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    }
  | {
      type: 'page_received'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
      page: SearchPagePresentation
    }
  | {
      type: 'request_failed'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
      retryable: boolean
    }
  | { type: 'access_revoked' }

export const initialSearchState = (): SearchState => ({ status: 'unsupported' })

export function transitionSearch(
  current: SearchState,
  event: SearchEvent,
): SearchState {
  if (event.type === 'access_revoked') {
    return { status: 'access_revoked', query: '' }
  }
  if (current.status === 'access_revoked') return current
  if (event.type === 'contract_published') {
    return current.status === 'unsupported' ? { status: 'idle', query: '' } : current
  }
  if (current.status === 'unsupported') return current

  if (event.type === 'query_changed') {
    const query = event.query.trim()
    if (query.length < 2) return { status: 'idle', query: '' }
    if (query.length > 120) return current
    return { status: 'debouncing', query }
  }

  if (event.type === 'request_started') {
    return current.status === 'debouncing' && current.query === event.query
      ? {
          status: 'loading',
          query: current.query,
          tenantEpoch: event.tenantEpoch,
          requestRef: event.requestRef,
        }
      : current
  }

  if (current.status !== 'loading') return current
  if (
    event.tenantEpoch !== current.tenantEpoch ||
    event.requestRef !== current.requestRef
  ) {
    return current
  }

  if (event.type === 'request_failed') {
    return { status: 'error', query: current.query, retryable: event.retryable }
  }
  if (event.type !== 'page_received') return current
  if (
    event.page.items.length === 0 &&
    event.page.completeness.kind === 'complete'
  ) {
    return {
      status: 'empty',
      query: current.query,
      requestRef: current.requestRef,
      asOf: event.page.asOf,
    }
  }
  return {
    status:
      event.page.completeness.kind === 'complete' ? 'ready' : 'partial',
    query: current.query,
    requestRef: current.requestRef,
    page: event.page,
  }
}

export const searchTelemetryProjection = (
  state: SearchState,
): Readonly<{ status: SearchState['status']; query: 'redacted' }> => ({
  status: state.status,
  query: 'redacted',
})

