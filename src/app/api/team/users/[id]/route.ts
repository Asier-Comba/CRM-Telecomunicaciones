// /api/team/users/[id] — update or remove one membership in the caller's
// active workspace. Removing a membership never deletes the auth user because
// one identity may belong to multiple workspaces.

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  canAssignRole,
  canManageTarget,
  isWorkspaceRole,
  resolveCaller,
  shapeMember,
  type WorkspaceRole,
} from '../_helpers'

export const runtime = 'nodejs'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

type Target = {
  membership: Record<string, unknown> & {
    id: string
    user_id: string
    workspace_id: string
    role: WorkspaceRole
    status: string
  }
  profile: Record<string, unknown>
}

async function loadTarget(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  workspaceId: string,
  targetUserId: string,
): Promise<Target | null> {
  const { data: membership } = await admin
    .from('workspace_members')
    .select('id, user_id, workspace_id, role, status, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (!membership || !isWorkspaceRole(membership.role)) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', targetUserId)
    .maybeSingle()

  return {
    membership: {
      ...(membership as Record<string, unknown>),
      id: String(membership.id),
      user_id: String(membership.user_id),
      workspace_id: String(membership.workspace_id),
      role: membership.role,
      status: String(membership.status),
    },
    profile: (profile as Record<string, unknown> | null) ?? { id: targetUserId },
  }
}

async function isLastActiveOwner(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  target: Target,
) {
  if (target.membership.role !== 'owner' || target.membership.status !== 'active') return false
  const { count } = await admin
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', target.membership.workspace_id)
    .eq('role', 'owner')
    .eq('status', 'active')
    .neq('user_id', target.membership.user_id)
  return (count ?? 0) === 0
}

type PatchBody = { full_name?: unknown; role?: unknown }

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await resolveCaller(req)
  if ('error' in caller) return NextResponse.json({ error: caller.error, code: caller.code }, { status: caller.status })

  const { id: targetUserId } = await ctx.params
  if (!isUuid(targetUserId)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  if (!caller.canManageMembers) return NextResponse.json({ error: 'No tienes permisos para editar usuarios.' }, { status: 403 })
  if (targetUserId === caller.userId) {
    return NextResponse.json({ error: 'No puedes modificar tu propia membresía desde este endpoint.' }, { status: 403 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) return NextResponse.json({ error: 'Edición no disponible.' }, { status: 503 })
  const target = await loadTarget(admin, caller.workspaceId, targetUserId)
  if (!target) return NextResponse.json({ error: 'Membresía no encontrada.' }, { status: 404 })
  if (!canManageTarget(caller.role, target.membership.role)) {
    return NextResponse.json({ error: 'No puedes modificar esa membresía.' }, { status: 403 })
  }

  let body: PatchBody = {}
  try { body = (await req.json()) as PatchBody } catch { /* empty body */ }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : null
  const nextRole = body.role === undefined ? null : body.role

  if (body.full_name !== undefined && !fullName) {
    return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 })
  }
  if (nextRole !== null && !isWorkspaceRole(nextRole)) {
    return NextResponse.json({ error: 'Rol no permitido.' }, { status: 400 })
  }
  if (nextRole !== null && !canAssignRole(caller.role, nextRole)) {
    return NextResponse.json({ error: 'No puedes asignar ese rol.' }, { status: 403 })
  }
  if (fullName === null && nextRole === null) {
    return NextResponse.json({ error: 'Sin cambios.' }, { status: 400 })
  }
  if (nextRole !== null && nextRole !== 'owner' && await isLastActiveOwner(admin, target)) {
    return NextResponse.json({ error: 'No puedes degradar al último owner activo.' }, { status: 409 })
  }

  if (fullName !== null) {
    const { error } = await admin
      .from('profiles')
      .update({ full_name: fullName.slice(0, 160) })
      .eq('id', targetUserId)
    if (error) return NextResponse.json({ error: 'No se pudo actualizar el perfil.' }, { status: 500 })
    target.profile.full_name = fullName.slice(0, 160)
  }

  if (nextRole !== null) {
    const { data, error } = await admin
      .from('workspace_members')
      .update({ role: nextRole })
      .eq('id', target.membership.id)
      .eq('workspace_id', caller.workspaceId)
      .select('id, user_id, workspace_id, role, status, created_at, updated_at')
      .single()
    if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar la membresía.' }, { status: 500 })
    target.membership = {
      ...(data as Record<string, unknown>),
      id: String(data.id),
      user_id: String(data.user_id),
      workspace_id: String(data.workspace_id),
      role: nextRole,
      status: String(data.status),
    }
  }

  return NextResponse.json({ user: shapeMember(target.profile, target.membership) })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await resolveCaller(req)
  if ('error' in caller) return NextResponse.json({ error: caller.error, code: caller.code }, { status: caller.status })

  const { id: targetUserId } = await ctx.params
  if (!isUuid(targetUserId)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  if (!caller.canManageMembers) return NextResponse.json({ error: 'No tienes permisos para retirar miembros.' }, { status: 403 })
  if (targetUserId === caller.userId) return NextResponse.json({ error: 'No puedes retirar tu propia membresía.' }, { status: 403 })

  const admin = getSupabaseAdminClient()
  if (!admin) return NextResponse.json({ error: 'Operación no disponible.' }, { status: 503 })
  const target = await loadTarget(admin, caller.workspaceId, targetUserId)
  if (!target) return NextResponse.json({ error: 'Membresía no encontrada.' }, { status: 404 })
  if (!canManageTarget(caller.role, target.membership.role)) {
    return NextResponse.json({ error: 'No puedes retirar esa membresía.' }, { status: 403 })
  }
  if (await isLastActiveOwner(admin, target)) {
    return NextResponse.json({ error: 'No puedes retirar al último owner activo.' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('workspace_members')
    .delete()
    .eq('id', target.membership.id)
    .eq('workspace_id', caller.workspaceId)
    .select('id')

  if (error) return NextResponse.json({ error: 'No se pudo retirar la membresía.' }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'La membresía ya no existe.' }, { status: 404 })

  return NextResponse.json({ ok: true, authUserDeleted: false })
}
