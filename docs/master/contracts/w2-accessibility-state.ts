export type AnnouncementPresentation = Readonly<{
  scopeId: string
  message: string
  politeness: 'polite' | 'assertive'
  atomic: true
  dedupeKey: string
}>

export type AccessibleAsyncState =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'empty'
  | 'partial'
  | 'stale'
  | 'error'
  | 'not_authorized'

export type AccessibleSectionSemantics = Readonly<{
  ariaBusy: boolean
  keepExistingContent: boolean
  skeletonAriaHidden: boolean
}>

export const accessibleSectionSemantics = (
  state: AccessibleAsyncState,
): AccessibleSectionSemantics => ({
  ariaBusy: state === 'loading' || state === 'refreshing',
  keepExistingContent: state === 'refreshing' || state === 'stale',
  skeletonAriaHidden: state === 'loading',
})

const announcementCopy: Readonly<
  Partial<
    Record<
      AccessibleAsyncState,
      { message: string; politeness: 'polite' | 'assertive' }
    >
  >
> = {
  loading: { message: 'Cargando contenido.', politeness: 'polite' },
  refreshing: { message: 'Actualizando contenido.', politeness: 'polite' },
  ready: { message: 'Contenido actualizado.', politeness: 'polite' },
  empty: { message: 'No hay resultados.', politeness: 'polite' },
  partial: {
    message: 'Se muestran resultados parciales.',
    politeness: 'polite',
  },
  stale: {
    message: 'La información visible puede estar desactualizada.',
    politeness: 'polite',
  },
  error: {
    message: 'No se ha podido cargar el contenido.',
    politeness: 'assertive',
  },
  not_authorized: {
    message: 'Tu acceso ha cambiado y el contenido protegido se ha retirado.',
    politeness: 'assertive',
  },
}

/**
 * Returns stable, scoped copy. A live-region host deduplicates on `dedupeKey`;
 * streaming text deltas never call this function.
 */
export function announcementForAsyncTransition(
  previous: AccessibleAsyncState,
  next: AccessibleAsyncState,
  scopeId: string,
  requestRef: string,
): AnnouncementPresentation | null {
  if (previous === next || next === 'idle') return null
  const copy = announcementCopy[next]
  if (!copy) return null
  return Object.freeze({
    scopeId,
    message: copy.message,
    politeness: copy.politeness,
    atomic: true,
    dedupeKey: `${scopeId}:${requestRef}:${next}`,
  })
}

export type AccessLostPresentation = Readonly<{
  headingId: 'access-lost-heading'
  title: 'Acceso no disponible'
  message: 'Tu acceso ha cambiado. Se han retirado los datos protegidos.'
  politeness: 'assertive'
  atomic: true
  focusTarget: 'access-lost-heading'
  safeDestination: 'workspace_selection_or_login'
  restoreProtectedOpenerFocus: false
}>

export const ACCESS_LOST_PRESENTATION: AccessLostPresentation = Object.freeze({
  headingId: 'access-lost-heading',
  title: 'Acceso no disponible',
  message: 'Tu acceso ha cambiado. Se han retirado los datos protegidos.',
  politeness: 'assertive',
  atomic: true,
  focusTarget: 'access-lost-heading',
  safeDestination: 'workspace_selection_or_login',
  restoreProtectedOpenerFocus: false,
})

