// Closed categories only; never retain stderr, SQL, IDs, credentials or causes.
export function nativeResourceQueryFailureCategory(error) {
  try {
    if (error?.code === 'ETIMEDOUT') return 'TIMEOUT'
    if (error?.code === 'ENOBUFS') return 'OUTPUT_LIMIT'
    const stderr = (typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '').slice(0, 65536)
    if (error?.status === 3 || /(?:^|\n)ERROR:|\bSQLSTATE\b/i.test(stderr)) return 'SQL_FAILED'
    if (error?.status === 2 || /connection refused|connection reset|could not connect|server closed the connection|no such file or directory/i.test(stderr)) return 'TRANSPORT_FAILED'
    if (error?.code === 'ENOENT') return 'CLIENT_UNAVAILABLE'
    if (error?.signal) return 'INTERRUPTED'
    if (error?.status === 1) return 'CLIENT_OR_SQL_FAILED'
  } catch { /* Malformed diagnostics remain unavailable. */ }
  return 'UNAVAILABLE'
}
