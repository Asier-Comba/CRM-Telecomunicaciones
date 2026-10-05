#!/usr/bin/env node

import assert from 'node:assert/strict'
import { resolve } from 'node:path'

import { loadTenantIsolationManifest, runTenantIsolationHarness } from '../security/tenant-isolation-harness.mjs'

const manifest = loadTenantIsolationManifest(resolve('.security/tenant-isolation-cases.json'))
const permissions = {
  owner: new Set(['list', 'read', 'create', 'update', 'delete', 'manage_members']),
  admin: new Set(['list', 'read', 'create', 'update', 'delete', 'manage_members']),
  viewer: new Set(['list', 'read']),
  member: new Set(['list', 'read', 'create', 'update']),
  manager: new Set(['list', 'read', 'create', 'update', 'delete', 'manage_members']),
}

function secureDecision({ principal, action, workspaceId, resourceWorkspaceId }) {
  if (principal.kind === 'anonymous' || !workspaceId) return { allowed: false, visibleWorkspaceIds: [] }
  const workspace = manifest.workspaces[workspaceId]
  if (!workspace || workspace.status !== 'active') return { allowed: false, visibleWorkspaceIds: [] }
  if (resourceWorkspaceId && resourceWorkspaceId !== workspaceId) return { allowed: false, visibleWorkspaceIds: [] }
  if (resourceWorkspaceId && manifest.workspaces[resourceWorkspaceId]?.status !== 'active') return { allowed: false, visibleWorkspaceIds: [] }

  let allowed = false
  if (principal.kind === 'service') {
    allowed = principal.workspaceIds.includes(workspaceId) && principal.actions.includes(action)
  } else {
    const active = principal.memberships.filter((membership) => membership.status === 'active')
    if (active.length > 1 && workspaceId === null) return { allowed: false, visibleWorkspaceIds: [] }
    const membership = active.find((candidate) => candidate.workspaceId === workspaceId)
    allowed = Boolean(membership && permissions[membership.role].has(action))
  }
  return {
    allowed,
    visibleWorkspaceIds: allowed && action === 'list' ? [workspaceId] : [],
  }
}

const secure = { authorize: async (request) => secureDecision(request) }

function vulnerable(mutator) {
  return {
    authorize: async (request) => mutator(request, secureDecision(request)),
  }
}

assert.deepEqual(await runTenantIsolationHarness(secure, manifest), [])

for (const [name, adapter] of [
  ['anonymous', vulnerable((request, result) => request.principal.kind === 'anonymous' ? { allowed: true, visibleWorkspaceIds: [] } : result)],
  ['cross-tenant', vulnerable((request, result) => request.resourceWorkspaceId === 'workspace-b' ? { allowed: true, visibleWorkspaceIds: [] } : result)],
  ['lifecycle', vulnerable((request, result) => request.principal.kind === 'user' && request.principal.memberships.some((item) => item.status !== 'active') ? { allowed: true, visibleWorkspaceIds: [] } : result)],
  ['workspace-lifecycle', vulnerable((request, result) => request.workspace?.status !== 'active' ? { allowed: true, visibleWorkspaceIds: [] } : result)],
  ['service-scope', vulnerable((request, result) => request.principal.kind === 'service' && request.workspaceId === 'workspace-b' ? { allowed: true, visibleWorkspaceIds: [] } : result)],
  ['role', vulnerable((request, result) => request.action === 'manage_members' ? { allowed: true, visibleWorkspaceIds: [] } : result)],
  ['list-leak', vulnerable((request, result) => result.allowed && request.action === 'list' ? { ...result, visibleWorkspaceIds: ['workspace-a', 'workspace-b'] } : result)],
]) {
  const violations = await runTenantIsolationHarness(adapter, manifest)
  assert.ok(violations.length > 0, `${name} negative control must be detected`)
}

console.log(`Tenant isolation harness passed (${manifest.cases.length} cases; negative controls detected)`)
