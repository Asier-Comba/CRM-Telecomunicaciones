declare const tenantEpochBrand: unique symbol
declare const protectedRequestBrand: unique symbol

/** Opaque server-issued generation; it is not a workspace ID or authority. */
export type TenantEpoch = string & { readonly [tenantEpochBrand]: true }
export type ProtectedRequestRef = string & {
  readonly [protectedRequestBrand]: true
}

export type TenantBoundaryReason =
  | 'workspace_switched'
  | 'workspace_suspended'
  | 'membership_removed'
  | 'session_invalidated'
  | 'access_revoked'
  | 'logout'
  | 'role_downgraded'

export type TenantBoundaryPhase = 'active' | 'reauthorizing' | 'access_lost'

export type TenantBoundaryState<T> = {
  phase: TenantBoundaryPhase
  tenantEpoch: TenantEpoch | null
  protectedData: T | null
  pendingRequests: readonly ProtectedRequestRef[]
  consumedRequests: readonly ProtectedRequestRef[]
  sensitiveSurfaceOpen: boolean
  previewActive: boolean
  assistantEntityRefs: readonly string[]
  actionsEnabled: boolean
}

export type TenantBoundaryEvent<T> =
  | { type: 'access_granted'; tenantEpoch: TenantEpoch }
  | {
      type: 'protected_request_started'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    }
  | {
      type: 'protected_request_resolved'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
      data: T
    }
  | {
      type: 'protected_request_aborted' | 'protected_request_failed'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    }
  | { type: 'sensitive_surface_opened'; tenantEpoch: TenantEpoch }
  | { type: 'preview_started'; tenantEpoch: TenantEpoch }
  | {
      type: 'assistant_entity_refs_received'
      tenantEpoch: TenantEpoch
      refs: readonly string[]
    }
  | {
      type: 'security_boundary_changed'
      reason: TenantBoundaryReason
      /** Required from the server for switch/downgrade reauthorization. */
      nextTenantEpoch?: TenantEpoch
    }

export type TenantBoundaryEffect =
  | 'purge_tenant_sensitive_caches'
  | 'abort_pending_protected_requests'
  | 'close_sensitive_surfaces'
  | 'cancel_mutation_preview'
  | 'clear_assistant_entity_references'
  | 'disable_tenant_actions'
  | 'render_access_lost'
  | 'request_server_reauthorization'

export type TenantBoundaryTransition<T> = {
  state: TenantBoundaryState<T>
  effects: readonly TenantBoundaryEffect[]
}

const emptyProtectedState = <T>(
  phase: TenantBoundaryPhase,
  tenantEpoch: TenantEpoch | null,
): TenantBoundaryState<T> => ({
  phase,
  tenantEpoch,
  protectedData: null,
  pendingRequests: [],
  consumedRequests: [],
  sensitiveSurfaceOpen: false,
  previewActive: false,
  assistantEntityRefs: [],
  actionsEnabled: phase === 'active',
})

export const initialTenantBoundaryState = <T>(): TenantBoundaryState<T> =>
  emptyProtectedState('reauthorizing', null)

const boundaryEffects = (
  phase: Exclude<TenantBoundaryPhase, 'active'>,
): readonly TenantBoundaryEffect[] => [
  'purge_tenant_sensitive_caches',
  'abort_pending_protected_requests',
  'close_sensitive_surfaces',
  'cancel_mutation_preview',
  'clear_assistant_entity_references',
  'disable_tenant_actions',
  phase === 'access_lost'
    ? 'render_access_lost'
    : 'request_server_reauthorization',
]

/**
 * One boundary reducer owns all browser-held tenant state. Late results are
 * accepted only for an active matching epoch and an outstanding request.
 */
export function transitionTenantBoundary<T>(
  current: TenantBoundaryState<T>,
  event: TenantBoundaryEvent<T>,
): TenantBoundaryTransition<T> {
  if (event.type === 'security_boundary_changed') {
    const reauthorize =
      event.reason === 'workspace_switched' ||
      event.reason === 'role_downgraded'
    const phase = reauthorize ? 'reauthorizing' : 'access_lost'
    return {
      state: emptyProtectedState(
        phase,
        reauthorize ? (event.nextTenantEpoch ?? null) : null,
      ),
      effects: boundaryEffects(phase),
    }
  }

  if (event.type === 'access_granted') {
    if (
      current.phase !== 'reauthorizing' ||
      (current.tenantEpoch !== null && current.tenantEpoch !== event.tenantEpoch)
    ) {
      return { state: current, effects: [] }
    }
    return {
      state: emptyProtectedState('active', event.tenantEpoch),
      effects: [],
    }
  }

  if (current.phase !== 'active' || current.tenantEpoch === null) {
    return { state: current, effects: [] }
  }

  switch (event.type) {
    case 'protected_request_started':
      if (
        event.tenantEpoch !== current.tenantEpoch ||
        current.pendingRequests.includes(event.requestRef) ||
        current.consumedRequests.includes(event.requestRef) ||
        current.pendingRequests.length >= 128
      ) {
        return { state: current, effects: [] }
      }
      return {
        state: {
          ...current,
          pendingRequests: [...current.pendingRequests, event.requestRef],
        },
        effects: [],
      }
    case 'protected_request_resolved':
      if (
        event.tenantEpoch !== current.tenantEpoch ||
        !current.pendingRequests.includes(event.requestRef)
      ) {
        return { state: current, effects: [] }
      }
      return {
        state: {
          ...current,
          protectedData: event.data,
          pendingRequests: current.pendingRequests.filter(
            (request) => request !== event.requestRef,
          ),
          consumedRequests: [...current.consumedRequests, event.requestRef].slice(
            -256,
          ),
        },
        effects: [],
      }
    case 'protected_request_aborted':
    case 'protected_request_failed':
      if (
        event.tenantEpoch !== current.tenantEpoch ||
        !current.pendingRequests.includes(event.requestRef)
      ) {
        return { state: current, effects: [] }
      }
      return {
        state: {
          ...current,
          pendingRequests: current.pendingRequests.filter(
            (request) => request !== event.requestRef,
          ),
          consumedRequests: [...current.consumedRequests, event.requestRef].slice(
            -256,
          ),
        },
        effects: [],
      }
    case 'sensitive_surface_opened':
      if (event.tenantEpoch !== current.tenantEpoch) {
        return { state: current, effects: [] }
      }
      return {
        state: { ...current, sensitiveSurfaceOpen: true },
        effects: [],
      }
    case 'preview_started':
      if (event.tenantEpoch !== current.tenantEpoch) {
        return { state: current, effects: [] }
      }
      return { state: { ...current, previewActive: true }, effects: [] }
    case 'assistant_entity_refs_received':
      if (
        event.tenantEpoch !== current.tenantEpoch ||
        event.refs.length > 100
      ) {
        return { state: current, effects: [] }
      }
      return {
        state: { ...current, assistantEntityRefs: [...event.refs] },
        effects: [],
      }
  }
}
