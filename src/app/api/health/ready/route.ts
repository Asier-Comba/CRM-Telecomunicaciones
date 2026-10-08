export const dynamic = 'force-dynamic'
export async function GET() {
  // Readiness never returns endpoints, keys, tenants, errors or provider bodies.
  const target = process.env.PLATFORM_TARGET
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (target !== 'LOCAL' || !url || !key) {
    return Response.json({status: 'not_ready'}, {status: 503, headers: {'Cache-Control': 'no-store'}})
  }
  try {
    const endpoint = new URL(url)
    if (endpoint.origin !== url || endpoint.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)) throw new Error('TARGET')
    const response = await fetch(url + '/rest/v1/', {headers: {apikey: key, authorization: `Bearer ${key}`}, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3000)})
    return Response.json({status: response.ok ? 'ready' : 'not_ready'}, {status: response.ok ? 200 : 503, headers: {'Cache-Control': 'no-store'}})
  } catch {
    return Response.json({status: 'not_ready'}, {status: 503, headers: {'Cache-Control': 'no-store'}})
  }
}
