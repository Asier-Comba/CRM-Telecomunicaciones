import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACCESS_LOST_PRESENTATION,
  accessibleSectionSemantics,
  announcementForAsyncTransition,
} from './w2-accessibility-state.ts'

test('loading and refresh expose distinct non-destructive semantics', () => {
  assert.deepEqual(accessibleSectionSemantics('loading'), {
    ariaBusy: true,
    keepExistingContent: false,
    skeletonAriaHidden: true,
  })
  assert.deepEqual(accessibleSectionSemantics('refreshing'), {
    ariaBusy: true,
    keepExistingContent: true,
    skeletonAriaHidden: false,
  })
})

test('announcements are scoped, atomic and deduplicable per request', () => {
  const announcement = announcementForAsyncTransition(
    'loading',
    'partial',
    'contracts-section',
    'request-002',
  )

  assert.deepEqual(announcement, {
    scopeId: 'contracts-section',
    message: 'Se muestran resultados parciales.',
    politeness: 'polite',
    atomic: true,
    dedupeKey: 'contracts-section:request-002:partial',
  })
  assert.equal(
    announcementForAsyncTransition(
      'partial',
      'partial',
      'contracts-section',
      'request-002',
    ),
    null,
  )
})

test('access loss is assertive and focus never returns to protected UI', () => {
  assert.deepEqual(ACCESS_LOST_PRESENTATION, {
    headingId: 'access-lost-heading',
    title: 'Acceso no disponible',
    message: 'Tu acceso ha cambiado. Se han retirado los datos protegidos.',
    politeness: 'assertive',
    atomic: true,
    focusTarget: 'access-lost-heading',
    safeDestination: 'workspace_selection_or_login',
    restoreProtectedOpenerFocus: false,
  })
})

test('stale retains content and announces once without moving focus', () => {
  assert.deepEqual(accessibleSectionSemantics('stale'), {
    ariaBusy: false,
    keepExistingContent: true,
    skeletonAriaHidden: false,
  })
  const announcement = announcementForAsyncTransition(
    'refreshing',
    'stale',
    'meetings-section',
    'request-003',
  )
  assert.equal(announcement?.politeness, 'polite')
  assert.equal('focusTarget' in (announcement ?? {}), false)
})
