import type { NextRequest } from 'next/server'
import {
  canManageMembers,
  normalizeActiveMemberships,
  selectActiveMembership,
  type WorkspaceRole,
} from '@/lib/workspace-roles'
import { createUserServerClient } from '@/lib/server/supabase-user'

export type TenantContext = {
  userId: string
  email: string
  membershipId: string
  workspaceId: string
  role: WorkspaceRole
  canManageMembers: boolean
}

export type TenantContextError = {
  error: string
  code: string
  status: 400 | 401 | 403 | 409 | 500 | 503
}

export async function resolveTenantContext(req?: NextRequest): Promise<TenantContext | TenantContextError> {
  const supabase = await createUserServerClient()
  if (!supabase) {
    return { error: 'Supabase no configurado', code: 'supabase_unconfigured', status: 503 }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { error: 'No autenticado', code: 'unauthenticated', status: 401 }
  }

  const [{ data: profile, error: profileError }, { data: rows, error: membershipError }] = await Promise.all([
    supabase.from('profiles').select('email, workspace_id').eq('id', userData.user.id).maybeSingle(),
    supabase
      .from('workspace_members')
      .select('id, workspace_id, role, status, created_at, workspace:workspaces!inner(status)')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .eq('workspace.status', 'active')
      .order('created_at', { ascending: true }),
  ])

  if (profileError || membershipError) {
    return { error: 'No se pudo resolver la membresía', code: 'membership_lookup_failed', status: 500 }
  }

  const memberships = normalizeActiveMemberships(rows ?? [])

  const requestedWorkspaceId = req?.headers.get('x-workspace-id')?.trim() || null
  const preferredWorkspaceId = typeof profile?.workspace_id === 'string' ? profile.workspace_id : null
  const selection = selectActiveMembership(memberships, requestedWorkspaceId, preferredWorkspaceId)

  if (!selection.membership) {
    const status = selection.error === 'invalid_workspace'
      ? 400
      : selection.error === 'not_a_member' || memberships.length === 0
        ? 403
        : 409
    return { error: 'Workspace no autorizado o no seleccionado', code: selection.error, status }
  }

  return {
    userId: userData.user.id,
    email: String(profile?.email ?? userData.user.email ?? ''),
    membershipId: selection.membership.id,
    workspaceId: selection.membership.workspace_id,
    role: selection.membership.role,
    canManageMembers: canManageMembers(selection.membership.role),
  }
}
