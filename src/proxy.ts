import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { readStagingAdmissionV1, stagingIdentityAllowedV1, userClientBindingV1 } from './lib/server/product-staging-admission-v1'
import { createPrivateSupabaseFetchV1, privateSupabaseTransportV1 } from './lib/server/product-private-egress-v1'

const publicPaths = new Set(['/login', '/reset-password', '/auth/callback', '/auth/signout', '/api/health/live', '/api/health/ready'])
const healthPaths = new Set(['/api/health/live', '/api/health/ready'])
function privateResponse(response: NextResponse) {
  // Match the application API contract exactly; no-store also prohibits shared caches.
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}
function unavailable(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/'))
    return privateResponse(NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 }))
  return privateResponse(new NextResponse('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CRM Telecom</title><main style="max-width:36rem;margin:12vh auto;padding:1.5rem;font-family:system-ui"><h1>El acceso a este entorno de prueba aún no está habilitado</h1><p>Consulta con el responsable o vuelve a intentarlo más tarde.</p><a href="/login">Volver al acceso</a></main></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (healthPaths.has(request.nextUrl.pathname)) return response
  const policy = readStagingAdmissionV1(process.env)
  const transport = privateSupabaseTransportV1(process.env)
  if (policy.status === 'invalid' || transport === 'denied') return unavailable(request)
  if (policy.status === 'enabled' && request.nextUrl.origin !== policy.origin) return unavailable(request)
  if (policy.status === 'disabled' &&
      ['staging', 'production'].includes(process.env.APP_ENV ?? '') &&
      !publicPaths.has(request.nextUrl.pathname)) return unavailable(request)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (url && key && userClientBindingV1(process.env) !== 'denied') {
    const supabase = createServerClient(url, key, {
      global: transport === 'gateway' ? { fetch: createPrivateSupabaseFetchV1() } : undefined,
      cookieOptions: policy.status === 'enabled' ? { secure: true } : undefined,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value))
        },
      },
    })
    // Refresh session — getUser() validates server-side, getSession() does not.
    let identity: { user: unknown; error: unknown } | null = null
    try {
      const result = await supabase.auth.getUser()
      identity = { user: result.data.user, error: result.error }
    } catch {
      if (policy.status === 'enabled') return unavailable(request)
    }
    if (policy.status === 'enabled' && !publicPaths.has(request.nextUrl.pathname) &&
        (!identity || identity.error !== null || !stagingIdentityAllowedV1(policy, identity.user))) {
      const authenticated = identity !== null && identity.error === null && identity.user !== null && identity.user !== undefined
      const denied = request.nextUrl.pathname.startsWith('/api/')
        ? NextResponse.json({ ok: false, error: 'access_denied' }, { status: authenticated ? 403 : 401 })
        : NextResponse.redirect(new URL(authenticated ? '/login?error=staging_access_denied' : '/login', policy.origin))
      response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie))
      return privateResponse(denied)
    }
    return privateResponse(response)
  }
  if (policy.status === 'enabled') return unavailable(request)
  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
