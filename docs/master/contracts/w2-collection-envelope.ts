import {
  mapFrontendError,
  type FrontendSafeError,
} from './w2-error-taxonomy.ts'
import {
  isSafeOpaqueReference,
  isStrictIsoUtcDateTime,
} from './w2-runtime-validation.ts'

declare const collectionContinuationBrand: unique symbol

export type CollectionContinuation = string & {
  readonly [collectionContinuationBrand]: true
}

export type CollectionCompletenessV1 =
  | { kind: 'complete' }
  | { kind: 'partial'; hasMore: true }

export type CollectionFreshnessV1 =
  | { kind: 'fresh'; asOf: string }
  | { kind: 'stale'; asOf: string; notice: FrontendSafeError | null }

/**
 * Transport-neutral input after a W1-owned DTO has been parsed and adapted.
 * A partial collection may have no continuation when the source knows there
 * is more data but cannot safely offer browser pagination.
 */
export type CollectionSource<T> =
  | { sourceStatus: 'unsupported'; reason: 'contract_not_published' }
  | { sourceStatus: 'unavailable'; notice: FrontendSafeError | null }
  | { sourceStatus: 'not_authorized' }
  | { sourceStatus: 'error'; error: FrontendSafeError }
  | {
      sourceStatus: 'available'
      items: readonly T[]
      completeness:
        | { kind: 'complete' }
        | {
            kind: 'partial'
            continuation: CollectionContinuation | null
          }
      freshness:
        | { kind: 'fresh'; asOf: string }
        | {
            kind: 'stale'
            asOf: string
            notice: FrontendSafeError | null
          }
    }

type UnavailableSection = {
  state: 'unsupported' | 'unavailable'
  data: null
  completeness: null
  nextCursor: null
  freshness: null
  permission: 'unknown'
  error: FrontendSafeError | null
  sourceStatus: 'unsupported' | 'unavailable'
}

type NotAuthorizedSection = {
  state: 'not_authorized'
  data: null
  completeness: null
  nextCursor: null
  freshness: null
  permission: 'not_authorized'
  error: null
  sourceStatus: 'not_authorized'
}

type ErrorSection = {
  state: 'error'
  data: null
  completeness: null
  nextCursor: null
  freshness: null
  permission: 'unknown'
  error: FrontendSafeError
  sourceStatus: 'error'
}

type EmptySection = {
  state: 'empty'
  data: readonly []
  completeness: { kind: 'complete' }
  nextCursor: null
  freshness: { kind: 'fresh'; asOf: string }
  permission: 'authorized'
  error: null
  sourceStatus: 'available'
}

type ReadySection<T> = {
  state: 'ready'
  data: readonly T[]
  completeness: { kind: 'complete' }
  nextCursor: null
  freshness: { kind: 'fresh'; asOf: string }
  permission: 'authorized'
  error: null
  sourceStatus: 'available'
}

type PartialSection<T> = {
  state: 'partial'
  data: readonly T[]
  completeness: { kind: 'partial'; hasMore: true }
  nextCursor: CollectionContinuation | null
  freshness: { kind: 'fresh'; asOf: string }
  permission: 'authorized'
  error: null
  sourceStatus: 'available'
}

type StaleSection<T> = {
  state: 'stale'
  data: readonly T[]
  completeness: CollectionCompletenessV1
  /** Stale continuations are never actionable. */
  nextCursor: null
  freshness: {
    kind: 'stale'
    asOf: string
    notice: FrontendSafeError | null
  }
  permission: 'authorized'
  error: null
  sourceStatus: 'available'
}

export type CollectionSection<T> =
  | UnavailableSection
  | NotAuthorizedSection
  | ErrorSection
  | EmptySection
  | ReadySection<T>
  | PartialSection<T>
  | StaleSection<T>

const invalidCollection = <T>(): CollectionSection<T> => ({
  state: 'error',
  data: null,
  completeness: null,
  nextCursor: null,
  freshness: null,
  permission: 'unknown',
  error: mapFrontendError({ code: 'internal_safe' }),
  sourceStatus: 'error',
})

/**
 * Deterministically derives visual state from source truth. It never uses an
 * empty array as a fallback for unsupported, denied or failed data.
 */
export function normalizeCollectionSource<T>(
  source: CollectionSource<T>,
): CollectionSection<T> {
  if (source.sourceStatus === 'unsupported') {
    return {
      state: 'unsupported',
      data: null,
      completeness: null,
      nextCursor: null,
      freshness: null,
      permission: 'unknown',
      error: null,
      sourceStatus: 'unsupported',
    }
  }

  if (source.sourceStatus === 'unavailable') {
    return {
      state: 'unavailable',
      data: null,
      completeness: null,
      nextCursor: null,
      freshness: null,
      permission: 'unknown',
      error: source.notice,
      sourceStatus: 'unavailable',
    }
  }

  if (source.sourceStatus === 'not_authorized') {
    return {
      state: 'not_authorized',
      data: null,
      completeness: null,
      nextCursor: null,
      freshness: null,
      permission: 'not_authorized',
      error: null,
      sourceStatus: 'not_authorized',
    }
  }

  if (source.sourceStatus === 'error') {
    return {
      state: 'error',
      data: null,
      completeness: null,
      nextCursor: null,
      freshness: null,
      permission: 'unknown',
      error: source.error,
      sourceStatus: 'error',
    }
  }

  if (!isStrictIsoUtcDateTime(source.freshness.asOf)) {
    return invalidCollection()
  }

  if (source.freshness.kind === 'stale') {
    return {
      state: 'stale',
      data: [...source.items],
      completeness:
        source.completeness.kind === 'complete'
          ? { kind: 'complete' }
          : { kind: 'partial', hasMore: true },
      nextCursor: null,
      freshness: {
        kind: 'stale',
        asOf: source.freshness.asOf,
        notice: source.freshness.notice,
      },
      permission: 'authorized',
      error: null,
      sourceStatus: 'available',
    }
  }

  if (source.completeness.kind === 'partial') {
    if (
      source.completeness.continuation !== null &&
      !isSafeOpaqueReference(source.completeness.continuation)
    ) {
      return invalidCollection()
    }
    return {
      state: 'partial',
      data: [...source.items],
      completeness: { kind: 'partial', hasMore: true },
      nextCursor: source.completeness.continuation,
      freshness: { kind: 'fresh', asOf: source.freshness.asOf },
      permission: 'authorized',
      error: null,
      sourceStatus: 'available',
    }
  }

  if (source.items.length === 0) {
    return {
      state: 'empty',
      data: [],
      completeness: { kind: 'complete' },
      nextCursor: null,
      freshness: { kind: 'fresh', asOf: source.freshness.asOf },
      permission: 'authorized',
      error: null,
      sourceStatus: 'available',
    }
  }

  return {
    state: 'ready',
    data: [...source.items],
    completeness: { kind: 'complete' },
    nextCursor: null,
    freshness: { kind: 'fresh', asOf: source.freshness.asOf },
    permission: 'authorized',
    error: null,
    sourceStatus: 'available',
  }
}

export const hasUsableCollectionData = <T>(
  section: CollectionSection<T>,
): section is ReadySection<T> | PartialSection<T> | StaleSection<T> =>
  section.state === 'ready' ||
  section.state === 'partial' ||
  section.state === 'stale'

export const canClaimCollectionEmpty = <T>(
  section: CollectionSection<T>,
): section is EmptySection => section.state === 'empty'

export const canShowCollectionTotal = <T>(
  section: CollectionSection<T>,
): boolean => section.completeness?.kind === 'complete'

export const canContinueCollection = <T>(
  section: CollectionSection<T>,
): section is PartialSection<T> & { nextCursor: CollectionContinuation } =>
  section.state === 'partial' && section.nextCursor !== null

