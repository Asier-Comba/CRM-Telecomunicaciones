/** Closed diagnostic vocabulary: never retain URLs, IDs, messages, or payloads. */
export function browserErrorKind(error) {
  return ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'].includes(error?.name) ? error.name : 'OTHER'
}

export function nextDiagnostic(line) {
  const clean = line.replace(/\u001b\[[0-9;]*m/g, '')
  if (/Compiling.*\/clients\/\[id\]/.test(clean)) return { event: 'CUSTOMER_DETAIL_COMPILE_START' }
  const compiled = clean.match(/Compiled.*\/clients\/\[id\].*?in ([\d.]+)(ms|s)/)
  if (compiled) return { event: 'CUSTOMER_DETAIL_COMPILE_END', elapsed_ms: Math.round(Number(compiled[1]) * (compiled[2] === 's' ? 1000 : 1)) }
  if (/Module not found|Can't resolve/.test(clean)) return { event: 'MODULE_RESOLUTION_FAILED' }
  if (/ReferenceError:/.test(clean)) return { event: 'SERVER_REFERENCE_ERROR' }
  if (/TypeError:/.test(clean)) return { event: 'SERVER_TYPE_ERROR' }
  if (/SyntaxError:/.test(clean)) return { event: 'SERVER_SYNTAX_ERROR' }
  return null
}

export function observeNextDiagnostics(server, report) {
  for (const stream of [server.stdout, server.stderr]) {
    let pending = ''
    stream?.on('data', chunk => {
      // Bound memory and discard all source text immediately after classification.
      pending = (pending + chunk.toString()).slice(-8192)
      const lines = pending.split('\n'); pending = lines.pop() ?? ''
      for (const line of lines) {
        const event = nextDiagnostic(line)
        if (event && report) {
          report.w2_next_diagnostics ??= []
          if (report.w2_next_diagnostics.length < 30) report.w2_next_diagnostics.push(event)
        }
      }
    })
  }
}
