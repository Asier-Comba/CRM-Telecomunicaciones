import {
  accept,
  hasExactKeys,
  isBoundedString,
  isRecord,
  isSafeOpaqueReference,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'
import type {
  ProtectedRequestRef,
  TenantBoundaryReason,
  TenantEpoch,
} from './w2-tenant-boundary.ts'

export const TENANT_CACHE_RESOURCE_KINDS = [
  'customer',
  'dashboard',
  'assistant_read',
  'contract',
  'task',
  'meeting',
] as const

export type TenantCacheResourceKind =
  (typeof TENANT_CACHE_RESOURCE_KINDS)[number]

export type TenantCacheKey = Readonly<{
  tenantEpoch: TenantEpoch
  authenticatedScopeRef: string
  transportContractVersion: string
  presentationVersion: string
  resourceKind: TenantCacheResourceKind
  entityRef: string | null
  projectionRef: string
}>

const keyFields = [
  'tenantEpoch',
  'authenticatedScopeRef',
  'transportContractVersion',
  'presentationVersion',
  'resourceKind',
  'entityRef',
  'projectionRef',
] as const

const resourceKinds = new Set<string>(TENANT_CACHE_RESOURCE_KINDS)

/** Cache-key input is unknown even though it is produced inside the browser. */
export const parseTenantCacheKey = (
  input: unknown,
): RuntimeParseResult<TenantCacheKey> =>
  safelyParseUnknown(input, (candidate) => {
    if (!isRecord(candidate)) return reject('expected_object', '$')
    if (!hasExactKeys(candidate, keyFields)) {
      const unknown = Object.keys(candidate).find(
        (key) => !keyFields.includes(key as (typeof keyFields)[number]),
      )
      return reject(
        unknown ? 'unknown_field' : 'missing_field',
        unknown ? `$.${unknown}` : '$',
      )
    }

    if (!isSafeOpaqueReference(candidate.tenantEpoch)) {
      return reject('invalid_identifier', '$.tenantEpoch')
    }
    if (!isSafeOpaqueReference(candidate.authenticatedScopeRef)) {
      return reject('invalid_identifier', '$.authenticatedScopeRef')
    }
    if (
      !isBoundedString(candidate.transportContractVersion, 1, 64) ||
      !isSafeOpaqueReference(candidate.transportContractVersion)
    ) {
      return reject('invalid_value', '$.transportContractVersion')
    }
    if (
      !isBoundedString(candidate.presentationVersion, 1, 96) ||
      !isSafeOpaqueReference(candidate.presentationVersion)
    ) {
      return reject('invalid_value', '$.presentationVersion')
    }
    if (
      typeof candidate.resourceKind !== 'string' ||
      !resourceKinds.has(candidate.resourceKind)
    ) {
      return reject('unknown_enum', '$.resourceKind')
    }
    if (
      candidate.entityRef !== null &&
      !isSafeOpaqueReference(candidate.entityRef)
    ) {
      return reject('invalid_identifier', '$.entityRef')
    }
    if (!isSafeOpaqueReference(candidate.projectionRef)) {
      return reject('invalid_identifier', '$.projectionRef')
    }

    return accept(
      Object.freeze({
        tenantEpoch: candidate.tenantEpoch as TenantEpoch,
        authenticatedScopeRef: candidate.authenticatedScopeRef,
        transportContractVersion: candidate.transportContractVersion,
        presentationVersion: candidate.presentationVersion,
        resourceKind: candidate.resourceKind as TenantCacheResourceKind,
        entityRef: candidate.entityRef,
        projectionRef: candidate.projectionRef,
      }),
    )
  })

type PendingCacheRequest = Readonly<{
  requestRef: ProtectedRequestRef
  key: TenantCacheKey
}>

type TenantCacheEntry<T> = Readonly<{
  key: TenantCacheKey
  data: T
}>

export type TenantCacheState<T> = Readonly<{
  phase: 'active' | 'reauthorizing' | 'access_lost'
  tenantEpoch: TenantEpoch | null
  expectedEpoch: TenantEpoch | null
  entries: readonly TenantCacheEntry<T>[]
  pending: readonly PendingCacheRequest[]
  consumedRequestRefs: readonly ProtectedRequestRef[]
}>

export type TenantCacheEvent<T> =
  | {
      type: 'security_boundary_changed'
      reason: TenantBoundaryReason
      nextTenantEpoch?: TenantEpoch
    }
  | { type: 'access_granted'; tenantEpoch: TenantEpoch }
  | {
      type: 'request_started'
      requestRef: ProtectedRequestRef
      key: TenantCacheKey
    }
  | {
      type: 'request_aborted' | 'request_failed' | 'request_superseded'
      requestRef: ProtectedRequestRef
    }
  | {
      type: 'response_committed'
      requestRef: ProtectedRequestRef
      key: TenantCacheKey
      data: T
    }

export const createActiveTenantCache = <T>(
  tenantEpoch: TenantEpoch,
): TenantCacheState<T> => ({
  phase: 'active',
  tenantEpoch,
  expectedEpoch: null,
  entries: [],
  pending: [],
  consumedRequestRefs: [],
})

const sameCacheKey = (left: TenantCacheKey, right: TenantCacheKey): boolean =>
  left.tenantEpoch === right.tenantEpoch &&
  left.authenticatedScopeRef === right.authenticatedScopeRef &&
  left.transportContractVersion === right.transportContractVersion &&
  left.presentationVersion === right.presentationVersion &&
  left.resourceKind === right.resourceKind &&
  left.entityRef === right.entityRef &&
  left.projectionRef === right.projectionRef

const consume = (
  current: readonly ProtectedRequestRef[],
  refs: readonly ProtectedRequestRef[],
): readonly ProtectedRequestRef[] =>
  [...new Set([...current, ...refs])].slice(-512)

/**
 * Cache writes are fenced at commit time. Aborting the network request is an
 * optimization; epoch, key and outstanding-attempt equality are the guard.
 */
export function transitionTenantCache<T>(
  current: TenantCacheState<T>,
  event: TenantCacheEvent<T>,
): TenantCacheState<T> {
  if (event.type === 'security_boundary_changed') {
    const reauthorize =
      event.reason === 'workspace_switched' ||
      event.reason === 'role_downgraded'
    return {
      phase: reauthorize ? 'reauthorizing' : 'access_lost',
      tenantEpoch: null,
      expectedEpoch: reauthorize ? (event.nextTenantEpoch ?? null) : null,
      entries: [],
      pending: [],
      consumedRequestRefs: consume(
        current.consumedRequestRefs,
        current.pending.map(({ requestRef }) => requestRef),
      ),
    }
  }

  if (event.type === 'access_granted') {
    if (
      current.phase !== 'reauthorizing' ||
      current.expectedEpoch === null ||
      event.tenantEpoch !== current.expectedEpoch
    ) {
      return current
    }
    return {
      ...current,
      phase: 'active',
      tenantEpoch: event.tenantEpoch,
      expectedEpoch: null,
    }
  }

  if (current.phase !== 'active' || current.tenantEpoch === null) return current

  if (event.type === 'request_started') {
    if (
      event.key.tenantEpoch !== current.tenantEpoch ||
      current.consumedRequestRefs.includes(event.requestRef) ||
      current.pending.some(({ requestRef }) => requestRef === event.requestRef) ||
      current.pending.length >= 128
    ) {
      return current
    }
    const superseded = current.pending.filter(({ key }) =>
      sameCacheKey(key, event.key),
    )
    return {
      ...current,
      pending: [
        ...current.pending.filter(({ key }) => !sameCacheKey(key, event.key)),
        { requestRef: event.requestRef, key: event.key },
      ],
      consumedRequestRefs: consume(
        current.consumedRequestRefs,
        superseded.map(({ requestRef }) => requestRef),
      ),
    }
  }

  if (
    event.type === 'request_aborted' ||
    event.type === 'request_failed' ||
    event.type === 'request_superseded'
  ) {
    if (!current.pending.some(({ requestRef }) => requestRef === event.requestRef)) {
      return current
    }
    return {
      ...current,
      pending: current.pending.filter(
        ({ requestRef }) => requestRef !== event.requestRef,
      ),
      consumedRequestRefs: consume(current.consumedRequestRefs, [event.requestRef]),
    }
  }

  const pending = current.pending.find(
    ({ requestRef, key }) =>
      requestRef === event.requestRef && sameCacheKey(key, event.key),
  )
  if (
    pending === undefined ||
    event.key.tenantEpoch !== current.tenantEpoch
  ) {
    return current
  }

  return {
    ...current,
    entries: [
      ...current.entries.filter(({ key }) => !sameCacheKey(key, event.key)),
      { key: event.key, data: event.data },
    ],
    pending: current.pending.filter(
      ({ requestRef }) => requestRef !== event.requestRef,
    ),
    consumedRequestRefs: consume(current.consumedRequestRefs, [event.requestRef]),
  }
}

export function readTenantCache<T>(
  state: TenantCacheState<T>,
  key: TenantCacheKey,
): T | null {
  if (
    state.phase !== 'active' ||
    state.tenantEpoch === null ||
    key.tenantEpoch !== state.tenantEpoch
  ) {
    return null
  }
  return state.entries.find(({ key: candidate }) => sameCacheKey(candidate, key))
    ?.data ?? null
}

