import type {
  CollectionContinuation,
  CollectionSection,
} from './w2-collection-envelope.ts'

export const LARGE_COLLECTION_INITIAL_WINDOW = 25
export const LARGE_COLLECTION_WINDOW_STEP = 25
export const LARGE_COLLECTION_MAX_RENDERED = 75

export type LargeCollectionAction =
  | { kind: 'none' }
  | { kind: 'show_more_local'; remainingKnown: number }
  | { kind: 'load_more_remote'; continuation: CollectionContinuation }
  | { kind: 'virtual_window'; nextStart: number }
  | { kind: 'incomplete_no_action' }

export type LargeCollectionPresentation<T> = Readonly<{
  state: CollectionSection<T>['state']
  visibleItems: readonly T[]
  visibleCount: number
  total:
    | { kind: 'known'; value: number }
    | { kind: 'unknown' }
  action: LargeCollectionAction
  rendering: 'none' | 'list' | 'windowed'
  retainTriggerFocus: boolean
}>

const unavailable = <T>(
  state: CollectionSection<T>['state'],
): LargeCollectionPresentation<T> => ({
  state,
  visibleItems: [],
  visibleCount: 0,
  total: { kind: 'unknown' },
  action: { kind: 'none' },
  rendering: 'none',
  retainTriggerFocus: false,
})

/**
 * Produces a bounded DOM window. Remote continuation is offered only after
 * every already-authorized local item is visible and the cursor is fresh.
 */
export function presentLargeCollection<T>(
  section: CollectionSection<T>,
  requestedVisibleCount = LARGE_COLLECTION_INITIAL_WINDOW,
): LargeCollectionPresentation<T> {
  if (
    section.state !== 'ready' &&
    section.state !== 'empty' &&
    section.state !== 'partial' &&
    section.state !== 'stale'
  ) {
    return unavailable(section.state)
  }

  const items = section.data
  const visibleCount = Math.min(
    items.length,
    Math.max(
      LARGE_COLLECTION_INITIAL_WINDOW,
      Math.min(requestedVisibleCount, LARGE_COLLECTION_MAX_RENDERED),
    ),
  )
  const visibleItems = items.slice(0, visibleCount)
  const localRemaining = items.length - visibleCount
  let action: LargeCollectionAction = { kind: 'none' }

  if (localRemaining > 0 && visibleCount < LARGE_COLLECTION_MAX_RENDERED) {
    action = { kind: 'show_more_local', remainingKnown: localRemaining }
  } else if (localRemaining > 0) {
    action = { kind: 'virtual_window', nextStart: visibleCount }
  } else if (section.state === 'partial') {
    action =
      section.nextCursor === null
        ? { kind: 'incomplete_no_action' }
        : { kind: 'load_more_remote', continuation: section.nextCursor }
  } else if (section.state === 'stale' && section.completeness.kind === 'partial') {
    action = { kind: 'incomplete_no_action' }
  }

  return {
    state: section.state,
    visibleItems,
    visibleCount,
    total:
      section.completeness.kind === 'complete'
        ? { kind: 'known', value: items.length }
        : { kind: 'unknown' },
    action,
    rendering:
      items.length === 0
        ? 'none'
        : items.length > LARGE_COLLECTION_INITIAL_WINDOW
          ? 'windowed'
          : 'list',
    retainTriggerFocus:
      action.kind === 'show_more_local' || action.kind === 'load_more_remote',
  }
}

export const nextLargeCollectionWindow = (currentVisibleCount: number): number =>
  Math.min(
    Math.max(currentVisibleCount, LARGE_COLLECTION_INITIAL_WINDOW) +
      LARGE_COLLECTION_WINDOW_STEP,
    LARGE_COLLECTION_MAX_RENDERED,
  )
