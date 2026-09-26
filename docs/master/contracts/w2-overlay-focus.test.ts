import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialOverlayFocusState,
  transitionOverlayFocus,
} from './w2-overlay-focus.ts'

const opened = () =>
  transitionOverlayFocus(initialOverlayFocusState(), {
    type: 'open',
    openerId: 'open-customer-dialog',
    fallbackFocusId: 'customer-heading',
    focusableIds: ['dialog-heading', 'name-field', 'save-action'],
    initialFocusId: 'name-field',
  }).state

test('open focuses the declared initial control', () => {
  const result = transitionOverlayFocus(initialOverlayFocusState(), {
    type: 'open',
    openerId: 'open-customer-dialog',
    fallbackFocusId: 'customer-heading',
    focusableIds: ['dialog-heading', 'name-field', 'save-action'],
    initialFocusId: 'name-field',
  })

  assert.equal(result.state.status, 'open')
  assert.deepEqual(result.effects, [{ type: 'focus', targetId: 'name-field' }])
})

test('Tab and Shift+Tab wrap within the overlay', () => {
  let state = opened()
  let result = transitionOverlayFocus(state, { type: 'tab_forward' })
  assert.deepEqual(result.effects, [{ type: 'focus', targetId: 'save-action' }])
  state = result.state
  result = transitionOverlayFocus(state, { type: 'tab_forward' })
  assert.deepEqual(result.effects, [{ type: 'focus', targetId: 'dialog-heading' }])
  result = transitionOverlayFocus(result.state, { type: 'tab_backward' })
  assert.deepEqual(result.effects, [{ type: 'focus', targetId: 'save-action' }])
})

test('Escape and programmatic close restore the exact opener', () => {
  for (const type of ['escape_pressed', 'close_requested'] as const) {
    const result = transitionOverlayFocus(opened(), { type })
    assert.deepEqual(result.state, { status: 'closed' })
    assert.deepEqual(result.effects, [
      { type: 'close_overlay' },
      { type: 'focus', targetId: 'open-customer-dialog' },
    ])
  }
})

test('removed opener restores focus to a safe page fallback', () => {
  const withoutOpener = transitionOverlayFocus(opened(), {
    type: 'opener_removed',
  }).state
  const closed = transitionOverlayFocus(withoutOpener, {
    type: 'close_requested',
  })

  assert.deepEqual(closed.effects, [
    { type: 'close_overlay' },
    { type: 'focus', targetId: 'customer-heading' },
  ])
})

test('irreversible processing blocks Escape and announces the reason', () => {
  const processing = transitionOverlayFocus(opened(), {
    type: 'processing_changed',
    irreversible: true,
  }).state
  const result = transitionOverlayFocus(processing, {
    type: 'escape_pressed',
  })

  assert.deepEqual(result.state, processing)
  assert.deepEqual(result.effects, [
    {
      type: 'announce',
      message: 'La operación en curso no se puede interrumpir.',
    },
  ])
})

test('access revocation closes and focuses safe heading without opener restore', () => {
  const result = transitionOverlayFocus(opened(), { type: 'access_revoked' })

  assert.deepEqual(result.state, { status: 'closed' })
  assert.deepEqual(result.effects, [
    { type: 'close_overlay' },
    { type: 'focus', targetId: 'access-lost-heading' },
  ])
  assert.equal(
    result.effects.some(
      (effect) =>
        effect.type === 'focus' &&
        effect.targetId === 'open-customer-dialog',
    ),
    false,
  )
})

test('invalid, duplicate or route-bearing focus IDs fail closed', () => {
  for (const focusableIds of [
    [],
    ['same', 'same'],
    ['valid', '../outside'],
  ]) {
    const initial = initialOverlayFocusState()
    const result = transitionOverlayFocus(initial, {
      type: 'open',
      openerId: 'opener',
      fallbackFocusId: 'fallback',
      focusableIds,
      initialFocusId: focusableIds[0] ?? 'missing',
    })
    assert.deepEqual(result, { state: initial, effects: [] })
  }
})
