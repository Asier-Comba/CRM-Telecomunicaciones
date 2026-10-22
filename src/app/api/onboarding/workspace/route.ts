import { NextResponse } from 'next/server'
import { createUserServerClient } from '@/lib/server/supabase-user'

export const runtime = 'nodejs'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const WORKSPACE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const WORKSPACE_ROLES = new Set(['owner', 'admin', 'member', 'viewer'])

type WorkspaceReceipt = { id: string; name: string; slug: string; role: string; created: boolean }

// This validates an RPC result, never substitutes for its authorization.
function confirmedWorkspace(data: unknown): WorkspaceReceipt | null {
  const row = Array.isArray(data) ? data.length === 1 ? data[0] : null : data
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null
  const value = row as Record<string, unknown>
  if (typeof value.id !== 'string' || !WORKSPACE_ID_RE.test(value.id)
    || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 160
    || typeof value.slug !== 'string' || value.slug.length > 64 || !SLUG_RE.test(value.slug)
    || typeof value.role !== 'string' || !WORKSPACE_ROLES.has(value.role)
    || typeof value.created !== 'boolean') return null
  return { id: value.id, name: value.name, slug: value.slug, role: value.role, created: value.created }
}

function normalizeSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '')
}

export async function POST(req: Request) {
  const supabase = await createUserServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado', code: 'supabase_unconfigured' }, { status: 503 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'No autenticado', code: 'unauthenticated' }, { status: 401 })
  }

  let body: { name?: unknown; slug?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido', code: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const requestedSlug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const slug = normalizeSlug(requestedSlug || name)
  if (!name || name.length > 160 || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Nombre o slug inválido', code: 'invalid_workspace' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('provision_workspace', {
    p_name: name,
    p_slug: slug,
  })

  if (error) {
    const duplicate = error.code === '23505'
    const suspended = error.code === '42501' && error.message?.includes('workspace suspended')
    return NextResponse.json(
      {
        error: duplicate
          ? 'Ese identificador de workspace ya está en uso.'
          : suspended
            ? 'El workspace asociado está suspendido.'
            : 'No se pudo crear el workspace.',
        code: duplicate ? 'slug_taken' : suspended ? 'workspace_suspended' : 'onboarding_failed',
      },
      { status: duplicate ? 409 : suspended ? 403 : 500 },
    )
  }

  const workspace = confirmedWorkspace(data)
  if (!workspace) {
    // The transaction may have committed. Do not claim rollback or retry the RPC.
    return NextResponse.json(
      { error: 'No se pudo confirmar el espacio. Comprueba tu acceso antes de repetir el alta.', code: 'onboarding_unconfirmed' },
      { status: 502 },
    )
  }
  return NextResponse.json({ workspace }, { status: workspace.created ? 201 : 200 })
}
