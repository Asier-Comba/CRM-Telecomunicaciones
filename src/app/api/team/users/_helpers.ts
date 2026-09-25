// Shared server-only authorization helpers for /api/team/users.
//
// Tenant authorization comes exclusively from an active workspace_members row.
// profiles.workspace_id is a non-authorizing default-workspace preference.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import {
  canAssignRole,
  canManageMembers,
  canManageTarget,
  isWorkspaceRole,
  selectActiveMembership,
  type ActiveMembership,
  type WorkspaceRole,
} from '@/lib/workspace-roles'

export {
  canAssignRole,
  canManageMembers,
  canManageTarget,
  isWorkspaceRole,
  selectActiveMembership,
}
export type { ActiveMembership, WorkspaceRole }

export async function buildUserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
  if (!url || !key) return null
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(list) {
        try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* static */ }
      },
    },
  })
}

export type Caller = {
  userId: string
  email: string
  membershipId: string
  workspaceId: string
  role: WorkspaceRole
  canManageMembers: boolean
}

export type CallerError = {
  error: string
  status: 400 | 401 | 403 | 409 | 500 | 503
  code?: string
}

export async function resolveCaller(req?: NextRequest): Promise<Caller | CallerError> {
  const supabase = await buildUserSupabase()
  if (!supabase) return { error: 'Supabase no configurado', status: 503, code: 'supabase_unconfigured' }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return { error: 'No autenticado', status: 401, code: 'unauthenticated' }

  const [{ data: profile, error: profileErr }, { data: membershipRows, error: membershipErr }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, workspace_id')
      .eq('id', userData.user.id)
      .maybeSingle(),
    supabase
      .from('workspace_members')
      .select('id, workspace_id, role, status, created_at')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
  ])

  if (profileErr || membershipErr) {
    return { error: 'No se pudo resolver la membresía del usuario', status: 500, code: 'membership_lookup_failed' }
  }

  const memberships: ActiveMembership[] = (membershipRows ?? [])
    .filter((row) => isWorkspaceRole(row.role) && row.status === 'active')
    .map((row) => ({
      id: String(row.id),
      workspace_id: String(row.workspace_id),
      role: row.role as WorkspaceRole,
      status: 'active',
      created_at: typeof row.created_at === 'string' ? row.created_at : null,
    }))

  const requestedWorkspaceId = req?.headers.get('x-workspace-id')?.trim() || null
  const preferredWorkspaceId = typeof profile?.workspace_id === 'string' ? profile.workspace_id : null
  const selection = selectActiveMembership(memberships, requestedWorkspaceId, preferredWorkspaceId)

  if (!selection.membership) {
    if (selection.error === 'invalid_workspace') {
      return { error: 'x-workspace-id inválido', status: 400, code: selection.error }
    }
    if (selection.error === 'not_a_member') {
      return { error: 'No perteneces al workspace solicitado', status: 403, code: selection.error }
    }
    return {
      error: memberships.length === 0
        ? 'Tu usuario no tiene una membresía activa.'
        : 'Selecciona un workspace activo mediante x-workspace-id.',
      status: memberships.length === 0 ? 403 : 409,
      code: selection.error,
    }
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

export function shapeMember(
  profile: Record<string, unknown>,
  membership: Record<string, unknown>,
) {
  return {
    id: String(profile.id ?? membership.user_id ?? ''),
    membership_id: String(membership.id ?? ''),
    email: typeof profile.email === 'string' ? profile.email : null,
    full_name: typeof profile.full_name === 'string' ? profile.full_name : null,
    role: isWorkspaceRole(membership.role) ? membership.role : 'viewer',
    membership_status: membership.status === 'active' ? 'active' : 'suspended',
    workspace_id: typeof membership.workspace_id === 'string' ? membership.workspace_id : null,
    created_at: typeof membership.created_at === 'string' ? membership.created_at : null,
    updated_at: typeof membership.updated_at === 'string' ? membership.updated_at : null,
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}
