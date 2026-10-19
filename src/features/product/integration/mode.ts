/**
 * Integrated product UI is allowed in exactly two explicit modes, never by URL fallback:
 * - non-production, loopback-only synthetic integration (local development);
 * - hosted staging: PLATFORM_TARGET=STAGING with exact HTTPS app and Supabase origins.
 * Production stays closed until a separate production contract exists.
 */
export function integratedLocalAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return localSyntheticAllowed(env) || hostedStagingAllowed(env)
}

function exactOrigin(value: string | undefined, accept: (url: URL) => boolean): boolean {
  try {
    const url = new URL(value ?? '')
    return !url.username && !url.password && url.origin === value && accept(url)
  } catch { return false }
}

function localSyntheticAllowed(env: NodeJS.ProcessEnv): boolean {
  if (env.NODE_ENV === 'production' || env.PRODUCT_LOCAL_INTEGRATION !== 'true' ||
      env.PRODUCT_LOCAL_SYNTHETIC !== 'true' || env.PRODUCT_V1_ENABLED !== 'true') return false
  const local = (url: URL) => url.protocol === 'http:' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  return exactOrigin(env.NEXT_PUBLIC_SUPABASE_URL, local) && exactOrigin(env.PRODUCT_V1_ORIGIN, local)
}

function hostedStagingAllowed(env: NodeJS.ProcessEnv): boolean {
  if (env.PLATFORM_TARGET !== 'STAGING' || env.PRODUCT_V1_ENABLED !== 'true' ||
      env.PRODUCT_LOCAL_INTEGRATION === 'true') return false
  const https = (url: URL) => url.protocol === 'https:'
  return exactOrigin(env.NEXT_PUBLIC_SUPABASE_URL, (url) => https(url) && url.hostname.endsWith('.supabase.co')) &&
    exactOrigin(env.PRODUCT_V1_ORIGIN, https)
}
