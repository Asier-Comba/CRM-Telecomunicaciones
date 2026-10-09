import {test} from 'node:test'
import assert from 'node:assert/strict'
import {acceptanceError} from '../../scripts/security/supabase-local/acceptance-error.mjs'
test('bounded acceptance diagnostics identify missing browser/timeouts while stripping all raw content',()=>{
 assert.equal(acceptanceError(new Error('CHECK_AUTH_DENIED')),'CHECK_AUTH_DENIED')
 assert.equal(acceptanceError(new Error("Executable doesn't exist at /private-canary/path")),'BROWSER_EXECUTABLE_UNAVAILABLE')
 const timeout=new Error('private-canary provider payload');timeout.name='TimeoutError'
 assert.equal(acceptanceError(timeout),'BOUNDED_OPERATION_TIMEOUT')
 assert.equal(acceptanceError(new Error('provider response includes private-canary')),'BOUNDED_ACCEPTANCE_FAILURE')
 assert.equal(acceptanceError(null),'BOUNDED_ACCEPTANCE_FAILURE')
 const syntax=new Error('private-canary source');syntax.code='ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX'
 assert.equal(acceptanceError(syntax),'TYPESCRIPT_TRANSFORM_REQUIRED')
})
