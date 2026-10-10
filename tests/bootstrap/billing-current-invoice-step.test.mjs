import test from 'node:test'
import assert from 'node:assert/strict'
import { observeBillingCurrentInvoiceStep } from '../../scripts/security/supabase-local/billing-current-invoice-step.mjs'

test('a viewport assertion remains rejected once, with its exact current width and closed diagnostic', async () => {
  const report = {}, failure = Error('expect(locator).toBeInViewport SYNTHETIC_PRIVATE_ERROR_BODY'), calls = []
  await assert.rejects(observeBillingCurrentInvoiceStep(report, 768, 'viewport_assertion', async () => { calls.push('assert'); throw failure }), error => error === failure)
  assert.deepEqual(calls, ['assert'])
  assert.deepEqual(report.w2_ui_billing_current_invoice_failure, { width: 768, step: 'viewport_assertion', kind: 'VIEWPORT_ASSERTION' })
  assert.equal(report.w2_ui_action_step, 'billing:confirmed_current_invoice:768:viewport_assertion')
  assert.ok(!JSON.stringify(report).includes('SYNTHETIC_PRIVATE_ERROR_BODY'))
})

test('version, timeout, closed page and generic causes emit only closed categories', async () => {
  for (const [message, kind] of [['toHaveAttribute mismatch', 'STATE_ASSERTION'], ['Timeout 30000ms exceeded', 'TIMEOUT'], ['strict mode violation', 'AMBIGUOUS_LOCATOR'], ['Target closed', 'BROWSER_INTERRUPTED'], ['SYNTHETIC_PRIVATE_ERROR_BODY', 'OTHER']]) {
    const report = {}, failure = Error(message)
    await assert.rejects(observeBillingCurrentInvoiceStep(report, 390, 'version_assertion', async () => { throw failure }), error => error === failure)
    assert.deepEqual(report.w2_ui_billing_current_invoice_failure, { width: 390, step: 'version_assertion', kind })
    assert.ok(!JSON.stringify(report).includes(message))
  }
})

test('error accessors and nested private causes are never executed or serialized', async () => {
  const report = {}; let reads = 0
  const failure = { get message() { reads++; return 'SYNTHETIC_PRIVATE_ERROR_BODY' }, get cause() { reads++; throw Error('private') } }
  await assert.rejects(observeBillingCurrentInvoiceStep(report, 1440, 'scroll', async () => { throw failure }), error => error === failure)
  assert.equal(reads, 0)
  assert.deepEqual(report.w2_ui_billing_current_invoice_failure, { width: 1440, step: 'scroll', kind: 'OTHER' })
})

test('invalid diagnostic axes cannot invoke an action or copy caller text', async () => {
  for (const [width, step] of [[42, 'scroll'], [1440, 'SYNTHETIC_PRIVATE_ERROR_BODY'], [1440, 'constructor']]) {
    const report = {}; let calls = 0
    await assert.rejects(observeBillingCurrentInvoiceStep(report, width, step, async () => { calls++ }), { message: 'BILLING_DIAGNOSTIC_CONTEXT_INVALID' })
    assert.equal(calls, 0); assert.deepEqual(report, {})
  }
})

test('successful actions preserve return values and execute once without a failure record', async () => {
  for (const width of [1440, 768, 390]) {
    const report = {}; let calls = 0
    assert.equal(await observeBillingCurrentInvoiceStep(report, width, 'screenshot', async () => { calls++; return 'done' }), 'done')
    assert.equal(calls, 1); assert.equal(report.w2_ui_billing_current_invoice_failure, undefined)
  }
})
