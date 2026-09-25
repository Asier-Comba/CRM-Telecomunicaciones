import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canAssignRole,
  canManageMembers,
  canManageTarget,
  selectActiveMembership,
} from '../../src/lib/workspace-roles.ts'

const workspaceA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const workspaceB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const memberships = [
  { id: 'm1', workspace_id: workspaceA, role: 'owner', status: 'active' },
  { id: 'm2', workspace_id: workspaceB, role: 'viewer', status: 'active' },
]

test('an explicit workspace must be an active membership', () => {
  assert.equal(selectActiveMembership(memberships, workspaceB).membership?.id, 'm2')
  assert.equal(
    selectActiveMembership(memberships, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc').error,
    'not_a_member',
  )
  assert.equal(selectActiveMembership(memberships, 'not-a-uuid').error, 'invalid_workspace')
})

test('multi-workspace resolution fails closed without a valid preference', () => {
  assert.equal(selectActiveMembership(memberships, null, workspaceA).membership?.id, 'm1')
  assert.equal(selectActiveMembership(memberships, null, null).error, 'workspace_required')
  assert.equal(
    selectActiveMembership([memberships[1]], null, null).membership?.workspace_id,
    workspaceB,
  )
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
