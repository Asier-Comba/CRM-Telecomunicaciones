// /api/team/users — list and invite members in the caller's active workspace.
// Tenant and role authority comes only from workspace_members.

import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  canAssignRole,
  isValidEmail,
  isWorkspaceRole,
  resolveCaller,
  shapeMember,
} from './_helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const caller = await resolveCaller(req)
  if ('error' in caller) return NextResponse.json({ error: caller.error, code: caller.code }, { status: caller.status })
  if (!caller.canManageMembers) {
    return NextResponse.json({ error: 'No tienes permisos para ver el equipo del workspace.' }, { status: 403 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 })

  const { data: memberships, error: membershipError } = await admin
    .from('workspace_members')
    .select('id, user_id, workspace_id, role, status, created_at, updated_at')
    .eq('workspace_id', caller.workspaceId)
    .order('created_at', { ascending: true })

  if (membershipError) {
    return NextResponse.json({ error: 'No se pudieron cargar las membresías.' }, { status: 500 })
  }

  const userIds = (memberships ?? []).map(({ user_id }) => String(user_id))
  const { data: profiles, error: profileError } = userIds.length
    ? await admin.from('profiles').select('id, email, full_name').in('id', userIds)
    : { data: [], error: null }

  if (profileError) {
    return NextResponse.json({ error: 'No se pudieron cargar los perfiles.' }, { status: 500 })
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [String(profile.id), profile as Record<string, unknown>]),
  )

  return NextResponse.json({
    users: (memberships ?? []).map((membership) => shapeMember(
      profilesById.get(String(membership.user_id)) ?? { id: membership.user_id },
      membership as Record<string, unknown>,
    )),
    callerRole: caller.role,
    workspaceId: caller.workspaceId,
  })
}

type InvitePayload = {
  email?: unknown
  full_name?: unknown
  role?: unknown
}

export async function POST(req: NextRequest) {
  const caller = await resolveCaller(req)
  if ('error' in caller) return NextResponse.json({ error: caller.error, code: caller.code }, { status: caller.status })
  if (!caller.canManageMembers) {
    return NextResponse.json({ error: 'No tienes permisos para invitar usuarios.' }, { status: 403 })
  }

  let body: InvitePayload = {}
  try { body = (await req.json()) as InvitePayload } catch { /* empty body */ }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const role = typeof body.role === 'string' ? body.role.trim() : ''

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  if (!fullName) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  if (!isWorkspaceRole(role)) return NextResponse.json({ error: 'Rol no permitido.' }, { status: 400 })
  if (!canAssignRole(caller.role, role)) {
    return NextResponse.json({ error: 'No puedes asignar ese rol.' }, { status: 403 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Invitación no disponible: falta configuración del servidor.' }, { status: 503 })
  }

  const { data: matchingProfiles, error: lookupError } = await admin
    .from('profiles')
    .select('id, email, full_name, workspace_id')
    .ilike('email', email)
    .limit(2)

  if (lookupError) return NextResponse.json({ error: 'No se pudo comprobar el usuario.' }, { status: 500 })
  if ((matchingProfiles ?? []).length > 1) {
    return NextResponse.json({ error: 'El email no identifica un perfil único.' }, { status: 409 })
  }

  let profile = matchingProfiles?.[0] ?? null
  let userId = profile ? String(profile.id) : ''
  let createdAuthUser = false

  if (profile) {
    const { data: existingMembership, error: existingError } = await admin
      .from('workspace_members')
      .select('id, user_id, workspace_id, role, status, created_at, updated_at')
      .eq('workspace_id', caller.workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: 'No se pudo comprobar la membresía.' }, { status: 500 })
    if (existingMembership) {
      return NextResponse.json({
        user: shapeMember(profile as Record<string, unknown>, existingMembership as Record<string, unknown>),
        alreadyExisted: true,
      })
    }
  } else {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (!appUrl && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no está configurada.' }, { status: 503 })
    }
    const redirectTo = appUrl ? `${appUrl.replace(/\/$/, '')}/auth/callback?type=invite` : undefined
    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      ...(redirectTo ? { redirectTo } : {}),
    })
    if (invite.error || !invite.data?.user) {
      return NextResponse.json({ error: `Error de Auth: ${invite.error?.message ?? 'desconocido'}` }, { status: 500 })
    }
    userId = invite.data.user.id
    createdAuthUser = true

    const { data: createdProfile, error: profileError } = await admin
      .from('profiles')
      .upsert({ id: userId, email, full_name: fullName, workspace_id: caller.workspaceId }, { onConflict: 'id' })
      .select('id, email, full_name, workspace_id')
      .single()
    if (profileError || !createdProfile) {
      await admin.auth.admin.deleteUser(userId).catch(() => null)
      return NextResponse.json({ error: 'No se pudo crear el perfil.' }, { status: 500 })
    }
    profile = createdProfile
  }

  const { data: membership, error: membershipError } = await admin
    .from('workspace_members')
    .insert({
      workspace_id: caller.workspaceId,
      user_id: userId,
      role,
      status: 'active',
      invited_by: caller.userId,
    })
    .select('id, user_id, workspace_id, role, status, created_at, updated_at')
    .single()

  if (membershipError || !membership) {
    if (createdAuthUser) await admin.auth.admin.deleteUser(userId).catch(() => null)
    return NextResponse.json({ error: 'No se pudo crear la membresía.' }, { status: 500 })
  }

  return NextResponse.json({
    user: shapeMember(profile as Record<string, unknown>, membership as Record<string, unknown>),
    invited: createdAuthUser,
    addedExistingUser: !createdAuthUser,
  })
}
