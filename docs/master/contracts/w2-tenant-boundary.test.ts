import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialTenantBoundaryState,
  transitionTenantBoundary,
  type ProtectedRequestRef,
  type TenantBoundaryReason,
  type TenantEpoch,
} from './w2-tenant-boundary.ts'

const epochA = 'server-epoch-a' as TenantEpoch
const epochB = 'server-epoch-b' as TenantEpoch
const requestA = 'request-a' as ProtectedRequestRef

const populated = () => {
  let state = transitionTenantBoundary(initialTenantBoundaryState<string>(), {
    type: 'access_granted',
    tenantEpoch: epochA,
  }).state
  state = transitionTenantBoundary(state, {
    type: 'protected_request_started',
    tenantEpoch: epochA,
    requestRef: requestA,
  }).state
  state = transitionTenantBoundary(state, {
    type: 'protected_request_resolved',
    tenantEpoch: epochA,
    requestRef: requestA,
    data: 'tenant-a-protected-data',
  }).state
  state = transitionTenantBoundary(state, {
    type: 'sensitive_surface_opened',
    tenantEpoch: epochA,
  }).state
  state = transitionTenantBoundary(state, {
    type: 'preview_started',
    tenantEpoch: epochA,
  }).state
  state = transitionTenantBoundary(state, {
    type: 'assistant_entity_refs_received',
    tenantEpoch: epochA,
    refs: ['entity-a'],
  }).state
  return state
}

test('every access-loss signal purges all tenant-sensitive browser state', () => {
  const reasons: TenantBoundaryReason[] = [
    'workspace_suspended',
    'membership_removed',
    'session_invalidated',
    'access_revoked',
    'logout',
  ]

  for (const reason of reasons) {
    const result = transitionTenantBoundary(populated(), {
      type: 'security_boundary_changed',
      reason,
    })
    assert.deepEqual(result.state, {
      phase: 'access_lost',
      tenantEpoch: null,
      protectedData: null,
      pendingRequests: [],
      consumedRequests: [],
      sensitiveSurfaceOpen: false,
      previewActive: false,
      assistantEntityRefs: [],
      actionsEnabled: false,
    })
    assert.deepEqual(result.effects, [
      'purge_tenant_sensitive_caches',
      'abort_pending_protected_requests',
      'close_sensitive_surfaces',
      'cancel_mutation_preview',
      'clear_assistant_entity_references',
      'disable_tenant_actions',
      'render_access_lost',
    ])
  }
})

test('workspace switch and role downgrade purge then require server reauthorization', () => {
  for (const reason of ['workspace_switched', 'role_downgraded'] as const) {
    const result = transitionTenantBoundary(populated(), {
      type: 'security_boundary_changed',
      reason,
      nextTenantEpoch: epochB,
    })
    assert.equal(result.state.phase, 'reauthorizing')
    assert.equal(result.state.tenantEpoch, epochB)
    assert.equal(result.state.protectedData, null)
    assert.equal(result.state.actionsEnabled, false)
    assert.ok(result.effects.includes('purge_tenant_sensitive_caches'))
    assert.ok(result.effects.includes('request_server_reauthorization'))
  }
})

test('late tenant-A response cannot repopulate state after switch to B', () => {
  let state = transitionTenantBoundary(populated(), {
    type: 'security_boundary_changed',
    reason: 'workspace_switched',
    nextTenantEpoch: epochB,
  }).state
  state = transitionTenantBoundary(state, {
    type: 'access_granted',
    tenantEpoch: epochB,
  }).state

  const late = transitionTenantBoundary(state, {
    type: 'protected_request_resolved',
    tenantEpoch: epochA,
    requestRef: requestA,
    data: 'must-not-return',
  }).state

  assert.equal(late.protectedData, null)
  assert.equal(late.tenantEpoch, epochB)
})

test('unknown or already completed request responses are ignored', () => {
  const state = transitionTenantBoundary(initialTenantBoundaryState<string>(), {
    type: 'access_granted',
    tenantEpoch: epochA,
  }).state
  const next = transitionTenantBoundary(state, {
    type: 'protected_request_resolved',
    tenantEpoch: epochA,
    requestRef: requestA,
    data: 'unexpected',
  }).state
  assert.deepEqual(next, state)
})

test('access-lost is absorbing for late or unrelated grants', () => {
  const revoked = transitionTenantBoundary(populated(), {
    type: 'security_boundary_changed',
    reason: 'access_revoked',
  }).state

  const late = transitionTenantBoundary(revoked, {
    type: 'access_granted',
    tenantEpoch: epochA,
  }).state
  assert.deepEqual(late, revoked)
})

test('active epoch cannot be replaced without an explicit purging boundary', () => {
  const active = populated()
  const injected = transitionTenantBoundary(active, {
    type: 'access_granted',
    tenantEpoch: epochB,
  }).state

  assert.deepEqual(injected, active)
})

test('late sensitive events from tenant A cannot reopen state in tenant B', () => {
  let state = transitionTenantBoundary(populated(), {
    type: 'security_boundary_changed',
    reason: 'workspace_switched',
    nextTenantEpoch: epochB,
  }).state
  state = transitionTenantBoundary(state, {
    type: 'access_granted',
    tenantEpoch: epochB,
  }).state

  for (const event of [
    { type: 'sensitive_surface_opened', tenantEpoch: epochA },
    { type: 'preview_started', tenantEpoch: epochA },
    {
      type: 'assistant_entity_refs_received',
      tenantEpoch: epochA,
      refs: ['tenant-a-entity'],
    },
  ] as const) {
    state = transitionTenantBoundary(state, event).state
  }

  assert.equal(state.sensitiveSurfaceOpen, false)
  assert.equal(state.previewActive, false)
  assert.deepEqual(state.assistantEntityRefs, [])
})

test('aborted and failed requests are consumed and never resurrect data', () => {
  for (const type of [
    'protected_request_aborted',
    'protected_request_failed',
  ] as const) {
    let state = transitionTenantBoundary(initialTenantBoundaryState<string>(), {
      type: 'access_granted',
      tenantEpoch: epochA,
    }).state
    state = transitionTenantBoundary(state, {
      type: 'protected_request_started',
      tenantEpoch: epochA,
      requestRef: requestA,
    }).state
    state = transitionTenantBoundary(state, {
      type,
      tenantEpoch: epochA,
      requestRef: requestA,
    }).state
    const late = transitionTenantBoundary(state, {
      type: 'protected_request_resolved',
      tenantEpoch: epochA,
      requestRef: requestA,
      data: 'late-data',
    }).state
    const reused = transitionTenantBoundary(late, {
      type: 'protected_request_started',
      tenantEpoch: epochA,
      requestRef: requestA,
    }).state

    assert.equal(reused.protectedData, null)
    assert.deepEqual(reused.pendingRequests, [])
    assert.deepEqual(reused.consumedRequests, [requestA])
  }
})
