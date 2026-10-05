import test from 'node:test'
import assert from 'node:assert/strict'
import { browserErrorKind, nextDiagnostic } from '../../scripts/security/supabase-local/product-browser-diagnostics.mjs'

test('browser failure diagnostics discard messages and arbitrary error names', () => {
  assert.equal(browserErrorKind({ name: 'TypeError', message: 'private@example.invalid' }), 'TypeError')
  assert.equal(browserErrorKind({ name: 'private@example.invalid' }), 'OTHER')
  assert.equal(nextDiagnostic('GET /clients/aa?secret=private@example.invalid 200 in 20ms'), null)
  assert.deepEqual(nextDiagnostic('TypeError: private@example.invalid'), { event: 'SERVER_TYPE_ERROR' })
  assert.deepEqual(nextDiagnostic("Module not found: Can't resolve private/path"), { event: 'MODULE_RESOLUTION_FAILED' })
})

test('cold customer compilation records only stage and numeric duration', () => {
  assert.deepEqual(nextDiagnostic(' ○ Compiling /clients/[id] ...'), { event: 'CUSTOMER_DETAIL_COMPILE_START' })
  assert.deepEqual(nextDiagnostic(' ✓ Compiled /clients/[id] in 34.2s (600 modules)'), { event: 'CUSTOMER_DETAIL_COMPILE_END', elapsed_ms: 34200 })
  assert.deepEqual(nextDiagnostic(' ✓ Compiled /clients/[id] in 100ms'), { event: 'CUSTOMER_DETAIL_COMPILE_END', elapsed_ms: 100 })
})
