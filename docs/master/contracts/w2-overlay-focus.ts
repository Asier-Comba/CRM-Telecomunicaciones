import { isSafeOpaqueReference } from './w2-runtime-validation.ts'

export type OverlayFocusState =
  | { status: 'closed' }
  | {
      status: 'open'
      openerId: string | null
      fallbackFocusId: string
      focusableIds: readonly string[]
      focusedIndex: number
      irreversibleProcessing: boolean
    }

export type OverlayFocusEvent =
  | {
      type: 'open'
      openerId: string
      fallbackFocusId: string
      focusableIds: readonly string[]
      initialFocusId: string
    }
  | { type: 'tab_forward' | 'tab_backward' }
  | { type: 'escape_pressed' | 'close_requested' }
  | { type: 'opener_removed' }
  | { type: 'processing_changed'; irreversible: boolean }
  | { type: 'access_revoked' }

export type OverlayFocusEffect =
  | { type: 'focus'; targetId: string }
  | { type: 'close_overlay' }
  | { type: 'announce'; message: 'La operación en curso no se puede interrumpir.' }

export type OverlayFocusTransition = Readonly<{
  state: OverlayFocusState
  effects: readonly OverlayFocusEffect[]
}>

export const initialOverlayFocusState = (): OverlayFocusState => ({
  status: 'closed',
})

const validFocusIds = (ids: readonly string[]): boolean =>
  ids.length > 0 &&
  ids.length <= 100 &&
  new Set(ids).size === ids.length &&
  ids.every(isSafeOpaqueReference)

export function transitionOverlayFocus(
  current: OverlayFocusState,
  event: OverlayFocusEvent,
): OverlayFocusTransition {
  if (event.type === 'access_revoked') {
    return {
      state: { status: 'closed' },
      effects:
        current.status === 'open'
          ? [
              { type: 'close_overlay' },
              { type: 'focus', targetId: 'access-lost-heading' },
            ]
          : [{ type: 'focus', targetId: 'access-lost-heading' }],
    }
  }

  if (event.type === 'open') {
    if (
      current.status !== 'closed' ||
      !isSafeOpaqueReference(event.openerId) ||
      !isSafeOpaqueReference(event.fallbackFocusId) ||
      !validFocusIds(event.focusableIds)
    ) {
      return { state: current, effects: [] }
    }
    const focusedIndex = event.focusableIds.indexOf(event.initialFocusId)
    if (focusedIndex < 0) return { state: current, effects: [] }
    return {
      state: {
        status: 'open',
        openerId: event.openerId,
        fallbackFocusId: event.fallbackFocusId,
        focusableIds: [...event.focusableIds],
        focusedIndex,
        irreversibleProcessing: false,
      },
      effects: [{ type: 'focus', targetId: event.initialFocusId }],
    }
  }

  if (current.status === 'closed') return { state: current, effects: [] }

  if (event.type === 'opener_removed') {
    return {
      state: { ...current, openerId: null },
      effects: [],
    }
  }
  if (event.type === 'processing_changed') {
    return {
      state: { ...current, irreversibleProcessing: event.irreversible },
      effects: [],
    }
  }
  if (event.type === 'tab_forward' || event.type === 'tab_backward') {
    const direction = event.type === 'tab_forward' ? 1 : -1
    const focusedIndex =
      (current.focusedIndex + direction + current.focusableIds.length) %
      current.focusableIds.length
    return {
      state: { ...current, focusedIndex },
      effects: [
        { type: 'focus', targetId: current.focusableIds[focusedIndex] },
      ],
    }
  }

  if (
    event.type === 'escape_pressed' &&
    current.irreversibleProcessing
  ) {
    return {
      state: current,
      effects: [
        {
          type: 'announce',
          message: 'La operación en curso no se puede interrumpir.',
        },
      ],
    }
  }

  const restoreTarget = current.openerId ?? current.fallbackFocusId
  return {
    state: { status: 'closed' },
    effects: [
      { type: 'close_overlay' },
      { type: 'focus', targetId: restoreTarget },
    ],
  }
}

