export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === 'string' && (WORKSPACE_ROLES as readonly string[]).includes(value)
}

export function canManageMembers(role: WorkspaceRole) {
  return role === 'owner' || role === 'admin'
}

export function canAssignRole(assigner: WorkspaceRole, nextRole: WorkspaceRole) {
  if (assigner === 'owner') return true
  if (assigner === 'admin') return nextRole === 'member' || nextRole === 'viewer'
  return false
}

export function canManageTarget(assigner: WorkspaceRole, target: WorkspaceRole) {
  if (assigner === 'owner') return true
  if (assigner === 'admin') return target === 'member' || target === 'viewer'
  return false
}

export type ActiveMembership = {
  id: string
  workspace_id: string
  role: WorkspaceRole
  status: 'active'
  created_at?: string | null
}

export type MembershipSelection =
  | { membership: ActiveMembership; error?: never }
  | { membership?: never; error: 'invalid_workspace' | 'not_a_member' | 'workspace_required' }

export function selectActiveMembership(
  memberships: ActiveMembership[],
  requestedWorkspaceId?: string | null,
  preferredWorkspaceId?: string | null,
): MembershipSelection {
  if (requestedWorkspaceId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedWorkspaceId)) {
      return { error: 'invalid_workspace' }
    }
    const requested = memberships.find(({ workspace_id }) => workspace_id === requestedWorkspaceId)
    return requested ? { membership: requested } : { error: 'not_a_member' }
  }

  if (preferredWorkspaceId) {
    const preferred = memberships.find(({ workspace_id }) => workspace_id === preferredWorkspaceId)
    if (preferred) return { membership: preferred }
  }

  if (memberships.length === 1) return { membership: memberships[0] }
  return { error: 'workspace_required' }
}
