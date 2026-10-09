// Classify captured failures without returning provider payloads, URLs, rows or
// browser diagnostics. Unknown messages remain opaque.
export function acceptanceError(error) {
  const message = typeof error?.message === 'string' ? error.message : ''
  if (/^[A-Z][A-Z0-9_]{0,180}$/.test(message)) return message
  if (/Executable doesn't exist|browser executable.*(?:missing|not found)|Please run.*playwright install/i.test(message)) return 'BROWSER_EXECUTABLE_UNAVAILABLE'
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'BOUNDED_OPERATION_TIMEOUT'
  return 'BOUNDED_ACCEPTANCE_FAILURE'
}
