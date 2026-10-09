/** CI diagnostics: discard every original byte; output only this fixed vocabulary. */
export function assistantServerDiagnostic(text) {
  const clean = text.replace(/\u001b\[[0-9;]*m/g, '')
  if (/Cannot find module|MODULE_NOT_FOUND|Module not found|Can't resolve/.test(clean)) return 'MODULE_RESOLUTION_FAILED'
  if (/Cannot find.*manifest|ENOENT.*manifest/.test(clean)) return 'MANIFEST_UNAVAILABLE'
  if (/Failed to find Server Action/.test(clean)) return 'SERVER_ACTION_UNAVAILABLE'
  if (/Invariant:|InvariantError/.test(clean)) return 'SERVER_INVARIANT'
  if (/fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT/.test(clean)) return 'UPSTREAM_NETWORK_FAILURE'
  if (/ReferenceError:/.test(clean)) return 'SERVER_REFERENCE_ERROR'
  if (/TypeError:/.test(clean)) return 'SERVER_TYPE_ERROR'
  if (/SyntaxError:/.test(clean)) return 'SERVER_SYNTAX_ERROR'
  if (/RangeError:/.test(clean)) return 'SERVER_RANGE_ERROR'
  if (/Error:/.test(clean)) return 'SERVER_ERROR_UNCLASSIFIED'
  return null
}

export function observeAssistantServerDiagnostics(server, report) {
  for (const stream of [server.stdout, server.stderr]) {
    let pending = ''
    stream?.on('data', chunk => {
      pending = (pending + chunk.toString()).slice(-8192)
      const lines = pending.split('\n'); pending = lines.pop() ?? ''
      for (const line of lines) {
        const category = assistantServerDiagnostic(line)
        if (category) {
          report.assistant_server_diagnostics ??= []
          if (report.assistant_server_diagnostics.length < 30) report.assistant_server_diagnostics.push({ category })
        }
      }
    })
  }
}

export async function assistantUpstreamDiagnostic(response) {
  // Called only for refused synthetic creates. Never emit the response or headers.
  const contentType = response.headers()['content-type'] ?? ''
  const diagnostic = {
    content_kind: /application\/json/i.test(contentType) ? 'JSON' : /text\/html/i.test(contentType) ? 'HTML' : 'OTHER',
    no_store: response.headers()['cache-control'] === 'no-store',
    error_category: null,
    application_error: null,
    body_available: false,
  }
  try {
    const bytes = await response.body()
    diagnostic.body_available = true
    if (bytes.length <= 262144) {
      const body = bytes.toString('utf8')
      diagnostic.error_category = assistantServerDiagnostic(body)
      if (diagnostic.content_kind === 'JSON') {
        try {
          const value = JSON.parse(body)
          if (value?.ok === false && ['validation', 'access_denied', 'access_changed', 'conflict', 'unavailable'].includes(value.error)) diagnostic.application_error = value.error
        } catch { /* Invalid JSON remains unclassified, never a successful receipt. */ }
      }
    }
  } catch { /* Diagnostics cannot replace the original upstream refusal. */ }
  return diagnostic
}
