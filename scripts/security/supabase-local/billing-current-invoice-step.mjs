const widths = new Set([1440, 768, 390])
const steps = new Set(['viewport_setup', 'scroll', 'viewport_assertion', 'version_assertion', 'screenshot', 'overflow'])

function kind(error) {
  // Observe a trusted assertion's own data message, never an accessor, stack,
  // request, response or nested cause. No message content leaves this function.
  let message = ''
  try {
    const descriptor = error && Object.getOwnPropertyDescriptor(error, 'message')
    if (descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string') message = descriptor.value
  } catch { /* Proxy/exotic failures remain unclassified. */ }
  if (message.includes('toBeInViewport')) return 'VIEWPORT_ASSERTION'
  if (message.includes('toHaveAttribute')) return 'STATE_ASSERTION'
  if (message.includes('strict mode violation')) return 'AMBIGUOUS_LOCATOR'
  if (/timeout|timed out/i.test(message)) return 'TIMEOUT'
  if (/has been closed|Target closed|interrupted by another navigation/.test(message)) return 'BROWSER_INTERRUPTED'
  return 'OTHER'
}

/** Diagnostic only: preserves the original action, exception and assertion.
 * Does not read invoice values, retry, scroll again or establish authorization.
 */
export async function observeBillingCurrentInvoiceStep(report, width, step, action) {
  if (!widths.has(width) || !steps.has(step) || typeof action !== 'function') throw Error('BILLING_DIAGNOSTIC_CONTEXT_INVALID')
  if (report) report.w2_ui_action_step = `billing:confirmed_current_invoice:${width}:${step}`
  try { return await action() }
  catch (error) {
    if (report) report.w2_ui_billing_current_invoice_failure = { width, step, kind: kind(error) }
    throw error
  }
}
