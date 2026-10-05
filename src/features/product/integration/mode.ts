/** Explicit non-production, loopback-only synthetic integration. No URL fallback. */
export function integratedLocalAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production' || env.PRODUCT_LOCAL_INTEGRATION !== 'true' ||
      env.PRODUCT_LOCAL_SYNTHETIC !== 'true' || env.PRODUCT_V1_ENABLED !== 'true') return false
  try {
    const database = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    const app = new URL(env.PRODUCT_V1_ORIGIN ?? '')
    const local = (url: URL) => url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.username && !url.password
    return local(database) && database.origin === env.NEXT_PUBLIC_SUPABASE_URL &&
      local(app) && app.origin === env.PRODUCT_V1_ORIGIN
  } catch { return false }
}
