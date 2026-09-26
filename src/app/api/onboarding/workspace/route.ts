import { NextResponse } from 'next/server'
import { createUserServerClient } from '@/lib/server/supabase-user'

export const runtime = 'nodejs'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
    return NextResponse.json(
      {
        error: duplicate ? 'Ese identificador de workspace ya está en uso.' : 'No se pudo crear el workspace.',
        code: duplicate ? 'slug_taken' : 'onboarding_failed',
      },
      { status: duplicate ? 409 : 500 },
    )
  }

  const workspace = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ workspace }, { status: workspace?.created ? 201 : 200 })
}
