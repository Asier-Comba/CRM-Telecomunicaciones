import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const requiredTags = [
  'anonymous', 'workspace-a', 'workspace-b', 'cross-tenant', 'removed', 'suspended',
  'workspace-suspended', 'multi-workspace', 'service-principal', 'owner', 'manager', 'member', 'viewer', 'read', 'write', 'list',
]
const allowedActions = new Set(['list', 'read', 'create', 'update', 'delete', 'manage_members'])
const principalKinds = new Set(['anonymous', 'user', 'service'])

export function loadTenantIsolationManifest(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function validateTenantIsolationManifest(manifest) {
  const errors = []
  if (!manifest || manifest.version !== 1) errors.push('version must equal 1')
  if (!manifest?.workspaces || typeof manifest.workspaces !== 'object' || Array.isArray(manifest.workspaces)) errors.push('workspaces must be an object')
  if (!manifest?.principals || typeof manifest.principals !== 'object' || Array.isArray(manifest.principals)) errors.push('principals must be an object')
  if (!Array.isArray(manifest?.cases) || manifest.cases.length === 0) errors.push('cases must be a non-empty array')

  const workspaces = manifest?.workspaces ?? {}
  for (const [id, workspace] of Object.entries(workspaces)) {
    if (!/^workspace-[a-z0-9-]+$/.test(id)) errors.push(`workspace ${id}: invalid ID`)
    if (!workspace || !['active', 'suspended'].includes(workspace.status)) errors.push(`workspace ${id}: invalid status`)
  }

  const principals = manifest?.principals ?? {}
  for (const [id, principal] of Object.entries(principals)) {
    if (!/^[a-z][a-z0-9_]{2,40}$/.test(id)) errors.push(`principal ${id}: invalid ID`)
    if (!principal || !principalKinds.has(principal.kind)) errors.push(`principal ${id}: invalid kind`)
    if (principal?.kind === 'user') {
      if (!Array.isArray(principal.memberships) || principal.memberships.length === 0) errors.push(`principal ${id}: memberships required`)
      for (const membership of principal.memberships ?? []) {
        if (!['owner', 'admin', 'manager', 'member', 'viewer'].includes(membership.role)) errors.push(`principal ${id}: invalid role`)
        if (!['active', 'suspended', 'removed'].includes(membership.status)) errors.push(`principal ${id}: invalid status`)
        if (!workspaces[membership.workspaceId]) errors.push(`principal ${id}: unknown workspace ${membership.workspaceId}`)
      }
    }
    if (principal?.kind === 'service') {
      if (!Array.isArray(principal.workspaceIds) || principal.workspaceIds.length === 0) errors.push(`principal ${id}: workspace scope required`)
      if (!Array.isArray(principal.actions) || principal.actions.some((action) => !allowedActions.has(action))) errors.push(`principal ${id}: invalid action scope`)
      for (const workspaceId of principal.workspaceIds ?? []) if (!workspaces[workspaceId]) errors.push(`principal ${id}: unknown workspace ${workspaceId}`)
    }
  }

  const ids = new Set()
  const tags = new Set()
  for (const testCase of manifest?.cases ?? []) {
    if (!testCase || typeof testCase.id !== 'string' || !/^[a-z][a-z0-9-]{2,80}$/.test(testCase.id)) errors.push('case has invalid ID')
    else if (ids.has(testCase.id)) errors.push(`duplicate case ${testCase.id}`)
    else ids.add(testCase.id)
    if (!principals[testCase.principal]) errors.push(`${testCase.id}: unknown principal`)
    if (!allowedActions.has(testCase.action)) errors.push(`${testCase.id}: invalid action`)
    if (!Array.isArray(testCase.tags) || testCase.tags.length === 0) errors.push(`${testCase.id}: tags required`)
    for (const tag of testCase.tags ?? []) tags.add(tag)
    if (testCase.workspaceId !== null && typeof testCase.workspaceId !== 'string') errors.push(`${testCase.id}: invalid workspaceId`)
    if (testCase.resourceWorkspaceId !== null && typeof testCase.resourceWorkspaceId !== 'string') errors.push(`${testCase.id}: invalid resourceWorkspaceId`)
    if (testCase.workspaceId !== null && !workspaces[testCase.workspaceId]) errors.push(`${testCase.id}: unknown workspaceId`)
    if (testCase.resourceWorkspaceId !== null && !workspaces[testCase.resourceWorkspaceId]) errors.push(`${testCase.id}: unknown resourceWorkspaceId`)
    if (typeof testCase.expected?.allowed !== 'boolean' || !Array.isArray(testCase.expected?.visibleWorkspaceIds)) errors.push(`${testCase.id}: invalid expected result`)
    if (!testCase.expected?.allowed && testCase.expected?.visibleWorkspaceIds.length) errors.push(`${testCase.id}: denied case cannot expose rows`)
  }
  for (const tag of requiredTags) if (!tags.has(tag)) errors.push(`missing required coverage tag: ${tag}`)
  return errors
}

export async function runTenantIsolationHarness(adapter, manifest) {
  const manifestErrors = validateTenantIsolationManifest(manifest)
  assert.deepEqual(manifestErrors, [], `invalid tenant isolation manifest:\n${manifestErrors.join('\n')}`)
  const violations = []

  for (const testCase of manifest.cases) {
    let actual
    try {
      actual = await adapter.authorize({
        principal: structuredClone(manifest.principals[testCase.principal]),
        action: testCase.action,
        workspaceId: testCase.workspaceId,
        resourceWorkspaceId: testCase.resourceWorkspaceId,
        workspace: testCase.workspaceId === null ? null : structuredClone(manifest.workspaces[testCase.workspaceId]),
        resourceWorkspace: testCase.resourceWorkspaceId === null ? null : structuredClone(manifest.workspaces[testCase.resourceWorkspaceId]),
      })
    } catch {
      violations.push(`${testCase.id}: adapter threw instead of returning a bounded decision`)
      continue
    }
    if (!actual || typeof actual.allowed !== 'boolean' || !Array.isArray(actual.visibleWorkspaceIds)) {
      violations.push(`${testCase.id}: malformed adapter result`)
      continue
    }
    if (actual.allowed !== testCase.expected.allowed) violations.push(`${testCase.id}: expected allowed=${testCase.expected.allowed}, got ${actual.allowed}`)
    const visible = [...new Set(actual.visibleWorkspaceIds)].sort()
    const expectedVisible = [...testCase.expected.visibleWorkspaceIds].sort()
    if (JSON.stringify(visible) !== JSON.stringify(expectedVisible)) violations.push(`${testCase.id}: visible workspace leak/mismatch`)
    if (!actual.allowed && visible.length) violations.push(`${testCase.id}: denied request exposed workspace rows`)
  }
  return violations
}
