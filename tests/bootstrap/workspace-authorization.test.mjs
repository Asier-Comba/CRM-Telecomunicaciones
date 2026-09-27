import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  canAssignRole,
  canManageMembers,
  canManageTarget,
  normalizeActiveMemberships,
  selectActiveMembership,
} from '../../src/lib/workspace-roles.ts'

const workspaceA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const workspaceB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const memberships = [
  { id: 'm1', workspace_id: workspaceA, role: 'owner', status: 'active', workspace: { status: 'active' } },
  { id: 'm2', workspace_id: workspaceB, role: 'viewer', status: 'active', workspace: { status: 'active' } },
]

test('an explicit workspace must be an active membership', () => {
  assert.equal(selectActiveMembership(memberships, workspaceB).membership?.id, 'm2')
  assert.equal(
    selectActiveMembership(memberships, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc').error,
    'not_a_member',
  )
  assert.equal(selectActiveMembership(memberships, 'not-a-uuid').error, 'invalid_workspace')
})

test('removed, suspended and role-mismatched rows fail closed', () => {
  const active = normalizeActiveMemberships([
    { id: 'active', workspace_id: workspaceA, role: 'member', status: 'active', workspace: { status: 'active' } },
    { id: 'removed', workspace_id: workspaceB, role: 'owner', status: 'removed', workspace: { status: 'active' } },
    { id: 'suspended', workspace_id: workspaceB, role: 'owner', status: 'suspended', workspace: { status: 'active' } },
    { id: 'bad-role', workspace_id: workspaceB, role: 'nowlabs_admin', status: 'active', workspace: { status: 'active' } },
    { id: 'suspended-workspace-owner', workspace_id: workspaceB, role: 'owner', status: 'active', workspace: { status: 'suspended' } },
    { id: 'suspended-workspace-admin', workspace_id: workspaceB, role: 'admin', status: 'active', workspace: { status: 'suspended' } },
  ])
  assert.deepEqual(active.map(({ id }) => id), ['active'])
  assert.equal(selectActiveMembership(active, workspaceB).error, 'not_a_member')
})

test('a stale or foreign profile preference grants no workspace access', () => {
  const active = normalizeActiveMemberships([
    { id: 'active', workspace_id: workspaceA, role: 'viewer', status: 'active', workspace: { status: 'active' } },
  ])
  assert.equal(selectActiveMembership(active, null, workspaceB).membership?.workspace_id, workspaceA)
  assert.equal(selectActiveMembership(active, workspaceB, workspaceA).error, 'not_a_member')
})

test('multi-workspace resolution fails closed without a valid preference', () => {
  assert.equal(selectActiveMembership(memberships, null, workspaceA).membership?.id, 'm1')
  assert.equal(selectActiveMembership(memberships, null, null).error, 'workspace_required')
  assert.equal(
    selectActiveMembership([memberships[1]], null, null).membership?.workspace_id,
    workspaceB,
  )
})

test('suspended A is denied while active B remains selectable for the same user', () => {
  const active = normalizeActiveMemberships([
    { id: 'suspended-a', workspace_id: workspaceA, role: 'owner', status: 'active', workspace: { status: 'suspended' } },
    { id: 'active-b', workspace_id: workspaceB, role: 'admin', status: 'active', workspace: [{ status: 'active' }] },
  ])

  assert.deepEqual(active.map(({ id }) => id), ['active-b'])
  assert.equal(selectActiveMembership(active, workspaceA).error, 'not_a_member')
  assert.equal(selectActiveMembership(active, workspaceB).membership?.id, 'active-b')
})

test('server and browser resolvers require an active workspace join', async () => {
  for (const path of ['src/lib/server/tenant-context.ts', 'src/lib/supabase-queries.ts']) {
    const source = await readFile(path, 'utf8')
    assert.match(source, /workspace:workspaces!inner\(status\)/)
    assert.match(source, /\.eq\('workspace\.status', 'active'\)/)
  }
})

test('member-management capabilities prevent admin escalation', () => {
  assert.equal(canManageMembers('owner'), true)
  assert.equal(canManageMembers('admin'), true)
  assert.equal(canManageMembers('member'), false)
  assert.equal(canManageMembers('viewer'), false)

  assert.equal(canAssignRole('owner', 'owner'), true)
  assert.equal(canAssignRole('admin', 'member'), true)
  assert.equal(canAssignRole('admin', 'viewer'), true)
  assert.equal(canAssignRole('admin', 'admin'), false)
  assert.equal(canAssignRole('admin', 'owner'), false)

  assert.equal(canManageTarget('admin', 'member'), true)
  assert.equal(canManageTarget('admin', 'viewer'), true)
  assert.equal(canManageTarget('admin', 'admin'), false)
  assert.equal(canManageTarget('admin', 'owner'), false)
})
