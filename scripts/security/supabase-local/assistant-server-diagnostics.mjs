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
  if (/SyntaxError:[^\r\n]*(?:Unexpected end of JSON input|is not valid JSON|in JSON at position|of the JSON input)/.test(clean)) return 'SERVER_SYNTAX_JSON_INPUT'
  if (/SyntaxError:[^\r\n]*(?:Invalid regular expression|Invalid flags supplied to RegExp)/.test(clean)) return 'SERVER_SYNTAX_REGEXP'
  if (/SyntaxError:[^\r\n]*(?:Cannot use import statement outside a module|Unexpected token ['"](?:export|import)['"])/.test(clean)) return 'SERVER_SYNTAX_MODULE_FORMAT'
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
  // Refused synthetic history creates/reads only. Never emit response or headers.
  const contentType = response.headers()['content-type'] ?? ''
  const diagnostic = {
    content_kind: /application\/json/i.test(contentType) ? 'JSON' : /text\/html/i.test(contentType) ? 'HTML' : 'OTHER',
    no_store: response.headers()['cache-control'] === 'no-store',
    error_category: null,
    json_parse_frame: null,
    application_error: null,
    body_available: false,
  }
  try {
    const bytes = await response.body()
    diagnostic.body_available = true
    if (bytes.length <= 262144) {
      const body = bytes.toString('utf8')
      diagnostic.error_category = assistantServerDiagnostic(body)
      if (diagnostic.content_kind === 'HTML' && diagnostic.error_category === 'SERVER_SYNTAX_JSON_INPUT') {
        diagnostic.json_parse_frame = assistantJsonParseFrame(body)
      }
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

/** Inspect only Next's serialized error stack; never export a frame or payload.
 * This identifies an observed parsing frame, not a cause or accepted receipt. */
export function assistantJsonParseFrame(html) {
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf8') > 262144) return 'UNCLASSIFIED'
  const script = /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script\s*>/i.exec(html)
  if (!script) return 'UNCLASSIFIED'
  try {
    const error = JSON.parse(script[1])?.err
    if (!error || error.name !== 'SyntaxError' || typeof error.stack !== 'string' || error.stack.length > 16384) return 'UNCLASSIFIED'
    const frames = error.stack.split(/\r?\n/).slice(1, 33).filter(line => /^\s+at\s/.test(line))
    if (!frames.some(line => /\bat JSON\.parse\b/.test(line))) return 'UNCLASSIFIED'
    if (frames.some(line => /\bat loadManifest\s+\([^\r\n]*[/\\]next[/\\]dist[/\\]server[/\\]load-manifest\.external\.js:\d+:\d+\)/.test(line))) return 'NEXT_MANIFEST_LOAD'
    if (frames.some(line => /\bat parseJSONFromBytes\s+\(node:internal\/deps\/undici\/undici:\d+:\d+\)/.test(line))) return 'HTTP_BODY_PARSE'
  } catch { /* Malformed/unsupported error documents retain the original refusal. */ }
  return 'UNCLASSIFIED'
}
