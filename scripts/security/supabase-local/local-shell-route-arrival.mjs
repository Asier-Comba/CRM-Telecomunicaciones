const paths = new Set(['/clients', '/portfolio', '/opportunities', '/calendar', '/inbox', '/automations', '/assistant', '/facturacion', '/documents', '/reports', '/settings', '/dashboard'])

/** Arm the current route arrival before its one original click. This uses the
 * page's existing navigation budget, never a new timeout, retry or request.
 * URL arrival is sequencing only; it does not authorize any resource.
 */
export async function synchronizeLocalShellRoute({ page, origin, path, click }) {
  let currentOrigin
  try {
    const parsed = new URL(origin)
    if (parsed.origin === origin && parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) currentOrigin = parsed.origin
  } catch { /* Never reflect supplied URL contents. */ }
  if (!currentOrigin || !paths.has(path) || typeof click !== 'function') throw Error('SHELL_NAVIGATION_CONTEXT_INVALID')
  await Promise.all([
    page.waitForURL(url => url.origin === currentOrigin && url.pathname === path),
    Promise.resolve().then(click),
  ])
}
